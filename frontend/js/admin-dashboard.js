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

function money(value) {
  return 'Rs ' + Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

// Makes "2026-10-08" from a date (using local time, not UTC)
function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + m + '-' + d;
}

// ===== KPI cards =====
function kpiCard(label, value) {
  return '<div class="kpi-card">' +
           '<span class="kpi-label">' + label + '</span>' +
           '<strong class="kpi-value">' + value + '</strong>' +
         '</div>';
}

function showKpis(stats) {
  document.getElementById('kpiGrid').innerHTML =
    kpiCard('Total Events ', stats.total_events) +
    kpiCard('Confirmed Bookings ', stats.total_bookings) +
    kpiCard('Tickets Sold ', stats.tickets_sold) +
    kpiCard('Revenue ', money(stats.revenue)) +
    kpiCard('Cancelled ', stats.cancelled_bookings);
     
}

// ===== Sales chart (last 7 days) =====
function drawChart(sales) {
  if (typeof Chart === 'undefined') {
    document.querySelector('.chart-wrap').innerHTML =
      '<p class="empty">Chart library could not load. Check your internet connection.</p>';
    return;
  }

  // Build the last 7 days, using 0 for days with no sales
  const revenueByDay = {};
  sales.forEach(function (s) { revenueByDay[s.day] = s.revenue; });

  const labels = [];
  const values = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
    values.push(revenueByDay[dayKey(date)] || 0);
  }

  Chart.defaults.color = '#a8a3d1';
  new Chart(document.getElementById('salesChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (Rs)',
        data: values,
        backgroundColor: '#8b5cf6',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#2d2950' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ===== Recent transactions =====
function showRecent(recent) {
  const box = document.getElementById('recentTable');

  if (recent.length === 0) {
    box.innerHTML = '<p class="empty">No transactions yet.</p>';
    return;
  }

  let rows = '';
  recent.forEach(function (b) {
    rows +=
      '<tr>' +
        '<td>' + escapeHtml(b.user_name) + '</td>' +
        '<td>' + escapeHtml(b.event_title) + '</td>' +
        '<td>' + money(b.total_amount) + '</td>' +
        '<td><span class="status-badge status-' + escapeHtml(b.status) + '">' + escapeHtml(b.status) + '</span></td>' +
        '<td>' + showDate(b.booked_at) + '</td>' +
      '</tr>';
  });

  box.innerHTML =
    '<table class="bookings-table">' +
      '<thead><tr><th>User</th><th>Event</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

// ===== Load everything =====
async function loadDashboard() {
  try {
    const response = await fetch('http://localhost:5000/api/admin/stats', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (response.status === 401 || response.status === 403) {
      alert('Session expired or not allowed. Please log in again.');
      window.location.href = 'login.html';
      return;
    }
    if (!response.ok) {
      document.getElementById('kpiGrid').innerHTML = '<p class="empty">Something went wrong. Please try again.</p>';
      return;
    }

    const stats = await response.json();
    showKpis(stats);
    drawChart(stats.sales);
    showRecent(stats.recent);
  } catch (error) {
    document.getElementById('kpiGrid').innerHTML =
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}

loadDashboard();