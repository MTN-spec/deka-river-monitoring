document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Target Credentials: Tadiwanashe / Blessings
            if (username === 'Tadiwanashe' && password === 'Blessings') {
                localStorage.setItem('deka_auth', 'true');
                localStorage.setItem('deka_user', username);
                window.location.href = 'index.html';
            } else {
                errorMsg.textContent = 'Invalid credentials. Please try again.';
                errorMsg.style.display = 'block';

                // Add shake effect
                const card = document.querySelector('.login-card');
                card.classList.add('shake');
                setTimeout(() => card.classList.remove('shake'), 500);
            }
        });
    }
});

// Check auth status for protected pages
function checkAuth() {
    if (localStorage.getItem('deka_auth') !== 'true') {
        window.location.href = 'login.html';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('deka_auth');
    localStorage.removeItem('deka_user');
    window.location.href = 'login.html';
}
