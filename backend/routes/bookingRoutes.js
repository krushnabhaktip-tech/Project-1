const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

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
    const [rows] = await connection.query(
      'SELECT event_id, price, available_seats, status FROM events WHERE event_id = ? FOR UPDATE',
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

    await connection.commit();

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
module.exports = router;