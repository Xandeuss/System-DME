// ==========================
// credenciais
// ==========================

window._DME_CREDENTIALS = [
    {
        username: "Xandelicado",
        password: "123456",
        status: "ativo",

        username: "-079",
        password: "123456",
        status: "ativo"
    }
];

(function mergeStaticCredentials() {
    try {
        const existing = JSON.parse(localStorage.getItem('dme_users')) || [];
        const existingUsernames = new Set(existing.map(u => (u.username || '').toString().toLowerCase()));

        let changed = false;
        window._DME_CREDENTIALS.forEach(cred => {
            const uname = (cred.username || '').toString();
            if (!existingUsernames.has(uname.toLowerCase())) {
                existing.push({
                    username: uname,
                    email: cred.email || (uname.toLowerCase() + '@local.test'),
                    password: (cred.password || '').toString(),
                    status: cred.status || 'ativo',
                    registradoEm: new Date().toLocaleString('pt-BR')
                });
                existingUsernames.add(uname.toLowerCase());
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('dme_users', JSON.stringify(existing));
            console.log('credentials.js: static credentials merged into localStorage.dme_users');
        }
    } catch (err) {
        console.warn('credentials.js: failed to merge static credentials', err);
    }
})();


// ==========================
// login
// ==========================

(function () {
    const theme = localStorage.getItem('dme_theme') || 'dark';
    if (theme === 'light') document.documentElement.classList.add('light-mode');
})();

const appState = {
    formData: { username: '', email: '', password: '', termsAccepted: false },
    isSubmitting: false
};

const DOM = {
    usernameInput: document.getElementById('username'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    termsCheckbox: document.getElementById('terms'),
    submitBtn: document.getElementById('submitBtn'),
    registerForm: document.getElementById('registerForm'),
    loginForm: document.getElementById('loginForm'),
    loginBtn: document.getElementById('loginBtn'),
    registerSection: document.getElementById('registerSection'),
    loginSection: document.getElementById('loginSection')
};

function toggleForm(form) {
    if (form === 'login') {
        DOM.registerSection.style.display = 'none';
        DOM.loginSection.style.display = 'block';
    } else {
        DOM.registerSection.style.display = 'block';
        DOM.loginSection.style.display = 'none';
    }
}

const validationRules = {
    username: (value) => {
        if (!value || value.trim().length < 3) return 'Mínimo 3 caracteres';
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) return 'Caracteres inválidos';
        return null;
    },
    email: (value) => {
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'E-mail inválido';
        return null;
    },
    password: (value) => {
        if (!value || value.length < 6) return 'Mínimo 6 caracteres';
        return null;
    }
};

function validateField(fieldName, value) {
    if (!validationRules[fieldName]) return true;
    const error = validationRules[fieldName](value);
    const input = DOM[fieldName + 'Input'];
    const errorElement = document.getElementById(fieldName + '-error');
    const icon = input.nextElementSibling;

    if (error) {
        input.classList.add('error');
        input.classList.remove('success');
        errorElement.textContent = error;
        errorElement.classList.add('show');
        icon.classList.remove('show');
        return false;
    } else {
        input.classList.remove('error');
        input.classList.add('success');
        errorElement.classList.remove('show');
        icon.classList.add('show');
        icon.classList.add('success');
        return true;
    }
}

Object.keys(validationRules).forEach(fieldName => {
    const input = DOM[fieldName + 'Input'];
    input.addEventListener('blur', (e) => {
        if (e.target.value) validateField(fieldName, e.target.value);
    });
    input.addEventListener('input', (e) => {
        appState.formData[fieldName] = e.target.value;
        if (input.classList.contains('error')) validateField(fieldName, e.target.value);
    });
});

DOM.termsCheckbox.addEventListener('change', (e) => {
    appState.formData.termsAccepted = e.target.checked;
});

// REGISTER LOGIC
DOM.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (appState.isSubmitting) return;

    const isValid = Object.keys(validationRules).every(field =>
        validateField(field, appState.formData[field])
    );

    if (!appState.formData.termsAccepted) {
        alert('Aceite os Termos de Serviço.');
        return;
    }

    if (!isValid) return;

    appState.isSubmitting = true;
    DOM.submitBtn.classList.add('loading');
    DOM.submitBtn.disabled = true;

    const users = JSON.parse(localStorage.getItem('dme_users')) || [];
    if (users.some(u => u.username.toLowerCase() === appState.formData.username.toLowerCase())) {
        alert('Este nome de usuário já está em uso.');
        appState.isSubmitting = false;
        DOM.submitBtn.classList.remove('loading');
        DOM.submitBtn.disabled = false;
        return;
    }

    localStorage.setItem('dme_pending_registration', JSON.stringify({
        username: appState.formData.username,
        email: appState.formData.email,
        password: appState.formData.password
    }));

    localStorage.setItem('dme_username', appState.formData.username);

    setTimeout(() => {
        window.location.href = 'verificacao.html';
    }, 1000);
});

// LOGIN LOGIC
DOM.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Preencha os dados de acesso.');
        return;
    }

    DOM.loginBtn.classList.add('loading');
    DOM.loginBtn.disabled = true;

    setTimeout(() => {
        const users = JSON.parse(localStorage.getItem('dme_users')) || [];
        let user = null;

        if (window._DME_CREDENTIALS && Array.isArray(window._DME_CREDENTIALS)) {
            user = window._DME_CREDENTIALS.find(u =>
                (u.username || '').toString().toLowerCase() === username.toLowerCase() &&
                (u.password || '').toString().trim() === password.trim()
            );
        }

        if (!user) {
            user = users.find(u => {
                const storedUsername = (u.username || '').toString().toLowerCase();
                const storedPassword = (u.password || '').toString();
                return storedUsername === username.toLowerCase() && storedPassword.trim() === password.trim();
            });
        }

        if (user) {
            const status = user.status || 'ativo';

            if (status === 'pendente') {
                alert('Sua conta ainda não foi aprovada por um administrador. Por favor, aguarde.');
                DOM.loginBtn.classList.remove('loading');
                DOM.loginBtn.disabled = false;
                return;
            }

            if (status === 'desativado') {
                alert('Sua conta foi desativada. Entre em contato com um administrador.');
                DOM.loginBtn.classList.remove('loading');
                DOM.loginBtn.disabled = false;
                return;
            }

            if (status === 'banido') {
                alert('Sua conta foi banida por violação das diretrizes.');
                DOM.loginBtn.classList.remove('loading');
                DOM.loginBtn.disabled = false;
                return;
            }

            if (status === 'ativo') {
                localStorage.setItem('dme_username', user.username);
                window.location.href = 'home.html';
            }
        } else {
            alert('Usuário ou senha incorretos.');
            DOM.loginBtn.classList.remove('loading');
            DOM.loginBtn.disabled = false;
        }
    }, 1000);
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('dme_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    const avatars = document.querySelectorAll('.avatar-wrapper');
    avatars.forEach((avatar, index) => {
        avatar.style.opacity = '0';
        avatar.style.transform = 'translateY(10px)';
        setTimeout(() => {
            avatar.style.transition = 'all 0.5s ease';
            avatar.style.opacity = '1';
            avatar.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });
});