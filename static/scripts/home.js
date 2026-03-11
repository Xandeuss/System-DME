/* ── auth guard ─────────────────────────────── */
const username = localStorage.getItem('dme_username');
if (!username) location.href = '/login';

function logout() {
    localStorage.removeItem('dme_username');
    location.href = '/login';
}

/* ── helpers ─────────────────────────────────── */
// Headonly médio: melhor para chips de 30px
const av = nick =>
    `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&headonly=1&size=m`;

// Full body para banner e busca
const avFull = (nick, dir = 2, hdir = 2, action = 'std') =>
    `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=l&action=${action}`;

function getMilitares() {
    return [
        ...(JSON.parse(localStorage.getItem('dme_militar')) || []),
        ...(JSON.parse(localStorage.getItem('dme_empresarial')) || [])
    ];
}

function getPessoasExemplo() {
    const real = getMilitares().map(m => m.nick).filter(Boolean);
    if (real.length >= 4) return real;
    return ['Valdlir25', 'Jodie-Foster', 'Mysticol', 'Bachr', 'ON_KEEL', 'chicosorvetes',
        'Elohimzinho', 'limitados', 'rafacv', 'unloav', 'Leticinha-_-', 'Horcrux-',
        'FelipeME45', 'Archie-', 'DiegoDME'];
}

function getPatente(nick) {
    const m = getMilitares().find(x => x.nick?.toLowerCase() === nick?.toLowerCase());
    return m?.patente || 'Militar';
}

function fmt(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
}

/* ── navbar ──────────────────────────────────── */
function initNavbar() {
    document.getElementById('navUserName').textContent = username;
    document.getElementById('navUserImage').src = avFull(username);
    document.getElementById('dropdownUserImage').src = avFull(username);
    document.getElementById('dropdownName').textContent = username;

    const admins = JSON.parse(localStorage.getItem('dme_admins')) || [username];
    if (admins.includes(username)) {
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
    const cfg = JSON.parse(localStorage.getItem('dme_config')) || {};

    if (cfg.treinadorDestaque) {
        const img = document.getElementById('treinadorDestaqueImg');
        const name = document.getElementById('treinadorDestaqueName');
        if (img) img.src = avFull(cfg.treinadorDestaque, 4, 4);
        if (name) name.textContent = cfg.treinadorDestaque;
    }
    if (cfg.supervisorDestaque) {
        const img = document.getElementById('supervisorDestaqueImg');
        const name = document.getElementById('supervisorDestaqueName');
        if (img) img.src = avFull(cfg.supervisorDestaque, 2, 2);
        if (name) name.textContent = cfg.supervisorDestaque;
    }
}

/* ── filtros notícias ─────────────────────────── */
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
    const on = !!(ativo && ativo.usuario === username);
    el.classList.toggle('active', on);
}

/* ── busca rápida ─────────────────────────────── */
function initBusca() {
    document.getElementById('btnSearch').addEventListener('click', buscar);
    document.getElementById('searchInput').addEventListener('keypress', e => { if (e.key === 'Enter') buscar(); });
}

function buscar() {
    const nick = document.getElementById('searchInput').value.trim();
    if (nick.length < 3) { alert('Digite pelo menos 3 caracteres'); return; }

    const todos = getMilitares();
    const emp = JSON.parse(localStorage.getItem('dme_empresarial')) || [];
    const hist = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
    const militar = todos.find(m => m.nick?.toLowerCase() === nick.toLowerCase());
    const res = document.getElementById('searchResult');

    if (militar) {
        const isEmp = emp.some(m => m.nick?.toLowerCase() === nick.toLowerCase());
        const corpo = isEmp ? 'Empresarial' : 'Militar';
        const prefix = isEmp ? '[EMP]' : '[MIL]';

        // formatar data membro
        const desde = militar.desde || militar.dataCadastro || '';
        const fromDate = desde ? (() => {
            const d = new Date(desde);
            return isNaN(d) ? desde : d.toLocaleDateString('pt-BR');
        })() : '—';

        // avatar full-body
        document.getElementById('resultAvatar').src = avFull(nick);

        // nick + sub-info
        document.getElementById('resultNick').textContent = nick;
        document.getElementById('resultSubline').textContent = `${nick} ${prefix} • ${fromDate}`;

        // rows
        document.getElementById('resultPatente').textContent = militar.patente || '—';
        document.getElementById('resultTag').textContent = militar.tag || 'DME';
        document.getElementById('resultStatus').textContent = militar.status || 'Ativo';
        document.getElementById('resultDesde').textContent = fromDate;

        // botão perfil
        document.getElementById('resultPerfilBtn').href = `/perfil?nick=${encodeURIComponent(nick)}`;

        res.style.display = 'block';
    } else {
        alert('Militar não encontrado!');
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
    document.getElementById('weekLabel').textContent = `${dd(ini)} – ${dd(fim)}`;

    const turnos = JSON.parse(localStorage.getItem('dme_turnos')) || [];
    const horas = {};
    turnos.forEach(t => {
        if (!t.usuario || !t.duracao || !t.inicio) return;
        const d = new Date(t.inicio);
        if (d >= ini && d <= fim)
            horas[t.usuario] = (horas[t.usuario] || 0) + t.duracao;
    });

    let rank = Object.entries(horas).sort((a, b) => b[1] - a[1]).slice(0, 15);

    // fallback com exemplos realistas
    if (rank.length < 3) {
        const ex = getPessoasExemplo();
        rank = ex.slice(0, 15).map((nick, i) => [nick, 480 - i * 30]);
    }

    const medalhas = ['🥇', '🥈', '🥉'];
    const topCls = ['top1', 'top2', 'top3'];

    document.getElementById('rankingList').innerHTML = rank.map(([nick, mins], i) => `
        <div class="rank-item ${topCls[i] || ''}">
            <span class="ri-pos">${i < 3 ? medalhas[i] : (i + 1) + 'º'}</span>
            <div class="ri-av"><img src="${av(nick)}" alt="${nick}" loading="lazy" title="${nick}"></div>
            <div class="ri-info">
                <div class="ri-name" title="${nick}">${nick}</div>
                <div class="ri-sub">${getPatente(nick)}</div>
            </div>
            <span class="ri-val">${fmt(mins)}</span>
        </div>`).join('');

    renderOficiais(rank);
}

document.getElementById('weekPrev').addEventListener('click', () => { semOffset--; renderRanking(); });
document.getElementById('weekNext').addEventListener('click', () => { if (semOffset < 0) { semOffset++; renderRanking(); } });

/* ── oficiais do mês ──────────────────────────── */
function renderOficiais(rankRef) {
    const turnos = JSON.parse(localStorage.getItem('dme_turnos')) || [];
    const now = new Date(), mes = now.getMonth(), ano = now.getFullYear();
    const hm = {};

    turnos.forEach(t => {
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

    const medals = ['🥇', '🥈', '🥉', '⭐', '⭐', '⭐', '⭐', '⭐'];

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
    const hist = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
    const turns = JSON.parse(localStorage.getItem('dme_turnos')) || [];
    const aulas = JSON.parse(localStorage.getItem('dme_aulas')) || [];
    const recrs = JSON.parse(localStorage.getItem('dme_recrutamentos')) || [];
    const now = new Date(), mes = now.getMonth(), ano = now.getFullYear();
    const ex = getPessoasExemplo();

    // Promoções
    const pc = {};
    hist.forEach(h => { if (h.tipo === 'promocao' && h.aprovador) pc[h.aprovador] = (pc[h.aprovador] || 0) + 1; });
    let pR = Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (pR.length < 3) pR = ex.slice(0, 3).map((n, i) => [n, 12 - i * 3]);
    statCard('statsPromocoes', pR);

    // Recrutamentos
    const rc = {};
    recrs.forEach(r => { if (r.recrutador) rc[r.recrutador] = (rc[r.recrutador] || 0) + 1; });
    hist.forEach(h => { if (h.tipo === 'recrutamento' && h.recrutador) rc[h.recrutador] = (rc[h.recrutador] || 0) + 1; });
    let rR = Object.entries(rc).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (rR.length < 3) rR = ex.slice(2, 5).map((n, i) => [n, 48 - i * 6]);
    statCard('statsRecrutamentos', rR);

    // Horas do mês
    const hm = {};
    turns.forEach(t => {
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
    aulas.forEach(a => { if (a.instrutor) ac[a.instrutor] = (ac[a.instrutor] || 0) + 1; });
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

/* ── INIT ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
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
});
