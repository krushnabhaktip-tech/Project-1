// ---------- Show / hide password ----------
const showPassword = document.getElementById('showPassword');

if (showPassword) {
  showPassword.addEventListener('change', function () {
    const type = this.checked ? 'text' : 'password';
    document.getElementById('password').type = type;

    const confirmBox = document.getElementById('confirmPassword');
    if (confirmBox) {
      confirmBox.type = type;
    }
  });
}

// ---------- Helper functions ----------
function setError(id, message) {
  document.getElementById(id).textContent = message;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

// ---------- Register form ----------
const registerForm = document.getElementById('registerForm');

if (registerForm) {
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    let valid = true;

    setError('nameError', '');
    setError('emailError', '');
    setError('passwordError', '');
    setError('confirmError', '');

    if (name.length < 2) {
      setError('nameError', 'Please enter your name (min 2 letters)');
      valid = false;
    }
    if (!isValidEmail(email)) {
      setError('emailError', 'Please enter a valid email');
      valid = false;
    }
    if (!isStrongPassword(password)) {
      setError('passwordError', 'Min 8 characters with letters and numbers');
      valid = false;
    }
    if (password !== confirmPassword) {
      setError('confirmError', 'Passwords do not match');
      valid = false;
    }

    const msg = document.getElementById('formMessage');

    if (!valid) {
      msg.textContent = '';
      return;
    }

    msg.style.color = 'var(--text)';
    msg.textContent = 'Registering...';

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        msg.style.color = 'var(--success)';
        msg.textContent = data.message + ' Redirecting to login...';
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      } else {
        msg.style.color = 'var(--error)';
        msg.textContent = data.message;
      }

    } catch (error) {
      msg.style.color = 'var(--error)';
      msg.textContent = 'Could not connect to server. Is it running?';
    }
  });
}

// ---------- Login form ----------
const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let valid = true;

    setError('emailError', '');
    setError('passwordError', '');

    if (!isValidEmail(email)) {
      setError('emailError', 'Please enter a valid email');
      valid = false;
    }
    if (password.length === 0) {
      setError('passwordError', 'Please enter your password');
      valid = false;
    }

     const msg = document.getElementById('formMessage');

if (!valid) {
  msg.textContent = '';
  return;
}

msg.style.color = 'var(--text)';
msg.textContent = 'Logging in...';

try {
  const response = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (response.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userRole', data.user.role);

    msg.style.color = 'var(--success)';
    msg.textContent = 'Login successful! Redirecting...';
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } else {
    msg.style.color = 'var(--error)';
    msg.textContent = data.message;
  }

} catch (error) {
  msg.style.color = 'var(--error)';
  msg.textContent = 'Could not connect to server. Is it running?';
}
  });
}