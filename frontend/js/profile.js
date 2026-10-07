// ===== Login check and navbar =====
const token = localStorage.getItem('token');
const userName = localStorage.getItem('userName');
const userRole = localStorage.getItem('userRole');

if (!token) {
  alert('Please log in to see your bookings.');
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
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ===== Load and show my bookings =====
const BOOKINGS_API = 'http://localhost:5000/api/bookings/my';

async function loadBookings() {
  const box = document.getElementById('profileContent');

  try {
    const response = await fetch(BOOKINGS_API, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (response.status === 401) {
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      return;
    }
    if (!response.ok) {
      box.innerHTML = '<p class="empty">Something went wrong. Please try again.</p>';
      return;
    }

    const bookings = await response.json();

    if (bookings.length === 0) {
      box.innerHTML =
        '<p class="empty">You have no bookings yet.</p>' +
        '<a class="back-link" href="index.html">Browse events</a>';
      return;
    }

    let rows = '';
    bookings.forEach(function (b) {
      const action = b.status === 'confirmed'
        ? '<button class="cancel-btn" data-id="' + escapeHtml(b.booking_id) + '">Cancel</button>'
        : '-';

      rows +=
        '<tr>' +
          '<td>' + escapeHtml(b.title) + '<br><small>' + escapeHtml(b.venue) + '</small></td>' +
          '<td>' + showDate(b.event_date) + '</td>' +
          '<td>' + escapeHtml(b.ticket_type) + '</td>' +
          '<td>' + b.quantity + '</td>' +
          '<td>Rs ' + Number(b.total_amount).toFixed(2) + '</td>' +
          '<td>' + escapeHtml(b.status) + '</td>' +
          '<td>' + showDate(b.booked_at) + '</td>' +
          '<td>' + action + '</td>' +
        '</tr>';
    });

    box.innerHTML =
      '<table class="bookings-table">' +
        '<thead><tr>' +
          '<th>Event</th><th>Event date</th><th>Ticket</th><th>Qty</th>' +
          '<th>Total</th><th>Status</th><th>Booked on</th><th>Action</th>'+
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
  } catch (error) {
    box.innerHTML =
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}
// ===== Cancel a booking =====
document.getElementById('profileContent').addEventListener('click', async function (e) {
  if (!e.target.classList.contains('cancel-btn')) return;

  const bookingId = e.target.getAttribute('data-id');
  if (!confirm('Are you sure you want to cancel this booking?')) return;

  e.target.disabled = true;   // stops double clicks

  try {
    const response = await fetch('http://localhost:5000/api/bookings/' + encodeURIComponent(bookingId) + '/cancel', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await response.json();

    if (response.status === 401) {
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      return;
    }

    alert(data.message);
    loadBookings();   // reload the table so the new status shows
  } catch (error) {
    alert('Could not connect to the server.');
    e.target.disabled = false;
  }
});

if (token) {
  loadBookings();
}