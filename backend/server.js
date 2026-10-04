const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
 

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api', eventRoutes);
app.use('/api', bookingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'NexusCon server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

 