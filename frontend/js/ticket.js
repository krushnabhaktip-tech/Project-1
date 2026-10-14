// ===== Login check and navbar =====
const token = localStorage.getItem('token');
const userName = localStorage.getItem('userName');
const userRole = localStorage.getItem('userRole');

if (!token) {
  alert('Please log in to see your ticket.');
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

// ===== Load and show the ticket =====
async function loadTicket() {
  const box = document.getElementById('ticketBox');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    box.innerHTML = '<p class="empty">No ticket selected.</p>';
    return;
  }

  try {
    const response = await fetch('/api/bookings/' + encodeURIComponent(id) + '/ticket', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (response.status === 401) {
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      box.innerHTML = '<p class="empty">' + escapeHtml(data.message) + '</p>';
      return;
    }

    box.innerHTML =
      '<div class="ticket-card">' +
        '<div class="ticket-main">' +
          '<p class="ticket-brand">NexusCon</p>' +
          '<h2>' + escapeHtml(data.title) + '</h2>' +
          '<p><strong>Date:</strong> ' + showDate(data.event_date) + '</p>' +
          '<p><strong>Venue:</strong> ' + escapeHtml(data.venue) + '</p>' +
          '<p><strong>Ticket holder:</strong> ' + escapeHtml(data.holder) + '</p>' +
          '<p><strong>Ticket:</strong> ' + escapeHtml(data.ticket_type) + ' x ' + data.quantity + '</p>' +
          '<p><strong>Total paid:</strong> Rs ' + Number(data.total_amount).toFixed(2) + '</p>' +
          '<p class="ticket-id"><strong>Booking ID:</strong> ' + escapeHtml(data.booking_id) + '</p>' +
        '</div>' +
        '<div class="ticket-qr">' +
          '<img src="' + escapeHtml(data.qr) + '" alt="Ticket QR code">' +
          '<small>Scan at the entry gate</small>' +
        '</div>' +
      '</div>';

    document.getElementById('downloadBtn').style.display = 'inline-block';
  } catch (error) {
    box.innerHTML = '<p class="empty">Could not connect to the server.</p>';
  }
}

// The browser print window opens: choose "Save as PDF" as the destination
document.getElementById('downloadBtn').addEventListener('click', function () {
  window.print();
});

if (token) {
  loadTicket();
}