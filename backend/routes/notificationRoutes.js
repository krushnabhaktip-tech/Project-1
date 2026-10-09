const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// GET MY NOTIFICATIONS (latest 20 and the unread count)
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const pool = db.promise();
    const [items] = await pool.query(
      `SELECT notify_id, message, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC, notify_id DESC LIMIT 20`,
      [req.user.user_id]
    );
    const [[count]] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.user_id]
    );
    res.status(200).json({ unread: count.unread, notifications: items });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error. Could not load notifications.' });
  }
});

// MARK ALL AS READ
router.put('/notifications/read-all', verifyToken, async (req, res) => {
  try {
    await db.promise().query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.user_id]
    );
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error. Could not update notifications.' });
  }
});

// MARK ONE AS READ (only your own)
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid notification id.' });
  }

  try {
    await db.promise().query(
      'UPDATE notifications SET is_read = 1 WHERE notify_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );
    res.status(200).json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error. Could not update notification.' });
  }
});

module.exports = router;