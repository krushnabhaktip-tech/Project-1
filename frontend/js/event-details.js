const API = 'http://localhost:5000/api/events';
const container = document.getElementById('eventContainer');

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

function showDate(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function showMessage(text) {
  container.innerHTML = '<p class="state-msg">' + escapeHtml(text) + '</p>';
}

// ===== Show one event =====
function renderEvent(ev) {
  const soldOut = ev.available_seats <= 0;
  const closed = ev.status === 'closed';
  const canBook = !soldOut && !closed;

  let buttonText = 'Book Now';
  if (soldOut) buttonText = 'Sold Out';
  else if (closed) buttonText = 'Booking Closed';

  const poster = ev.poster_url
    ? '<img class="detail-poster" src="' + escapeHtml(ev.poster_url) + '" alt="" onerror="this.style.display=\'none\'">'
    : '';

  container.innerHTML =
    '<article class="event-detail">' +
      poster +
      '<div class="detail-info">' +
        '<span class="badge">' + escapeHtml(ev.category || 'Event') + '</span>' +
        '<h1>' + escapeHtml(ev.title) + '</h1>' +
        '<p class="description">' + escapeHtml(ev.description || 'No description available.') + '</p>' +
        '<ul class="meta">' +
          '<li><strong>Venue:</strong> ' + escapeHtml(ev.venue) + '</li>' +
          '<li><strong>Date &amp; Time:</strong> ' + escapeHtml(showDate(ev.event_date)) + '</li>' +
          '<li><strong>Price:</strong> Rs ' + escapeHtml(ev.price) + '</li>' +
          '<li><strong>Seats:</strong> ' +
            (soldOut ? '<span class="sold-out-text">Sold Out</span>'
                     : escapeHtml(ev.available_seats) + ' of ' + escapeHtml(ev.total_seats) + ' left') +
          '</li>' +
        '</ul>' +
        '<button id="bookBtn" class="book-btn"' + (canBook ? '' : ' disabled') + '>' + buttonText + '</button>' +
      '</div>' +
    '</article>';

  if (canBook) {
    document.getElementById('bookBtn').addEventListener('click', function () {
      alert('Booking will be available soon.'); // real booking comes after Day 11
    });
  }
}

// ===== Load the event from the server =====
async function loadEvent() {
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    showMessage('Event not found.');
    return;
  }

  try {
    const response = await fetch(API + '/' + encodeURIComponent(id));

    if (response.status === 404) {
      showMessage('Event not found.');
      return;
    }
    if (!response.ok) {
      showMessage('Something went wrong. Please try again.');
      return;
    }

    const ev = await response.json();
    document.title = ev.title + ' - NexusCon';
    renderEvent(ev);
  } catch (error) {
    showMessage('Could not connect to the server. Is the backend running? (npm run dev)');
  }
}

loadEvent();