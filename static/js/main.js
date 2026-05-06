document.addEventListener('DOMContentLoaded', () => {
    // Initial Setup
    toggleStudentFields();
});

// --- Tab Switching ---
function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const alertBox = document.getElementById('alert-box');

    // Hide Alert
    alertBox.classList.add('hidden');

    if (tab === 'login') {
        loginForm.classList.add('active-form');
        registerForm.classList.remove('active-form');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        registerForm.classList.add('active-form');
        loginForm.classList.remove('active-form');
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
    }
}

// --- Toggle Student Fields ---
function toggleStudentFields() {
    const studentRadio = document.getElementById('role-student');
    const studentFields = document.getElementById('student-fields');
    
    // Required fields for student
    const regRoll = document.getElementById('reg-roll');
    const regSem = document.getElementById('reg-sem');

    if (studentRadio.checked) {
        studentFields.classList.remove('collapse');
        regRoll.setAttribute('required', 'true');
        regSem.setAttribute('required', 'true');
    } else {
        studentFields.classList.add('collapse');
        regRoll.removeAttribute('required');
        regSem.removeAttribute('required');
        regRoll.value = '';
        regSem.value = '';
    }
}

// --- Alerts ---
function showAlert(message, type) {
    const alertBox = document.getElementById('alert-box');
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.classList.remove('hidden');
}

// --- API Calls ---
async function handleRegister(e) {
    e.preventDefault();
    
    // Get form data
    const role = document.querySelector('input[name="role"]:checked').value;
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    const payload = { role, name, email, password };

    if (role === 'student') {
        payload.rollNo = document.getElementById('reg-roll').value;
        payload.semester = document.getElementById('reg-sem').value;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            // Redirect after successful registration
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Network error. Please try again.', 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(`Welcome back, ${data.name}!`, 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Network error. Please try again.', 'error');
    }
}
