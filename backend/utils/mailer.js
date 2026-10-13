const nodemailer = require('nodemailer');

// Email works only when the settings exist in .env
const configured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,   // do not wait forever if the port is blocked
      greetingTimeout: 10000,
      socketTimeout: 15000
    })
  : null;

// Makes user text safe to put inside HTML
function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Never throws: a failed email must not break register or booking
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log('Email skipped: email settings are missing in .env');
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html
    });
    console.log('Email sent to ' + to);
  } catch (err) {
    console.log('Email failed:', err.message);
  }
}

function sendWelcomeEmail(name, email) {
  const html =
    '<h2>Welcome to NexusCon, ' + esc(name) + '!</h2>' +
    '<p>Your account is ready. Browse anime conventions and esports tournaments and book your seat.</p>' +
    '<p>See you at the event!</p>';
  return sendMail(email, 'Welcome to NexusCon', html);
}

function sendBookingReceipt(d) {
  const when = new Date(d.date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const html =
    '<h2>Booking confirmed</h2>' +
    '<p>Hi ' + esc(d.name) + ', your booking is confirmed.</p>' +
    '<table cellpadding="6" style="border-collapse:collapse">' +
      '<tr><td><b>Booking ID</b></td><td>' + esc(d.bookingId) + '</td></tr>' +
      '<tr><td><b>Event</b></td><td>' + esc(d.eventTitle) + '</td></tr>' +
      '<tr><td><b>Venue</b></td><td>' + esc(d.venue) + '</td></tr>' +
      '<tr><td><b>Date</b></td><td>' + esc(when) + '</td></tr>' +
      '<tr><td><b>Ticket</b></td><td>' + esc(d.ticketType) + ' x ' + esc(d.quantity) + '</td></tr>' +
      '<tr><td><b>Total</b></td><td>Rs ' + Number(d.total).toFixed(2) + '</td></tr>' +
    '</table>' +
    '<p>Thank you for booking with NexusCon.</p>';
  return sendMail(d.to, 'Your NexusCon booking receipt', html);
}

module.exports = { sendWelcomeEmail, sendBookingReceipt };