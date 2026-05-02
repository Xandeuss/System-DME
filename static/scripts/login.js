/**
 * LOGIN.JS — DME System v2
 * 
 * MUDANÇAS em relação à versão anterior:
 *   - REMOVIDO: _DME_CREDENTIALS (senhas em texto puro)
 *   - REMOVIDO: ADMINS_FIXOS no frontend (agora vive no backend)
 *   - REMOVIDO: acesso direto ao Supabase (supabase-client.js não é mais necessário)
 *   - REMOVIDO: localStorage para dme_username e dme_admins (sessão via cookie httpOnly)
 *   - ADICIONADO: fetch('/api/auth/login') e fetch('/api/auth/register')
 *
 * O que CONTINUA no frontend:
 *   - Validação visual dos campos (UX)
 *   - Toast de feedback
 *   - Toggle de formulário login/registro
 *   - Tema claro/escuro (localStorage apenas para tema)
 *   - Animações de avatar
 */

// ── Favcon ───────────────────────────────────────────



// ── Estado ───────────────────────────────────────────
const appState = {
    formData: { username: "", email: "", password: "", termsAccepted: false },
    isSubmitting: false
};

const DOM = {
    usernameInput: document.getElementById("username"),
    emailInput: document.getElementById("email"),
    passwordInput: document.getElementById("password"),
    termsCheckbox: document.getElementById("terms"),
    submitBtn: document.getElementById("submitBtn"),
    registerForm: document.getElementById("registerForm"),
    loginForm: document.getElementById("loginForm"),
    loginBtn: document.getElementById("loginBtn"),
    registerSection: document.getElementById("registerSection"),
    loginSection: document.getElementById("loginSection")
};

// ── Toast ────────────────────────────────────────────
function toast(msg, type) {
    const el = document.getElementById("toast");
    if (!el) return;

    el.textContent = msg;
    el.className = "toast " + (type || "ok");
    clearTimeout(el._t);
    setTimeout(() => el.classList.add("show"), 10);
    el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

// ── Toggle Login / Registro ─────────────────────────
function toggleForm(form) {
    if (!DOM.registerSection || !DOM.loginSection) return;

    if (form === "login") {
        DOM.registerSection.style.display = "none";
        DOM.loginSection.style.display = "block";
        return;
    }

    DOM.registerSection.style.display = "block";
    DOM.loginSection.style.display = "none";
}

window.toggleForm = toggleForm;

// ── Tema ─────────────────────────────────────────────
(function applySavedTheme() {
    const theme = localStorage.getItem("dme_theme") || "dark";
    if (theme === "light") {
        document.documentElement.classList.add("light-mode");
    }
})();

// ── Validação visual (apenas UX, o backend valida de verdade) ────────────
const validationRules = {
    username: (value) => {
        if (!value || value.trim().length < 3) return "Minimo 3 caracteres";
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) return "Caracteres invalidos";
        return null;
    },
    email: (value) => {
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "E-mail invalido";
        return null;
    },
    password: (value) => {
        if (!value || value.length < 6) return "Minimo 6 caracteres";
        return null;
    }
};

function validateField(fieldName, value) {
    if (!validationRules[fieldName]) return true;

    const input = DOM[fieldName + "Input"];
    if (!input) return true;

    const error = validationRules[fieldName](value);
    const errorElement = document.getElementById(fieldName + "-error");

    if (error) {
        input.classList.add("is-error");
        input.classList.remove("is-ok");
        if (errorElement) {
            errorElement.textContent = error;
            errorElement.classList.add("show");
        }
        return false;
    }

    input.classList.remove("is-error");
    input.classList.add("is-ok");
    if (errorElement) {
        errorElement.classList.remove("show");
    }
    return true;
}

Object.keys(validationRules).forEach((fieldName) => {
    const input = DOM[fieldName + "Input"];
    if (!input) return;

    input.addEventListener("blur", (e) => {
        if (e.target.value) {
            validateField(fieldName, e.target.value);
        }
    });

    input.addEventListener("input", (e) => {
        appState.formData[fieldName] = e.target.value;
        if (input.classList.contains("is-error")) {
            validateField(fieldName, e.target.value);
        }
    });
});

if (DOM.termsCheckbox) {
    DOM.termsCheckbox.addEventListener("change", (e) => {
        appState.formData.termsAccepted = e.target.checked;
    });
}

// ── Helper: chama a API e trata erros ────────────────
async function apiCall(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",  // envia/recebe cookies httpOnly
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
        // A API retorna { "detail": "mensagem de erro" }
        throw new Error(data.detail || "Erro desconhecido");
    }

    return data;
}

// ── Registro ─────────────────────────────────────────
if (DOM.registerForm) {
    DOM.registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (appState.isSubmitting) return;

        const isValid = Object.keys(validationRules).every((field) =>
            validateField(field, appState.formData[field])
        );

        if (!appState.formData.termsAccepted) {
            toast("Aceite os Termos de Servico para continuar.", "err");
            return;
        }

        if (!isValid) return;

        appState.isSubmitting = true;
        if (DOM.submitBtn) {
            DOM.submitBtn.classList.add("loading");
            DOM.submitBtn.disabled = true;
        }

        try {
            await apiCall("/api/auth/register", {
                nick: appState.formData.username.trim(),
                email: appState.formData.email.trim(),
                password: appState.formData.password,
            });

            toast("Cadastro realizado! Aguarde aprovacao de um administrador.", "ok");
            setTimeout(() => {
                window.location.href = "/verificacao";
            }, 1500);
        } catch (err) {
            console.error("Erro no registro:", err);
            toast(err.message || "Erro ao realizar cadastro. Tente novamente.", "err");
        } finally {
            appState.isSubmitting = false;
            if (DOM.submitBtn) {
                DOM.submitBtn.classList.remove("loading");
                DOM.submitBtn.disabled = false;
            }
        }
    });
}

// ── Login ────────────────────────────────────────────
if (DOM.loginForm) {
    DOM.loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value;

        if (!username || !password) {
            toast("Preencha os dados de acesso.", "err");
            return;
        }

        if (DOM.loginBtn) {
            DOM.loginBtn.classList.add("loading");
            DOM.loginBtn.disabled = true;
        }

        try {
            // O backend valida tudo: busca no banco, verifica bcrypt, checa status.
            // Se tudo ok, seta o cookie httpOnly automaticamente na resposta.
            await apiCall("/api/auth/login", {
                nick: username,
                password: password,
            });

            // Login OK — o cookie já foi setado pelo backend.
            // Também guardamos o nick em localStorage para scripts legados que ainda consultam 'dme_username'.
            try { localStorage.setItem("dme_username", username); } catch (_) {}

            window.location.href = "/home";
        } catch (err) {
            console.error("Erro no login:", err);
            toast(err.message || "Erro ao conectar ao servidor.", "err");
        } finally {
            if (DOM.loginBtn) {
                DOM.loginBtn.classList.remove("loading");
                DOM.loginBtn.disabled = false;
            }
        }
    });
}

// ── DOMContentLoaded ─────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("dme_theme") || "dark";
    if (savedTheme === "light") {
        document.documentElement.classList.add("light-mode");
    }

    const avatars = document.querySelectorAll(".avatar-slot");
    avatars.forEach((avatar, index) => {
        avatar.style.opacity = "0";
        avatar.style.transform = "translateY(10px)";
        setTimeout(() => {
            avatar.style.transition = "all 0.5s ease";
            avatar.style.opacity = "1";
            avatar.style.transform = "translateY(0)";
        }, 300 + (index * 120));
    });
});
