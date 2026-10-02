// ===== 1. Saved data aur admin guard =====
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('userRole');
const userName = localStorage.getItem('userName');

if (!token || userRole !== 'admin') {
  alert('Access denied. Sirf admin is page ko dekh sakta hai.');
  window.location.href = 'login.html';
}

document.getElementById('adminName').textContent = userName;

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  window.location.href = 'login.html';
}
document.getElementById('logoutBtn').addEventListener('click', logout);

// ===== 2. Variables =====
const API = 'http://localhost:5000/api/events';
let allEvents = [];
let editingId = null;

// ===== 3. Helper functions =====
function showMessage(text, isError) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = isError ? 'message error' : 'message success';
}

// Special characters (<, >, &) ko safe text bana deta hai
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

// Server ki UTC date ko form ke liye local time (YYYY-MM-DDTHH:mm) mein badalta hai
function toInputDate(dateString) {
  const d = new Date(dateString);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

// List mein dikhane ke liye padhne layak local date-time
function showDate(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Token expire ya galat ho to logout karwa do
function checkAuthError(response) {
  if (response.status === 401 || response.status === 403) {
    alert('Session khatam ho gaya. Dobara login karo.');
    logout();
    return true;
  }
  return false;
}

function resetForm() {
  document.getElementById('eventForm').reset();
  document.getElementById('status').value = 'upcoming';
  document.getElementById('formTitle').textContent = 'Naya Event Banao';
  document.getElementById('saveBtn').textContent = 'Event Banao';
  editingId = null;
  renderEvents();
}

// ===== 4. Events ki list =====
function renderEvents() {
  const list = document.getElementById('eventsList');
  document.getElementById('eventCount').textContent = allEvents.length;

  if (allEvents.length === 0) {
    list.innerHTML = '<p class="empty">Abhi koi event nahi hai. Right side ke form se pehla event banao.</p>';
    return;
  }

  let html = '';
  allEvents.forEach(function (item) {
    const editingClass = item.event_id === editingId ? ' editing' : '';
    html +=
      '<div class="event-card' + editingClass + '">' +
        '<div class="event-top">' +
          '<h3>' + escapeHtml(item.title) + '</h3>' +
          '<span class="badge">' + escapeHtml(item.status) + '</span>' +
        '</div>' +
        '<p class="event-info">Venue: ' + escapeHtml(item.venue) + '</p>' +
        '<p class="event-info">Date: ' + showDate(item.event_date) + '</p>' +
        '<p class="event-info">Price: Rs ' + escapeHtml(item.price) +
          ' | Seats: ' + item.available_seats + '/' + item.total_seats + '</p>' +
        '<div class="event-actions">' +
          '<button class="btn btn-edit" onclick="editEvent(' + item.event_id + ')">Edit</button>' +
          '<button class="btn btn-delete" onclick="deleteEvent(' + item.event_id + ')">Delete</button>' +
        '</div>' +
      '</div>';
  });
  list.innerHTML = html;
}

async function loadEvents() {
  try {
    const response = await fetch(API);
    allEvents = await response.json();
    renderEvents();
  } catch (error) {
    document.getElementById('eventsList').innerHTML =
      '<p class="empty">Server se connect nahi ho paya. Backend chalu hai? (npm run dev)</p>';
  }
}

// ===== 5. Create aur Update (ek hi form) =====
document.getElementById('eventForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const data = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    category: document.getElementById('category').value,
    venue: document.getElementById('venue').value,
    event_date: document.getElementById('event_date').value.replace('T', ' '),
    price: document.getElementById('price').value || 0,
    total_seats: document.getElementById('total_seats').value,
    poster_url: document.getElementById('poster_url').value,
    status: document.getElementById('status').value
  };

  const url = editingId ? API + '/' + editingId : API;
  const method = editingId ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(data)
    });

    if (checkAuthError(response)) return;

    const result = await response.json();
    showMessage(result.message, !response.ok);

    if (response.ok) {
      resetForm();
      loadEvents();
    }
  } catch (error) {
    showMessage('Server se connect nahi ho paya.', true);
  }
});

// ===== 6. Edit =====
function editEvent(id) {
  const item = allEvents.find(function (ev) { return ev.event_id === id; });

  document.getElementById('title').value = item.title;
  document.getElementById('description').value = item.description || '';
  document.getElementById('category').value = item.category || '';
  document.getElementById('venue').value = item.venue;
  document.getElementById('event_date').value = toInputDate(item.event_date);
  document.getElementById('price').value = item.price;
  document.getElementById('total_seats').value = item.total_seats;
  document.getElementById('poster_url').value = item.poster_url || '';
  document.getElementById('status').value = item.status;

  editingId = id;
  document.getElementById('formTitle').textContent = 'Event Edit Karo (ID: ' + id + ')';
  document.getElementById('saveBtn').textContent = 'Changes Save Karo';
  document.getElementById('message').textContent = '';
  renderEvents();
  document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
}

// ===== 7. Delete =====
async function deleteEvent(id) {
  if (!confirm('Pakka delete karna hai? Yeh wapas nahi aayega.')) return;

  try {
    const response = await fetch(API + '/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (checkAuthError(response)) return;

    const result = await response.json();
    showMessage(result.message, !response.ok);

    if (response.ok) {
      if (editingId === id) resetForm();
      loadEvents();
    }
  } catch (error) {
    showMessage('Server se connect nahi ho paya.', true);
  }
}

// ===== 8. Cancel button aur page start =====
document.getElementById('cancelBtn').addEventListener('click', function () {
  resetForm();
  document.getElementById('message').textContent = '';
});

loadEvents();