// ==========================
// credenciais
// ==========================

window._DME_CREDENTIALS = [
    { username: "Xandelicado", password: "123456", status: "ativo" },
    { username: "-079", password: "123456", status: "ativo" }
];

// ==========================
// credenciais estáticas -> Supabase
// ==========================

window._DME_CREDENTIALS = [
    { username: "Xandelicado", password: "123456", status: "ativo", corpo: "militar", patente: "Comandante Geral" },
    { username: "-079", password: "123456", status: "ativo", corpo: "militar", patente: "General de Exército" }
];

async function syncStaticCredentials() {
    try {
        for (const cred of window._DME_CREDENTIALS) {
            // Verifica se o usuário já existe
            const { data, error } = await supabase
                .from('militares')
                .select('nick')
                .eq('nick', cred.username)
                .single();

            if (!data && !error) {
                // Insere se não existir
                await supabase.from('militares').insert([{
                    nick: cred.username,
                    patente: cred.patente || 'Recruta',
                    corpo: cred.corpo || 'militar',
                    status: cred.status || 'ativo'
                }]);
                console.log(`Supabase: Credencial estática ${cred.username} sincronizada.`);
            }
        }
    } catch (err) {
        console.warn('Erro ao sincronizar credenciais estáticas:', err);
    }
}

// Executa sincronização ao carregar
syncStaticCredentials();

// ==========================
// login
// ==========================

// ── Toast global ─────────────────────────────────────
function toast(msg, type) {
    let el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (type || 'ok');
    clearTimeout(el._t);
    setTimeout(() => el.classList.add('show'), 10);
    el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

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

/** Obtém o IP e dados de segurança (VPN/Proxy) via API e salva no Supabase; em seguida redireciona. */
async function salvarIpLoginERedirecionar(username) {
    let ip = 'desconhecido';
    let isVpn = false;
    let isp = 'desconhecido';

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`https://ipwho.is/`, { signal: controller.signal });
        clearTimeout(id);
        const data = await res.json();

        if (data && data.success) {
            ip = data.ip || 'desconhecido';
            isp = data.connection ? data.connection.isp : 'desconhecido';
            if (data.security) {
                isVpn = data.security.vpn || data.security.proxy || data.security.tor || data.security.relay;
            }
        }
    } catch (err) {
        console.warn('Falha ao obter dados de IP:', err);
    }

    const date = new Date().toLocaleString('pt-BR');
    
    // Log local opcional
    const log = JSON.parse(localStorage.getItem('dme_login_log') || '[]');
    log.push({ username, ip, date, isVpn, isp });
    localStorage.setItem('dme_login_log', JSON.stringify(log));

    // Atualiza no Supabase
    try {
        await supabase
            .from('militares')
            .update({ 
                last_login_ip: ip,
                is_vpn: isVpn
            })
            .eq('nick', username);
    } catch (err) {
        console.warn('Erro ao atualizar IP no Supabase:', err);
    }

    window.location.href = '/home';
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

    if (error) {
        input.classList.add('is-error');
        input.classList.remove('is-ok');
        if (errorElement) { errorElement.textContent = error; errorElement.classList.add('show'); }
        return false;
    } else {
        input.classList.remove('is-error');
        input.classList.add('is-ok');
        if (errorElement) errorElement.classList.remove('show');
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

// REGISTER LOGIC (Supabase)
DOM.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (appState.isSubmitting) return;

    const isValid = Object.keys(validationRules).every(field =>
        validateField(field, appState.formData[field])
    );

    if (!appState.formData.termsAccepted) {
        toast('Aceite os Termos de Serviço para continuar.', 'err');
        return;
    }

    if (!isValid) return;

    appState.isSubmitting = true;
    DOM.submitBtn.classList.add('loading');
    DOM.submitBtn.disabled = true;

    try {
        // Verifica duplicata no Supabase
        const { data: existingUser } = await supabase
            .from('militares')
            .select('nick')
            .eq('nick', appState.formData.username)
            .single();

        if (existingUser) {
            toast('Este nome de usuário já está em uso.', 'err');
            appState.isSubmitting = false;
            DOM.submitBtn.classList.remove('loading');
            DOM.submitBtn.disabled = false;
            return;
        }

        // Insere novo militar (Status Pendente por padrão)
        const { error: insError } = await supabase.from('militares').insert([{
            nick: appState.formData.username,
            patente: 'Recruta',
            corpo: 'militar',
            status: 'pendente'
        }]);

        if (insError) throw insError;

        localStorage.setItem('dme_username', appState.formData.username);
        
        toast('Cadastro realizado! Aguarde redirecionamento.', 'ok');
        setTimeout(() => {
            window.location.href = '/verificacao';
        }, 1500);

    } catch (err) {
        console.error('Erro no registro:', err);
        toast('Erro ao realizar cadastro. Tente novamente.', 'err');
        appState.isSubmitting = false;
        DOM.submitBtn.classList.remove('loading');
        DOM.submitBtn.disabled = false;
    }
});

// LOGIN LOGIC (Supabase)
DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        toast('Preencha os dados de acesso.', 'err');
        return;
    }

    DOM.loginBtn.classList.add('loading');
    DOM.loginBtn.disabled = true;

    try {
        // Busca no Supabase
        const { data: user, error } = await supabase
            .from('militares')
            .select('*')
            .eq('nick', username)
            .single();

        if (error || !user) {
            toast('Usuário não encontrado.', 'err');
            DOM.loginBtn.classList.remove('loading');
            DOM.loginBtn.disabled = false;
            return;
        }

        // Para este MVP, verificamos a senha contra as credenciais estáticas 
        // ou permitimos entrar se for um cadastro novo com a senha padrão '123456'
        // Futuramente usaremos Supabase Auth completo
        const staticUser = window._DME_CREDENTIALS.find(u => u.username.toLowerCase() === username.toLowerCase());
        const expectedPassword = staticUser ? staticUser.password : '123456';

        if (password.trim() !== expectedPassword.trim()) {
            toast('Senha incorreta.', 'err');
            DOM.loginBtn.classList.remove('loading');
            DOM.loginBtn.disabled = false;
            return;
        }

        const status = (user.status || 'ativo').toLowerCase();

        if (status !== 'ativo') {
            const msg = {
                pendente: 'Sua conta está aguardando aprovação de um administrador.',
                desativado: 'Sua conta foi desativada. Entre em contato com a administração.',
                banido: 'Sua conta foi banida. Entre em contato se achar que houve engano.'
            };
            toast(msg[status] || 'Acesso negado. Conta não está ativa.', 'err');
            DOM.loginBtn.classList.remove('loading');
            DOM.loginBtn.disabled = false;
            return;
        }

        localStorage.setItem('dme_username', user.nick);

        // Garantir que os admins fixos estejam sempre na lista
        const ADMINS_FIXOS = ['Xandelicado', 'rafacv', 'Ronaldo'];
        const adminsAtuais = JSON.parse(localStorage.getItem('dme_admins') || '[]');
        const adminsUnificados = [...new Set([...ADMINS_FIXOS, ...adminsAtuais])];
        localStorage.setItem('dme_admins', JSON.stringify(adminsUnificados));

        salvarIpLoginERedirecionar(user.nick);

    } catch (err) {
        console.error('Erro no login:', err);
        toast('Erro ao conectar ao servidor.', 'err');
        DOM.loginBtn.classList.remove('loading');
        DOM.loginBtn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('dme_theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
    }

    // Animar avatar slots
    const avatars = document.querySelectorAll('.avatar-slot');
    avatars.forEach((avatar, index) => {
        avatar.style.opacity = '0';
        avatar.style.transform = 'translateY(10px)';
        setTimeout(() => {
            avatar.style.transition = 'all 0.5s ease';
            avatar.style.opacity = '1';
            avatar.style.transform = 'translateY(0)';
        }, 300 + (index * 120));
    });
});
