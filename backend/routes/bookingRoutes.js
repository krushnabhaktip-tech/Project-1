const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { sendBookingReceipt } = require('../utils/mailer');
const QRCode = require('qrcode');

const MAX_TICKETS = 10;     // maximum tickets in one booking
const VIP_MULTIPLIER = 2;   // VIP ticket costs 2x the normal price

// CREATE BOOKING (logged-in users)
router.post('/bookings', verifyToken, async (req, res) => {
  const { event_id, ticket_type, quantity } = req.body;
  const type = ticket_type || 'General';
  const qty = Number(quantity);

  // Basic validation
  if (!event_id) {
    return res.status(400).json({ message: 'Event is required.' });
  }
  if (!['General', 'VIP'].includes(type)) {
    return res.status(400).json({ message: 'Ticket type must be General or VIP.' });
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_TICKETS) {
    return res.status(400).json({ message: 'Quantity must be a whole number between 1 and ' + MAX_TICKETS + '.' });
  }

  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // Lock the event row so two users cannot book the last seat at the same time
    // NEW: title is also selected, so the notification can show the event name
    const [rows] = await connection.query('SELECT event_id, title, venue, event_date, price, available_seats, status FROM events WHERE event_id = ? FOR UPDATE',
      [event_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Event not found.' });
    }

    const event = rows[0];

    if (event.status !== 'upcoming') {
      await connection.rollback();
      return res.status(400).json({ message: 'Bookings are closed for this event.' });
    }

    if (event.available_seats < qty) {
      await connection.rollback();
      return res.status(400).json({ message: 'Not enough seats. Only ' + event.available_seats + ' left.' });
    }

    // The price always comes from the database, never from the user
    const unitPrice = type === 'VIP' ? Number(event.price) * VIP_MULTIPLIER : Number(event.price);
    const totalAmount = Number((unitPrice * qty).toFixed(2));
    const bookingId = crypto.randomUUID();

    await connection.query(
      `INSERT INTO bookings (booking_id, user_id, event_id, ticket_type, quantity, total_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookingId, req.user.user_id, event_id, type, qty, totalAmount]
    );

    await connection.query(
      'UPDATE events SET available_seats = available_seats - ? WHERE event_id = ?',
      [qty, event_id]
    );

    // NEW: notification is created in the same transaction as the booking
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [req.user.user_id, 'Booking confirmed: ' + qty + ' x ' + type + ' ticket(s) for ' + event.title + '.']
    );

    await connection.commit();
    // Receipt email (the booking is already saved, so a failed email cannot break it)
    db.query('SELECT name, email FROM users WHERE user_id = ?', [req.user.user_id], function (err, users) {
      if (!err && users.length > 0) {
        sendBookingReceipt({
          to: users[0].email, name: users[0].name, bookingId: bookingId,
          eventTitle: event.title, venue: event.venue, date: event.event_date,
          ticketType: type, quantity: qty, total: totalAmount
        });
      }
    });

    res.status(201).json({
      message: 'Booking confirmed!',
      booking: {
        booking_id: bookingId,
        event_id: event_id,
        ticket_type: type,
        quantity: qty,
        total_amount: totalAmount
      }
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.log(err);
    res.status(500).json({ message: 'Server error. Could not create booking.' });
  } finally {
    if (connection) connection.release();
  }
});

// GET MY BOOKINGS (logged-in users see only their own bookings)
router.get('/bookings/my', verifyToken, (req, res) => {
  const query = `SELECT b.booking_id, b.event_id, b.ticket_type, b.quantity, b.total_amount,
                        b.status, b.booked_at,
                        e.title, e.venue, e.event_date, e.poster_url
                 FROM bookings b
                 JOIN events e ON b.event_id = e.event_id
                 WHERE b.user_id = ?
                 ORDER BY b.booked_at DESC`;

  db.query(query, [req.user.user_id], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error. Could not fetch bookings.' });
    }
    res.status(200).json(results);
  });
});

// CANCEL BOOKING (users can cancel only their own confirmed bookings)
router.put('/bookings/:id/cancel', verifyToken, async (req, res) => {
  const bookingId = req.params.id;
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // Find the booking (it must belong to the logged-in user) and lock it
    const [rows] = await connection.query(
      'SELECT booking_id, event_id, quantity, status FROM bookings WHERE booking_id = ? AND user_id = ? FOR UPDATE',
      [bookingId, req.user.user_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = rows[0];

    if (booking.status !== 'confirmed') {
      await connection.rollback();
      return res.status(400).json({ message: 'This booking is already cancelled.' });
    }

    await connection.query(
      "UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?",
      [bookingId]
    );

    // Release the seats back to the event
    await connection.query(
      'UPDATE events SET available_seats = available_seats + ? WHERE event_id = ?',
      [booking.quantity, booking.event_id]
    );

    // NEW: notification for the cancellation (same transaction)
    const [eventRows] = await connection.query(
      'SELECT title FROM events WHERE event_id = ?',
      [booking.event_id]
    );
    const title = eventRows.length > 0 ? eventRows[0].title : 'your event';
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [req.user.user_id, 'Booking cancelled: ' + booking.quantity + ' ticket(s) for ' + title + '. Seats released.']
    );

    await connection.commit();

    res.status(200).json({ message: 'Booking cancelled. Seats released.' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.log(err);
    res.status(500).json({ message: 'Server error. Could not cancel booking.' });
  } finally {
    if (connection) connection.release();
  }
});

// ADMIN: GET ALL BOOKINGS (optional ?status= and ?search=)
router.get('/admin/bookings', verifyToken, verifyAdmin, (req, res) => {
  const { status, search } = req.query;
  const conditions = [];
  const params = [];

  if (status === 'confirmed' || status === 'cancelled') {
    conditions.push('b.status = ?');
    params.push(status);
  }
  if (search && search.trim() !== '') {
    const like = '%' + search.trim() + '%';
    conditions.push('(u.name LIKE ? OR u.email LIKE ? OR e.title LIKE ? OR b.booking_id LIKE ?)');
    params.push(like, like, like, like);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const query = `SELECT b.booking_id, b.ticket_type, b.quantity, b.total_amount, b.status, b.booked_at,
                        u.name AS user_name, u.email AS user_email,
                        e.title AS event_title
                 FROM bookings b
                 JOIN users u ON b.user_id = u.user_id
                 JOIN events e ON b.event_id = e.event_id
                 ${where}
                 ORDER BY b.booked_at DESC`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error. Could not fetch bookings.' });
    }
    res.status(200).json(results);
  });
});

// ADMIN: DASHBOARD STATS
router.get('/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = db.promise();

    const [[events]] = await pool.query('SELECT COUNT(*) AS total_events FROM events');

    const [[confirmed]] = await pool.query(
      `SELECT COUNT(*) AS total_bookings,
              COALESCE(SUM(total_amount), 0) AS revenue,
              COALESCE(SUM(quantity), 0) AS tickets_sold
       FROM bookings WHERE status = 'confirmed'`
    );

    const [[cancelled]] = await pool.query(
      "SELECT COUNT(*) AS cancelled_bookings FROM bookings WHERE status = 'cancelled'"
    );

    // Revenue per day for the last 7 days (confirmed bookings only)
    const [sales] = await pool.query(
      `SELECT DATE_FORMAT(booked_at, '%Y-%m-%d') AS day,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM bookings
       WHERE status = 'confirmed' AND booked_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE_FORMAT(booked_at, '%Y-%m-%d')
       ORDER BY day`
    );

    const [recent] = await pool.query(
      `SELECT b.booking_id, b.total_amount, b.status, b.booked_at,
              u.name AS user_name, e.title AS event_title
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN events e ON b.event_id = e.event_id
       ORDER BY b.booked_at DESC
       LIMIT 5`
    );

    res.status(200).json({
      total_events: events.total_events,
      total_bookings: confirmed.total_bookings,
      cancelled_bookings: cancelled.cancelled_bookings,
      tickets_sold: Number(confirmed.tickets_sold),
      revenue: Number(confirmed.revenue),
      sales: sales.map(function (s) { return { day: s.day, revenue: Number(s.revenue) }; }),
      recent: recent
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error. Could not load dashboard.' });
  }
});
// GET TICKET (a user can open only their own confirmed booking)
router.get('/bookings/:id/ticket', verifyToken, (req, res) => {
  const query = `SELECT b.booking_id, b.ticket_type, b.quantity, b.total_amount, b.status,
                        e.title, e.venue, e.event_date, e.category,
                        u.name AS holder
                 FROM bookings b
                 JOIN events e ON b.event_id = e.event_id
                 JOIN users u ON b.user_id = u.user_id
                 WHERE b.booking_id = ? AND b.user_id = ?`;

  db.query(query, [req.params.id, req.user.user_id], async (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error. Could not load ticket.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const ticket = results[0];
    if (ticket.status !== 'confirmed') {
      return res.status(400).json({ message: 'This booking is cancelled, so it has no ticket.' });
    }

    try {
             // The QR holds a link, so scanning it opens the verify page
      const base = req.protocol + '://' + req.get('host');
      ticket.qr = await QRCode.toDataURL(base + '/verify.html?id=' + ticket.booking_id, { width: 300, margin: 1 });
      res.status(200).json(ticket);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error. Could not create the QR code.' });
    }
  });
});
// VERIFY A TICKET (public: used when a QR code is scanned; shows only basic details)
router.get('/verify/:id', (req, res) => {
  const query = `SELECT b.ticket_type, b.quantity, b.status,
                        e.title, e.venue, e.event_date, u.name AS holder
                 FROM bookings b
                 JOIN events e ON b.event_id = e.event_id
                 JOIN users u ON b.user_id = u.user_id
                 WHERE b.booking_id = ?`;

  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ valid: false, message: 'Ticket not found.' });
    }
    const t = results[0];
    res.status(200).json({
      valid: t.status === 'confirmed',
      status: t.status,
      title: t.title,
      venue: t.venue,
      event_date: t.event_date,
      holder: String(t.holder).split(' ')[0],   // first name only
      ticket_type: t.ticket_type,
      quantity: t.quantity
    });
  });
});

module.exports = router;