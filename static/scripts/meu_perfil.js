/* ── auth guard & user nick ──────────────── */
const userNick = typeof _USER_NICK !== 'undefined' ? _USER_NICK : localStorage.getItem('dme_username');
if (!userNick) location.href = '/login';

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        console.warn('Logout API call failed, clearing local storage anyway');
    }
    localStorage.removeItem('dme_username');
    location.href = '/login';
}
window.logout = logout;

/* ── helpers ─────────────────────────────── */
const avFull = (nick, dir = 2, hdir = 2) =>
    `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=l&action=std`;

const avMedium = (nick, dir = 2, hdir = 2) =>
    `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=m&action=std`;

function fmt(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
}

function fmtDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('pt-BR');
}

function fmtDateTime(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateTimePortuguese(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    const monthsEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsPT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const day = d.getDate();
    const month = monthsPT[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} de ${month} de ${year} às ${hours}:${mins}`;
}

/* ── data sources ────────────────────────── */
const militar = JSON.parse(localStorage.getItem('dme_militar')) || [];
const empresarial = JSON.parse(localStorage.getItem('dme_empresarial')) || [];
const historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
const turnos = JSON.parse(localStorage.getItem('dme_turnos')) || [];
const aulas = JSON.parse(localStorage.getItem('dme_aulas')) || [];
const recrutamentos = JSON.parse(localStorage.getItem('dme_recrutamentos')) || [];
const gratificacoes = JSON.parse(localStorage.getItem('dme_gratificacoes')) || [];

const todos = [...militar, ...empresarial];
let found = todos.find(m => m.nick?.toLowerCase() === userNick.toLowerCase());

// DEV_MODE fallback: create synthetic profile so the page renders
if (!found) {
    found = {
        nick: userNick,
        patente: 'Comandante-Geral',
        tag: 'DME',
        status: 'Ativo',
        cargo: 'Administrador do Sistema',
        desde: new Date().toISOString(),
        dataCadastro: new Date().toISOString(),
    };
}

/* ── navbar ──────────────────────────────── */
function initNavbar() {
    document.getElementById('navUserName').textContent = userNick;
    document.getElementById('navUserImage').src = avMedium(userNick);
    document.getElementById('dropdownUserImage').src = avMedium(userNick);
    document.getElementById('dropdownName').textContent = userNick;

    const admins = JSON.parse(localStorage.getItem('dme_admins')) || [userNick];
    if (admins.includes(userNick)) {
        document.getElementById('dropdownPainel').style.display = 'flex';
    }

    const btn = document.getElementById('userProfileBtn');
    const drop = document.getElementById('userDropdown');
    btn.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('active'); });
    document.addEventListener('click', e => { if (!btn.contains(e.target)) drop.classList.remove('active'); });
    drop.addEventListener('click', e => e.stopPropagation());
}

/* ── sidebar ─────────────────────────────── */
function initSidebar() {
    const sb = document.getElementById('mobileSidebar');
    const ov = document.getElementById('sidebarOverlay');
    const toggle = () => { sb.classList.toggle('active'); ov.classList.toggle('active'); };
    document.getElementById('hamburger').addEventListener('click', toggle);
    document.getElementById('sidebarClose').addEventListener('click', toggle);
    ov.addEventListener('click', toggle);
}

/* ── populate left sidebar ───────────────── */
function buildSidebar() {
    const nick = found.nick;
    const paten = found.patente || 'Militar';
    const corp = empresarial.some(m => m.nick?.toLowerCase() === nick.toLowerCase())
        ? 'Empresarial' : 'Militar';
    const tag = found.tag || 'DME';
    const status = found.status || 'Ativo';
    const desde = found.desde || found.dataCadastro || '—';
    const gratCount = gratificacoes.filter(g => g.beneficiario?.toLowerCase() === nick.toLowerCase()).length;

    // title & breadcrumb
    document.title = `Meu Perfil — DME System`;
    document.getElementById('breadNick').textContent = 'Meu Perfil';

    // avatar (full body)
    document.getElementById('profileAvatar').src = avFull(nick);

    // header
    document.getElementById('profileNick').textContent = nick;
    document.getElementById('profileTag').textContent = tag;
    document.getElementById('profilePatente').textContent = paten;

    const corpBadge = document.getElementById('profileCorpBadge');
    corpBadge.textContent = corp;
    corpBadge.className = 'corp-badge ' + (corp === 'Militar' ? 'corp-militar' : 'corp-empresarial');

    // info list
    document.getElementById('infoPatente').textContent = paten;
    document.getElementById('infoTag').textContent = tag;
    document.getElementById('infoStatus').textContent = status;
    document.getElementById('infoStatus').className = 'pil-val status-' + status.toLowerCase().replace(/\s/g, '');
    document.getElementById('infoDesde').textContent = fmtDate(desde);
    document.getElementById('infoCorp').textContent = corp;

    // gratificações count
    const gratRow = document.getElementById('rowGratificacoes');
    if (gratRow) {
        document.getElementById('infoGratificacoes').textContent = gratCount || '0';
        gratRow.style.display = 'flex';
    }

    // info da listagem (extra field: [RCV] 27 Fev 2023, etc.)
    const listagemKeys = ['dme_militar', 'dme_empresarial', 'dme_alto_comando', 'dme_cadetes', 'dme_contas_oficiais', 'dme_exonerados'];
    let listagemInfo = null;
    for (const key of listagemKeys) {
        const arr = JSON.parse(localStorage.getItem(key)) || [];
        const entry = arr.find(m => m.nick?.toLowerCase() === nick.toLowerCase());
        if (entry && entry.extra) { listagemInfo = entry.extra; break; }
    }
    if (listagemInfo) {
        document.getElementById('infoListagem').textContent = listagemInfo;
        document.getElementById('rowListagem').style.display = 'flex';
    }

    // habbo link
    document.getElementById('btnHabbo').href = `https://www.habbo.com.br/profile/${encodeURIComponent(nick)}`;

    // mini stats
    const agora = new Date(), mes = agora.getMonth(), ano = agora.getFullYear();
    const horasMes = turnos
        .filter(t => t.usuario?.toLowerCase() === nick.toLowerCase() && new Date(t.inicio).getMonth() === mes && new Date(t.inicio).getFullYear() === ano)
        .reduce((s, t) => s + (t.duracao || 0), 0);
    const promoCount = historico.filter(h => h.tipo === 'promocao' && h.militar?.toLowerCase() === nick.toLowerCase()).length;
    const aulasCount = aulas.filter(a => a.instrutor?.toLowerCase() === nick.toLowerCase()).length;

    document.getElementById('statHoras').textContent = horasMes ? fmt(horasMes) : '—';
    document.getElementById('statPromocoes').textContent = promoCount || '—';
    document.getElementById('statAulas').textContent = aulasCount || '—';
}

/* ── populate historico tab ──────────────── */
function buildHistorico() {
    const nick = found.nick.toLowerCase();
    const items = historico.filter(h =>
        h.militar?.toLowerCase() === nick ||
        h.aprovador?.toLowerCase() === nick ||
        h.solicitante?.toLowerCase() === nick
    ).sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    document.getElementById('badgeHistorico').textContent = items.length;

    const container = document.getElementById('historicoList');
    if (!items.length) {
        container.innerHTML = emptyState('Nenhuma ação ou histórico encontrado');
        return;
    }

    const tipoMap = {
        'promocao': { label: 'Promoção', cls: 'ac-tipo-promocao', icon: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>', emojiLabel: 'Promoção' },
        'advertencia': { label: 'Advertência', cls: 'ac-tipo-advertencia', icon: '<path d="m10.29 3.86-8.5 14.73A2 2 0 0 0 3.5 22h17a2 2 0 0 0 1.71-3l-8.5-14.86a2 2 0 0 0-3.42.72z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', emojiLabel: '⚠️ Advertência' },
        'elogio': { label: 'Elogio', cls: 'ac-tipo-elogio', icon: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>', emojiLabel: '👏 Elogio' },
        'rebaixamento': { label: 'Rebaixamento', cls: 'ac-tipo-rebaixamento', icon: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>', emojiLabel: 'Rebaixamento' },
        'aula': { label: 'Aula', cls: 'ac-tipo-aula', icon: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>', emojiLabel: '📋 Aula' },
        'demissao': { label: 'Demissão', cls: 'ac-tipo-advertencia', icon: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', emojiLabel: 'Demissão' },
    };

    container.innerHTML = items.map(h => {
        const tipo = tipoMap[h.tipo] || { label: h.tipo || 'Ação', cls: 'ac-tipo-elogio', icon: '<circle cx="12" cy="12" r="10"/>', emojiLabel: 'Ação' };
        const performer = h.aprovador || h.solicitante || h.recrutador || 'Sistema';

        return `
        <div class="feed-card">
            <div class="feed-header">
                <img class="feed-avatar" src="${avMedium(performer)}" alt="${performer}" onerror="this.src='https://via.placeholder.com/48'">
                <div class="feed-info">
                    <strong>${performer}</strong> publicou uma <span>${tipo.label.toLowerCase()}</span>
                    <span class="feed-date">${fmtDateTimePortuguese(h.data)}</span>
                </div>
            </div>
            <div class="feed-body">
                <div class="feed-tag">
                    ${tipo.emojiLabel}
                    ${h.cargo ? ` - ${h.cargo}` : ''}
                    ${h.patenteAnterior && h.patenteNova ? ` (${h.patenteAnterior} → ${h.patenteNova})` : ''}
                    <span class="status-pill ${h.aprovador ? 'aprovado' : 'pendente'}">${h.aprovador ? 'Aprovado' : 'Registrado'}</span>
                </div>
                ${h.motivo ? `<p class="feed-desc">${h.motivo}</p>` : ''}
                ${h.obs ? `<p class="feed-desc">${h.obs}</p>` : ''}
            </div>
        </div>`;
    }).join('');
}

/* ── populate aulas e diplomas tab ───────── */
function buildAulas() {
    const nick = found.nick.toLowerCase();
    const myAulas = aulas
        .filter(a => a.instrutor?.toLowerCase() === nick || a.militar?.toLowerCase() === nick)
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    document.getElementById('badgeAulas').textContent = myAulas.length;

    const container = document.getElementById('aulasList');
    if (!myAulas.length) {
        container.innerHTML = emptyState('Nenhuma aula registrada');
        return;
    }

    container.innerHTML = myAulas.map(a => {
        const isInstrutor = a.instrutor?.toLowerCase() === nick;
        const role = isInstrutor ? 'Instrutor' : 'Aluno';
        const otherNick = isInstrutor ? (a.militar || 'Desconhecido') : (a.instrutor || 'Desconhecido');

        return `
        <div class="feed-card">
            <div class="feed-header">
                <img class="feed-avatar" src="${avMedium(otherNick)}" alt="${otherNick}" onerror="this.src='https://via.placeholder.com/48'">
                <div class="feed-info">
                    <strong>${otherNick}</strong> ${isInstrutor ? 'assistiu sua aula' : 'participou de sua aula'}
                    <span class="feed-date">${fmtDateTimePortuguese(a.data)}</span>
                </div>
            </div>
            <div class="feed-body">
                <div class="feed-tag">
                    📚 ${a.materia || 'Aula'} ${a.nota ? `- Nota: ${a.nota}` : ''}
                    <span class="status-pill ${a.aprovado ? 'aprovado' : 'pendente'}">${a.aprovado ? 'Aprovado' : 'Registrado'}</span>
                </div>
                ${a.obs ? `<p class="feed-desc">${a.obs}</p>` : ''}
            </div>
        </div>`;
    }).join('');
}

/* ── populate gratificacoes tab ─────────── */
function buildGratificacoes() {
    const nick = found.nick.toLowerCase();
    const myGrats = gratificacoes
        .filter(g => g.beneficiario?.toLowerCase() === nick)
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    document.getElementById('badgeGratificacoes').textContent = myGrats.length;

    const container = document.getElementById('gratificacoesList');
    if (!myGrats.length) {
        container.innerHTML = emptyState('Nenhuma gratificação recebida');
        return;
    }

    container.innerHTML = myGrats.map(g => `
        <div class="feed-card">
            <div class="feed-header">
                <img class="feed-avatar" src="${avMedium(g.concedente || 'Admin')}" alt="${g.concedente || 'Admin'}" onerror="this.src='https://via.placeholder.com/48'">
                <div class="feed-info">
                    <strong>${g.concedente || 'Administração'}</strong> concedeu uma gratificação
                    <span class="feed-date">${fmtDateTimePortuguese(g.data)}</span>
                </div>
            </div>
            <div class="feed-body">
                <div class="feed-tag">
                    🏆 ${g.tipo || 'Gratificação'}
                    <span class="status-pill aprovado">Concedida</span>
                </div>
                ${g.motivo ? `<p class="feed-desc">${g.motivo}</p>` : ''}
            </div>
        </div>`;
    }).join('');
}

/* ── populate funcoes tab ──────────────────── */
function buildFuncoes() {
    const nick = found.nick.toLowerCase();
    // Funcoes can come from various sources; consolidate from records
    const funcoes = [];

    // Extract from militar/empresarial records
    if (found.cargo) {
        funcoes.push({
            cargo: found.cargo,
            corpo: empresarial.some(m => m.nick?.toLowerCase() === nick) ? 'Empresarial' : 'Militar',
            data: found.dataCadastro || found.desde,
        });
    }

    // Could also come from historico promotions/demotions
    const promotions = historico.filter(h =>
        (h.tipo === 'promocao' || h.tipo === 'rebaixamento') &&
        h.militar?.toLowerCase() === nick
    );

    document.getElementById('badgeFuncoes').textContent = funcoes.length + promotions.length;

    const container = document.getElementById('funcoesList');
    if (!funcoes.length && !promotions.length) {
        container.innerHTML = emptyState('Nenhuma função registrada');
        return;
    }

    const html = funcoes.map(f => `
        <div class="feed-card">
            <div class="feed-header">
                <div class="feed-info">
                    <strong>${f.cargo}</strong>
                    <span class="feed-date">Desde ${fmtDateTimePortuguese(f.data)}</span>
                </div>
            </div>
            <div class="feed-body">
                <div class="feed-tag">
                    💼 ${f.corpo}
                    <span class="status-pill aprovado">Ativo</span>
                </div>
            </div>
        </div>`).join('');

    container.innerHTML = html || '<div class="empty-panel"><p>Nenhuma função registrada</p></div>';
}

/* ── populate aquisicoes tab ──────────────── */
function buildAquisicoes() {
    const nick = found.nick.toLowerCase();
    const aquisicoes = JSON.parse(localStorage.getItem('dme_aquisicoes')) || [];
    const myAquisicoes = aquisicoes
        .filter(a => a.usuario?.toLowerCase() === nick)
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    document.getElementById('badgeAquisicoes').textContent = myAquisicoes.length;

    const container = document.getElementById('aquisicoesList');
    if (!myAquisicoes.length) {
        container.innerHTML = emptyState('Nenhuma aquisição registrada');
        return;
    }

    container.innerHTML = myAquisicoes.map(a => `
        <div class="feed-card">
            <div class="feed-header">
                <div class="feed-info">
                    <strong>${a.item || 'Item'}</strong>
                    <span class="feed-date">${fmtDateTimePortuguese(a.data)}</span>
                </div>
            </div>
            <div class="feed-body">
                <div class="feed-tag">
                    📦 ${a.categoria || 'Geral'}
                    ${a.valor ? `- R$ ${a.valor}` : ''}
                    <span class="status-pill aprovado">Adquirido</span>
                </div>
                ${a.obs ? `<p class="feed-desc">${a.obs}</p>` : ''}
            </div>
        </div>`).join('');
}

/* ── populate turnos tab ─────────────────── */
function buildTurnos() {
    const nick = found.nick.toLowerCase();
    const myTurnos = turnos
        .filter(t => t.usuario?.toLowerCase() === nick)
        .sort((a, b) => new Date(b.inicio || 0) - new Date(a.inicio || 0));

    document.getElementById('badgeTurnos').textContent = myTurnos.length;

    const container = document.getElementById('turnosList');
    if (!myTurnos.length) {
        container.innerHTML = emptyState('Nenhum turno registrado');
        return;
    }

    container.innerHTML = myTurnos.map(t => `
        <div class="turno-row">
            <span class="turno-date">${fmtDateTime(t.inicio)}</span>
            <span class="turno-setor">${t.setor || 'Geral'}</span>
            <span class="turno-dur">${fmt(t.duracao || 0)}</span>
        </div>`).join('');
}

/* ── tab switch ──────────────────────────── */
function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
}
window.switchTab = switchTab;

/* ── utils ──────────────────────────────── */
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function emptyState(msg) {
    return `<div class="empty-panel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>${msg}</p>
    </div>`;
}

/* ── copiar info listagem ────────────────── */
function copiarInfoListagem() {
    const nick = found.nick;
    const extra = document.getElementById('infoListagem').textContent;
    if (!extra || extra === '—') return;

    const texto = `${nick} ${extra}`;

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btnCopiarListagem');
        const orig = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>`;
        btn.style.borderColor = 'var(--green)';
        btn.style.color = 'var(--green)';
        setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = ''; btn.style.color = ''; }, 1500);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
    });
}
window.copiarInfoListagem = copiarInfoListagem;

/* ── init ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initSidebar();
    buildSidebar();
    buildHistorico();
    buildAulas();
    buildGratificacoes();
    buildFuncoes();
    buildAquisicoes();
    buildTurnos();
});
