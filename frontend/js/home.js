const API = '/api/events';
const SERVER = '';
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

// Uploaded images are saved as /uploads/..., so add the server address in front
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

// ===== Search, filters, sort and pagination =====
const PAGE_SIZE = 8;     // events shown on one page
let currentPage = 1;

// Makes "YYYY-MM-DD" from a date (in local time) so it can be compared with the date inputs
function dayKey(dateString) {
  const d = new Date(dateString);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function applyFilters() {
  const text = document.getElementById('searchBox').value.toLowerCase().trim();
  const category = document.getElementById('categoryFilter').value;
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;
  const minPrice = document.getElementById('minPrice').value;
  const maxPrice = document.getElementById('maxPrice').value;
  const sort = document.getElementById('sortSelect').value;

  const filtered = allEvents.filter(function (item) {
    const key = dayKey(item.event_date);
    const price = Number(item.price);
    return (item.title.toLowerCase().includes(text) || item.venue.toLowerCase().includes(text)) &&
           (category === '' || item.category === category) &&
           (dateFrom === '' || key >= dateFrom) &&
           (dateTo === '' || key <= dateTo) &&
           (minPrice === '' || price >= Number(minPrice)) &&
           (maxPrice === '' || price <= Number(maxPrice));
  });

  if (sort === 'price-low') {
    filtered.sort(function (a, b) { return Number(a.price) - Number(b.price); });
  } else if (sort === 'price-high') {
    filtered.sort(function (a, b) { return Number(b.price) - Number(a.price); });
  }   // "date" keeps the order from the server (soonest first)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;

  renderEvents(filtered.slice(start, start + PAGE_SIZE));
  renderPagination(filtered.length, totalPages, start);
}

function renderPagination(total, totalPages, start) {
  const box = document.getElementById('pagination');
  if (total === 0) {
    box.innerHTML = '';
    return;
  }

  const to = Math.min(start + PAGE_SIZE, total);
  let html = '<p class="page-info">Showing ' + (start + 1) + '-' + to + ' of ' + total + ' events</p>';

  if (totalPages > 1) {
    html += '<div class="page-buttons">';
    html += '<button type="button" class="page-btn" data-page="' + (currentPage - 1) + '"' +
            (currentPage === 1 ? ' disabled' : '') + '>Prev</button>';
    for (let p = 1; p <= totalPages; p++) {
      html += '<button type="button" class="page-btn' + (p === currentPage ? ' active' : '') +
              '" data-page="' + p + '">' + p + '</button>';
    }
    html += '<button type="button" class="page-btn" data-page="' + (currentPage + 1) + '"' +
            (currentPage === totalPages ? ' disabled' : '') + '>Next</button>';
    html += '</div>';
  }
  box.innerHTML = html;
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
    applyFilters();   // CHANGED: was renderEvents(allEvents)
  } catch (error) {
    document.getElementById('eventsGrid').innerHTML =
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}

// CHANGED: new listeners for all filters, the Clear button and the page buttons
// Any filter change goes back to page 1
function onFilterChange() {
  currentPage = 1;
  applyFilters();
}

['searchBox', 'dateFrom', 'dateTo', 'minPrice', 'maxPrice'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', onFilterChange);
});
['categoryFilter', 'sortSelect'].forEach(function (id) {
  document.getElementById(id).addEventListener('change', onFilterChange);
});

document.getElementById('clearFilters').addEventListener('click', function () {
  ['searchBox', 'dateFrom', 'dateTo', 'minPrice', 'maxPrice'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('categoryFilter').value = '';
  document.getElementById('sortSelect').value = 'date';
  onFilterChange();
});

// Page buttons (one listener for all buttons)
document.getElementById('pagination').addEventListener('click', function (e) {
  const btn = e.target.closest('.page-btn');
  if (!btn || btn.disabled) return;
  currentPage = Number(btn.getAttribute('data-page'));
  applyFilters();
  document.getElementById('eventsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

loadEvents();