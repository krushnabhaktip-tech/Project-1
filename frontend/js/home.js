const API = 'http://localhost:5000/api/events';
const SERVER = 'http://localhost:5000';   // NEW
let allEvents = [];

// ===== Navbar: show links based on login status =====
const token = localStorage.getItem('token');
const userName = localStorage.getItem('userName');
const userRole = localStorage.getItem('userRole');

if (token) {
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

// NEW: uploaded images are saved as /uploads/..., so add the server address in front
function posterSrc(url) {
  if (!url) return '';
  return url.startsWith('/uploads/') ? SERVER + url : url;
}

function showDate(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ===== Show events =====
function renderEvents(list) {
  const grid = document.getElementById('eventsGrid');

  if (list.length === 0) {
    grid.innerHTML = '<p class="empty">No events found.</p>';
    return;
  }

  let html = '';
  list.forEach(function (item) {
    const soldOut = item.available_seats <= 0;
    // NEW: posterSrc() is used here
    const poster = item.poster_url
      ? '<img class="poster" src="' + escapeHtml(posterSrc(item.poster_url)) + '" alt="" onerror="this.style.display=\'none\'">'
      : '';

    html +=
      '<div class="event-card">' +
        poster +
        '<div class="event-body">' +
          '<span class="category">' + escapeHtml(item.category || 'Event') + '</span>' +
          '<h3>' + escapeHtml(item.title) + '</h3>' +
          '<p class="info">Venue: ' + escapeHtml(item.venue) + '</p>' +
          '<p class="info">Date: ' + showDate(item.event_date) + '</p>' +
          '<p class="info">Price: Rs ' + escapeHtml(item.price) + '</p>' +
          '<p class="seats ' + (soldOut ? 'soldout' : '') + '">' +
            (soldOut ? 'Sold Out' : item.available_seats + ' seats left') +
          '</p>' +
          '<a class="details-btn" href="event-details.html?id=' + item.event_id + '">View details</a>' +
        '</div>' +
      '</div>';
  });
  grid.innerHTML = html;
}

// ===== Search and category filter =====
function applyFilters() {
  const text = document.getElementById('searchBox').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;

  const filtered = allEvents.filter(function (item) {
    const matchText =
      item.title.toLowerCase().includes(text) ||
      item.venue.toLowerCase().includes(text);
    const matchCategory = category === '' || item.category === category;
    return matchText && matchCategory;
  });

  renderEvents(filtered);
}

function fillCategories() {
  const select = document.getElementById('categoryFilter');
  const categories = [];
  allEvents.forEach(function (item) {
    if (item.category && !categories.includes(item.category)) {
      categories.push(item.category);
    }
  });
  categories.forEach(function (cat) {
    select.innerHTML += '<option value="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</option>';
  });
}

async function loadEvents() {
  try {
    const response = await fetch(API);
    allEvents = await response.json();
    fillCategories();
    renderEvents(allEvents);
  } catch (error) {
    document.getElementById('eventsGrid').innerHTML =
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}

document.getElementById('searchBox').addEventListener('input', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);

loadEvents();