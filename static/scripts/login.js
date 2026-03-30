window._DME_CREDENTIALS = [
    {
        username: "Xandelicado",
        password: "123456",
        status: "ativo",
        corpo: "militar",
        patente: "Comandante Geral"
    },
    {
        username: "-079",
        password: "123456",
        status: "ativo",
        corpo: "militar",
        patente: "General de Exercito"
    }
];

const DEFAULT_LOGIN_USERNAME = "Xandelicado";
const ADMINS_FIXOS = ["Xandelicado", "rafacv", "Ronaldo"];

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

function toast(msg, type) {
    const el = document.getElementById("toast");
    if (!el) return;

    el.textContent = msg;
    el.className = "toast " + (type || "ok");
    clearTimeout(el._t);
    setTimeout(() => el.classList.add("show"), 10);
    el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

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

(function applySavedTheme() {
    const theme = localStorage.getItem("dme_theme") || "dark";
    if (theme === "light") {
        document.documentElement.classList.add("light-mode");
    }
})();

function findStaticCredential(username) {
    const normalized = (username || "").trim().toLowerCase();
    return window._DME_CREDENTIALS.find((cred) => cred.username.toLowerCase() === normalized) || null;
}

function buildStaticUser(cred) {
    return {
        nick: cred.username,
        patente: cred.patente || "Recruta",
        corpo: cred.corpo || "militar",
        status: (cred.status || "ativo").toLowerCase()
    };
}

async function ensureStaticCredentialUser(cred) {
    const fallbackUser = buildStaticUser(cred);

    try {
        const { data, error } = await supabase
            .from("militares")
            .select("*")
            .eq("nick", cred.username)
            .maybeSingle();

        if (error) {
            console.warn(`Supabase: falha ao consultar ${cred.username}. Usando usuario estatico.`, error);
            return fallbackUser;
        }

        if (data) {
            const mergedUser = {
                ...data,
                nick: data.nick || fallbackUser.nick,
                patente: data.patente || fallbackUser.patente,
                corpo: data.corpo || fallbackUser.corpo,
                status: fallbackUser.status
            };

            const needsRepair =
                (data.status || "").toLowerCase() !== fallbackUser.status ||
                !data.patente ||
                !data.corpo;

            if (needsRepair) {
                const { error: updateError } = await supabase
                    .from("militares")
                    .update({
                        patente: fallbackUser.patente,
                        corpo: fallbackUser.corpo,
                        status: fallbackUser.status
                    })
                    .eq("nick", cred.username);

                if (updateError) {
                    console.warn(`Supabase: nao foi possivel normalizar ${cred.username}.`, updateError);
                }
            }

            return mergedUser;
        }

        const { error: insertError } = await supabase.from("militares").insert([fallbackUser]);
        if (insertError) {
            console.warn(`Supabase: nao foi possivel recriar ${cred.username}. Usando usuario estatico.`, insertError);
            return fallbackUser;
        }

        console.log(`Supabase: usuario padrao ${cred.username} restaurado.`);
        return fallbackUser;
    } catch (err) {
        console.warn(`Supabase: erro ao garantir usuario padrao ${cred.username}.`, err);
        return fallbackUser;
    }
}

async function syncStaticCredentials() {
    try {
        for (const cred of window._DME_CREDENTIALS) {
            await ensureStaticCredentialUser(cred);
        }
    } catch (err) {
        console.warn("Erro ao sincronizar credenciais estaticas:", err);
    }
}

syncStaticCredentials();

async function salvarIpLoginERedirecionar(username) {
    let ip = "desconhecido";
    let isVpn = false;
    let isp = "desconhecido";

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch("https://ipwho.is/", { signal: controller.signal });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (data && data.success) {
            ip = data.ip || "desconhecido";
            isp = data.connection ? data.connection.isp : "desconhecido";
            if (data.security) {
                isVpn = Boolean(data.security.vpn || data.security.proxy || data.security.tor || data.security.relay);
            }
        }
    } catch (err) {
        console.warn("Falha ao obter dados de IP:", err);
    }

    const date = new Date().toLocaleString("pt-BR");
    const log = JSON.parse(localStorage.getItem("dme_login_log") || "[]");
    log.push({ username, ip, date, isVpn, isp });
    localStorage.setItem("dme_login_log", JSON.stringify(log));

    try {
        await supabase
            .from("militares")
            .update({
                last_login_ip: ip,
                is_vpn: isVpn
            })
            .eq("nick", username);
    } catch (err) {
        console.warn("Erro ao atualizar IP no Supabase:", err);
    }

    window.location.href = "/home";
}

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
            const staticCredential = findStaticCredential(appState.formData.username);
            if (staticCredential) {
                toast("Este nome de usuario ja esta reservado.", "err");
                appState.isSubmitting = false;
                if (DOM.submitBtn) {
                    DOM.submitBtn.classList.remove("loading");
                    DOM.submitBtn.disabled = false;
                }
                return;
            }

            const { data: existingUser } = await supabase
                .from("militares")
                .select("nick")
                .eq("nick", appState.formData.username)
                .maybeSingle();

            if (existingUser) {
                toast("Este nome de usuario ja esta em uso.", "err");
                appState.isSubmitting = false;
                if (DOM.submitBtn) {
                    DOM.submitBtn.classList.remove("loading");
                    DOM.submitBtn.disabled = false;
                }
                return;
            }

            const { error: insertError } = await supabase.from("militares").insert([{
                nick: appState.formData.username,
                patente: "Recruta",
                corpo: "militar",
                status: "pendente"
            }]);

            if (insertError) throw insertError;

            localStorage.setItem("dme_username", appState.formData.username);
            toast("Cadastro realizado! Aguarde redirecionamento.", "ok");
            setTimeout(() => {
                window.location.href = "/verificacao";
            }, 1500);
        } catch (err) {
            console.error("Erro no registro:", err);
            toast("Erro ao realizar cadastro. Tente novamente.", "err");
            appState.isSubmitting = false;
            if (DOM.submitBtn) {
                DOM.submitBtn.classList.remove("loading");
                DOM.submitBtn.disabled = false;
            }
        }
    });
}

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
            const staticUser = findStaticCredential(username);
            let data = null;
            let error = null;

            try {
                const response = await supabase
                    .from("militares")
                    .select("*")
                    .eq("nick", username)
                    .maybeSingle();
                data = response.data;
                error = response.error;
            } catch (queryError) {
                if (!staticUser) throw queryError;
                console.warn("Supabase: consulta falhou no login. Tentando usuario estatico.", queryError);
            }

            if (error && !staticUser) {
                console.warn("Supabase: erro ao buscar usuario no login.", error);
            }

            let user = data;
            if (!user && staticUser) {
                user = await ensureStaticCredentialUser(staticUser);
            }

            if (!user) {
                toast("Usuario nao encontrado.", "err");
                if (DOM.loginBtn) {
                    DOM.loginBtn.classList.remove("loading");
                    DOM.loginBtn.disabled = false;
                }
                return;
            }

            const expectedPassword = staticUser ? staticUser.password : "123456";
            if (password.trim() !== expectedPassword.trim()) {
                toast("Senha incorreta.", "err");
                if (DOM.loginBtn) {
                    DOM.loginBtn.classList.remove("loading");
                    DOM.loginBtn.disabled = false;
                }
                return;
            }

            const status = staticUser
                ? (staticUser.status || "ativo").toLowerCase()
                : (user.status || "ativo").toLowerCase();

            if (status !== "ativo") {
                const msg = {
                    pendente: "Sua conta esta aguardando aprovacao de um administrador.",
                    desativado: "Sua conta foi desativada. Entre em contato com a administracao.",
                    banido: "Sua conta foi banida. Entre em contato se achar que houve engano."
                };
                toast(msg[status] || "Acesso negado. Conta nao esta ativa.", "err");
                if (DOM.loginBtn) {
                    DOM.loginBtn.classList.remove("loading");
                    DOM.loginBtn.disabled = false;
                }
                return;
            }

            const nickname = user.nick || username;
            localStorage.setItem("dme_username", nickname);

            const adminsAtuais = JSON.parse(localStorage.getItem("dme_admins") || "[]");
            const adminsUnificados = [...new Set([...ADMINS_FIXOS, ...adminsAtuais])];
            localStorage.setItem("dme_admins", JSON.stringify(adminsUnificados));

            salvarIpLoginERedirecionar(nickname);
        } catch (err) {
            console.error("Erro no login:", err);
            toast("Erro ao conectar ao servidor.", "err");
            if (DOM.loginBtn) {
                DOM.loginBtn.classList.remove("loading");
                DOM.loginBtn.disabled = false;
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const adminsAtuais = JSON.parse(localStorage.getItem("dme_admins") || "[]");
    localStorage.setItem("dme_admins", JSON.stringify([...new Set([...ADMINS_FIXOS, ...adminsAtuais])]));

    const loginUsernameInput = document.getElementById("loginUsername");
    if (loginUsernameInput && !loginUsernameInput.value) {
        loginUsernameInput.value = DEFAULT_LOGIN_USERNAME;
    }

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
