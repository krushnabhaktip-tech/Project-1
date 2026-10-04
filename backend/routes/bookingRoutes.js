const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

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

module.exports = router;