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

async function verifyTicket() {
  const box = document.getElementById('verifyBox');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    box.innerHTML = '<div class="verify-card invalid"><h2>Invalid ticket</h2><p>No ticket ID was found.</p></div>';
    return;
  }

  try {
    const response = await fetch('/api/verify/' + encodeURIComponent(id));

    if (response.status === 404) {
      box.innerHTML = '<div class="verify-card invalid"><h2>Invalid ticket</h2><p>No booking was found for this QR code.</p></div>';
      return;
    }
    if (!response.ok) {
      box.innerHTML = '<p class="empty">Something went wrong. Please try again.</p>';
      return;
    }

    const t = await response.json();

    if (!t.valid) {
      box.innerHTML =
        '<div class="verify-card invalid"><h2>Ticket cancelled</h2>' +
        '<p>This booking was cancelled, so the ticket is not valid.</p></div>';
      return;
    }

    box.innerHTML =
      '<div class="verify-card valid">' +
        '<h2>&#10003; Valid ticket</h2>' +
        '<p><strong>Event:</strong> ' + escapeHtml(t.title) + '</p>' +
        '<p><strong>Date:</strong> ' + showDate(t.event_date) + '</p>' +
        '<p><strong>Venue:</strong> ' + escapeHtml(t.venue) + '</p>' +
        '<p><strong>Holder:</strong> ' + escapeHtml(t.holder) + '</p>' +
        '<p><strong>Ticket:</strong> ' + escapeHtml(t.ticket_type) + ' x ' + t.quantity + '</p>' +
      '</div>';
  } catch (error) {
    box.innerHTML = '<p class="empty">Could not connect to the server.</p>';
  }
}

verifyTicket();