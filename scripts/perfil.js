/* ── auth guard ──────────────────────────── */
const loggedUser = localStorage.getItem('dme_username');
if (!loggedUser) location.href = 'login.html';

function logout() { localStorage.removeItem('dme_username'); location.href = 'login.html'; }

/* ── helpers ─────────────────────────────── */
const avFull = (nick, dir = 2, hdir = 2) =>
    `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=l&action=std`;

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

/* ── get nick from URL ───────────────────── */
const params = new URLSearchParams(location.search);
const targetNick = params.get('nick') || '';

/* ── data sources ────────────────────────── */
const militar = JSON.parse(localStorage.getItem('dme_militar')) || [];
const empresarial = JSON.parse(localStorage.getItem('dme_empresarial')) || [];
const historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
const turnos = JSON.parse(localStorage.getItem('dme_turnos')) || [];
const aulas = JSON.parse(localStorage.getItem('dme_aulas')) || [];
const recrutamentos = JSON.parse(localStorage.getItem('dme_recrutamentos')) || [];

const todos = [...militar, ...empresarial];
const found = todos.find(m => m.nick?.toLowerCase() === targetNick.toLowerCase());

if (!targetNick || !found) {
    // Militar não encontrado — redireciona
    alert('Militar não encontrado. Voltando para a home.');
    location.href = 'home.html';
}

/* ── navbar ──────────────────────────────── */
function initNavbar() {
    const av = (nick, dir = 2, hdir = 2) =>
        `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=m&action=std`;
    document.getElementById('navUserName').textContent = loggedUser;
    document.getElementById('navUserImage').src = av(loggedUser);
    document.getElementById('dropdownUserImage').src = av(loggedUser);
    document.getElementById('dropdownName').textContent = loggedUser;

    const admins = JSON.parse(localStorage.getItem('dme_admins')) || [loggedUser];
    if (admins.includes(loggedUser)) {
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

    // breadcrumb & title
    document.title = `${nick} — DME System`;
    document.getElementById('breadNick').textContent = nick;

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

/* ── populate about tab ──────────────────── */
function buildAbout() {
    const nick = found.nick;
    const corp = empresarial.some(m => m.nick?.toLowerCase() === nick.toLowerCase()) ? 'Empresarial' : 'Militar';
    const desde = found.desde || found.dataCadastro || '—';

    const totalHoras = turnos
        .filter(t => t.usuario?.toLowerCase() === nick.toLowerCase())
        .reduce((s, t) => s + (t.duracao || 0), 0);
    const promoCount = historico.filter(h => h.tipo === 'promocao' && h.militar?.toLowerCase() === nick.toLowerCase()).length;

    setText('aboutNick', nick);
    setText('aboutPatente', found.patente || '—');
    setText('aboutCorp', corp);
    setText('aboutStatus', found.status || 'Ativo');
    setText('aboutTag', found.tag || 'DME');
    setText('aboutDesde', fmtDate(desde));
    setText('aboutHoras', totalHoras ? fmt(totalHoras) : '—');
    setText('aboutPromocoes', promoCount || '—');
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
        container.innerHTML = emptyState('Nenhuma ação ou histórico encontrado para este militar');
        return;
    }

    const tipoMap = {
        'promocao': { label: 'Promoção', cls: 'ac-tipo-promocao', icon: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
        'advertencia': { label: 'Advertência', cls: 'ac-tipo-advertencia', icon: '<path d="m10.29 3.86-8.5 14.73A2 2 0 0 0 3.5 22h17a2 2 0 0 0 1.71-3l-8.5-14.86a2 2 0 0 0-3.42.72z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
        'elogio': { label: 'Elogio', cls: 'ac-tipo-elogio', icon: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>' },
        'rebaixamento': { label: 'Rebaixamento', cls: 'ac-tipo-rebaixamento', icon: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>' },
        'aula': { label: 'Aula', cls: 'ac-tipo-aula', icon: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>' },
        'demissao': { label: 'Demissão', cls: 'ac-tipo-advertencia', icon: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' },
    };

    container.innerHTML = items.map(h => {
        const tipo = tipoMap[h.tipo] || { label: h.tipo || 'Ação', cls: 'ac-tipo-elogio', icon: '<circle cx="12" cy="12" r="10"/>' };
        return `
        <div class="action-card">
            <div class="ac-head">
                <span class="ac-type ${tipo.cls}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${tipo.icon}</svg>
                    ${tipo.label}
                </span>
                <span class="ac-date">${fmtDateTime(h.data)}</span>
            </div>
            <div class="ac-body">
                ${h.militar ? `<div class="ac-row"><span class="ac-row-lbl">Militar</span><span class="ac-row-val">${h.militar}</span></div>` : ''}
                ${h.cargo ? `<div class="ac-row"><span class="ac-row-lbl">Cargo</span><span class="ac-row-val">${h.cargo}</span></div>` : ''}
                ${h.patenteAnterior ? `<div class="ac-row"><span class="ac-row-lbl">De</span><span class="ac-row-val">${h.patenteAnterior}</span></div>` : ''}
                ${h.patenteNova ? `<div class="ac-row"><span class="ac-row-lbl">Para</span><span class="ac-row-val">${h.patenteNova}</span></div>` : ''}
                ${h.aprovador ? `<div class="ac-row"><span class="ac-row-lbl">Aprovador</span><span class="ac-row-val">${h.aprovador}</span></div>` : ''}
                ${h.recrutador ? `<div class="ac-row"><span class="ac-row-lbl">Recrutador</span><span class="ac-row-val">${h.recrutador}</span></div>` : ''}
                ${h.motivo ? `<div class="ac-obs">${h.motivo}</div>` : ''}
                ${h.obs ? `<div class="ac-obs">${h.obs}</div>` : ''}
            </div>
            ${h.aprovador ? `<div class="ac-footer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Aprovado por ${h.aprovador}
            </div>` : ''}
        </div>`;
    }).join('');
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
        document.getElementById('panel-turnos').innerHTML = emptyState('Nenhum turno registrado para este militar');
        return;
    }

    container.innerHTML = myTurnos.map(t => `
        <div class="turno-row">
            <span class="turno-date">${fmtDateTime(t.inicio)}</span>
            <span class="turno-setor">${t.setor || 'Geral'}</span>
            <span class="turno-dur">${fmt(t.duracao || 0)}</span>
        </div>`).join('');
}

/* ── populate aulas tab ──────────────────── */
function buildAulas() {
    const nick = found.nick.toLowerCase();
    const myAulas = aulas
        .filter(a => a.instrutor?.toLowerCase() === nick || a.militar?.toLowerCase() === nick)
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    document.getElementById('badgeAulas').textContent = myAulas.length;

    const container = document.getElementById('aulasList');
    if (!myAulas.length) {
        container.innerHTML = emptyState('Nenhuma aula registrada para este militar');
        return;
    }

    container.innerHTML = myAulas.map(a => `
        <div class="action-card">
            <div class="ac-head">
                <span class="ac-type ac-tipo-aula">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    Aula
                </span>
                <span class="ac-date">${fmtDateTime(a.data)}</span>
            </div>
            <div class="ac-body">
                ${a.materia ? `<div class="ac-row"><span class="ac-row-lbl">Matéria</span><span class="ac-row-val">${a.materia}</span></div>` : ''}
                ${a.instrutor ? `<div class="ac-row"><span class="ac-row-lbl">Instrutor</span><span class="ac-row-val">${a.instrutor}</span></div>` : ''}
                ${a.militar ? `<div class="ac-row"><span class="ac-row-lbl">Aluno</span><span class="ac-row-val">${a.militar}</span></div>` : ''}
                ${a.nota ? `<div class="ac-row"><span class="ac-row-lbl">Nota</span><span class="ac-row-val">${a.nota}</span></div>` : ''}
                ${a.obs ? `<div class="ac-obs">${a.obs}</div>` : ''}
            </div>
        </div>`).join('');
}

/* ── populate recrutamentos tab ──────────── */
function buildRecrutamentos() {
    const nick = found.nick.toLowerCase();
    const myRecs = recrutamentos
        .filter(r => r.recrutador?.toLowerCase() === nick || r.recrutado?.toLowerCase() === nick)
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    document.getElementById('badgeRecrutamentos').textContent = myRecs.length;

    const container = document.getElementById('recrutamentosList');
    if (!myRecs.length) {
        container.innerHTML = emptyState('Nenhum recrutamento encontrado para este militar');
        return;
    }

    container.innerHTML = myRecs.map(r => `
        <div class="action-card">
            <div class="ac-head">
                <span class="ac-type ac-tipo-recrutamento">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Recrutamento
                </span>
                <span class="ac-date">${fmtDateTime(r.data)}</span>
            </div>
            <div class="ac-body">
                ${r.recrutado ? `<div class="ac-row"><span class="ac-row-lbl">Recrutado</span><span class="ac-row-val">${r.recrutado}</span></div>` : ''}
                ${r.recrutador ? `<div class="ac-row"><span class="ac-row-lbl">Recrutador</span><span class="ac-row-val">${r.recrutador}</span></div>` : ''}
                ${r.corpo ? `<div class="ac-row"><span class="ac-row-lbl">Corpo</span><span class="ac-row-val">${r.corpo}</span></div>` : ''}
                ${r.obs ? `<div class="ac-obs">${r.obs}</div>` : ''}
            </div>
        </div>`).join('');
}

/* ── tab switch ──────────────────────────── */
function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
}
window.switchTab = switchTab; // expose globally (onclick)

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
    buildAbout();
    buildHistorico();
    buildTurnos();
    buildAulas();
    buildRecrutamentos();
});
