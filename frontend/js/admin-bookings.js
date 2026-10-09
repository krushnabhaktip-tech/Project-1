// ===== Admin check and navbar =====
const token = localStorage.getItem('token');
const userName = localStorage.getItem('userName');
const userRole = localStorage.getItem('userRole');

if (!token || userRole !== 'admin') {
  alert('Admin access only.');
  window.location.href = 'index.html';
} else {
  document.getElementById('loginLink').style.display = 'none';
  document.getElementById('registerLink').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  document.getElementById('userGreeting').textContent = 'Hi, ' + userName;
  document.getElementById('adminLink').style.display = 'inline-block';
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

// ===== Load bookings (with search and filter) =====
const ADMIN_API = 'http://localhost:5000/api/admin/bookings';
let currentRows = [];   // the rows currently on screen (used for CSV)

async function loadBookings() {
  const box = document.getElementById('bookingsTable');
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput').value.trim();
  const status = document.getElementById('statusFilter').value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const response = await fetch(ADMIN_API + '?' + params.toString(), {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (response.status === 401 || response.status === 403) {
      alert('Session expired or not allowed. Please log in again.');
      window.location.href = 'login.html';
      return;
    }
    if (!response.ok) {
      box.innerHTML = '<p class="empty">Something went wrong. Please try again.</p>';
      return;
    }

    currentRows = await response.json();

    if (currentRows.length === 0) {
      box.innerHTML = '<p class="empty">No bookings found.</p>';
      return;
    }

    let rows = '';
    currentRows.forEach(function (b) {
      rows +=
        '<tr>' +
          '<td><small>' + escapeHtml(b.booking_id) + '</small></td>' +
          '<td>' + escapeHtml(b.user_name) + '<br><small>' + escapeHtml(b.user_email) + '</small></td>' +
          '<td>' + escapeHtml(b.event_title) + '</td>' +
          '<td>' + escapeHtml(b.ticket_type) + '</td>' +
          '<td>' + b.quantity + '</td>' +
          '<td>Rs ' + Number(b.total_amount).toFixed(2) + '</td>' +
          '<td><span class="status-badge status-' + escapeHtml(b.status) + '">' + escapeHtml(b.status) + '</span></td>' +
          '<td>' + showDate(b.booked_at) + '</td>' +
        '</tr>';
    });

    box.innerHTML =
      '<table class="bookings-table">' +
        '<thead><tr>' +
          '<th>Booking ID</th><th>User</th><th>Event</th><th>Ticket</th>' +
          '<th>Qty</th><th>Total</th><th>Status</th><th>Booked on</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
  } catch (error) {
    box.innerHTML =
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}

// ===== Search (waits 300ms after typing) and filter =====
let searchTimer;
document.getElementById('searchInput').addEventListener('input', function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadBookings, 300);
});
document.getElementById('statusFilter').addEventListener('change', loadBookings);

// ===== Export CSV =====
function csvCell(value) {
  let text = String(value == null ? '' : value);
  if (/^[=+\-@]/.test(text)) text = "'" + text;   // stops Excel from running text as a formula
  return '"' + text.replace(/"/g, '""') + '"';
}

document.getElementById('exportBtn').addEventListener('click', function () {
  if (currentRows.length === 0) {
    alert('No bookings to export.');
    return;
  }

  const lines = [['Booking ID', 'User', 'Email', 'Event', 'Ticket', 'Qty', 'Total', 'Status', 'Booked on']
    .map(csvCell).join(',')];

  currentRows.forEach(function (b) {
    lines.push([
      b.booking_id, b.user_name, b.user_email, b.event_title, b.ticket_type,
      b.quantity, Number(b.total_amount).toFixed(2), b.status, showDate(b.booked_at)
    ].map(csvCell).join(','));
  });

  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'bookings.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

loadBookings();