// ===== Notification bell (works on any page that has .nav-links) =====
(function () {
  const token = localStorage.getItem('token');
  const nav = document.querySelector('.nav-links');
  if (!token || !nav) return;

  const API = 'http://localhost:5000/api/notifications';
  const headers = { 'Authorization': 'Bearer ' + token };

  // Build the bell and the dropdown
  const wrap = document.createElement('div');
  wrap.className = 'notif-wrap';
  wrap.innerHTML =
    '<button type="button" class="notif-bell" aria-label="Notifications">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>' +
        '<path d="M13.7 21a2 2 0 0 1-3.4 0"/>' +
      '</svg>' +
      '<span class="notif-badge" style="display:none">0</span>' +
    '</button>' +
    '<div class="notif-panel" style="display:none">' +
      '<div class="notif-head">' +
        '<strong>Notifications</strong>' +
        '<button type="button" class="notif-markall">Mark all as read</button>' +
      '</div>' +
      '<div class="notif-list"></div>' +
    '</div>';

  const greeting = document.getElementById('userGreeting');
  if (greeting && greeting.parentNode === nav) {
    nav.insertBefore(wrap, greeting);
  } else {
    nav.appendChild(wrap);
  }

  const badge = wrap.querySelector('.notif-badge');
  const panel = wrap.querySelector('.notif-panel');
  const list = wrap.querySelector('.notif-list');

  function timeText(dateString) {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function render(data) {
    badge.textContent = data.unread > 9 ? '9+' : data.unread;
    badge.style.display = data.unread > 0 ? 'inline-block' : 'none';
    list.innerHTML = '';

    if (data.notifications.length === 0) {
      list.innerHTML = '<p class="notif-empty">No notifications yet.</p>';
      return;
    }

    data.notifications.forEach(function (n) {
      const item = document.createElement('div');
      item.className = 'notif-item' + (n.is_read ? '' : ' unread');

      const msg = document.createElement('p');
      msg.textContent = n.message;
      const time = document.createElement('small');
      time.textContent = timeText(n.created_at);

      item.appendChild(msg);
      item.appendChild(time);
      item.addEventListener('click', function () { markRead(n.notify_id); });
      list.appendChild(item);
    });
  }

  async function load() {
    try {
      const response = await fetch(API, { headers: headers });
      if (!response.ok) return;
      render(await response.json());
    } catch (error) {
      // server may be off, ignore
    }
  }

  async function markRead(id) {
    try {
      await fetch(API + '/' + id + '/read', { method: 'PUT', headers: headers });
      load();
    } catch (error) { /* ignore */ }
  }

  wrap.querySelector('.notif-markall').addEventListener('click', async function () {
    try {
      await fetch(API + '/read-all', { method: 'PUT', headers: headers });
      load();
    } catch (error) { /* ignore */ }
  });

  wrap.querySelector('.notif-bell').addEventListener('click', function (e) {
    e.stopPropagation();
    const open = panel.style.display === 'none';
    panel.style.display = open ? 'block' : 'none';
    if (open) load();
  });

  // Close the dropdown when clicking anywhere else
  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) panel.style.display = 'none';
  });

  window.refreshNotifications = load;   // other scripts can call this after a booking
  load();
  setInterval(load, 30000);             // refresh every 30 seconds
})();