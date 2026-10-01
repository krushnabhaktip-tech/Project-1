const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// CREATE EVENT (Admin only)
router.post('/events', verifyToken, verifyAdmin, (req, res) => {
  const { title, description, category, venue, event_date, price, total_seats, poster_url } = req.body;

  if (!title || !event_date || !venue || !total_seats) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  const query = `INSERT INTO events (title, description, category, venue, event_date, price, total_seats, available_seats, poster_url, status, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    title,
    description,
    category,
    venue,
    event_date,
    price,
    total_seats,
    total_seats,   // available_seats shuru me total_seats ke barabar hi hoga
    poster_url,
    'upcoming',     // status ki default value
    req.user.user_id  // kisne event banaya (token se mila admin ka id)
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error. Could not create event.' });
    }
    res.status(201).json({ message: 'Event created successfully!', eventId: result.insertId });
  });
});
// GET SINGLE EVENT (Public - event details page ke liye)
router.get('/events/:id', (req, res) => {
  const eventId = req.params.id;

  const query = `SELECT * FROM events WHERE event_id = ?`;

  db.query(query, [eventId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error. Could not fetch event.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json(results[0]);
  });
});
// GET ALL EVENTS (Public - koi bhi dekh sakta hai)
router.get('/events', (req, res) => {
  const query = `SELECT * FROM events ORDER BY event_date ASC`;

  db.query(query, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error. Could not fetch events.' });
    }
    res.status(200).json(results);
  });
});

// UPDATE EVENT (Admin only)
router.put('/events/:id', verifyToken, verifyAdmin, (req, res) => {
  const eventId = req.params.id;
  const { title, description, category, venue, event_date, price, total_seats, poster_url, status } = req.body;

     const query = `UPDATE events 
                 SET title = ?, description = ?, category = ?, venue = ?, event_date = ?, price = ?,
                     available_seats = available_seats + (? - total_seats),
                     total_seats = ?, poster_url = ?, status = ?
                 WHERE event_id = ?`;

  const values = [title, description, category, venue, event_date, price, total_seats, total_seats, poster_url, status, eventId];

  db.query(query, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Server error. Could not update event.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json({ message: 'Event updated successfully!' });
  });
});
// DELETE EVENT (Admin only)
router.delete('/events/:id', verifyToken, verifyAdmin, (req, res) => {
  const eventId = req.params.id;

  const query = `DELETE FROM events WHERE event_id = ?`;

  db.query(query, [eventId], (err, result) => {
    if (err) {
      console.log(err);
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ message: 'Is event ki bookings hain, isliye delete nahi ho sakta.' });
      }
      return res.status(500).json({ message: 'Server error. Could not delete event.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json({ message: 'Event deleted successfully!' });
  });
});
module.exports = router;