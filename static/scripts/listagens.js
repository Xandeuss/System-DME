// ── AUTH GUARD ────────────────────────────────────────
const username = localStorage.getItem('dme_username');
if (!username) window.location.href = '/login';

function logout() {
    localStorage.removeItem('dme_username');
    window.location.href = '/login';
}

// ── CACHE DE DADOS DA API ─────────────────────────────
let _dadosApi = {};
let _apiCarregada = false;

// Hierarquia para o Alto Comando Supremo
const hierarquiaAltoComando = {
    'Fundador': 100,
    'Supremo': 99,
    "Supremo Interino": 98,
};

async function carregarDadosApi() {
    try {
        const res = await fetch('/api/listagens');
        if (!res.ok) { console.error('API Error:', res.status); return; }
        const json = await res.json();
        _dadosApi = json.data || {};
        _apiCarregada = true;
    } catch (e) {
        console.warn('Falha ao carregar listagens da API:', e);
    }
}

// ── INIT UI ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navUserName').textContent = username;
    document.getElementById('dropdownName').textContent = username;

    document.getElementById('navUserImage').src =
        `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${username}&headonly=1&size=m&gesture=std&head_direction=2`;
    document.getElementById('dropdownUserImage').src =
        `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${username}&size=m&direction=2&head_direction=2&gesture=std`;

    const admins = JSON.parse(localStorage.getItem('dme_admins')) || ['Xandelicado', 'rafacv', 'Ronaldo'];
    if (admins.includes(username)) {
        document.getElementById('dropdownPainel').style.display = 'flex';
        document.getElementById('dropdownDivider').style.display = 'block';
    }

    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userProfileBtn) {
        userProfileBtn.onclick = (e) => { e.stopPropagation(); userDropdown.classList.toggle('active'); };
    }
    document.addEventListener('click', () => { if (userDropdown) userDropdown.classList.remove('active'); });

    const hamburger = document.getElementById('hamburger');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');
    function toggleSidebar() {
        mobileSidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }
    if (hamburger) hamburger.addEventListener('click', toggleSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    await carregarDadosApi();
    renderEscolha();
});

// ── HIERARQUIAS ───────────────────────────────────────
const hierarquiaMilitar = {
    'Comandante-Geral': 100, 'Comandante': 99, 'Subcomandante': 98, 'Marechal': 97,
    'General': 96, 'Coronel': 95, 'Tenente-Coronel': 94, 'Major': 93, 'Capitão': 92, 'Tenente': 91,
    'Aspirante a Oficial': 90, 'Subtenente': 80, 'Sargento': 70, 'Cabo': 60, 'Soldado': 50
};
const hierarquiaEmpresarial = {
    'Chanceler': 101, 'Presidente': 100, 'Vice-Presidente': 99, 'Ministro': 98, 'Comissário': 97,
    'Delegado': 96, 'Executivo': 95, 'Diretor': 94, 'Coordenador': 93, 'Supervisor': 92,
    'Escrivão': 91, 'Analista': 90, 'Inspetor': 80, 'Sócio': 70, 'Agente': 60
};
const listaOficiais = ['Comandante-Geral', 'Comandante', 'Subcomandante', 'Marechal', 'General', 'Coronel', 'Tenente-Coronel', 'Major', 'Capitão', 'Tenente'];

// ── CONFIGURAÇÃO DAS LISTAGENS ────────────────────────
const LISTAGENS_CONFIG = [
    {
        id: 'militar',
        label: 'Hierarquia Militar',
        desc: 'Corpo Militar completo por patente',
        hierarquia: hierarquiaMilitar,
        acento: 'green',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>`
    },
    {
        id: 'empresarial',
        label: 'Hierarquia Empresarial',
        desc: 'Corpo Empresarial por hierarquia',
        hierarquia: hierarquiaEmpresarial,
        acento: 'green',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>`
    },
    {
        id: 'alto_comando',
        label: 'Alto Comando Supremo',
        desc: 'Oficiais de alto escalão do DME',
        hierarquia: hierarquiaAltoComando,
        acento: 'gold',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>`
    },
    {
        id: 'cadetes',
        label: 'Cadetes',
        desc: 'Novos integrantes em formação',
        hierarquia: {},
        acento: 'blue',
        plano: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        </svg>`
    },
    {
        id: 'contas_oficiais',
        label: 'Contas Oficiais',
        desc: 'Órgãos e Centros do DME',
        hierarquia: { 'Órgãos': 10, 'Centros': 5 },
        acento: 'blue',
        plano: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>`
    },
    {
        id: 'exonerados',
        label: 'Exonerados',
        desc: 'Membros desligados do corpo',
        hierarquia: {},
        acento: 'red',
        plano: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="17" y1="11" x2="23" y2="17"/><line x1="23" y1="11" x2="17" y2="17"/>
        </svg>`
    }
];

// ── DADOS ─────────────────────────────────────────────
function getDados(id) {
    return _dadosApi[id] || [];
}

function getHierarquia(id) {
    return LISTAGENS_CONFIG.find(c => c.id === id)?.hierarquia || {};
}

function isPlano(id) {
    return LISTAGENS_CONFIG.find(c => c.id === id)?.plano || false;
}

function obterValorPatente(patente, id) {
    const mapa = getHierarquia(id);
    const chave = Object.keys(mapa).find(k => k.toLowerCase() === patente.trim().toLowerCase());
    return chave ? mapa[chave] : 0;
}

// ── ESTADO ────────────────────────────────────────────
let corpoAtivo = null;
let viewMode = 'avatar';
let apenasIrregulares = false;
let analiseRodando = false;

// ── NAVEGAÇÃO ─────────────────────────────────────────
function abrirListagem(id) {
    const config = LISTAGENS_CONFIG.find(c => c.id === id);
    if (!config) return;
    corpoAtivo = id;
    viewMode = 'avatar';
    apenasIrregulares = false;

    const dados = getDados(id);
    document.getElementById('view-title').textContent = config.label;
    document.getElementById('view-count-badge').textContent =
        `${dados.length} membro${dados.length !== 1 ? 's' : ''}`;

    const view = document.getElementById('sec-view');
    view.className = 'l-section view-acento-' + config.acento;

    const toggleBtn = document.getElementById('btn-view-mode');
    if (toggleBtn) toggleBtn.style.display = id === 'exonerados' ? 'none' : '';
    updateToggleBtn();

    document.getElementById('sec-escolha').style.display = 'none';
    view.style.display = 'block';
    view.style.animation = 'none';
    view.offsetHeight;
    view.style.animation = '';

    renderListagem();
}

function voltarEscolha() {
    corpoAtivo = null;
    analiseRodando = false;
    document.getElementById('sec-view').style.display = 'none';
    document.getElementById('sec-escolha').style.display = 'block';
    renderEscolha();
}

// ── RENDER: TELA ESCOLHA ──────────────────────────────
function renderEscolha() {
    const grid = document.getElementById('listagem-cards-grid');
    let totalMembros = 0;

    grid.innerHTML = LISTAGENS_CONFIG.map(cfg => {
        const dados = getDados(cfg.id);
        const count = dados.length;
        totalMembros += count;
        const hasData = count > 0;

        return `
        <div class="listagem-card acento-${cfg.acento}" onclick="abrirListagem('${cfg.id}')">
            <div class="card-top">
                <div class="card-icon-wrap">${cfg.icon}</div>
                <span class="card-count-pill">${hasData ? count : '—'}</span>
            </div>
            <div class="card-info">
                <div class="card-title">${cfg.label}</div>
                <div class="card-desc">${cfg.desc}</div>
            </div>
            ${!hasData ? `<div class="card-empty-hint">Sem dados — aguardando requerimento aprovado</div>` : ''}
            <div class="card-cta">
                Visualizar
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        </div>`;
    }).join('');

    const totalEl = document.getElementById('hero-total');
    if (totalEl) totalEl.textContent = totalMembros + ' registros';
}

// ── TOGGLE VIEW MODE ──────────────────────────────────
const ICON_GRID = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
</svg>`;
const ICON_LIST = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
</svg>`;

function updateToggleBtn() {
    const btn = document.getElementById('btn-view-mode');
    btn.innerHTML = viewMode === 'avatar' ? ICON_LIST : ICON_GRID;
    btn.title = viewMode === 'avatar' ? 'Visualizar como lista' : 'Visualizar como avatares';
}

function toggleViewMode() {
    viewMode = viewMode === 'avatar' ? 'texto' : 'avatar';
    updateToggleBtn();
    renderListagem();
}

// ── TOGGLE ANÁLISE ─────────────────────────────────────
function toggleAnalise() {
    const panel = document.getElementById('analise-panel');
    const btn = document.getElementById('btn-analise-toggle');
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : 'block';
    btn.classList.toggle('active', !visible);
}

function toggleFiltro() {
    apenasIrregulares = !apenasIrregulares;
    const btn = document.getElementById('btn-filtro-analise');
    const tabela = document.getElementById('analise-table');
    const ico = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`;
    if (apenasIrregulares) {
        btn.classList.add('active'); tabela.classList.add('filtro-ativo');
        btn.innerHTML = `${ico} Verificar Todos`;
    } else {
        btn.classList.remove('active'); tabela.classList.remove('filtro-ativo');
        btn.innerHTML = `${ico} Analisar Irregulares`;
    }
}

// ── COPIAR LISTAGEM ───────────────────────────────────
function copiarListagem() {
    if (!corpoAtivo) return;
    const lista = ordenaLista(getDados(corpoAtivo));
    if (!lista.length) return;

    const config = LISTAGENS_CONFIG.find(c => c.id === corpoAtivo);
    const grupos = gruparPorPatente(lista);
    const linhas = [`=== ${(config?.label || corpoAtivo).toUpperCase()} ===`, ''];

    grupos.forEach((membros, patente) => {
        linhas.push(patente);
        membros.forEach(m => {
            linhas.push(m.extra ? `${m.nick} ${m.extra}` : m.nick);
        });
        linhas.push('');
    });

    const texto = linhas.join('\n').trim();

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btn-copiar');
        const original = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> Copiado!`;
        btn.style.borderColor = 'var(--green)';
        btn.style.color = 'var(--green)';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

// ── RENDER LISTAGEM ───────────────────────────────────
function renderListagem() {
    if (!corpoAtivo) return;
    if (corpoAtivo === 'exonerados') { renderExonerados(); return; }
    viewMode === 'avatar' ? renderAvatares() : renderTexto();
}

function ordenaLista(lista) {
    if (isPlano(corpoAtivo)) return [...lista];
    return [...lista].sort((a, b) => obterValorPatente(b.patente, corpoAtivo) - obterValorPatente(a.patente, corpoAtivo));
}

function gruparPorPatente(lista) {
    const grupos = new Map();
    const hierarquia = getHierarquia(corpoAtivo);

    Object.keys(hierarquia).forEach(patente => {
        grupos.set(patente, []);
    });

    if (corpoAtivo === 'cadetes') {
        grupos.set('Cadetes', []);
    }

    for (const m of lista) {
        let patenteAlvo;
        if (corpoAtivo === 'cadetes') {
            patenteAlvo = 'Cadetes';
        } else if (corpoAtivo === 'contas_oficiais') {
            // API retorna corpo 'orgao' ou 'centro' — mapeia para o título visual
            patenteAlvo = (m.corpo === 'centro') ? 'Centros' : 'Órgãos';
        } else {
            patenteAlvo = m.patente;
        }

        if (!grupos.has(patenteAlvo)) grupos.set(patenteAlvo, []);
        grupos.get(patenteAlvo).push(m);
    }
    return grupos;
}

// ── MODO AVATAR ───────────────────────────────────────
function renderAvatares() {
    const area = document.getElementById('render-area');
    const lista = ordenaLista(getDados(corpoAtivo));
    const grupos = gruparPorPatente(lista);

    if (grupos.size === 0 && lista.length === 0) {
        area.innerHTML = emptyState();
        return;
    }

    area.innerHTML = Array.from(grupos.entries()).map(([patente, membros], sIdx) => `
        <div class="av-section" style="animation-delay:${sIdx * .045}s">
            <div class="av-section-hdr">
                <span class="av-rank-name">${patente}</span>
                <span class="av-rank-count">${membros.length} membro${membros.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="av-grid">
                ${membros.length > 0 ? membros.map((m, i) => {
                    const displayExtra = (corpoAtivo === 'cadetes')
                        ? `C${String(i + 1).padStart(3, '0')}`
                        : (m.extra || '');

                    const isOficial = corpoAtivo === 'contas_oficiais';
                    let avatarImg = '';

                    if (isOficial) {
                        const imgUrl = (m.extra || '').trim();
                        if (imgUrl && imgUrl.startsWith('http')) {
                            avatarImg = `<img src="${imgUrl}" alt="${m.patente || m.nick}" style="width:100%;height:100%;object-fit:contain;padding:10px;">`;
                        } else {
                            avatarImg = `<div class="av-official-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`;
                        }
                    } else {
                        avatarImg = `<img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.nick)}&size=l&direction=2&head_direction=2&gesture=std&action=std"
                                 alt="${m.nick}" loading="lazy"
                                 onerror="this.src='https://www.habbo.com.br/habbo-imaging/avatarimage?user=Guest&size=l&direction=2&head_direction=2'">`;
                    }

                    // Para contas oficiais, o "nome" exibido é o nome_oficial vindo em m.patente
                    const displayName = isOficial ? (m.patente || m.nick) : m.nick;

                    return `
                    <div class="av-card" style="animation-delay:${(sIdx * .045) + (i * .028)}s">
                        <div class="av-card-img ${isOficial ? 'av-card-official' : ''}">
                            ${avatarImg}
                        </div>
                        <div class="av-card-name" title="${displayName}">${displayName}</div>
                        ${displayExtra && !isOficial ? `<div class="av-card-extra">${displayExtra}</div>` : ''}
                    </div>`;
                }).join('') : `<div class="card-empty-hint" style="padding: 10px 20px;">Nenhum membro nesta patente</div>`}
            </div>
        </div>
    `).join('');
}

// ── MODO TEXTO ────────────────────────────────────────
function renderTexto() {
    const area = document.getElementById('render-area');
    const lista = ordenaLista(getDados(corpoAtivo));
    const grupos = gruparPorPatente(lista);

    if (grupos.size === 0 && lista.length === 0) {
        area.innerHTML = emptyState();
        return;
    }

    area.innerHTML = Array.from(grupos.entries()).map(([patente, membros]) => `
        <div class="txt-section">
            <div class="txt-rank-box">
                <div class="txt-rank-header" onclick="this.closest('.txt-rank-box').classList.toggle('collapsed')">
                    <div class="txt-rank-label">
                        <span class="txt-rank-dot"></span>
                        ${patente}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px">
                        <span class="txt-rank-count-badge">${membros.length} membro${membros.length !== 1 ? 's' : ''}</span>
                        <span class="txt-rank-chevron">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="6 9 12 15 18 9"/></svg>
                        </span>
                    </div>
                </div>
                <div class="txt-list">
                    ${membros.length > 0 ? membros.map((m, i) => {
                        const isOficial = corpoAtivo === 'contas_oficiais';
                        const displayExtra = (corpoAtivo === 'cadetes')
                            ? `C${String(i + 1).padStart(3, '0')}`
                            : (m.extra || '');
                        const displayName = isOficial ? (m.patente || m.nick) : m.nick;

                        return `
                        <div class="txt-entry">
                            ${!isOficial ? `<span class="txt-num">${String(i + 1).padStart(2, '0')}</span>` : ''}
                            <span class="txt-nick">${displayName}</span>
                            ${displayExtra && !isOficial ? `<span class="txt-extra">${displayExtra}</span>` : ''}
                        </div>`;
                    }).join('') : `<div class="txt-entry cell-muted" style="padding-left: 20px;">Nenhum membro nesta patente</div>`}
                </div>
            </div>
        </div>
    `).join('');
}

// ── MODO EXONERADOS ───────────────────────────────────
function renderExonerados() {
    const area = document.getElementById('render-area');
    const lista = getDados('exonerados');
    if (!lista.length) { area.innerHTML = emptyState(); return; }

    const rows = lista.map(m => {
        const extra = m.extra || '';
        const match = extra.match(/^\[([^\]]+)\] \{([^}]+)\} - (.+?) - (.+)$/);
        const tag    = match ? match[1] : '—';
        const motivo = match ? match[2] : extra || '—';
        const dt1    = match ? match[3] : '—';
        const dt2    = match ? match[4] : '—';
        return `<tr>
            <td class="exo-nick">${m.nick}</td>
            <td><span class="exo-tag">[${tag}]</span></td>
            <td class="exo-motivo">${motivo}</td>
            <td class="exo-periodo">${dt1} → ${dt2}</td>
        </tr>`;
    }).join('');

    area.innerHTML = `
        <div class="exo-table-wrap">
            <table class="exo-table">
                <thead>
                    <tr>
                        <th>Nick</th>
                        <th>Organização</th>
                        <th>Motivo</th>
                        <th>Período</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function emptyState() {
    return `<div class="empty-view">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 10v11M16 10v11M12 10v11"/>
        </svg>
        <strong>Nenhum dado carregado</strong>
        <p>As listagens são populadas automaticamente quando um requerimento é aprovado.</p>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  ANÁLISE DE STATUS
// ══════════════════════════════════════════════════════
const proxy = 'https://corsproxy.io/?';
const MAX_CONCURRENCY = 2;
const BATCH_DELAY_MS = 300;
const TARGET_GROUP_ID = 'g-hhbr-daf72072dd8d80ed3db6e1dcb8412403';

const GROUPS_CACHE = new Map();
try { const _g = JSON.parse(sessionStorage.getItem('dme_groups_cache') || '{}'); Object.keys(_g).forEach(k => GROUPS_CACHE.set(k, _g[k])); } catch (e) { }
const USER_CACHE = new Map();
try { const _u = JSON.parse(sessionStorage.getItem('dme_users_cache') || '{}'); Object.keys(_u).forEach(k => USER_CACHE.set(k, _u[k])); } catch (e) { }

async function fetchWithRetries(url, options = {}, retries = 4, baseDelay = 500) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const resp = await fetch(url, options);
            if (resp.status === 429) {
                const ra = resp.headers.get('Retry-After');
                const wait = ra ? parseInt(ra, 10) * 1000 : baseDelay * Math.pow(2, attempt);
                if (attempt === retries) throw new Error('Too Many Requests');
                await new Promise(r => setTimeout(r, wait)); continue;
            }
            return resp;
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        }
    }
}

function celLoading() { return `<span class="cell-loading"></span>`; }

async function runAnalise() {
    if (analiseRodando || !corpoAtivo) return;
    analiseRodando = true;
    const corpo = document.getElementById('analise-corpo');
    corpo.innerHTML = '';
    const lista = ordenaLista(getDados(corpoAtivo));

    if (!lista.length) {
        corpo.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--t3)">Nenhum dado para analisar.</td></tr>`;
        analiseRodando = false; return;
    }

    let ultimaP = ''; let hCount = 0;
    lista.forEach(m => {
        if (m.patente !== ultimaP) {
            hCount++;
            corpo.innerHTML += `<tr class="patente-header" id="ahead-${hCount}"><td colspan="6">${m.patente}</td></tr>`;
            ultimaP = m.patente;
        }
        const hId = `ahead-${hCount}`;
        corpo.innerHTML += `
            <tr id="row-${m.nick}" data-header="${hId}" class="member-row">
                <td><div class="militar-info">
                    <div class="mil-avatar"><img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.nick)}&size=m&headonly=1" loading="lazy" alt="${m.nick}"></div>
                    <div><div class="mil-nick">${m.nick}</div><div class="mil-cargo">${m.patente}</div></div>
                </div></td>
                <td id="status-${m.nick}">${celLoading()}</td>
                <td id="tempo-${m.nick}">${celLoading()}</td>
                <td id="visib-${m.nick}">${celLoading()}</td>
                <td id="grupos-${m.nick}">${celLoading()}</td>
                <td id="alerta-${m.nick}">${celLoading()}</td>
            </tr>`;
    });

    for (let i = 0; i < lista.length; i += MAX_CONCURRENCY) {
        const lote = lista.slice(i, i + MAX_CONCURRENCY);
        await Promise.all(lote.map(m => consultarHabbo(m.nick, m.patente)));
        if (BATCH_DELAY_MS > 0) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
    analiseRodando = false;
}

async function consultarGrupos(nick, userId) {
    const gCell = document.getElementById(`grupos-${nick}`);
    const aCell = document.getElementById(`alerta-${nick}`);
    if (!gCell) return;
    try {
        let data = GROUPS_CACHE.get(String(userId));
        if (!data) {
            const res = await fetchWithRetries(proxy + encodeURIComponent(`https://www.habbo.com.br/api/public/users/${userId}/groups?v=${Date.now()}`));
            data = await res.json();
            try { GROUPS_CACHE.set(String(userId), data); sessionStorage.setItem('dme_groups_cache', JSON.stringify(Object.fromEntries(GROUPS_CACHE))); } catch (e) { }
        }
        const estaNoGrupo = data?.length > 0 && data.some(g => String(g.id) === TARGET_GROUP_ID);
        if (estaNoGrupo) {
            gCell.innerHTML = '<span class="grupo-in">No Grupo</span>';
        } else {
            gCell.innerHTML = '<span class="grupo-out">Fora do Grupo</span>';
            if (aCell && !aCell.querySelector('.alerta-demissao'))
                aCell.innerHTML = `<span class="status-badge alerta-demissao">DESLIGAMENTO</span>`;
            const row = document.getElementById(`row-${nick}`);
            if (row) {
                row.classList.add('fora-do-grupo-demissao'); row.classList.remove('status-regular');
                document.getElementById(row.getAttribute('data-header'))?.classList.add('has-irregular');
            }
        }
    } catch (e) { if (gCell) gCell.innerHTML = '<span class="erro-cell">Erro</span>'; }
}

async function consultarHabbo(nick, patente) {
    const row = document.getElementById(`row-${nick}`);
    if (!row) return;
    const [sCell, tCell, vCell, aCell] = ['status', 'tempo', 'visib', 'alerta'].map(p => document.getElementById(`${p}-${nick}`));
    const headerId = row.getAttribute('data-header');
    try {
        let d = USER_CACHE.get(nick);
        if (!d) {
            const res = await fetchWithRetries(proxy + encodeURIComponent(`https://www.habbo.com.br/api/public/users?name=${encodeURIComponent(nick)}&v=${Date.now()}`));
            d = await res.json();
            try { USER_CACHE.set(nick, d); sessionStorage.setItem('dme_users_cache', JSON.stringify(Object.fromEntries(USER_CACHE))); } catch (e) { }
        }
        if (!d || d.error) {
            if (sCell) sCell.innerHTML = `<span class="status-badge status-offline">N/A</span>`;
            if (tCell) tCell.innerHTML = `<span class="cell-muted">—</span>`;
            if (vCell) vCell.innerHTML = `<span class="cell-muted">—</span>`;
            if (aCell) aCell.innerHTML = `<span class="status-badge alerta-demissao">NÃO LOCALIZADO</span>`;
            row.classList.add('fora-do-grupo-demissao');
            document.getElementById(headerId)?.classList.add('has-irregular');
            return;
        }
        if (sCell) sCell.innerHTML = d.online
            ? `<span class="status-badge status-online"><span class="status-dot"></span>Online</span>`
            : `<span class="status-badge status-offline"><span class="status-dot"></span>Offline</span>`;

        let diasOff = 0;
        if (!d.online && d.lastAccessTime) {
            const diff = new Date() - new Date(d.lastAccessTime);
            diasOff = Math.floor(diff / 86400000);
            const horas = Math.floor(diff / 3600000);
            const cls = diasOff >= 10 ? 'tempo-critico' : diasOff >= 5 ? 'tempo-alerta' : '';
            if (tCell) tCell.innerHTML = diasOff > 0 ? `<span class="tempo-badge ${cls}">${diasOff}d</span>` : `<span class="tempo-badge">${horas}h</span>`;
        } else if (tCell) tCell.innerHTML = `<span class="cell-muted">—</span>`;

        if (vCell) vCell.innerHTML = d.profileVisible
            ? `<a href="https://www.habbo.com.br/profile/${nick}" target="_blank" class="badge-perfil">↗ Perfil</a>`
            : `<span class="vis-oculto">Oculto</span>`;

        let neg = false;
        if (corpoAtivo === 'militar' || corpoAtivo === 'alto_comando' || corpoAtivo === 'cadetes') {
            const ehOficial = listaOficiais.some(o => patente.toLowerCase().includes(o.toLowerCase()));
            const ehSoldado = patente.toLowerCase() === 'soldado';
            if (ehSoldado) {
                if (diasOff >= 15) { if (aCell) aCell.innerHTML = `<span class="status-badge alerta-demissao">DEMISSÃO</span>`; neg = true; }
                else { if (aCell) aCell.innerHTML = `<span class="alerta-regular">Normal</span>`; row.classList.add('status-regular'); }
            } else if (ehOficial) {
                if (diasOff >= 10) { if (aCell) aCell.innerHTML = `<span class="status-badge alerta-demissao">DEMISSÃO</span>`; neg = true; }
                else if (diasOff >= 5) { if (aCell) aCell.innerHTML = `<span class="status-badge alerta-rebaixamento">REBAIXAR</span>`; neg = true; }
                else { if (aCell) aCell.innerHTML = `<span class="alerta-regular">Normal</span>`; row.classList.add('status-regular'); }
            } else {
                if (diasOff >= 15) { if (aCell) aCell.innerHTML = `<span class="status-badge alerta-demissao">DEMISSÃO</span>`; neg = true; }
                else if (diasOff >= 8) { if (aCell) aCell.innerHTML = `<span class="status-badge alerta-rebaixamento">REBAIXAR</span>`; neg = true; }
                else { if (aCell) aCell.innerHTML = `<span class="alerta-regular">Normal</span>`; row.classList.add('status-regular'); }
            }
        } else {
            if (diasOff >= 60) { if (aCell) aCell.innerHTML = `<span class="status-badge alerta-demissao">DEMISSÃO</span>`; neg = true; }
            else { if (aCell) aCell.innerHTML = `<span class="alerta-regular">Normal</span>`; row.classList.add('status-regular'); }
        }
        if (neg) document.getElementById(headerId)?.classList.add('has-irregular');
        await consultarGrupos(nick, d.id || d.uniqueId);
    } catch (e) {
        ['status', 'tempo', 'visib', 'alerta'].forEach(p => {
            const el = document.getElementById(`${p}-${nick}`);
            if (el) el.innerHTML = p === 'status' ? `<span class="erro-cell">Erro</span>` : `<span class="cell-muted">—</span>`;
        });
        row.classList.add('status-regular');
    }
}
