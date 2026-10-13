const nodemailer = require('nodemailer');

// Two ways to send email:
// 1) Brevo API: works on Render free plan because it uses HTTPS
// 2) SMTP with Nodemailer: works on a laptop
const useBrevo = Boolean(process.env.BREVO_API_KEY);
const smtpConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

const transporter = (!useBrevo && smtpConfigured)
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
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

// Splits "NexusCon <a@b.com>" into a name and an email address
function parseSender(from) {
  const match = String(from || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim() || 'NexusCon', email: match[2].trim() };
  }
  return { name: 'NexusCon', email: String(from || '').trim() };
}

// Sends one email through the Brevo HTTPS API
async function sendWithBrevo(to, subject, html) {
  const sender = parseSender(process.env.EMAIL_FROM || process.env.EMAIL_USER);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: sender,
      to: [{ email: to }],
      subject: subject,
      htmlContent: html
    }),
    signal: AbortSignal.timeout(15000)  // do not wait forever
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error('Brevo error ' + response.status + ': ' + details);
  }
}

// Never throws: a failed email must not break register or booking
async function sendMail(to, subject, html) {
  if (!useBrevo && !transporter) {
    console.log('Email skipped: email settings are missing');
    return;
  }
  try {
    if (useBrevo) {
      await sendWithBrevo(to, subject, html);
    } else {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: html
      });
    }
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