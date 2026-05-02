/**
 * HOME.JS — DME System v2
 *
 * Migrado para consumir a API backend em vez de localStorage.
 * - Autenticação via cookie httpOnly + GET /api/auth/me
 * - Dados de militares, turnos, aulas, recrutamentos via API
 * - localStorage usado APENAS para tema e turno ativo local
 */

/* ── estado global carregado pela API ───────────── */
let currentUser = null;   // { nick, patente, corpo, status, role }
let militaresCache = [];  // lista de todos os militares
let turnosCache = [];     // todos os turnos
let aulasCache = [];      // todas as aulas
let recrutamentosCache = [];
let configCache = {};     // config do sistema (destaques etc.)
let requerimentosCache = []; // historico de requerimentos

/* ── helpers ─────────────────────────────────── */
const av = nick =>
  `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&headonly=1&size=m`;

const avFull = (nick, dir = 2, hdir = 2, action = 'std') =>
    `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=l&action=${action}`;

function getPatente(nick) {
    const m = militaresCache.find(x => x.nick?.toLowerCase() === nick?.toLowerCase());
    return m?.patente || 'Militar';
}

function fmt(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
}

function getPessoasExemplo() {
    const real = militaresCache.map(m => m.nick).filter(Boolean);
    if (real.length >= 4) return real;
    return ['Valdlir25', 'Jodie-Foster', 'Mysticol', 'Bachr', 'ON_KEEL', 'chicosorvetes',
        'Elohimzinho', 'limitados', 'rafacv', 'unloav', 'Leticinha-_-', 'Horcrux-',
        'FelipeME45', 'Archie-', 'DiegoDME'];
}

/* ── API helper ─────────────────────────────── */
async function apiFetch(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.status === 401) {
        window.location.href = '/login';
        return null;
    }
    if (!res.ok) return null;
    const json = await res.json();
    return json;
}

/* ── logout via API ─────────────────────────── */
async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/login';
}
window.logout = logout;

/* ── navbar ──────────────────────────────────── */
function initNavbar() {
    const username = currentUser.nick;
    document.getElementById('navUserName').textContent = username;
    document.getElementById('navUserImage').src = av(username);
    document.getElementById('dropdownUserImage').src = avFull(username);
    document.getElementById('dropdownName').textContent = username;

    if (currentUser.role === 'admin') {
        document.getElementById('dropdownPainel').style.display = 'flex';
        document.getElementById('dropdownDivider').style.display = 'block';
    }

    const el = document.getElementById('themeText');
    if (el) el.textContent = (localStorage.getItem('dme_theme') || 'dark') === 'light'
        ? 'Modo Escuro' : 'Modo Claro';
}

/* ── sidebar ──────────────────────────────────── */
function initSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };

    document.getElementById('hamburger').addEventListener('click', toggle);
    document.getElementById('sidebarClose').addEventListener('click', toggle);
    overlay.addEventListener('click', toggle);
}

/* ── dropdown ─────────────────────────────────── */
function initDropdown() {
    const btn = document.getElementById('userProfileBtn');
    const drop = document.getElementById('userDropdown');

    btn.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('active'); });
    document.addEventListener('click', e => { if (!btn.contains(e.target)) drop.classList.remove('active'); });
    drop.addEventListener('click', e => e.stopPropagation());
}

/* ── banner carrossel ─────────────────────────── */
let bIdx = 0;
function initBanner() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.bdot');

    function goSlide(i) {
        slides.forEach((s, j) => s.classList.toggle('on', j === i));
        dots.forEach((d, j) => d.classList.toggle('on', j === i));
        bIdx = i;
    }

    document.getElementById('bNext')?.addEventListener('click', () => goSlide((bIdx + 1) % slides.length));
    document.getElementById('bPrev')?.addEventListener('click', () => goSlide((bIdx - 1 + slides.length) % slides.length));
    dots.forEach((d, i) => d.addEventListener('click', () => goSlide(i)));

    setInterval(() => goSlide((bIdx + 1) % (document.querySelectorAll('.slide').length)), 5500);
}

function carregarDestaques() {
    if (configCache.treinadorDestaque) {
        const img = document.getElementById('treinadorDestaqueImg');
        const name = document.getElementById('treinadorDestaqueName');
        if (img) img.src = avFull(configCache.treinadorDestaque, 4, 4);
        if (name) name.textContent = configCache.treinadorDestaque;
    }
    if (configCache.supervisorDestaque) {
        const img = document.getElementById('supervisorDestaqueImg');
        const name = document.getElementById('supervisorDestaqueName');
        if (img) img.src = avFull(configCache.supervisorDestaque, 2, 2);
        if (name) name.textContent = configCache.supervisorDestaque;
    }
}

/* ── filtros noticias ─────────────────────────── */
function initFiltros() {
    const filtros = document.querySelectorAll('.filtro');
    const items = document.querySelectorAll('#noticiasFeed .noticia');

    filtros.forEach(btn => btn.addEventListener('click', () => {
        filtros.forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        const cat = btn.dataset.cat;
        items.forEach(item => {
            const show = cat === 'all' || item.dataset.cat === cat;
            item.style.display = show ? '' : 'none';
            if (show) {
                item.animate(
                    [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 200, easing: 'ease', fill: 'forwards' }
                );
            }
        });
    }));
}

/* ── status ponto ─────────────────────────────── */
function syncPonto() {
    const ativo = JSON.parse(localStorage.getItem('dme_turno_ativo'));
    const el = document.getElementById('qPonto');
    if (!el) return;
    const on = !!(ativo && ativo.usuario === currentUser.nick);
    el.classList.toggle('active', on);
}

/* ── busca rapida (agora via API) ────────────── */
function initBusca() {
    document.getElementById('btnSearch').addEventListener('click', buscar);
    document.getElementById('searchInput').addEventListener('keypress', e => { if (e.key === 'Enter') buscar(); });
}

async function buscar() {
    const nick = document.getElementById('searchInput').value.trim();
    if (nick.length < 3) { alert('Digite pelo menos 3 caracteres'); return; }

    const res = document.getElementById('searchResult');

    // Buscar na API
    const result = await apiFetch(`/api/militares/${encodeURIComponent(nick)}`);

    if (result && result.ok && result.data) {
        const militar = result.data;
        const corpo = (militar.corpo || 'militar').toLowerCase() === 'empresarial' ? 'Empresarial' : 'Militar';
        const prefix = corpo === 'Empresarial' ? '[EMP]' : '[MIL]';

        const desde = militar.created_at || '';
        const fromDate = desde ? (() => {
            const d = new Date(desde);
            return isNaN(d) ? desde : d.toLocaleDateString('pt-BR');
        })() : '\u2014';

        document.getElementById('resultAvatar').src = avFull(nick);
        document.getElementById('resultNick').textContent = militar.nick;
        document.getElementById('resultSubline').textContent = `${militar.nick} ${prefix} \u2022 ${fromDate}`;
        document.getElementById('resultPatente').textContent = militar.patente || '\u2014';
        document.getElementById('resultTag').textContent = militar.tag || 'DME';
        document.getElementById('resultStatus').textContent = militar.status || 'Ativo';
        document.getElementById('resultDesde').textContent = fromDate;
        document.getElementById('resultPerfilBtn').href = `/perfil?nick=${encodeURIComponent(militar.nick)}`;

        res.style.display = 'block';
    } else {
        alert('Militar nao encontrado!');
        res.style.display = 'none';
    }
}

/* ── ranking semanal ──────────────────────────── */
let semOffset = 0;

function semanaRange(offset) {
    const hoje = new Date();
    const ini = new Date(hoje);
    ini.setDate(hoje.getDate() - hoje.getDay() + offset * 7);
    ini.setHours(0, 0, 0, 0);
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6); fim.setHours(23, 59, 59, 999);
    return { ini, fim };
}

function dd(d) { return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; }

function renderRanking() {
    const { ini, fim } = semanaRange(semOffset);
    document.getElementById('weekLabel').textContent = `${dd(ini)} \u2013 ${dd(fim)}`;

    const horas = {};
    turnosCache.forEach(t => {
        if (!t.usuario || !t.duracao || !t.inicio) return;
        const d = new Date(t.inicio);
        if (d >= ini && d <= fim)
            horas[t.usuario] = (horas[t.usuario] || 0) + t.duracao;
    });

    let rank = Object.entries(horas).sort((a, b) => b[1] - a[1]).slice(0, 15);

    if (rank.length < 3) {
        const ex = getPessoasExemplo();
        rank = ex.slice(0, 15).map((nick, i) => [nick, 480 - i * 30]);
    }

    const medalhas = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    const topCls = ['top1', 'top2', 'top3'];

    document.getElementById('rankingList').innerHTML = rank.map(([nick, mins], i) => `
        <div class="rank-item ${topCls[i] || ''}">
            <span class="ri-pos">${i < 3 ? medalhas[i] : (i + 1) + '\u00BA'}</span>
            <div class="ri-av"><img src="${av(nick)}" alt="${nick}" loading="lazy" title="${nick}"></div>
            <div class="ri-info">
                <div class="ri-name" title="${nick}">${nick}</div>
                <div class="ri-sub">${getPatente(nick)}</div>
            </div>
            <span class="ri-val">${fmt(mins)}</span>
        </div>`).join('');

    renderOficiais();
}

document.getElementById('weekPrev').addEventListener('click', () => { semOffset--; renderRanking(); });
document.getElementById('weekNext').addEventListener('click', () => { if (semOffset < 0) { semOffset++; renderRanking(); } });

/* ── oficiais do mes ──────────────────────────── */
function renderOficiais() {
    const now = new Date(), mes = now.getMonth(), ano = now.getFullYear();
    const hm = {};

    turnosCache.forEach(t => {
        if (!t.usuario || !t.duracao || !t.inicio) return;
        const d = new Date(t.inicio);
        if (d.getMonth() === mes && d.getFullYear() === ano)
            hm[t.usuario] = (hm[t.usuario] || 0) + t.duracao;
    });

    let rank = Object.entries(hm).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (rank.length < 3) {
        const ex = getPessoasExemplo();
        rank = ex.slice(0, 8).map((nick, i) => [nick, 1900 - i * 175]);
    }

    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49', '\u2B50', '\u2B50', '\u2B50', '\u2B50', '\u2B50'];

    document.getElementById('oficiaisList').innerHTML = rank.map(([nick, mins], i) => `
        <div class="of-item">
            <span class="of-medal">${medals[i]}</span>
            <div class="of-av"><img src="${av(nick)}" alt="${nick}" loading="lazy" title="${nick}"></div>
            <div class="of-info">
                <div class="of-name" title="${nick}">${nick}</div>
                <div class="of-cargo">${getPatente(nick)}</div>
            </div>
            <span class="of-val">${fmt(mins)}</span>
        </div>`).join('');
}

/* ── stats 4 colunas ──────────────────────────── */
function renderStats() {
    const ex = getPessoasExemplo();

    // Promocoes (do cache de requerimentos tipo promocao)
    const pc = {};
    requerimentosCache.forEach(h => { if (h.aprovador) pc[h.aprovador] = (pc[h.aprovador] || 0) + 1; });
    let pR = Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (pR.length < 3) pR = ex.slice(0, 3).map((n, i) => [n, 12 - i * 3]);
    statCard('statsPromocoes', pR);

    // Recrutamentos
    const rc = {};
    recrutamentosCache.forEach(r => { if (r.recrutador) rc[r.recrutador] = (rc[r.recrutador] || 0) + 1; });
    let rR = Object.entries(rc).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (rR.length < 3) rR = ex.slice(2, 5).map((n, i) => [n, 48 - i * 6]);
    statCard('statsRecrutamentos', rR);

    // Horas do mes
    const now = new Date(), mes = now.getMonth(), ano = now.getFullYear();
    const hm = {};
    turnosCache.forEach(t => {
        if (!t.usuario || !t.duracao || !t.inicio) return;
        const d = new Date(t.inicio);
        if (d.getMonth() === mes && d.getFullYear() === ano)
            hm[t.usuario] = (hm[t.usuario] || 0) + t.duracao;
    });
    let hR = Object.entries(hm).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, m]) => [n, fmt(m)]);
    if (hR.length < 3) hR = [[ex[4] || 'ON_KEEL', '320h'], [ex[0] || 'Valdlir25', '298h'], [ex[2] || 'Mysticol', '270h']];
    statCard('statsHoras', hR);

    // Aulas
    const ac = {};
    aulasCache.forEach(a => { if (a.instrutor) ac[a.instrutor] = (ac[a.instrutor] || 0) + 1; });
    let aR = Object.entries(ac).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (aR.length < 3) aR = ex.slice(5, 8).map((n, i) => [n, 34 - i * 4]);
    statCard('statsAulas', aR);
}

function statCard(id, data) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!data || !data.length) {
        el.innerHTML = '<div style="padding:12px 10px;text-align:center;font-size:.67rem;color:var(--t3)">Sem dados</div>';
        return;
    }
    el.innerHTML = data.map(([nick, val]) => `
        <div class="sc-row">
            <div class="sc-av"><img src="${av(nick)}" alt="${nick}" loading="lazy" title="${nick}"></div>
            <span class="sc-nick" title="${nick}">${nick}</span>
            <span class="sc-val">${val}</span>
        </div>`).join('');
}

/* ── INIT: carrega dados da API e inicializa ──── */
async function init() {
    // 1. Buscar usuario autenticado
    const meResult = await apiFetch('/api/auth/me');
    if (!meResult) return; // redirecionou para /login

    currentUser = meResult;

    // Expor o nick para outros scripts (notificacoes.js, chat_global.js)
    window.dmeCurrentUser = currentUser.nick;

    // 2. Carregar dados em paralelo
    const [militaresRes, turnosRes, aulasRes, recrutsRes, configRes, reqsRes] = await Promise.all([
        apiFetch('/api/militares'),
        apiFetch('/api/turnos'),
        apiFetch('/api/aulas'),
        apiFetch('/api/recrutamentos'),
        apiFetch('/api/config'),
        apiFetch('/api/requerimentos?tipo=promocao&aba=todos'),
    ]);

    militaresCache = militaresRes?.data || [];
    turnosCache = turnosRes?.data || [];
    aulasCache = aulasRes?.data || [];
    recrutamentosCache = recrutsRes?.data || [];
    configCache = configRes?.data || {};
    requerimentosCache = reqsRes?.data || [];

    // 3. Inicializar componentes da pagina
    initNavbar();
    initSidebar();
    initDropdown();
    initBanner();
    initBusca();
    initFiltros();
    carregarDestaques();
    renderRanking();
    renderStats();
    syncPonto();
    setInterval(syncPonto, 30000);
}

document.addEventListener('DOMContentLoaded', init);
