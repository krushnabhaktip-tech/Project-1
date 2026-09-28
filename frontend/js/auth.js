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