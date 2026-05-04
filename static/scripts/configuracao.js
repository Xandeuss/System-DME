/**
 * CONFIGURACAO.JS — DME System v2
 * 
 * Gerencia o carregamento e atualização do perfil do usuário.
 */

const DOM = {
    inputNick: document.getElementById('inputNick'),
    inputEmail: document.getElementById('inputEmail'),
    inputTag: document.getElementById('inputTag'),
    tagBadge: document.getElementById('tagBadge'),
    tagHint: document.getElementById('tagHint'),
    inputNovaSenha: document.getElementById('inputNovaSenha'),
    inputConfirmarSenha: document.getElementById('inputConfirmarSenha'),
    inputSenhaAtual: document.getElementById('inputSenhaAtual'),
    btnSave: document.querySelector('.btn-save'),
    dropdownTag: document.getElementById('dropdownTag'),
    bbTextarea: document.getElementById('bbTextarea'),
    bbPreviewBody: document.getElementById('bbPreviewBody')
};

// ── Toast ────────────────────────────────────────────
function toast(msg, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (type || 'ok');
    clearTimeout(el._t);
    setTimeout(() => el.classList.add('show'), 10);
    el._t = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Carregar dados iniciais ──────────────────────────
async function carregarDados() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error();
        const user = await res.json();

        if (DOM.inputNick) DOM.inputNick.value = user.nick;
        if (DOM.inputEmail && user.email) DOM.inputEmail.value = user.email;
        
        // Tags e outros dados RPG poderiam vir daqui também se necessário
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

// ── Salvar Alterações ───────────────────────────────
async function salvarConta() {
    const email = DOM.inputEmail.value.trim();
    const nova = DOM.inputNovaSenha.value;
    const conf = DOM.inputConfirmarSenha.value;
    const atual = DOM.inputSenhaAtual.value;

    if (!atual) {
        toast('Informe sua senha atual para confirmar.', 'err');
        return;
    }

    if (nova) {
        if (nova !== conf) {
            toast('As senhas não coincidem.', 'err');
            return;
        }
        if (nova.length < 6) {
            toast('A nova senha precisa ter ao menos 6 caracteres.', 'err');
            return;
        }
    }

    DOM.btnSave.classList.add('loading');
    DOM.btnSave.disabled = true;

    try {
        const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email || null,
                nova_senha: nova || null,
                senha_atual: atual
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Erro ao atualizar perfil.');
        }

        toast(data.message || 'Configurações salvas com sucesso!');
        
        // Limpar campos de senha
        DOM.inputSenhaAtual.value = '';
        DOM.inputNovaSenha.value = '';
        DOM.inputConfirmarSenha.value = '';

    } catch (err) {
        console.error(err);
        toast(err.message, 'err');
    } finally {
        DOM.btnSave.classList.remove('loading');
        DOM.btnSave.disabled = false;
    }
}

// ── Inicialização ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Reutiliza funções globais se existirem ou define o básico
    if (typeof carregarDados === 'function') carregarDados();
});
