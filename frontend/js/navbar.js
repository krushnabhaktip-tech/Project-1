// ===== Navbar: show links based on login status =====
(function () {
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
})();