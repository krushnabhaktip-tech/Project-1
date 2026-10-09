const API = 'http://localhost:5000/api/events';
const SERVER = 'http://localhost:5000';   // NEW

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
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ===== Show one event =====
function renderEvent(item) {
  document.title = item.title + ' - NexusCon';

  const soldOut = item.available_seats <= 0;
  const isOpen = item.status === 'upcoming';

  let buttonText = 'Book Now';
  if (soldOut) {
    buttonText = 'Sold Out';
  } else if (!isOpen) {
    buttonText = 'Booking Closed';
  }

  // NEW: posterSrc() is used here
  const poster = item.poster_url
    ? '<img class="details-poster" src="' + escapeHtml(posterSrc(item.poster_url)) + '" alt="" onerror="this.style.display=\'none\'">'
    : '';

  document.getElementById('eventDetails').innerHTML =
    '<div class="details-card">' +
      poster +
      '<div class="details-body">' +
        '<div class="details-tags">' +
          '<span class="category">' + escapeHtml(item.category || 'Event') + '</span>' +
          '<span class="status-tag">' + escapeHtml(item.status) + '</span>' +
        '</div>' +
        '<h1>' + escapeHtml(item.title) + '</h1>' +
        '<ul class="details-list">' +
          '<li><strong>Date:</strong> ' + showDate(item.event_date) + '</li>' +
          '<li><strong>Venue:</strong> ' + escapeHtml(item.venue) + '</li>' +
          '<li><strong>Price:</strong> Rs ' + escapeHtml(item.price) + '</li>' +
          '<li><strong>Seats:</strong> ' +
            (soldOut ? 'Sold Out' : item.available_seats + ' of ' + item.total_seats + ' seats left') +
          '</li>' +
        '</ul>' +
        '<h3>About this event</h3>' +
        '<p class="description">' + escapeHtml(item.description || 'No description available.') + '</p>' +
        '<button id="bookBtn" class="book-btn"' + (soldOut || !isOpen ? ' disabled' : '') + '>' + buttonText + '</button>' +
        '<p id="bookMessage" class="book-message"></p>' +
      '</div>' +
    '</div>';

  document.getElementById('bookBtn').addEventListener('click', function () {
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
    window.location.href = 'booking.html?id=' + item.event_id;
  });
}

// ===== Load the event whose id is in the URL (?id=1) =====
async function loadEvent() {
  const box = document.getElementById('eventDetails');
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

    const item = await response.json();
    renderEvent(item);
  } catch (error) {
    box.innerHTML =
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}

loadEvent();