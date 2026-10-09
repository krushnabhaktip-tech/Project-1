// ===== 1. Saved login data and admin guard =====
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('userRole');
const userName = localStorage.getItem('userName');

if (!token || userRole !== 'admin') {
  alert('Access denied. Only an admin can view this page.');
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
const SERVER = 'http://localhost:5000';   // NEW
let allEvents = [];
let editingId = null;

// ===== 3. Helper functions =====
function showMessage(text, isError) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = isError ? 'message error' : 'message success';
}

// Converts special characters (<, >, &) into safe text
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

// Converts the server's UTC date into local time (YYYY-MM-DDTHH:mm) for the form
function toInputDate(dateString) {
  const d = new Date(dateString);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

// Readable local date and time for the list
function showDate(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// If the token is expired or invalid, log the user out
function checkAuthError(response) {
  if (response.status === 401 || response.status === 403) {
    alert('Your session has expired. Please log in again.');
    logout();
    return true;
  }
  return false;
}

// NEW: uploaded images are saved as /uploads/..., so add the server address in front
function posterSrc(url) {
  if (!url) return '';
  return url.startsWith('/uploads/') ? SERVER + url : url;
}

// NEW: shows or hides the small image preview under the file input
function showPreview(src) {
  const img = document.getElementById('posterPreview');
  if (src) {
    img.src = src;
    img.style.display = 'block';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
}

function resetForm() {
  document.getElementById('eventForm').reset();
  document.getElementById('status').value = 'upcoming';
  document.getElementById('formTitle').textContent = 'Create New Event';
  document.getElementById('saveBtn').textContent = 'Create Event';
  showPreview('');   // NEW
  editingId = null;
  renderEvents();
}

// ===== 4. Events list =====
function renderEvents() {
  const list = document.getElementById('eventsList');
  document.getElementById('eventCount').textContent = allEvents.length;

  if (allEvents.length === 0) {
    list.innerHTML = '<p class="empty">There are no events yet. Create your first event using the form on the right.</p>';
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
      '<p class="empty">Could not connect to the server. Is the backend running? (npm run dev)</p>';
  }
}

// ===== 5. Create and Update (same form) =====
// NEW: checks the chosen image and shows a preview
document.getElementById('posterFile').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) {
    showPreview(posterSrc(document.getElementById('poster_url').value));
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showMessage('Only JPG, PNG or WEBP images are allowed.', true);
    this.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showMessage('Image must be 2 MB or smaller.', true);
    this.value = '';
    return;
  }
  showPreview(URL.createObjectURL(file));
});

document.getElementById('eventForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  // NEW: FormData is used instead of JSON because the form can contain an image file
  const data = new FormData();
  data.append('title', document.getElementById('title').value);
  data.append('description', document.getElementById('description').value);
  data.append('category', document.getElementById('category').value);
  data.append('venue', document.getElementById('venue').value);
  data.append('event_date', document.getElementById('event_date').value.replace('T', ' '));
  data.append('price', document.getElementById('price').value || 0);
  data.append('total_seats', document.getElementById('total_seats').value);
  data.append('poster_url', document.getElementById('poster_url').value);
  data.append('status', document.getElementById('status').value);

  const file = document.getElementById('posterFile').files[0];
  if (file) data.append('poster', file);   // the name must be "poster"

  const url = editingId ? API + '/' + editingId : API;
  const method = editingId ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Authorization': 'Bearer ' + token },   // no Content-Type: the browser sets it
      body: data
    });

    if (checkAuthError(response)) return;

    const result = await response.json();
    showMessage(result.message, !response.ok);

    if (response.ok) {
      resetForm();
      loadEvents();
    }
  } catch (error) {
    showMessage('Could not connect to the server.', true);
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
  document.getElementById('posterFile').value = '';          // NEW
  showPreview(posterSrc(item.poster_url));                   // NEW
  document.getElementById('status').value = item.status;

  editingId = id;
  document.getElementById('formTitle').textContent = 'Edit Event (ID: ' + id + ')';
  document.getElementById('saveBtn').textContent = 'Save Changes';
  document.getElementById('message').textContent = '';
  renderEvents();
  document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
}

// ===== 7. Delete =====
async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;

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
    showMessage('Could not connect to the server.', true);
  }
}

// ===== 8. Cancel button and page start =====
document.getElementById('cancelBtn').addEventListener('click', function () {
  resetForm();
  document.getElementById('message').textContent = '';
});

loadEvents();