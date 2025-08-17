const USERS_STORAGE_KEY = 'control_desk_users';
const SESSION_STORAGE_KEY = 'control_desk_session';

let onLoginSuccessCallback;

function getUsers() {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function showAppContent(user) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');

    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Olá, ${user.name.split(' ')[0]}`;
        welcomeMessage.classList.remove('hidden');
    }
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('mobile-logout-btn').classList.remove('hidden');

    if (onLoginSuccessCallback) {
        onLoginSuccessCallback();
    }
}

function showAuthForm() {
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    const feedbackEl = document.getElementById('login-feedback');
    feedbackEl.classList.add('hidden');

    if (user) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
        showAppContent(user);
    } else {
        feedbackEl.textContent = 'E-mail ou senha inválidos.';
        feedbackEl.classList.remove('hidden');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const feedbackEl = document.getElementById('register-feedback');
    feedbackEl.classList.add('hidden');

    if (!name || !email || !password) {
        feedbackEl.textContent = 'Por favor, preencha todos os campos.';
        feedbackEl.classList.remove('hidden');
        return;
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
        feedbackEl.textContent = 'Este e-mail já está cadastrado.';
        feedbackEl.classList.remove('hidden');
        return;
    }

    users.push({ name, email, password });
    saveUsers(users);
    
    alert('Cadastro realizado com sucesso! Por favor, faça o login.');
    showLoginForm();
}

function handleLogout() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    location.reload();
}

function showRegisterForm() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('register-view').classList.remove('hidden');
    document.getElementById('login-feedback').classList.add('hidden');
}

function showLoginForm() {
    document.getElementById('register-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('register-feedback').classList.add('hidden');
}

export function initAuth(onLogin) {
    onLoginSuccessCallback = onLogin;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);
    document.getElementById('show-register-form').addEventListener('click', showRegisterForm);
    document.getElementById('show-login-form').addEventListener('click', showLoginForm);

    const sessionUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionUser) {
        try {
            const user = JSON.parse(sessionUser);
            showAppContent(user);
        } catch (e) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            showAuthForm();
        }
    } else {
        showAuthForm();
    }
}
