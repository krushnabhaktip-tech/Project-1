const API = 'http://localhost:5000/api/events';

// ===== Login check and navbar =====
const token = localStorage.getItem('token');
const userName = localStorage.getItem('userName');
const userRole = localStorage.getItem('userRole');

if (!token) {
  alert('Please log in to book tickets.');
  window.location.href = 'login.html';
} else {
  document.getElementById('loginLink').style.display = 'none';
  document.getElementById('registerLink').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  document.getElementById('userGreeting').textContent = 'Hi, ' + userName;
  if (userRole === 'admin') {
    document.getElementById('adminLink').style.display = 'inline-block';
  }
}

document.getElementById('logoutBtn').addEventListener('click', function () {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  window.location.href = 'login.html';
});

// ===== Helper functions =====
function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showDate(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ===== Show the order summary =====
let currentEvent = null;

function renderCheckout(item) {
  currentEvent = item;
  const box = document.getElementById('bookingContent');

  if (item.status !== 'upcoming' || item.available_seats <= 0) {
    box.innerHTML =
      '<p class="empty">Sorry, bookings are not available for this event.</p>' +
      '<a class="back-link" href="index.html">Browse other events</a>';
    return;
  }

  document.title = 'Checkout - ' + item.title;

  box.innerHTML =
    '<div class="checkout-layout">' +
      '<div class="checkout-box">' +
        '<h2>Order Summary</h2>' +
        '<h3>' + escapeHtml(item.title) + '</h3>' +
        '<p class="checkout-info">Date: ' + showDate(item.event_date) + '</p>' +
        '<p class="checkout-info">Venue: ' + escapeHtml(item.venue) + '</p>' +
        '<p class="checkout-info">Price per ticket: Rs ' + escapeHtml(item.price) + '</p>' +
        '<p class="checkout-info">Seats left: ' + item.available_seats + '</p>' +
      '</div>' +
      '<div class="checkout-box" id="ticketForm"></div>' +
    '</div>';

  renderTicketForm();
}

// ===== Ticket form and live total =====
const VIP_MULTIPLIER = 2;   // VIP costs 2x the normal price (same rule as the server)
const MAX_TICKETS = 10;     // maximum tickets in one booking

function renderTicketForm() {
  const price = Number(currentEvent.price);
  const maxQty = Math.min(MAX_TICKETS, currentEvent.available_seats);

  document.getElementById('ticketForm').innerHTML =
    '<h2>Your Tickets</h2>' +
    '<p class="checkout-info">Booking as: <strong>' + escapeHtml(userName) + '</strong></p>' +
    '<label for="ticketType">Ticket type</label>' +
    '<select id="ticketType">' +
      '<option value="General">General (Rs ' + price.toFixed(2) + ')</option>' +
      '<option value="VIP">VIP (Rs ' + (price * VIP_MULTIPLIER).toFixed(2) + ')</option>' +
    '</select>' +
    '<label for="quantity">Quantity (max ' + maxQty + ')</label>' +
    '<input type="number" id="quantity" value="1" min="1" max="' + maxQty + '">' +
    '<div class="total-row"><span>Total</span><strong id="totalPrice"></strong></div>' +
    '<button id="confirmBtn" class="book-btn">Confirm Booking</button>' +
    '<p id="bookingMessage" class="book-message"></p>';

  document.getElementById('ticketType').addEventListener('change', updateTotal);
  document.getElementById('quantity').addEventListener('input', updateTotal);
  document.getElementById('confirmBtn').addEventListener('click', confirmBooking);
  updateTotal();
}

function updateTotal() {
  const price = Number(currentEvent.price);
  const maxQty = Math.min(MAX_TICKETS, currentEvent.available_seats);
  const type = document.getElementById('ticketType').value;
  const qty = Number(document.getElementById('quantity').value);
  const totalBox = document.getElementById('totalPrice');

  if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) {
    totalBox.textContent = 'Enter 1 to ' + maxQty + ' tickets';
    return;
  }

  const unitPrice = type === 'VIP' ? price * VIP_MULTIPLIER : price;
  totalBox.textContent = 'Rs ' + (unitPrice * qty).toFixed(2);
}

// ===== Load the event from the URL (?id=1) =====
async function loadEvent() {
  const box = document.getElementById('bookingContent');
  const eventId = new URLSearchParams(window.location.search).get('id');

  if (!eventId) {
    box.innerHTML = '<p class="empty">No event selected.</p>';
    return;
  }

  try {
    const response = await fetch(API + '/' + encodeURIComponent(eventId));

    if (response.status === 404) {
      box.innerHTML = '<p class="empty">Event not found.</p>';
      return;
    }
    if (!response.ok) {
      box.innerHTML = '<p class="empty">Something went wrong. Please try again.</p>';
      return;
    }

    renderCheckout(await response.json());
  } catch (error) {
    box.innerHTML =
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}
// ===== Success screen =====
function showSuccess(booking) {
  document.title = 'Booking Confirmed - NexusCon';
  document.getElementById('bookingContent').innerHTML =
    '<div class="checkout-box">' +
      '<h2>Booking Confirmed!</h2>' +
      '<p class="checkout-info">Booking ID: <strong>' + escapeHtml(booking.booking_id) + '</strong></p>' +
      '<p class="checkout-info">Event: ' + escapeHtml(currentEvent.title) + '</p>' +
      '<p class="checkout-info">Ticket type: ' + escapeHtml(booking.ticket_type) + '</p>' +
      '<p class="checkout-info">Quantity: ' + booking.quantity + '</p>' +
      '<p class="checkout-info">Total paid: Rs ' + Number(booking.total_amount).toFixed(2) + '</p>' +
      '<a class="back-link" href="index.html">Browse more events</a>' +
    '</div>';
}
// ===== Confirm booking (calls POST /api/bookings) =====
const BOOKING_API = 'http://localhost:5000/api/bookings';

async function confirmBooking() {
  const btn = document.getElementById('confirmBtn');
  const msg = document.getElementById('bookingMessage');
  const type = document.getElementById('ticketType').value;
  const qty = Number(document.getElementById('quantity').value);
  const maxQty = Math.min(MAX_TICKETS, currentEvent.available_seats);

  if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) {
     showSuccess(data.booking);
         if (window.refreshNotifications) window.refreshNotifications();
    return;
  }

  btn.disabled = true;   // stops double clicks
  msg.style.color = '';
  msg.textContent = 'Booking...';

  try {
    const response = await fetch(BOOKING_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        event_id: currentEvent.event_id,
        ticket_type: type,
        quantity: qty
      })
    });
    const data = await response.json();

    if (response.status === 401) {
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      return;
    }
    if (!response.ok) {
      msg.style.color = '#ff6b6b';
      msg.textContent = data.message;
      btn.disabled = false;
      return;
    }

    msg.style.color = '#4ade80';
    msg.textContent = 'Booked! Booking ID: ' + data.booking.booking_id;
  } catch (error) {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Could not connect to the server.';
    btn.disabled = false;
  }
}

if (token) {
  loadEvent();
}