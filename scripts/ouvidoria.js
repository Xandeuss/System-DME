// ══════════════════════════════════════════════════════
//  OUVIDORIA — JS
// ══════════════════════════════════════════════════════

const usuarioLogado = localStorage.getItem('dme_username');
if (!usuarioLogado) window.location.href = 'login.html';

function logout() { localStorage.removeItem('dme_username'); window.location.href = 'login.html'; }

// ── Steps e progresso ─────────────────────────────────
const STEPS_ORDER = ['step-intro', 'step-modalidade', 'step-projeto', 'step-sucesso'];
let etapaAtual = 'step-intro';

function irParaEtapa(id) {
    document.querySelectorAll('.ouv-step').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); etapaAtual = id; }
    atualizarProgresso();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function atualizarProgresso() {
    const map = {
        'step-intro': 0,
        'step-modalidade': 25,
        'step-projeto': 60,
        'step-emenda': 60,
        'step-sucesso': 100
    };
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = (map[etapaAtual] ?? 0) + '%';
}

// ── Emenda Legislativa ────────────────────────────────
function setupEmenda() {
    // Radio cards de objetivo
    const radiosObj = document.querySelectorAll('input[name="emenda-objetivo"]');
    const cardsObj = document.querySelectorAll('#grupoObjetivo .ouv-radio-card');
    const subForms = ['adicionar', 'eliminar', 'modificar', 'realocar'];

    cardsObj.forEach((card, i) => {
        card.addEventListener('click', () => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio) { radio.checked = true; }
            cardsObj.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            // Mostrar sub-form correspondente
            const val = radio ? radio.value : null;
            subForms.forEach(sf => {
                const el = document.getElementById(`sub-${sf}`);
                if (el) el.style.display = (sf === val) ? 'block' : 'none';
            });
        });
    });

    // Envio da emenda
    const btn = document.getElementById('btnEnviarEmenda');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const autor = document.getElementById('e-autor')?.value.trim();
        const titulo = document.getElementById('e-titulo')?.value.trim();
        const obj = document.querySelector('input[name="emenda-objetivo"]:checked')?.value;

        if (!autor || !titulo) {
            toast('Preencha o autor e o título da emenda.', 'error');
            return;
        }
        if (!obj) {
            toast('Selecione o objetivo da emenda.', 'error');
            return;
        }

        // Validar campos específicos por objetivo
        const camposObrig = {
            adicionar: ['a-documento', 'a-dispositivo', 'a-justificativa'],
            eliminar: ['el-documento', 'el-dispositivo', 'el-justificativa'],
            modificar: ['m-documento', 'm-texto-atual', 'm-texto-proposto', 'm-justificativa'],
            realocar: ['r-documento', 'r-dispositivo', 'r-justificativa'],
        };

        let valido = true;
        (camposObrig[obj] || []).forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.value.trim()) {
                el.style.borderColor = 'var(--red, #ef4444)';
                el.addEventListener('input', () => { el.style.borderColor = ''; }, { once: true });
                valido = false;
            }
        });
        if (!valido) { toast('Preencha todos os campos obrigatórios (*).', 'error'); return; }

        // Montar proposta
        const extra = {};
        if (obj === 'adicionar') {
            extra.documento = document.getElementById('a-documento').value.trim();
            extra.dispositivo = document.getElementById('a-dispositivo').value.trim();
            extra.justificativa = document.getElementById('a-justificativa').value.trim();
        } else if (obj === 'eliminar') {
            extra.documento = document.getElementById('el-documento').value.trim();
            extra.dispositivo = document.getElementById('el-dispositivo').value.trim();
            extra.justificativa = document.getElementById('el-justificativa').value.trim();
        } else if (obj === 'modificar') {
            extra.documento = document.getElementById('m-documento').value.trim();
            extra.textoAtual = document.getElementById('m-texto-atual').value.trim();
            extra.textoProposto = document.getElementById('m-texto-proposto').value.trim();
            extra.justificativa = document.getElementById('m-justificativa').value.trim();
        } else if (obj === 'realocar') {
            extra.documento = document.getElementById('r-documento').value.trim();
            extra.dispositivo = document.getElementById('r-dispositivo').value.trim();
            extra.justificativa = document.getElementById('r-justificativa').value.trim();
        }

        const proposta = {
            id: Date.now(),
            tipo: 'emenda',
            objetivo: obj,
            autor,
            titulo,
            ...extra,
            submitidoPor: usuarioLogado,
            data: new Date().toLocaleString('pt-BR'),
            dataFimVotacao: Date.now() + (7 * 24 * 60 * 60 * 1000),
            votos: [],
            status: 'Pendente'
        };

        confirmarEnvio(proposta);
    });
}

// ── Modalidade ────────────────────────────────────────
function setupModalidade() {
    const radios = document.querySelectorAll('input[name="modalidade"]');
    const cards = document.querySelectorAll('.ouv-radio-card');
    const btnAvancar = document.getElementById('btnAvancarModalidade');

    radios.forEach((r, i) => {
        r.addEventListener('change', () => {
            cards.forEach(c => c.classList.remove('selected'));
            cards[i].classList.add('selected');
        });
    });

    // Permitir clicar direto no card
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
        });
    });

    if (btnAvancar) {
        btnAvancar.addEventListener('click', () => {
            const sel = document.querySelector('input[name="modalidade"]:checked');
            if (!sel) { toast('Selecione uma modalidade para continuar.', 'error'); return; }
            irParaEtapa(sel.value === 'projeto' ? 'step-projeto' : 'step-emenda');
        });
    }
}

// ── Envio do Projeto ──────────────────────────────────
function setupEnvioProjeto() {
    const btn = document.getElementById('btnEnviarProjeto');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const autor = document.getElementById('p-autor').value.trim();
        const titulo = document.getElementById('p-titulo').value.trim();
        const justificativa = document.getElementById('p-justificativa').value.trim();
        const objetivo = document.getElementById('p-objetivo').value.trim();
        const desenvolvimento = document.getElementById('p-desenvolvimento').value.trim();
        const impactos = document.getElementById('p-impactos').value.trim();

        if (!autor || !titulo || !justificativa || !objetivo || !desenvolvimento || !impactos) {
            toast('Preencha todos os campos obrigatórios (*).', 'error');
            ['p-autor', 'p-titulo', 'p-justificativa', 'p-objetivo', 'p-desenvolvimento', 'p-impactos'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value.trim()) {
                    el.style.borderColor = 'var(--red, #ef4444)';
                    el.addEventListener('input', () => { el.style.borderColor = ''; }, { once: true });
                }
            });
            return;
        }

        const proposta = {
            id: Date.now(),
            tipo: 'projeto',
            autor,
            colaboradores: document.getElementById('p-colaboradores').value.trim(),
            titulo,
            justificativa,
            objetivo,
            desenvolvimento,
            impactos,
            consideracoes: document.getElementById('p-consideracoes').value.trim(),
            imagens: document.getElementById('p-imagens').value.trim(),
            anexos: document.getElementById('p-anexos').value.trim(),
            submitidoPor: usuarioLogado,
            data: new Date().toLocaleString('pt-BR'),
            dataFimVotacao: Date.now() + (7 * 24 * 60 * 60 * 1000),
            votos: [],
            status: 'Pendente'
        };

        confirmarEnvio(proposta);
    });
}

// ── Modal de Confirmação de Envio ─────────────────────
function confirmarEnvio(proposta) {
    const tipoLabel = proposta.tipo === 'projeto' ? 'Projeto' : 'Emenda Legislativa';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease';
    wrap.innerHTML = `
        <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:20px;padding:28px;max-width:480px;width:100%;box-shadow:var(--shadow-lg);animation:slideUp .2s ease">
            <div style="text-align:center;margin-bottom:22px">
                <div style="width:56px;height:56px;background:var(--green-muted);border:1px solid rgba(34,197,94,.25);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:1.6rem">📋</div>
                <h3 style="font-size:1.05rem;font-weight:800;color:var(--t1);margin-bottom:6px">Confirmar Envio</h3>
                <p style="font-size:.82rem;color:var(--t3)">Revise os dados antes de enviar sua proposta ao STM.</p>
            </div>
            <div style="background:var(--bg-3);border:1px solid var(--b1);border-radius:12px;padding:16px;margin-bottom:20px;display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;gap:8px;font-size:.82rem">
                    <span style="color:var(--t3);min-width:90px;font-weight:600">Tipo:</span>
                    <span style="color:var(--t1);font-weight:700">${tipoLabel}</span>
                </div>
                <div style="display:flex;gap:8px;font-size:.82rem">
                    <span style="color:var(--t3);min-width:90px;font-weight:600">Título:</span>
                    <span style="color:var(--t1);font-weight:700;word-break:break-word">${escHtml(proposta.titulo)}</span>
                </div>
                <div style="display:flex;gap:8px;font-size:.82rem">
                    <span style="color:var(--t3);min-width:90px;font-weight:600">Autor:</span>
                    <span style="color:var(--t1)">${escHtml(proposta.autor)}</span>
                </div>
                <div style="display:flex;gap:8px;font-size:.82rem">
                    <span style="color:var(--t3);min-width:90px;font-weight:600">Votação:</span>
                    <span style="color:var(--green);font-weight:600">Encerra em 7 dias</span>
                </div>
            </div>
            <div style="display:flex;gap:10px">
                <button id="_confirmCancel" style="flex:1;padding:11px;border:1px solid var(--b2);border-radius:10px;background:var(--bg-3);color:var(--t2);font-weight:600;font-size:.85rem;cursor:pointer;font-family:inherit">Revisar</button>
                <button id="_confirmSend" style="flex:2;padding:11px;border:1px solid var(--green);border-radius:10px;background:var(--green);color:#000;font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit">✅ Confirmar Envio</button>
            </div>
        </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#_confirmCancel').onclick = () => wrap.remove();
    wrap.querySelector('#_confirmSend').onclick = () => {
        const key = 'dme_ouvidoria_propostas';
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.push(proposta);
        localStorage.setItem(key, JSON.stringify(arr));
        wrap.remove();
        irParaEtapa('step-sucesso');
        renderHistorico();
    };
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
}

// ── Histórico ─────────────────────────────────────────
function renderHistorico() {
    const list = document.getElementById('histList');
    const countEl = document.getElementById('histCount');
    if (!list) return;

    const key = 'dme_ouvidoria_propostas';
    const arr = JSON.parse(localStorage.getItem(key) || '[]')
        .filter(p => p.submitidoPor === usuarioLogado)
        .reverse();

    if (countEl) countEl.textContent = arr.length;

    const section = document.getElementById('secaoMinhasPropostas');
    if (section) section.style.display = arr.length === 0 ? 'none' : 'block';

    if (arr.length === 0) { list.innerHTML = ''; return; }

    list.innerHTML = arr.map(p => `
        <div class="ouv-hist-item">
            <div>
                <div class="ouv-hist-tipo ${p.tipo}">${p.tipo === 'projeto' ? 'Projeto' : 'Emenda'}</div>
                <div class="ouv-hist-titulo">${escHtml(p.titulo)}</div>
                <div class="ouv-hist-meta">${escHtml(p.autor)} · ${p.data}</div>
            </div>
            <div class="ouv-hist-badge">${p.status}</div>
        </div>`).join('');
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Reset do formulário ───────────────────────────────
function resetForm() {
    ['p-autor', 'p-colaboradores', 'p-titulo', 'p-justificativa', 'p-objetivo', 'p-desenvolvimento', 'p-impactos', 'p-consideracoes', 'p-imagens', 'p-anexos'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.querySelectorAll('input[name="modalidade"]').forEach(r => r.checked = false);
    document.querySelectorAll('.ouv-radio-card').forEach(c => c.classList.remove('selected'));
}

// ── Toast ─────────────────────────────────────────────
function toast(msg, type = 'success') {
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    };
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = (icons[type] || '') + msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ── Navbar / Hamburger / Dropdown ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('navUserName').textContent = usuarioLogado;
    document.getElementById('dropdownName').textContent = usuarioLogado;

    const av = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${usuarioLogado}&headonly=1&size=m&gesture=std&head_direction=2`;
    const av2 = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${usuarioLogado}&size=m&direction=2&head_direction=2&gesture=std`;
    document.getElementById('navUserImage').src = av;
    document.getElementById('dropdownUserImage').src = av2;

    const admins = JSON.parse(localStorage.getItem('dme_admins')) || ['Xandelicado'];
    if (admins.includes(usuarioLogado)) {
        const dp = document.getElementById('dropdownPainel');
        if (dp) dp.style.display = 'flex';
    }

    // Hamburger
    const ham = document.getElementById('hamburger');
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarClose');

    if (ham) ham.addEventListener('click', () => { sidebar?.classList.add('active'); overlay?.classList.add('active'); });
    if (closeBtn) closeBtn.addEventListener('click', () => { sidebar?.classList.remove('active'); overlay?.classList.remove('active'); });
    if (overlay) overlay.addEventListener('click', () => { sidebar?.classList.remove('active'); overlay.classList.remove('active'); });

    // Dropdown de perfil
    const profileBtn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('userDropdown');
    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('active'); });
        document.addEventListener('click', e => { if (!profileBtn.contains(e.target)) dropdown.classList.remove('active'); });
    }

    // Tema
    window.toggleTheme = function () {
        const isLight = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('dme_theme', isLight ? 'light' : 'dark');
        const themeText = document.getElementById('themeText');
        if (themeText) themeText.textContent = isLight ? 'Modo Escuro' : 'Modo Claro';
    };
    const tEl = document.getElementById('themeText');
    if (tEl) tEl.textContent = document.documentElement.classList.contains('light-mode') ? 'Modo Escuro' : 'Modo Claro';

    // Setup
    setupModalidade();
    setupEmenda();
    setupEnvioProjeto();
    renderHistorico();
    atualizarProgresso();
});
