/* ══════════════════════════════════════════════════════
   CENTRO DETALHE — JavaScript
   Página dinâmica por centro selecionado
   ══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ── Auth Guard ──────────────────────────────────────
    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = '/login'; return; }

    // ── Órgãos (mesma lista do centro_tarefas_orgaos.js) ─
    const ORGAOS = [
        { id: 'centro-instrucao', title: 'Centro de Instrução', icon: '🛡️', desc: 'Responsável pela instrução e capacitação dos militares do DME.' },
        { id: 'centro-treinamento', title: 'Centro de Treinamento', icon: '🛡️', desc: 'Coordena os treinamentos táticos e operacionais.' },
        { id: 'centro-supervisao', title: 'Centro de Supervisão', icon: '🛡️', desc: 'Supervisiona as atividades e o cumprimento das normas.' },
        { id: 'centro-patrulha', title: 'Centro de Patrulha', icon: '🛡️', desc: 'Gerencia operações de patrulha e segurança interna.' },
        { id: 'academia-agulhas-negras', title: 'Academia Militar das Agulhas Negras', icon: '🦅', desc: 'Elite da formação militar do DME.' },
        { id: 'auditoria-fiscal', title: 'Auditoria Fiscal', icon: '⚖️', desc: 'Controle e auditoria das atividades fiscais do DME.' },
        { id: 'academia-publicitaria', title: 'Academia Publicitária Militar', icon: '📜', desc: 'Gestão de comunicação e publicidade institucional.' },
        { id: 'corpo-oficiais-gerais', title: 'Corpo de Oficiais Gerais', icon: '⭐', desc: 'Conselho dos oficiais mais graduados do DME.' },
        { id: 'centro-rh', title: 'Centro de Recursos Humanos', icon: '👥', desc: 'Gerencia admissões, desligamentos e bem-estar dos militares.' },
        { id: 'corpo-oficiais', title: 'Corpo de Oficiais', icon: '🗡️', desc: 'Setor de Inteligência e liderança intermediária.' },
        { id: 'portadores-direitos', title: 'Portadores de Direitos', icon: '🤝', desc: 'Proteção e direitos dos militares do DME.' },
        { id: 'comando-feminino', title: 'Comando Feminino', icon: '♀️', desc: 'Liderança e representação feminina no DME.' },
        { id: 'ministerio-publico', title: 'Ministério Público', icon: '⚖️', desc: 'Fiscalização da legalidade das ações internas.' },
        { id: 'corregedoria', title: 'Corregedoria', icon: '🦅', desc: 'Investigações e processos disciplinares.' },
        { id: 'abi', title: 'Agência Brasileira de Inteligência', icon: '🦅', desc: 'Coleta e análise de inteligência interna.' },
        { id: 'goe', title: 'Grupamento de Operações Especiais', icon: '💀', desc: 'Unidade especializada em operações de alto risco.' },
        { id: 'instrucao-inicial', title: 'Aplicar Instrução Inicial', icon: '📖', desc: 'Aplicação da instrução inicial para novos recrutas.' },
        { id: 'af-dragonas', title: '[AF] Postagem de Dragonas', icon: '🎖️', desc: 'Gestão de postagens e dragonas no AF.' },
        { id: 'guerra-selva', title: 'Centro de Instrução Guerra na Selva', icon: '🐆', desc: 'Especialização em operações de selva e ambiente hostil.' },
        { id: 'cadetes', title: 'Cadetes', icon: '🪖', desc: 'Formação e acompanhamento dos cadetes do DME.' },
        { id: 'normas-desligamentos', title: 'Centro de Normas e Desligamentos', icon: '📄', desc: 'Processamento de normas internas e desligamentos.' },
        { id: 'agencia-eventos', title: 'Agência de Eventos', icon: '📅', desc: 'Coordenação e organização de eventos do DME.' },
        { id: 'stm', title: 'Superior Tribunal Militar', icon: '⚔️', desc: 'Julgamento e deliberação nos processos militares.' },
    ];

    // ── Helpers de localStorage ─────────────────────────
    const get = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

    const getForums = id => get(`dme_forum_${id}`) || [];
    const saveForums = (id, v) => set(`dme_forum_${id}`, v);
    const getHier = id => get(`dme_hier_${id}`) || [];
    const saveHier = (id, v) => set(`dme_hier_${id}`, v);
    const getLideres = () => get('dme_centros_lideres') || {};
    const isAdmin = () => (get('dme_admins') || ['Xandelicado', 'rafacv', 'Ronaldo']).includes(username);
    const isLiderByOrgao = (id) => {
        try {
            const raw = localStorage.getItem('dme_orgao_' + id);
            if (!raw) return false;
            const data = JSON.parse(raw);
            const me = (data.membros || []).find(m => m.username.toLowerCase() === username.toLowerCase());
            if (!me) return false;
            const cargo = (data.cargos || []).find(c => c.nome === me.cargo);
            return cargo ? !!cargo.perms.lideranca : me.cargo === 'Líder';
        } catch(_) { return false; }
    };
    const isLider = id => isAdmin() || (getLideres()[id] || []).includes(username) || isLiderByOrgao(id);
    const getAulas = () => get('dme_aulas') || [];

    // ── Período ativo ────────────────────────────────────
    function getPeriodo(orgaoId) {
        const saved = get(`dme_periodo_${orgaoId}`);
        if (saved && saved.inicio && saved.fim) return saved;
        const now = new Date();
        const dia = now.getDay();
        const offsetSeg = dia === 0 ? -6 : 1 - dia;
        const seg = new Date(now); seg.setDate(now.getDate() + offsetSeg); seg.setHours(0, 0, 0, 0);
        const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23, 59, 59, 999);
        return { inicio: seg.toISOString(), fim: dom.toISOString() };
    }

    function formatPeriodo(orgaoId) {
        const p = getPeriodo(orgaoId);
        const fmt = d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
        return `Período: ${fmt(p.inicio)} a ${fmt(p.fim)}`;
    }

    // ── Toast ────────────────────────────────────────────
    function toast(msg, tipo = 'success') {
        let tc = document.getElementById('toastContainer');
        if (!tc) {
            tc = document.createElement('div');
            tc.id = 'toastContainer';
            tc.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none';
            document.body.appendChild(tc);
        }
        const color = tipo === 'success' ? 'var(--green)' : 'var(--red)';
        const icon = tipo === 'success'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        const el = document.createElement('div');
        el.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--bg-2);border:1px solid ${color};border-radius:12px;color:${color};font-size:.84rem;font-weight:600;box-shadow:var(--shadow-lg);max-width:320px;animation:slideUp .2s ease;pointer-events:all`;
        el.innerHTML = `${icon}<span>${msg}</span>`;
        tc.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }

    // ── Confirmar (substitui confirm()) ──────────────────
    function confirmar(msg, onConfirm) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
        wrap.innerHTML = `
            <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:16px;padding:28px;max-width:360px;width:100%;box-shadow:var(--shadow-lg)">
                <p style="font-size:.9rem;font-weight:600;color:var(--t1);margin-bottom:20px;line-height:1.5">${msg}</p>
                <div style="display:flex;gap:10px;justify-content:flex-end">
                    <button id="_cfCancel" class="btn-secondary">Cancelar</button>
                    <button id="_cfOk" class="btn-primary" style="background:var(--red);border-color:var(--red)">Confirmar</button>
                </div>
            </div>`;
        document.body.appendChild(wrap);
        wrap.querySelector('#_cfCancel').onclick = () => wrap.remove();
        wrap.querySelector('#_cfOk').onclick = () => { wrap.remove(); onConfirm(); };
    }

    // ── Carregar Centro Atual ───────────────────────────
    const orgaoSel = get('dme_orgao_selecionado');
    if (!orgaoSel || !orgaoSel.id) { window.location.href = '/centro_tarefas_orgaos'; return; }
    const orgao = ORGAOS.find(o => o.id === orgaoSel.id) || { ...orgaoSel, icon: '🛡️', desc: '' };

    // ── Inicializar UI ──────────────────────────────────
    document.title = `DME — ${orgao.title}`;
    const tC = qs('#centroTitle'); if (tC) tC.textContent = orgao.title;
    const tS = qs('#centroSub'); if (tS) tS.textContent = orgao.sub || orgao.desc || '';
    const cI = qs('#centroIcon'); if (cI) cI.textContent = orgao.icon;
    const iI = qs('#inicioIcon'); if (iI) iI.textContent = orgao.icon;
    const iT = qs('#inicioTitle'); if (iT) iT.textContent = orgao.title;
    const iD = qs('#inicioDesc'); if (iD) iD.textContent = orgao.desc || 'Centro do DME System.';
    const bC = qs('#breadcrumbCurrent'); if (bC) bC.textContent = orgao.title;
    const pT = qs('#pageTitle'); if (pT) pT.textContent = `DME — ${orgao.title}`;

    const militares = [...(get('dme_militar') || []), ...(get('dme_empresarial') || [])];
    const mC = qs('#membrosCount'); if (mC) mC.textContent = militares.length;

    if (isLider(orgao.id)) {
        const _lb = qs('#liderBadge'); if (_lb) _lb.style.display = 'inline-flex';
        const _ls = qs('#liderSection'); if (_ls) _ls.style.display = 'flex';
        const _nf = qs('#newForumBtn'); if (_nf) _nf.style.display = 'inline-flex';
        // Se for STM, mostrar seção de Projetos e Emendas
        if (orgao.id === 'stm') {
            const _stmQS = document.getElementById('stmQuickSection');
            const _stmTb = document.getElementById('stmTab');
            if (_stmQS) _stmQS.style.display = 'block';
            if (_stmTb) _stmTb.style.display = '';
        }
        const _nh = qs('#newHierBtn'); if (_nh) _nh.style.display = 'inline-flex';
        const _ad = qs('#addDocBtn'); if (_ad) _ad.style.display = 'inline-flex';
        const _eh = qs('#emptyHint'); if (_eh) _eh.style.display = 'inline';
        // Filtro de período: só líder
        const fw = qs('#periodoFiltroWrap');
        if (fw) fw.style.display = 'block';
        const _ft = qs('#fiscalizacaoTab'); if (_ft) _ft.style.display = '';
        const _mt = qs('#metaSemanalTab'); if (_mt) _mt.style.display = '';
        // Preencher datepickers com período atual
        const p = getPeriodo(orgao.id);
        const toDateStr = iso => iso.substring(0, 10);
        if (qs('#periodoInicio')) qs('#periodoInicio').value = toDateStr(p.inicio);
        if (qs('#periodoFim')) qs('#periodoFim').value = toDateStr(p.fim);
        // Salvar período ao clicar Aplicar
        qs('#btnSalvarPeriodo')?.addEventListener('click', () => {
            const ini = qs('#periodoInicio').value;
            const fim = qs('#periodoFim').value;
            if (!ini || !fim) { toast('Selecione as duas datas.', 'error'); return; }
            if (ini > fim) { toast('A data de início deve ser anterior ao fim.', 'error'); return; }
            set(`dme_periodo_${orgao.id}`, { inicio: new Date(ini).toISOString(), fim: new Date(fim + 'T23:59:59').toISOString() });
            toast('Período atualizado com sucesso!');
            renderAulas();
        });
    }

    // Mostrar botão STM para qualquer usuário do STM (independente de ser líder)
    if (orgao.id === 'stm') {
        const _stmEl = document.getElementById('stmQuickSection');
        const _stmTb = document.getElementById('stmTab');
        if (_stmEl) _stmEl.style.display = 'block';
        if (_stmTb) _stmTb.style.display = '';
    }

    // Período texto
    if (qs('#aulasPeriodoText')) qs('#aulasPeriodoText').textContent = formatPeriodo(orgao.id);

    // Navbar
    const navImg = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std&head_direction=2`;
    const fullImg = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&size=m&direction=2&head_direction=2&gesture=std`;
    if (qs('#navUserName')) qs('#navUserName').textContent = username;
    if (qs('#dropdownName')) qs('#dropdownName').textContent = username;
    if (qs('#navUserImage')) qs('#navUserImage').src = navImg;
    if (qs('#dropdownUserImage')) qs('#dropdownUserImage').src = fullImg;

    if (isAdmin() && qs('#dropdownPainel')) qs('#dropdownPainel').style.display = 'flex';

    // ── Tabs ────────────────────────────────────────────
    const tabs = qsa('.centro-tab');
    const contents = qsa('.tab-content');
    const qItems = qsa('.quick-menu-item[data-tab]');

    function switchTab(tabId) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        contents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
        qItems.forEach(q => q.classList.toggle('active', q.dataset.tab === tabId));
        if (tabId === 'aulas') renderAulas();
    }

    tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
    qItems.forEach(q => q.addEventListener('click', () => switchTab(q.dataset.tab)));

    // Sub-tabs Aulas
    qsa('.aulas-subtab').forEach(btn => {
        btn.addEventListener('click', () => {
            qsa('.aulas-subtab').forEach(b => b.classList.remove('active'));
            qsa('.aulas-subtab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const sub = qs(`#subtab-${btn.dataset.subtab}`);
            if (sub) sub.classList.add('active');
        });
    });

    // ── Início Stats ────────────────────────────────────
    const forums = getForums(orgao.id);
    const hier = getHier(orgao.id);
    const aulasDoPeriodo = getAulasDoPeriodo(orgao.id);

    const _statsEl = qs('#inicioStats');
    if (_statsEl) {
        _statsEl.innerHTML = `
            <div class="inicio-stat-card"><span class="stat-num">${militares.length}</span><span class="stat-lbl">Membros</span></div>
            <div class="inicio-stat-card"><span class="stat-num">${aulasDoPeriodo.length}</span><span class="stat-lbl">Aulas</span></div>
            <div class="inicio-stat-card"><span class="stat-num">${forums.length}</span><span class="stat-lbl">Sub-Fóruns</span></div>
            <div class="inicio-stat-card"><span class="stat-num">${hier.length}</span><span class="stat-lbl">Níveis</span></div>
        `;
    }

    // ── Aulas: Funções Helper ────────────────────────────
    // Verifica se o usuário atual pode ver aulas de um centro:
    // Instrução Inicial → visível para todos
    // Outros centros → só membros, líderes e admins
    function podeVerAulasDoCentro(centroId) {
        if (centroId === 'instrucao-inicial') return true;
        if (isAdmin()) return true;
        if ((getLideres()[centroId] || []).includes(username)) return true;
        try {
            const raw = localStorage.getItem('dme_orgao_' + centroId);
            if (!raw) return false;
            const data = JSON.parse(raw);
            return (data.membros || []).some(m => m.username.toLowerCase() === username.toLowerCase());
        } catch (_) { return false; }
    }

    function getAulasDoPeriodo(orgaoId) {
        if (!podeVerAulasDoCentro(orgaoId)) return [];
        const p = getPeriodo(orgaoId);
        const ini = new Date(p.inicio).getTime();
        const fim = new Date(p.fim).getTime();
        return getAulas().filter(a => a.centro === orgaoId && a.timestamp >= ini && a.timestamp <= fim);
    }
    // Apenas aulas válidas (não anuladas) — usada no ranking
    function getAulasAtivasDoPeriodo(orgaoId) {
        return getAulasDoPeriodo(orgaoId).filter(a => !a.anulada);
    }

    function renderAulas() {
        // Período texto
        if (qs('#aulasPeriodoText')) qs('#aulasPeriodoText').textContent = formatPeriodo(orgao.id);
        renderRanking();
        if (isLider(orgao.id)) { renderFiscalizacao(); renderMetaSemanal(); }
    }

    // ── Ranking ──────────────────────────────────────────
    renderRanking();

    function renderRanking() {
        const list = qs('#rankingList');
        if (!list) return;
        const aulas = getAulasAtivasDoPeriodo(orgao.id);

        if (aulas.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎓</div><div class="empty-text">Nenhuma aula registrada neste período.</div></div>`;
            return;
        }

        // Agrupa por instrutor → array de aulas
        const agrupado = {};
        aulas.forEach(a => {
            if (!agrupado[a.aplicador]) agrupado[a.aplicador] = [];
            agrupado[a.aplicador].push(a);
        });

        const ranking = Object.entries(agrupado)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([nick, aulasArr], i) => ({ nick, aulasArr, count: aulasArr.length, pos: i + 1 }));

        const posColors = ['#f59e0b', '#94a3b8', '#cd7c3d'];
        const posEmoji = ['🥇', '🥈', '🥉'];

        list.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;padding:4px 0">` +
        ranking.map(r => {
            const rowId = 'rank-expand-' + r.nick.replace(/\W/g,'_');

            // Montar lista de aulas com aprovados/reprovados
            const aulasHTML = r.aulasArr
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(a => {
                    const aprovs = (a.aprovados||'').split(/[,\n]/).map(n=>n.trim()).filter(Boolean);
                    const reprovs = (a.reprovados||'').split(/[,\n]/).map(n=>n.trim()).filter(Boolean);
                    const dataStr = new Date(a.dataAula||a.timestamp).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
                    const numLabel = a.numero ? `<span class="fisc-num-badge" style="font-size:.65rem">#${escH(a.numero)}</span>` : '';
                    const nickBadge = (nicks, cor, icone) => nicks.map(n =>
                        `<span style="display:inline-flex;align-items:center;gap:4px;background:${cor}18;border:1px solid ${cor}33;border-radius:6px;padding:2px 7px;font-size:.7rem;font-weight:600;color:${cor}">
                            ${icone} ${escH(n)}
                        </span>`).join('');
                    return `
                    <div style="background:var(--bg-1);border:1px solid var(--b1);border-radius:8px;padding:9px 12px;margin-top:6px">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px">
                            ${numLabel}
                            <span style="font-size:.78rem;font-weight:700;color:var(--t1)">${escH(a.tipo)}</span>
                            <span style="font-size:.68rem;color:var(--t3);margin-left:auto">📅 ${dataStr}</span>
                        </div>
                        ${!a.semAlunos && (aprovs.length||reprovs.length) ? `
                        <div style="display:flex;flex-direction:column;gap:5px">
                            ${aprovs.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
                                <span style="font-size:.65rem;color:var(--t3);margin-right:2px;font-weight:700">✅ Aprov.:</span>
                                ${nickBadge(aprovs,'#22c55e','✅')}
                            </div>` : ''}
                            ${reprovs.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
                                <span style="font-size:.65rem;color:var(--t3);margin-right:2px;font-weight:700">❌ Reprov.:</span>
                                ${nickBadge(reprovs,'#ef4444','❌')}
                            </div>` : ''}
                        </div>` : a.semAlunos ? `<span style="font-size:.7rem;color:var(--t3)">Sem alunos</span>` : `<span style="font-size:.7rem;color:var(--t3)">Sem registros de alunos</span>`}
                        ${a.observacao ? `<div style="font-size:.68rem;color:var(--t3);margin-top:4px;font-style:italic">"${escH(a.observacao.substring(0,80))}${a.observacao.length>80?'…':''}"</div>` : ''}
                    </div>`;
                }).join('');

            return `
            <div class="hierarquia-item" style="border-radius:10px;overflow:hidden">
                <div class="ranking-row" data-target="${rowId}"
                    style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;user-select:none">
                    <div style="font-weight:800;color:${posColors[r.pos-1]||'var(--t2)'};font-size:.95rem;min-width:28px;text-align:center">
                        ${r.pos <= 3 ? posEmoji[r.pos-1] : r.pos + 'º'}
                    </div>
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(r.nick)}&headonly=1&size=s&gesture=std"
                        style="width:28px;height:28px;border-radius:50%;object-fit:cover" loading="lazy">
                    <span style="font-weight:700;color:var(--t1);flex:1">${escH(r.nick)}
                        ${r.nick === username ? '<span style="background:var(--green-muted);color:var(--green);font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:8px;margin-left:4px">Você</span>' : ''}
                    </span>
                    <span style="background:var(--green-muted);color:var(--green);font-weight:800;padding:4px 12px;border-radius:10px;font-size:.82rem">
                        ${r.count} Aula${r.count !== 1 ? 's' : ''}
                    </span>
                    <svg class="rank-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;color:var(--t3);transition:transform .2s"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                <div id="${rowId}" style="display:none;padding:0 14px 12px">
                    ${aulasHTML}
                </div>
            </div>`;
        }).join('') + '</div>';

        // Toggle expand por linha
        list.querySelectorAll('.ranking-row').forEach(row => {
            row.addEventListener('click', () => {
                const target = document.getElementById(row.dataset.target);
                if (!target) return;
                const open = target.style.display !== 'none';
                target.style.display = open ? 'none' : 'block';
                row.querySelector('.rank-chevron').style.transform = open ? '' : 'rotate(90deg)';
            });
        });
    }

    // ── Fiscalização ─────────────────────────────────────
    if (isLider(orgao.id)) {
        renderFiscalizacao();
        renderMetaSemanal();
        qs('#fiscSearch')?.addEventListener('input', function () {
            renderFiscalizacao(this.value.toLowerCase());
        });
    }

    function getBlacklist() {
        return get('dme_blacklist_' + orgao.id) || [];
    }
    function saveBlacklist(arr) {
        set('dme_blacklist_' + orgao.id, arr);
    }

    // Detecta pares de aulas do mesmo instrutor com intervalo < 10min
    function detectarAlertas(aulas) {
        const LIMITE = 10 * 60 * 1000; // 10 min em ms
        const alertas = {}; // id → array de motivos
        const blacklist = getBlacklist();

        // Ordenar por timestamp
        const sorted = aulas.slice().sort((a, b) => a.timestamp - b.timestamp);

        sorted.forEach((a, i) => {
            const motivos = alertas[a.id] || [];

            // Blacklist de alunos: checar aprovados e reprovados
            const todosNicksAula = [
                ...(a.aprovados || '').split(/[,\n]/).map(n => n.trim().toLowerCase()).filter(Boolean),
                ...(a.reprovados || '').split(/[,\n]/).map(n => n.trim().toLowerCase()).filter(Boolean),
            ];
            const blNomes = blacklist.map(b => b.toLowerCase());
            const nicksBlacklist = todosNicksAula.filter(n => blNomes.includes(n));
            if (nicksBlacklist.length > 0) {
                if (!motivos.includes('blacklist')) motivos.push('blacklist');
                // Guardar quais nicks acionaram
                a._nicksBlacklist = nicksBlacklist;
            }
            // Flag salva no registro (intervalo)
            if (a.flags && a.flags.intervalo_curto) motivos.push('intervalo_curto');

            // Verificar pares com aulas anteriores do mesmo instrutor
            for (let j = i - 1; j >= 0; j--) {
                const prev = sorted[j];
                if (prev.aplicador.toLowerCase() !== a.aplicador.toLowerCase()) continue;
                const diff = a.timestamp - prev.timestamp;
                if (diff < 0) break;
                if (diff < LIMITE) {
                    if (!motivos.includes('intervalo_curto')) motivos.push('intervalo_curto');
                    // Marcar também a aula anterior
                    const motivosPrev = alertas[prev.id] || [];
                    if (!motivosPrev.includes('intervalo_curto')) motivosPrev.push('intervalo_curto');
                    alertas[prev.id] = motivosPrev;
                }
                break; // só checar a imediatamente anterior do mesmo instrutor
            }

            if (motivos.length) alertas[a.id] = motivos;
        });
        return alertas;
    }

    function renderFiscalizacao(filtro = '') {
        const list = qs('#fiscalizacaoList');
        if (!list) return;
        let aulas = getAulasDoPeriodo(orgao.id);
        if (filtro) aulas = aulas.filter(a =>
            (a.aplicador||'').toLowerCase().includes(filtro) ||
            (a.tipo||'').toLowerCase().includes(filtro) ||
            (a.numero||'').includes(filtro));
        aulas.sort((a, b) => b.timestamp - a.timestamp);

        if (aulas.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Nenhuma aula encontrada.</div></div>`;
            return;
        }

        const alertas = detectarAlertas(aulas);
        const blacklist = getBlacklist();

        // Contadores de alertas para o header
        const totalIntervalo = Object.values(alertas).filter(m => m.includes('intervalo_curto')).length;
        const totalBlacklist = Object.values(alertas).filter(m => m.includes('blacklist')).length;

        const headerAlertas = (totalIntervalo > 0 || totalBlacklist > 0) ? `
        <div class="fisc-alertas-header">
            ${totalIntervalo > 0 ? `<span class="fisc-alerta-badge intervalo">⏱ ${totalIntervalo} aula(s) com intervalo &lt; 10min</span>` : ''}
            ${totalBlacklist > 0 ? `<span class="fisc-alerta-badge blacklist">🚫 ${totalBlacklist} aula(s) de instrutor na blacklist</span>` : ''}
        </div>` : '';

        // Botão para gerenciar blacklist
        const btnBlacklist = `<button class="btn-secondary" id="btnGerenciarBlacklist" style="font-size:.72rem;padding:6px 12px;margin-left:auto">
            🚫 Blacklist Alunos (${blacklist.length})
        </button>`;

        list.innerHTML = headerAlertas +
            `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px 0;flex-wrap:wrap">
                ${btnBlacklist}
            </div>` +
            `<div style="display:flex;flex-direction:column;gap:6px;padding:12px 16px">` +
            aulas.map((a) => {
                const motivos = alertas[a.id] || [];
                const temAlerta = motivos.length > 0;
                const isBlacklist = motivos.includes('blacklist');
                const isIntervalo = motivos.includes('intervalo_curto');
                const numLabel = a.numero ? `<span class="fisc-num-badge">#${escH(a.numero)}</span>` : '';

                const isAnulada = !!a.anulada;
                const badgesAlerta = [
                    isAnulada ? `<span class="fisc-flag" style="background:rgba(107,114,128,.18);color:#9ca3af;border:1px solid rgba(107,114,128,.3)">🚫 ANULADA</span>` : '',
                    isBlacklist ? `<span class="fisc-flag blacklist-flag">🚫 BLACKLIST</span>` : '',
                    isIntervalo ? `<span class="fisc-flag intervalo-flag">⏱ &lt;10MIN</span>` : '',
                ].filter(Boolean).join('');

                const dataFormatada = escH(new Date(a.dataAula || a.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }));
                const nAprov = a.aprovados ? a.aprovados.split(/[,\n]/).filter(Boolean).length : 0;
                const nReprov = a.reprovados ? a.reprovados.split(/[,\n]/).filter(Boolean).length : 0;

                return `
        <div class="hierarquia-item fisc-row${isAnulada ? ' fisc-row-anulada' : (temAlerta ? ' fisc-row-alerta' + (isBlacklist ? ' fisc-row-blacklist' : '') : '')}" style="border-radius:10px${isAnulada ? ';opacity:.6' : ''}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 14px">
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:4px">
                        ${numLabel}
                        <span style="font-size:.85rem;font-weight:700;color:var(--t1)${isAnulada ? ';text-decoration:line-through;color:var(--t3)' : ''}">${escH(a.tipo)}</span>
                        ${badgesAlerta}
                    </div>
                    <div style="font-size:.72rem;color:var(--t3);display:flex;gap:8px;flex-wrap:wrap">
                        <span>👤 ${escH(a.aplicador)}</span>
                        <span>📅 ${dataFormatada}</span>
                        ${a.semAlunos ? '<span>Sem alunos</span>' : (nAprov > 0 ? '<span>\u2705 ' + nAprov + ' aprov.</span>' : '')}
                        ${nReprov > 0 ? '<span>\u274c ' + nReprov + ' reprov.</span>' : ''}
                    </div>
                    ${a.motivoAnulacao ? `<div style="font-size:.7rem;color:#ef4444;margin-top:3px;font-weight:600">Motivo: ${escH(a.motivoAnulacao)}</div>` : ''}
                    ${!a.anulada && a.observacao ? `<div style="font-size:.7rem;color:var(--t3);margin-top:3px;font-style:italic">"${escH(a.observacao.substring(0,80))}${a.observacao.length>80?'…':''}"</div>` : ''}
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap;justify-content:flex-end">
                    <button class="btn-tabela-edit" title="Ver detalhes" onclick="verAulaFisc('${escH(a.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg> Ver
                    </button>
                    ${!isAnulada ? `
                    <button class="btn-tabela-edit" title="Editar aula" style="background:rgba(59,130,246,.15);color:#3b82f6;border-color:rgba(59,130,246,.3)" onclick="editarAulaFisc('${escH(a.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg> Editar
                    </button>
                    <button class="btn-tabela-edit" title="Anular aula" style="background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.3)" onclick="anularAulaFisc('${escH(a.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg> Anular
                    </button>` : `
                    <button class="btn-tabela-edit" title="Reativar aula" style="background:rgba(34,197,94,.12);color:var(--green);border-color:rgba(34,197,94,.3)" onclick="reativarAulaFisc('${escH(a.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12">
                            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                        </svg> Reativar
                    </button>`}
                </div>
            </div>
        </div>`;
            }).join('') + '</div>';

        // Gerenciar blacklist
        qs('#btnGerenciarBlacklist')?.addEventListener('click', () => abrirModalBlacklist());
    }

    // ── Modal de Blacklist ────────────────────────────────
    window._blacklistModalOpen = false;
    function abrirModalBlacklist() {
        if (window._blacklistModalOpen) return;
        window._blacklistModalOpen = true;

        const overlay = document.createElement('div');
        overlay.className = 'modal-wrap open';
        overlay.id = 'blacklistModal';
        const bl = getBlacklist();

        overlay.innerHTML = `
        <div class="modal-content" style="max-width:420px">
            <div class="modal-header">
                <h3>🚫 Blacklist de Alunos</h3>
                <button class="modal-close" id="blModalClose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <p style="font-size:.75rem;color:var(--t3);margin-bottom:12px">Alunos na blacklist terão suas aulas sinalizadas automaticamente.</p>
                <div class="g-form-group" style="display:flex;gap:8px">
                    <input type="text" class="g-input" id="blNickInput" placeholder="Nick do aluno" style="flex:1">
                    <button class="btn-primary" id="blAdicionarBtn" style="white-space:nowrap">Adicionar</button>
                </div>
                <div id="blLista" style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
                    ${bl.length === 0 ? '<div style="color:var(--t3);font-size:.78rem">Nenhum instrutor na blacklist.</div>' :
                      bl.map(nick => `
                      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:8px 12px">
                          <span style="font-weight:700;color:var(--red);font-size:.82rem">🚫 ${escH(nick)}</span>
                          <button class="btn-icon del bl-remover" data-nick="${escH(nick)}" style="width:26px;height:26px">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                      </div>`).join('')}
                </div>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        overlay.querySelector('#blModalClose').addEventListener('click', fecharBlacklist);
        overlay.addEventListener('click', e => { if (e.target === overlay) fecharBlacklist(); });

        overlay.querySelector('#blAdicionarBtn').addEventListener('click', () => {
            const nick = (overlay.querySelector('#blNickInput').value || '').trim();
            if (!nick) return;
            const bl2 = getBlacklist();
            if (bl2.some(b => b.toLowerCase() === nick.toLowerCase())) { toast('Já está na blacklist.', 'error'); return; }
            bl2.push(nick);
            saveBlacklist(bl2);
            toast(`${nick} adicionado à blacklist.`);
            fecharBlacklist();
            renderFiscalizacao((qs('#fiscSearch')||{}).value||'');
        });

        overlay.querySelectorAll('.bl-remover').forEach(btn => {
            btn.addEventListener('click', () => {
                const nick = btn.dataset.nick;
                const bl2 = getBlacklist().filter(b => b.toLowerCase() !== nick.toLowerCase());
                saveBlacklist(bl2);
                toast(`${nick} removido da blacklist.`);
                fecharBlacklist();
                renderFiscalizacao((qs('#fiscSearch')||{}).value||'');
            });
        });

        function fecharBlacklist() {
            overlay.remove();
            window._blacklistModalOpen = false;
        }
    }

    // ── Modal Ver Aula ───────────────────────────────────
    window.verAulaFisc = (id) => {
        const todas = getAulas();
        const a = todas.find(x => x.id === id);
        if (!a) return;

        const dataFormatada = new Date(a.dataAula || a.timestamp).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const aprovList = (a.aprovados || '').split(/[,\n]/).map(n => n.trim()).filter(Boolean);
        const reprovList = (a.reprovados || '').split(/[,\n]/).map(n => n.trim()).filter(Boolean);

        const renderNicks = (nicks, cor, icone) => nicks.length === 0
            ? `<span style="color:var(--t3);font-size:.78rem">Nenhum</span>`
            : nicks.map(n => `
                <span style="display:inline-flex;align-items:center;gap:5px;background:${cor}22;border:1px solid ${cor}44;border-radius:8px;padding:4px 10px;font-size:.78rem;font-weight:600;color:${cor}">
                    ${icone}
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(n)}&headonly=1&size=s&gesture=std"
                        style="width:20px;height:20px;border-radius:50%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">
                    ${escH(n)}
                </span>`).join('');

        const overlay = document.createElement('div');
        overlay.className = 'modal-wrap open';
        overlay.innerHTML = `
        <div class="modal-content" style="max-width:500px">
            <div class="modal-header">
                <h3>📋 Detalhes da Aula ${a.numero ? '<span style="color:var(--green);font-size:.85rem">#' + escH(a.numero) + '</span>' : ''}</h3>
                <button class="modal-close" id="verAulaClose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
                <!-- Info principal -->
                <div style="background:var(--bg-2);border-radius:10px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
                    <div>
                        <div style="font-size:.65rem;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">Tipo</div>
                        <div style="font-size:.85rem;font-weight:700;color:var(--t1)">${escH(a.tipo)}</div>
                    </div>
                    <div>
                        <div style="font-size:.65rem;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">Aplicador</div>
                        <div style="display:flex;align-items:center;gap:6px">
                            <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(a.aplicador||'')}&headonly=1&size=s&gesture=std"
                                style="width:22px;height:22px;border-radius:50%;object-fit:cover" loading="lazy">
                            <span style="font-size:.85rem;font-weight:700;color:var(--t1)">${escH(a.aplicador)}</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:.65rem;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">📅 Data e Hora</div>
                        <div style="font-size:.82rem;font-weight:600;color:var(--t2)">${dataFormatada}</div>
                    </div>
                    <div>
                        <div style="font-size:.65rem;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">Centro</div>
                        <div style="font-size:.82rem;font-weight:600;color:var(--t2)">${escH(a.centro || orgao.title || orgao.id)}</div>
                    </div>
                </div>

                <!-- Aprovados -->
                <div>
                    <div style="font-size:.7rem;color:var(--green);font-weight:700;text-transform:uppercase;margin-bottom:6px">
                        ✅ Aprovados (${aprovList.length})
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px">
                        ${a.semAlunos ? '<span style="color:var(--t3);font-size:.78rem">Aula sem alunos</span>' : renderNicks(aprovList, '#22c55e', '✅')}
                    </div>
                </div>

                <!-- Reprovados -->
                <div>
                    <div style="font-size:.7rem;color:#ef4444;font-weight:700;text-transform:uppercase;margin-bottom:6px">
                        ❌ Reprovados (${reprovList.length})
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px">
                        ${a.semAlunos ? '<span style="color:var(--t3);font-size:.78rem">Aula sem alunos</span>' : renderNicks(reprovList, '#ef4444', '❌')}
                    </div>
                </div>

                <!-- Observação -->
                ${a.observacao ? `
                <div>
                    <div style="font-size:.7rem;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:6px">💬 Observação</div>
                    <div style="background:var(--bg-2);border-radius:8px;padding:10px 12px;font-size:.8rem;color:var(--t2);font-style:italic">"${escH(a.observacao)}"</div>
                </div>` : ''}
            </div>
        </div>`;

        document.body.appendChild(overlay);
        overlay.querySelector('#verAulaClose').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    };

    // ── Modal Editar Aula ────────────────────────────────
    window.editarAulaFisc = (id) => {
        const todas = getAulas();
        const a = todas.find(x => x.id === id);
        if (!a) return;

        // Monta chips helper reutilizável
        function makeTagSystem(containerId, inputId, initialNicks, chipClass, icone) {
            let tags = [...initialNicks];
            const container = document.getElementById(containerId);
            const input = document.getElementById(inputId);

            function render() {
                container.querySelectorAll('.tag-chip-modal').forEach(c => c.remove());
                tags.forEach((nick, idx) => {
                    const chip = document.createElement('span');
                    chip.className = `tag-chip-modal ${chipClass}`;
                    chip.innerHTML = `${icone} ${escH(nick)}<button type="button" data-idx="${idx}">&times;</button>`;
                    container.insertBefore(chip, input);
                });
                container.querySelectorAll('.tag-chip-modal button').forEach(btn => {
                    btn.addEventListener('click', () => { tags.splice(+btn.dataset.idx, 1); render(); });
                });
            }
            render();

            function add(nick) {
                const n = nick.trim();
                if (!n || tags.some(t => t.toLowerCase() === n.toLowerCase())) return;
                tags.push(n);
                render();
            }

            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    add(e.target.value);
                    e.target.value = '';
                }
            });
            input.addEventListener('blur', e => {
                if (e.target.value.trim()) { add(e.target.value); e.target.value = ''; }
            });

            return { get: () => tags };
        }

        const aprovInicial = (a.aprovados || '').split(/[,\n]/).map(n => n.trim()).filter(Boolean);
        const reprovInicial = (a.reprovados || '').split(/[,\n]/).map(n => n.trim()).filter(Boolean);

        const overlay = document.createElement('div');
        overlay.className = 'modal-wrap open';
        overlay.innerHTML = `
        <div class="modal-content" style="max-width:520px">
            <div class="modal-header">
                <h3>✏️ Editar Aula ${a.numero ? '<span style="color:var(--green);font-size:.85rem">#' + escH(a.numero) + '</span>' : ''}</h3>
                <button class="modal-close" id="editAulaClose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
                <div class="g-form-group">
                    <label class="g-label">Tipo de Aula</label>
                    <input type="text" class="g-input" id="editTipo" value="${escH(a.tipo)}">
                </div>
                <div class="g-form-group">
                    <label class="g-label">✅ Aprovados</label>
                    <div class="tag-input-container" id="editAprovContainer" onclick="document.getElementById('editAprovInput').focus()" style="cursor:text">
                        <input type="text" id="editAprovInput" class="tag-input-field" placeholder="Nick + Enter ou Tab...">
                    </div>
                </div>
                <div class="g-form-group">
                    <label class="g-label">❌ Reprovados</label>
                    <div class="tag-input-container" id="editReprovContainer" onclick="document.getElementById('editReprovInput').focus()" style="cursor:text">
                        <input type="text" id="editReprovInput" class="tag-input-field" placeholder="Nick + Enter ou Tab...">
                    </div>
                </div>
                <div class="g-form-group">
                    <label class="aula-check-label">
                        <input type="checkbox" id="editSemAlunos" ${a.semAlunos ? 'checked' : ''}>
                        <span class="aula-check-box"></span>
                        Aula sem alunos
                    </label>
                </div>
                <div class="g-form-group">
                    <label class="g-label">💬 Observação</label>
                    <textarea class="g-input" id="editObs" style="min-height:80px;resize:vertical">${escH(a.observacao || '')}</textarea>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
                    <button class="btn-secondary" id="editAulaCancelar">Cancelar</button>
                    <button class="btn-primary" id="editAulaSalvar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><polyline points="20 6 9 17 4 12"/></svg>
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        // Inicia tag systems após o DOM estar pronto
        const aprovSys = makeTagSystem('editAprovContainer', 'editAprovInput', aprovInicial, 'aprov', '✅');
        const reprovSys = makeTagSystem('editReprovContainer', 'editReprovInput', reprovInicial, 'reprov', '❌');

        const fechar = () => overlay.remove();
        overlay.querySelector('#editAulaClose').addEventListener('click', fechar);
        overlay.querySelector('#editAulaCancelar').addEventListener('click', fechar);
        overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });

        overlay.querySelector('#editAulaSalvar').addEventListener('click', () => {
            const novoTipo = overlay.querySelector('#editTipo').value.trim();
            const novaObs = overlay.querySelector('#editObs').value.trim();
            const novoSemAlunos = overlay.querySelector('#editSemAlunos').checked;
            if (!novoTipo) { toast('Informe o tipo de aula.', 'error'); return; }

            const idx = todas.findIndex(x => x.id === id);
            if (idx === -1) return;
            todas[idx] = {
                ...todas[idx],
                tipo: novoTipo,
                aprovados: aprovSys.get().join(', '),
                reprovados: reprovSys.get().join(', '),
                semAlunos: novoSemAlunos,
                observacao: novaObs,
                editadoEm: new Date().toLocaleString('pt-BR'),
                editadoPor: username,
            };
            set('dme_aulas', todas);
            toast('Aula atualizada com sucesso.', 'success');
            fechar();
            renderFiscalizacao((qs('#fiscSearch') || {}).value || '');
            renderRanking();
        });
    };

    // ── Anular Aula ──────────────────────────────────────
    window.anularAulaFisc = (id) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-wrap open';
        overlay.innerHTML = `
        <div class="modal-content" style="max-width:400px">
            <div class="modal-header">
                <h3>🚫 Anular Aula</h3>
                <button class="modal-close" id="anularClose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
                <p style="font-size:.82rem;color:var(--t2)">A aula ficará visível com status <strong style="color:#ef4444">ANULADA</strong> e não será contabilizada no ranking.</p>
                <div class="g-form-group">
                    <label class="g-label">Motivo da Anulação <span class="req-star">*</span></label>
                    <textarea class="g-input" id="motivoAnulacao" style="min-height:70px;resize:vertical" placeholder="Descreva o motivo..."></textarea>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end">
                    <button class="btn-secondary" id="anularCancelar">Cancelar</button>
                    <button class="btn-primary" id="anularConfirmar" style="background:#ef4444;border-color:#ef4444">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        Confirmar Anulação
                    </button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(overlay);
        const fechar = () => overlay.remove();
        overlay.querySelector('#anularClose').addEventListener('click', fechar);
        overlay.querySelector('#anularCancelar').addEventListener('click', fechar);
        overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });

        overlay.querySelector('#anularConfirmar').addEventListener('click', () => {
            const motivo = overlay.querySelector('#motivoAnulacao').value.trim();
            if (!motivo) { toast('Informe o motivo da anulação.', 'error'); return; }
            const todas = getAulas();
            const idx = todas.findIndex(x => x.id === id);
            if (idx === -1) return;
            todas[idx] = { ...todas[idx], anulada: true, motivoAnulacao: motivo, anuladaEm: new Date().toLocaleString('pt-BR'), anuladaPor: username };
            set('dme_aulas', todas);
            toast('Aula anulada.', 'success');
            fechar();
            renderFiscalizacao((qs('#fiscSearch') || {}).value || '');
            renderRanking();
        });
    };

    // ── Reativar Aula ────────────────────────────────────
    window.reativarAulaFisc = (id) => {
        confirmar('Reativar esta aula? Ela voltará a ser contabilizada normalmente.', () => {
            const todas = getAulas();
            const idx = todas.findIndex(x => x.id === id);
            if (idx === -1) return;
            delete todas[idx].anulada;
            delete todas[idx].motivoAnulacao;
            delete todas[idx].anuladaEm;
            delete todas[idx].anuladaPor;
            set('dme_aulas', todas);
            toast('Aula reativada.', 'success');
            renderFiscalizacao((qs('#fiscSearch') || {}).value || '');
            renderRanking();
        });
    };

        window.removerAulaFisc = (id) => {
        confirmar('Remover esta aula do registro? Esta ação é irreversível.', () => {
            const todas = getAulas().filter(a => a.id !== id);
            set('dme_aulas', todas);
            toast('Aula removida.');
            renderFiscalizacao();
            renderMetaSemanal();
            renderRanking();
        });
    };

    // ── Licenças do Centro ───────────────────────────────
    function getLicencas() {
        return get('dme_licencas_' + orgao.id) || [];
    }
    function saveLicencas(arr) {
        set('dme_licencas_' + orgao.id, arr);
    }
    function getLicencasAtivas() {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        return getLicencas().filter(l => {
            if (!l.ativa) return false;
            if (l.dataFim) {
                const fim = new Date(l.dataFim); fim.setHours(23,59,59,999);
                return fim >= hoje;
            }
            return true; // sem data fim = indefinida
        });
    }
    function isEmLicenca(nick) {
        return getLicencasAtivas().some(l => l.nick.toLowerCase() === nick.toLowerCase());
    }

    // Botão Licença → abre modal
    qs('#btnLicenca')?.addEventListener('click', abrirModalLicenca);

    function abrirModalLicenca() {
        const membros = getMembrosOrgao();
        const hoje = new Date().toISOString().slice(0,10);
        const licAtivas = getLicencasAtivas();

        // Cargo do usuário atual neste centro
        const meuMembro = membros.find(m => m.username.toLowerCase() === username.toLowerCase());
        const meuCargo = meuMembro ? meuMembro.cargo : 'Militar';

        const overlay = document.createElement('div');
        overlay.className = 'modal-wrap open';
        overlay.id = 'licencaModal';

        overlay.innerHTML = `
        <div class="modal-content" style="max-width:460px">
            <div class="modal-header">
                <h3>📅 Licenças do Centro</h3>
                <button class="modal-close" id="licModalClose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column;gap:16px">

                <!-- Solicitante (fixo = usuário logado) -->
                <div style="background:var(--bg-3);border:1px solid var(--b1);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std"
                        style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid var(--green);flex-shrink:0" loading="lazy">
                    <div>
                        <div style="font-weight:800;font-size:.9rem;color:var(--t1)">${escH(username)}</div>
                        <div style="font-size:.72rem;color:var(--t3)">${escH(meuCargo)} · Solicitante</div>
                    </div>
                    <span style="margin-left:auto;font-size:.68rem;font-weight:700;background:var(--green-muted);color:var(--green);padding:3px 10px;border-radius:8px">Você</span>
                </div>

                <!-- Formulário -->
                <div style="display:flex;flex-direction:column;gap:12px">
                    <div style="font-size:.7rem;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Nova Licença</div>

                    <div class="g-form-row" style="gap:10px">
                        <div class="g-form-group" style="margin:0;flex:1">
                            <label class="g-label">📅 Início</label>
                            <input type="date" class="g-input" id="licDataInicio" value="${hoje}">
                        </div>
                        <div class="g-form-group" style="margin:0;flex:1">
                            <label class="g-label">📅 Fim <span style="color:var(--t3);font-weight:400">(opcional)</span></label>
                            <input type="date" class="g-input" id="licDataFim">
                        </div>
                    </div>

                    <div class="g-form-group" style="margin:0">
                        <label class="g-label">💬 Motivo</label>
                        <input type="text" class="g-input" id="licMotivo" placeholder="Ex: Viagem, Problema pessoal, Trabalho...">
                    </div>

                    <button class="btn-primary" id="licAdicionarBtn" style="width:100%;justify-content:center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><path d="M12 5v14M5 12h14"/></svg>
                        Registrar Minha Licença
                    </button>
                </div>

                <!-- Divider -->
                <div style="border-top:1px solid var(--b1)"></div>

                <!-- Lista de licenças ativas -->
                <div>
                    <div style="font-size:.7rem;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">
                        Licenças Ativas
                        <span style="background:var(--bg-3);border:1px solid var(--b1);border-radius:6px;padding:1px 7px;font-size:.68rem;margin-left:6px;color:var(--t2)">${licAtivas.length}</span>
                    </div>
                    <div id="licListaAtivas" style="display:flex;flex-direction:column;gap:8px">
                        ${licAtivas.length === 0
                            ? `<div style="text-align:center;padding:16px 0;color:var(--t3);font-size:.8rem">
                                <div style="font-size:1.5rem;margin-bottom:6px">🏖️</div>
                                Nenhuma licença ativa no momento.
                               </div>`
                            : licAtivas.map(l => `
                            <div style="display:flex;align-items:center;gap:10px;background:var(--bg-3);border:1px solid var(--b1);border-radius:10px;padding:10px 12px">
                                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(l.nick)}&headonly=1&size=s&gesture=std"
                                    style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #f59e0b" loading="lazy">
                                <div style="flex:1;min-width:0">
                                    <div style="font-weight:700;font-size:.83rem;color:var(--t1)">${escH(l.nick)}</div>
                                    <div style="font-size:.69rem;color:var(--t3);margin-top:1px">
                                        ${l.dataInicio ? new Date(l.dataInicio).toLocaleDateString('pt-BR') : '—'}
                                        ${l.dataFim ? ' → ' + new Date(l.dataFim + 'T23:59:59').toLocaleDateString('pt-BR') : ' (indefinido)'}
                                        ${l.motivo ? ' · ' + escH(l.motivo) : ''}
                                    </div>
                                </div>
                                <button class="lic-encerrar" data-id="${l.id}" title="Encerrar licença"
                                    style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#ef4444;border-radius:8px;padding:5px 10px;font-size:.7rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .2s">
                                    Encerrar
                                </button>
                            </div>`).join('')
                        }
                    </div>
                </div>

            </div>
        </div>`;

        document.body.appendChild(overlay);

        overlay.querySelector('#licModalClose').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector('#licAdicionarBtn').addEventListener('click', () => {
            const dataInicio = overlay.querySelector('#licDataInicio').value;
            const dataFim = overlay.querySelector('#licDataFim').value;
            const motivo = overlay.querySelector('#licMotivo').value.trim();

            const todas = getLicencas();
            todas.forEach(l => { if (l.nick.toLowerCase() === username.toLowerCase()) l.ativa = false; });

            todas.push({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2),
                nick: username, dataInicio, dataFim: dataFim || null, motivo,
                ativa: true,
                registradoPor: username,
                registradoEm: new Date().toLocaleString('pt-BR'),
            });
            saveLicencas(todas);
            toast('Licença registrada com sucesso!', 'success');
            overlay.remove();
            renderMetaSemanal();
            renderListaLicencas();
        });

        overlay.querySelectorAll('.lic-encerrar').forEach(btn => {
            btn.addEventListener('click', () => {
                const todas = getLicencas();
                const l = todas.find(x => x.id === btn.dataset.id);
                if (l) { l.ativa = false; l.encerradoEm = new Date().toLocaleString('pt-BR'); }
                saveLicencas(todas);
                toast('Licença encerrada.', 'success');
                overlay.remove();
                renderMetaSemanal();
                renderListaLicencas();
            });
        });
    }

    // ── Listagem de licenças na aba Membros ──────────────
    function renderListaLicencas() {
        const container = qs('#licencasListContainer');
        if (!container) return;
        const ativas = getLicencasAtivas();
        const title = qs('#licencasSection');
        if (title) title.style.display = ativas.length > 0 ? 'block' : 'none';
        if (!ativas.length) { container.innerHTML = ''; return; }

        container.innerHTML = ativas.map(l => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b1)">
            <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(l.nick)}&headonly=1&size=s&gesture=std"
                style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:2px solid #f59e0b" loading="lazy">
            <div style="flex:1">
                <div style="font-weight:700;font-size:.83rem;color:var(--t1)">${escH(l.nick)}</div>
                <div style="font-size:.68rem;color:var(--t3)">
                    📅 ${l.dataInicio ? new Date(l.dataInicio).toLocaleDateString('pt-BR') : '—'}
                    ${l.dataFim ? ' até ' + new Date(l.dataFim + 'T23:59:59').toLocaleDateString('pt-BR') : ' (indefinido)'}
                    ${l.motivo ? ' · ' + escH(l.motivo) : ''}
                </div>
            </div>
            <span style="font-size:.68rem;font-weight:700;background:rgba(245,158,11,.15);color:#f59e0b;padding:3px 9px;border-radius:7px">📅 Licença</span>
        </div>`).join('');
    }

    // ── Meta Semanal ─────────────────────────────────────
    function getMetas() {
        // Metas por cargo: retorna { min, tipo, label }
        // tipo: 'total' = qualquer aula, 'caps' = capacitações, 'adm' = admissões, 'lideranca' = cumprimento interno
        const c = (orgao.id || '').toLowerCase();
        return {
            instrutor:    { min: 3, tipo: 'total',    label: 'Aulas', cargo: 'Instrutor' },
            treinador:    { min: 3, tipo: 'total',    label: 'Treinamentos', cargo: 'Treinador' },
            supervisor:   { min: 3, tipo: 'total',    label: 'Supervisões', cargo: 'Supervisor' },
            capacitador:  { min: 2, tipo: 'caps',     label: 'Capacitações', cargo: 'Capacitador' },
            ministro:     { min: 2, tipo: 'adm',      label: 'Admissões', cargo: 'Ministro' },
            'vice-lider': { min: 0, tipo: 'lideranca', label: 'Obrigações', cargo: 'Vice-Líder' },
            'vice-líder': { min: 0, tipo: 'lideranca', label: 'Obrigações', cargo: 'Vice-Líder' },
            lider:        { min: 0, tipo: 'lideranca', label: 'Obrigações', cargo: 'Líder' },
            'líder':      { min: 0, tipo: 'lideranca', label: 'Obrigações', cargo: 'Líder' },
        };
    }

    function getMetaDoCargo(cargo) {
        const METAS = getMetas();
        const cargoLower = (cargo || '').toLowerCase();
        // Ministros (qualquer especialidade)
        if (cargoLower.startsWith('ministro')) return METAS['ministro'];
        return METAS[cargoLower] || null;
    }

    function contarAulasPorTipo(aulas, nick) {
        const minhas = aulas.filter(a =>
            (a.aplicador || '').toLowerCase() === nick.toLowerCase() && !a.anulada
        );
        let total = 0, caps = 0, adm = 0, aux = 0;
        minhas.forEach(a => {
            const tipo = (a.tipo || '').toLowerCase();
            if (tipo.includes('capacitação') || tipo.includes('capacitacao') || tipo.includes('cap')) caps++;
            else if (tipo.includes('admissão') || tipo.includes('admissao') || tipo.includes('adm')) adm++;
            else if (tipo.includes('auxílio') || tipo.includes('auxilio') || tipo.includes('aux')) aux++;
            else total++;
        });
        return { total: minhas.length, treinos: total, caps, adm, aux };
    }

    // ── Meta Semanal ─────────────────────────────────────
    function renderMetaSemanal() {
        const panel = qs('#metaSemanalPanel');
        if (!panel) return;

        const aulas  = getAulasAtivasDoPeriodo(orgao.id);
        const membros = getMembrosOrgao();
        const periodo = formatPeriodo(orgao.id);

        if (membros.length === 0) {
            panel.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">Nenhum membro cadastrado.</div></div>`;
            return;
        }

        // ── Processar membros ────────────────────────────
        const pad = n => String(n).padStart(2, '0');

        const processados = membros.map(m => {
            const meta = getMetaDoCargo(m.cargo);
            if (!meta) return null;
            const stats = contarAulasPorTipo(aulas, m.username);
            let atual = 0;
            if      (meta.tipo === 'lideranca') atual = 1;
            else if (meta.tipo === 'total')     atual = stats.total;
            else if (meta.tipo === 'caps')      atual = stats.caps;
            else if (meta.tipo === 'adm')       atual = stats.adm;
            const cumpriu = meta.tipo === 'lideranca' ? true : atual >= meta.min;
            return { ...m, meta, stats, atual, cumpriu };
        }).filter(Boolean);

        // Período atual para detectar membro novo
        const periodoObj = getPeriodo(orgao.id);
        const inicioSemana = new Date(periodoObj.inicio).getTime();

        const lideranca      = processados.filter(m => m.meta.tipo === 'lideranca');

        // Licenciados: qualquer cargo que esteja com licença ativa
        const licenciados    = processados.filter(m => m.meta.tipo !== 'lideranca' && isEmLicenca(m.username));

        // Membros novos: entraram durante ou após o início da semana atual E não atingiram a meta
        const membrosNovos   = processados.filter(m => {
            if (m.meta.tipo === 'lideranca') return false;
            if (isEmLicenca(m.username)) return false;
            if (m.cumpriu) return false;
            if (!m.dataEntrada) return false;
            const entrada = new Date(m.dataEntrada).getTime();
            return entrada >= inicioSemana;
        });

        const idsBloqueados = new Set([
            ...licenciados.map(m => m.username),
            ...membrosNovos.map(m => m.username),
        ]);

        const cumprindo = processados.filter(m => m.meta.tipo !== 'lideranca' && m.cumpriu && !idsBloqueados.has(m.username));
        const pendentes = processados.filter(m => m.meta.tipo !== 'lideranca' && !m.cumpriu && !idsBloqueados.has(m.username));

        const medalhista = cumprindo.reduce((b, m) => (!b || m.stats.total > b.stats.total) ? m : b, null);

        const instrutoresOK   = cumprindo.filter(m => m !== medalhista && m.meta.tipo === 'total');
        const capacitadoresOK = cumprindo.filter(m => m !== medalhista && m.meta.tipo === 'caps');
        const ministrosOK     = cumprindo.filter(m => m !== medalhista && m.meta.tipo === 'adm');
        const instutoresFail  = pendentes.filter(m => m.meta.tipo === 'total');
        const capssFail       = pendentes.filter(m => m.meta.tipo === 'caps');
        const minFail         = pendentes.filter(m => m.meta.tipo === 'adm');

        const totalAulas = aulas.length;
        const totalCaps  = aulas.filter(a => (a.tipo||'').toLowerCase().includes('cap')).length;
        const totalAdm   = aulas.filter(a => (a.tipo||'').toLowerCase().includes('adm')).length;
        const totalAux   = aulas.filter(a => (a.tipo||'').toLowerCase().includes('aux')).length;

        // ── Formatar linha de stats ───────────────────────
        const fmtStats = (m) => {
            const s = m.stats; const p = [];
            if (s.treinos > 0) p.push(`${pad(s.treinos)} Aulas`);
            if (s.caps > 0)    p.push(`${pad(s.caps)} Capacitações`);
            if (s.adm > 0)     p.push(`${pad(s.adm)} Admissões`);
            if (s.aux > 0)     p.push(`${pad(s.aux)} Auxílios`);
            return `[${p.length ? p.join(' / ') : '00 Atividades'}]`;
        };

        // ── Linha de membro idêntica ao print ────────────
        // NICK [00 Aulas] com avatar pequeno ao lado
        const memberLine = (m, medal = false) => `
            <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin:2px 0">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.username)}&headonly=1&size=s&gesture=std"
                    style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0" loading="lazy"
                    onerror="this.style.display='none'">
                <span style="font-size:13px;color:#333">${escH(m.username)} ${fmtStats(m)}${medal ? ' 🏆' : ''}</span>
            </div>`;

        const liderancaLine = (m) => `
            <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin:2px 0">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.username)}&headonly=1&size=s&gesture=std"
                    style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0" loading="lazy"
                    onerror="this.style.display='none'">
                <span style="font-size:13px;color:#333">${escH(m.username)} (Cumpriu com sua função na liderança)</span>
            </div>`;

        // ── Título de seção colorido UPPERCASE ───────────
        const secTitle = (cor, txt) =>
            `<p style="color:${cor};font-weight:bold;text-transform:uppercase;font-size:13px;margin:18px 0 6px">${txt}</p>`;

        // ── Texto para copiar ─────────────────────────────
        const buildTexto = () => {
            const lines = [];
            lines.push(`Meta Semanal - ${periodo}`);
            lines.push('');
            lines.push('MEDALHISTA SEMANAL:');
            lines.push(medalhista ? `${medalhista.username} ${fmtStats(medalhista)} 🏆` : '---');
            lines.push('');
            lines.push('INSTRUTORES COM METAS ALCANÇADAS:');
            instrutoresOK.length ? instrutoresOK.forEach(m => lines.push(`${m.username} ${fmtStats(m)}`)) : lines.push('---');
            lines.push('');
            lines.push('CAPACITADORES COM METAS ALCANÇADAS:');
            capacitadoresOK.length ? capacitadoresOK.forEach(m => lines.push(`${m.username} ${fmtStats(m)}`)) : lines.push('---');
            lines.push('');
            lines.push('MINISTROS COM METAS ALCANÇADAS:');
            ministrosOK.length ? ministrosOK.forEach(m => lines.push(`${m.username} ${fmtStats(m)}`)) : lines.push('---');
            lines.push('');
            lines.push('LIDERANÇA:');
            lideranca.length ? lideranca.forEach(m => lines.push(`${m.username} (Cumpriu com sua função na liderança)`)) : lines.push('---');
            lines.push('');
            lines.push('INSTRUTORES QUE NÃO ATINGIRAM A META:');
            instutoresFail.length ? instutoresFail.forEach(m => lines.push(`${m.username} ${fmtStats(m)}`)) : lines.push('---');
            lines.push('');
            lines.push('CAPACITADORES QUE NÃO ATINGIRAM A META:');
            capssFail.length ? capssFail.forEach(m => lines.push(`${m.username} ${fmtStats(m)}`)) : lines.push('---');
            lines.push('');
            lines.push('MINISTROS QUE NÃO ATINGIRAM A META:');
            minFail.length ? minFail.forEach(m => lines.push(`${m.username} ${fmtStats(m)}`)) : lines.push('---');
            lines.push('');
            lines.push('CASOS ESPECIAIS:');
            // Automáticos
            licenciados.forEach(m => lines.push(`${m.username} ${fmtStats(m)} - (Licença)`));
            membrosNovos.forEach(m => lines.push(`${m.username} ${fmtStats(m)} - (Membro novo)`));
            // Manuais
            const ce = (qs('#casosEspeciaisInput') || {}).value || '';
            if (ce.trim()) lines.push(ce.trim());
            if (!licenciados.length && !membrosNovos.length && !ce.trim()) lines.push('---');
            lines.push('');
            lines.push('➔ TOTAL ⬅');
            lines.push(`${pad(totalAulas)} Aulas / ${pad(totalCaps)} Capacitações / ${pad(totalAdm)} Admissões / ${pad(totalAux)} Auxílios`);
            return lines.join('\n');
        };

        // ── Render ────────────────────────────────────────
        panel.innerHTML = `
        <!-- Barra de ações -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-bottom:14px;margin-bottom:6px;border-bottom:1px solid var(--b1)">
            <div style="font-size:.72rem;color:var(--t3)">
                <strong style="color:var(--t1);font-size:.82rem">🎯 Meta Semanal</strong>
                &nbsp;·&nbsp; ${periodo}
                &nbsp;·&nbsp; <span style="color:#22c55e">✅ ${cumprindo.length + lideranca.length}</span>
                &nbsp;/&nbsp; <span style="color:#ef4444">❌ ${pendentes.length}</span>
            </div>
            <button id="btnCopiarMeta" style="display:inline-flex;align-items:center;gap:6px;background:var(--green);color:#fff;border:none;padding:7px 16px;border-radius:8px;font-weight:700;font-size:.78rem;cursor:pointer;white-space:nowrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copiar Meta
            </button>
        </div>

        <!-- Corpo do relatório — centralizado igual ao Habbo -->
        <div id="metaCorpo" style="font-family:'Verdana',sans-serif;text-align:center;line-height:1.8;padding:10px 0">

            <p style="font-size:11px;color:#666;font-weight:bold">Meta Semanal - ${periodo}</p>

            ${secTitle('#F39C12', 'Medalhista Semanal:')}
            ${medalhista ? memberLine(medalhista, true) : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#27AE60', 'Instrutores com Metas Alcançadas:')}
            ${instrutoresOK.length ? instrutoresOK.map(m => memberLine(m)).join('') : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#27AE60', 'Capacitadores com Metas Alcançadas:')}
            ${capacitadoresOK.length ? capacitadoresOK.map(m => memberLine(m)).join('') : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#27AE60', 'Ministros com Metas Alcançadas:')}
            ${ministrosOK.length ? ministrosOK.map(m => memberLine(m)).join('') : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#27AE60', 'Liderança:')}
            ${lideranca.length ? lideranca.map(m => liderancaLine(m)).join('') : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#E74C3C', 'Instrutores que Não Atingiram a Meta:')}
            ${instutoresFail.length ? instutoresFail.map(m => memberLine(m)).join('') : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#E74C3C', 'Capacitadores que Não Atingiram a Meta:')}
            ${capssFail.length ? capssFail.map(m => memberLine(m)).join('') : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#E74C3C', 'Ministros que Não Atingiram a Meta:')}
            ${minFail.length ? minFail.map(m => memberLine(m)).join('') : '<p style="font-size:13px;color:#333">---</p>'}

            ${secTitle('#1ABC9C', 'Casos Especiais:')}
            ${licenciados.map(m => `
            <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin:2px 0">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.username)}&headonly=1&size=s&gesture=std"
                    style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0" loading="lazy" onerror="this.style.display='none'">
                <span style="font-size:13px;color:#333">${escH(m.username)} ${fmtStats(m)} - (Licença)</span>
            </div>`).join('')}
            ${membrosNovos.map(m => `
            <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin:2px 0">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.username)}&headonly=1&size=s&gesture=std"
                    style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0" loading="lazy" onerror="this.style.display='none'">
                <span style="font-size:13px;color:#333">${escH(m.username)} ${fmtStats(m)} - (Membro novo)</span>
            </div>`).join('')}
            ${licenciados.length === 0 && membrosNovos.length === 0 ? '' : ''}
            <div style="margin:6px auto;max-width:420px">
                <textarea id="casosEspeciaisInput"
                    style="width:100%;min-height:46px;resize:vertical;padding:8px 12px;background:var(--bg-2);border:1px dashed var(--b1);border-radius:8px;font-size:12px;color:var(--t2);font-family:'Verdana',sans-serif;text-align:center;box-sizing:border-box"
                    placeholder="Outros casos manuais..."></textarea>
            </div>

            <p style="font-weight:bold;font-size:13px;margin:18px 0 4px">➔ TOTAL ⬅</p>
            <p style="font-size:13px;color:#333">
                ${pad(totalAulas)} Aulas / ${pad(totalCaps)} Capacitações / ${pad(totalAdm)} Admissões / ${pad(totalAux)} Auxílios
            </p>

        </div>`;

        // ── Copiar ────────────────────────────────────────
        qs('#btnCopiarMeta').addEventListener('click', function() {
            const txt = buildTexto();
            const btn = this;
            const ok = () => {
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13"><polyline points="20 6 9 17 4 12"/></svg> Copiado!`;
                btn.style.background = '#16a34a';
                setTimeout(() => {
                    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar Meta`;
                    btn.style.background = 'var(--green)';
                }, 2500);
            };
            if (navigator.clipboard) {
                navigator.clipboard.writeText(txt).then(ok).catch(() => { fallbackCopy(txt); ok(); });
            } else { fallbackCopy(txt); ok(); }
        });

        function fallbackCopy(txt) {
            const ta = document.createElement('textarea');
            ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
        }
    }


    // ── Membros ─────────────────────────────────────────
    // Funções de dados
    function getMembrosOrgao() {
        try {
            const raw = localStorage.getItem('dme_orgao_' + orgao.id);
            return raw ? (JSON.parse(raw).membros || []) : [];
        } catch (_) { return []; }
    }
    function saveMembrosOrgao(membros) {
        try {
            const raw = localStorage.getItem('dme_orgao_' + orgao.id);
            const data = raw ? JSON.parse(raw) : {};
            data.membros = membros;
            localStorage.setItem('dme_orgao_' + orgao.id, JSON.stringify(data));
        } catch (_) {}
    }

    // Funções disponiveis para seleção de cargos
    const CARGOS_DISPONIVEIS = function() {
        try {
            const raw = localStorage.getItem('dme_orgao_' + orgao.id);
            const data = raw ? JSON.parse(raw) : {};
            if (data.cargos && data.cargos.length) return data.cargos.map(function(c){ return c.nome || c; });
        } catch(_){}
        return ['Líder','Vice-Líder','Ministro','Capacitador','Instrutor','Membro'];
    };

    // Ordem hierárquica dos cargos
    const CARGO_ORDEM = ['Lider','Líder','Vice-Lider','Vice-Líder','Ministro','Ministro Administrativo','Ministro de Contabilidade','Ministro de Atualização','Ministro de Fiscalização','Suboficial','Capacitador','Instrutor','Membro'];
    // Verifica se um cargo é do tipo Ministro (qualquer especialidade)
    function ehMinistro(cargo) {
        return (cargo || '').toLowerCase().startsWith('ministro');
    }

    // Retorna o label de exibição do grupo — ministros agrupam como "Ministro"
    function labelGrupo(cargo) {
        return ehMinistro(cargo) ? 'Ministro' : cargo;
    }

    function getCargoOrdem(cargo) {
        const idx = CARGO_ORDEM.findIndex(function(c){ return c.toLowerCase() === (cargo||'').toLowerCase(); });
        return idx >= 0 ? idx : CARGO_ORDEM.length;
    }

    // Estado: view atual (lista | avatares | tabela)
    let membrosView = 'lista';

    // Mostrar botão + e toggle tabela para líderes
    if (isLider(orgao.id)) {
        const btnAdd = qs('#btnAddMembro');
        if (btnAdd) btnAdd.style.display = 'inline-flex';
        const btnTab = qs('#btnViewTabela');
        if (btnTab) btnTab.style.display = 'inline-flex';
    }

    // Toggle de view
    qsa('.view-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            membrosView = btn.dataset.view;
            qsa('.view-btn').forEach(function(b){ b.classList.remove('active'); });
            btn.classList.add('active');
            const filter = (qs('#membrosSearch') || {}).value || '';
            renderMembros(filter.toLowerCase());
        });
    });

    // Busca
    renderMembros();
    renderListaLicencas();
    qs('#membrosSearch')?.addEventListener('input', function() {
        renderMembros(this.value.toLowerCase());
    });

    function renderMembros(filter) {
        filter = filter || '';
        if (membrosView === 'tabela' && isLider(orgao.id)) {
            renderMembrosTabela(filter);
        } else if (membrosView === 'avatares') {
            renderMembrosAvataresGrid(filter);
        } else {
            renderMembrosAvatares(filter); // lista com data (padrão)
        }
    }

    // ── View Listagem (padrão — por seção com data) ────────
    function renderMembrosAvatares(filter) {
        const list = qs('#membrosList');
        const tabelaList = qs('#membrosListTabela');
        if (!list) return;
        list.style.display = '';
        if (tabelaList) tabelaList.style.display = 'none';

        let membrosOrgao = getMembrosOrgao();
        if (filter) membrosOrgao = membrosOrgao.filter(function(m){
            return (m.username||'').toLowerCase().includes(filter) ||
                   (m.cargo||'').toLowerCase().includes(filter);
        });

        if (membrosOrgao.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:48px 20px">' +
                '<div class="empty-icon" style="font-size:2rem;margin-bottom:10px">&#x1F465;</div>' +
                '<div class="empty-text">' + (filter ? 'Nenhum membro encontrado.' : 'Nenhum membro cadastrado neste centro.') + '</div>' +
                '</div>';
            return;
        }

        // Agrupar: ministros ficam em grupo único "Ministério"
        const grupos = {};
        const ordemGrupos = [];
        membrosOrgao.forEach(function(m) {
            const cargo = m.cargo || 'Membro';
            var grupoKey;
            if (ehMinistro(cargo)) {
                grupoKey = 'Ministério';
            } else {
                // Normalizar nome do grupo p/ exibição
                grupoKey = cargo === 'Líder' || cargo === 'Lider' ? 'Liderança'
                         : cargo === 'Vice-Líder' || cargo === 'Vice-Lider' ? 'Liderança'
                         : cargo === 'Capacitador' ? 'Capacitadores'
                         : cargo === 'Instrutor' ? 'Instrutores'
                         : cargo;
            }
            if (!grupos[grupoKey]) { grupos[grupoKey] = []; ordemGrupos.push(grupoKey); }
            grupos[grupoKey].push(m);
        });

        // Ordenação dos grupos pela hierarquia (usando primeiro membro do grupo)
        const GRUPO_ORDEM = ['Liderança','Ministério','Capacitadores','Instrutores','Membro'];
        const cargosOrdenados = Object.keys(grupos).sort(function(a, b) {
            var ia = GRUPO_ORDEM.indexOf(a); var ib = GRUPO_ORDEM.indexOf(b);
            if (ia < 0) ia = 99; if (ib < 0) ib = 99;
            return ia - ib;
        });

        function formatData(dataStr) {
            if (!dataStr) return '';
            // Suporta ISO, dd/mm/yyyy, dd Mon yyyy
            try {
                var d = new Date(dataStr);
                if (isNaN(d.getTime())) return dataStr;
                var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                return d.getDate().toString().padStart(2,'0') + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
            } catch(_) { return dataStr; }
        }

        list.innerHTML = cargosOrdenados.map(function(grupoKey) {
            var membros = grupos[grupoKey];
            // Ordenar dentro do grupo pelo cargo hierárquico e depois pela data
            membros.sort(function(a, b) {
                var oa = getCargoOrdem(a.cargo), ob = getCargoOrdem(b.cargo);
                if (oa !== ob) return oa - ob;
                // mesma hierarquia: mais antigo primeiro
                if (a.dataEntrada && b.dataEntrada) return new Date(a.dataEntrada) - new Date(b.dataEntrada);
                return 0;
            });

            var totalSlots = membros.filter(function(m){ return m.slots; }).length > 0
                ? membros[0].slots : null;

            var countLabel = totalSlots
                ? '[' + membros.length + '/' + totalSlots + ']'
                : '[' + membros.length + ']';

            var linhas = membros.map(function(m) {
                var nick = m.username || '';
                var dataFmt = m.dataEntrada ? formatData(m.dataEntrada) : '';
                var cargoLabel = ehMinistro(m.cargo) ? escH(m.cargo) : '';
                return '<li>' +
                    (cargoLabel ? '<span class="listagem-cargo-label">' + cargoLabel + ':</span> ' : '') +
                    '<span class="listagem-nick">' + escH(nick) + '</span>' +
                    (dataFmt ? ' <span class="listagem-data">- ' + escH(dataFmt) + '</span>' : '') +
                    '</li>';
            }).join('');

            return '<div class="listagem-secao">' +
                '<div class="listagem-secao-header">' +
                '<span class="listagem-secao-titulo">' + escH(grupoKey) + ':</span>' +
                '<span class="listagem-secao-count">' + countLabel + '</span>' +
                '</div>' +
                '<ul class="listagem-membros-ul">' + linhas + '</ul>' +
                '</div>';
        }).join('');
    }

        // ── View Avatares Habbo (grade com personagens) ─────
    function renderMembrosAvataresGrid(filter) {
        const list = qs('#membrosList');
        const tabelaList = qs('#membrosListTabela');
        if (!list) return;
        list.style.display = '';
        if (tabelaList) tabelaList.style.display = 'none';

        let membrosOrgao = getMembrosOrgao();
        if (filter) membrosOrgao = membrosOrgao.filter(function(m){
            return (m.username||'').toLowerCase().includes(filter) ||
                   (m.cargo||'').toLowerCase().includes(filter);
        });

        if (membrosOrgao.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:48px 20px">' +
                '<div class="empty-icon" style="font-size:2rem;margin-bottom:10px">&#x1F465;</div>' +
                '<div class="empty-text">' + (filter ? 'Nenhum membro encontrado.' : 'Nenhum membro cadastrado neste centro.') + '</div>' +
                '</div>';
            return;
        }

        // Agrupar por cargo (ministros juntos)
        const grupos = {};
        membrosOrgao.forEach(function(m) {
            const cargo = m.cargo || 'Membro';
            const grupoKey = ehMinistro(cargo) ? 'Ministro' : cargo;
            if (!grupos[grupoKey]) grupos[grupoKey] = [];
            grupos[grupoKey].push(m);
        });

        const cargosOrdenados = Object.keys(grupos).sort(function(a,b){ return getCargoOrdem(a)-getCargoOrdem(b); });

        list.innerHTML = '<div class="membros-avatar-wrap-outer">' +
            cargosOrdenados.map(function(grupoKey) {
                const membros = grupos[grupoKey];
                const cards = membros.map(function(m) {
                    const nick = m.username || '';
                    const av = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' +
                        encodeURIComponent(nick) + '&size=m&direction=3&head_direction=3&gesture=std&action=std';
                    const tooltip = escH(nick) + (ehMinistro(m.cargo) ? ' (' + escH(m.cargo) + ')' : '');
                    return '<div class="membro-card-hierarquia" title="' + tooltip + '">' +
                        '<div class="membro-avatar-wrap"><img src="' + av + '" alt="' + escH(nick) + '" loading="lazy"></div>' +
                        '<span class="membro-nick-label">' + escH(nick) + '</span>' +
                        (ehMinistro(m.cargo) ? '<span class="membro-subtipo">' + escH(m.cargo.replace('Ministro ','').replace('Ministro','')) + '</span>' : '') +
                        '</div>';
                }).join('');
                return '<div class="membros-grupo">' +
                    '<div class="membros-grupo-header">' +
                    '<span class="membros-grupo-titulo">' + escH(grupoKey) + '</span>' +
                    '<span class="membros-grupo-count">' + membros.length + '</span>' +
                    '</div>' +
                    '<div class="membros-grupo-grid">' + cards + '</div>' +
                    '</div>';
            }).join('') +
            '</div>';
    }

        // ── View Tabela (somente líderes) ────────────────────
    function renderMembrosTabela(filter) {
        const list = qs('#membrosList');
        const tabelaList = qs('#membrosListTabela');
        if (!tabelaList) return;
        if (list) list.style.display = 'none';
        tabelaList.style.display = '';

        let membros = getMembrosOrgao();
        if (filter) membros = membros.filter(function(m){ return (m.username||'').toLowerCase().includes(filter); });
        membros = membros.slice().sort(function(a,b){ return getCargoOrdem(a.cargo)-getCargoOrdem(b.cargo); });

        if (membros.length === 0) {
            tabelaList.innerHTML = '<div class="empty-state" style="padding:36px 20px">' +
                '<div class="empty-icon">&#x1F465;</div>' +
                '<div class="empty-text">' + (filter ? 'Nenhum membro encontrado.' : 'Nenhum membro cadastrado.') + '</div>' +
                '</div>';
            return;
        }

        const rows = membros.map(function(m, i) {
            const nick = m.username || '';
            const av = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' +
                encodeURIComponent(nick) + '&headonly=1&size=s&gesture=std';
            return '<tr>' +
                '<td style="color:var(--t3);font-size:.72rem">' + (i+1) + '</td>' +
                '<td><div style="display:flex;align-items:center;gap:8px">' +
                '<img src="' + av + '" style="width:26px;height:26px;border-radius:50%;object-fit:cover;background:var(--bg-3)" loading="lazy">' +
                '<span style="font-weight:700;color:var(--t1)">' + escH(nick) + '</span>' +
                '</div></td>' +
                '<td><span class="membro-cargo-pill">' + escH(m.cargo||'Membro') + '</span></td>' +
                '<td><div style="display:flex;gap:6px">' +
                '<button class="btn-tabela-edit" onclick="editarMembro(\'' + escH(nick) + '\')" title="Editar">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12">' +
                '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar</button>' +
                '<button class="btn-tabela-del" onclick="removerMembro(\'' + escH(nick) + '\')" title="Apagar">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12">' +
                '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
                '</svg> Apagar</button>' +
                '</div></td>' +
                '</tr>';
        }).join('');

        tabelaList.innerHTML = '<table class="membros-tabela">' +
            '<thead><tr><th>#</th><th>Usuário</th><th>Função</th><th>Ações</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '</table>';
    }

    // ── Modal Adicionar/Editar Membro ────────────────────
    const membroModal = qs('#membroModal');
    qs('#btnAddMembro')?.addEventListener('click', function(){ abrirModalMembro(null); });
    qs('#membroModalClose')?.addEventListener('click', fecharModalMembro);
    qs('#membroModalCancel')?.addEventListener('click', fecharModalMembro);
    membroModal?.addEventListener('click', function(e){ if(e.target===membroModal) fecharModalMembro(); });

    function toggleGrupoMinistro() {
        const cargoSel = qs('#membroModalCargo');
        const grupoMin = qs('#grupoMinistro');
        if (!grupoMin) return;
        grupoMin.style.display = cargoSel && cargoSel.value === 'Ministro' ? '' : 'none';
    }

    function abrirModalMembro(nickParaEditar) {
        if (!membroModal) return;
        const titulo = qs('#membroModalTitle');
        const nickInput = qs('#membroModalNick');
        const nickHidden = qs('#membroModalEditNick');
        const cargoSel = qs('#membroModalCargo');
        const ministroSel = qs('#membroModalMinistro');

        // Preencher opções de cargo (sempre "Ministro" como opção única no select principal)
        const cargos = CARGOS_DISPONIVEIS();
        // Colapsar variações de Ministro em uma só entrada
        const cargosNormalizados = [];
        const temMinistro = cargos.some(function(c){ return ehMinistro(c); });
        cargos.forEach(function(c) {
            if (ehMinistro(c)) {
                if (!temMinistroAdicionado) { cargosNormalizados.push('Ministro'); temMinistroAdicionado = true; }
            } else {
                cargosNormalizados.push(c);
            }
        });
        var temMinistroAdicionado = false;
        const cargosFinais = [];
        const vistos = {};
        cargos.forEach(function(c) {
            const key = ehMinistro(c) ? 'Ministro' : c;
            if (!vistos[key]) { vistos[key] = true; cargosFinais.push(key); }
        });
        // Garantir que Ministro existe na lista
        if (!vistos['Ministro']) cargosFinais.splice(2, 0, 'Ministro');

        cargoSel.innerHTML = cargosFinais.map(function(c){ return '<option value="'+escH(c)+'">'+escH(c)+'</option>'; }).join('');

        // Bind: mostrar/esconder grupo ministro ao mudar seleção
        cargoSel.onchange = toggleGrupoMinistro;

        if (nickParaEditar) {
            titulo.textContent = 'Editar Membro';
            nickInput.value = nickParaEditar;
            nickInput.readOnly = true;
            nickInput.style.opacity = '.6';
            nickHidden.value = nickParaEditar;
            const m = getMembrosOrgao().find(function(x){ return x.username===nickParaEditar; });
            if (m) {
                if (ehMinistro(m.cargo)) {
                    cargoSel.value = 'Ministro';
                    if (ministroSel) ministroSel.value = m.cargo;
                } else {
                    cargoSel.value = m.cargo || 'Membro';
                }
                var dataInput = qs('#membroModalData');
                if (dataInput) dataInput.value = m.dataEntrada || '';
            }
        } else {
            titulo.textContent = 'Adicionar Membro';
            nickInput.value = '';
            nickInput.readOnly = false;
            nickInput.style.opacity = '';
            nickHidden.value = '';
            cargoSel.value = cargosFinais[0] || 'Instrutor';
            var dataInput = qs('#membroModalData');
            if (dataInput) dataInput.value = '';
        }

        toggleGrupoMinistro();
        membroModal.classList.add('open');
        if (!nickParaEditar) nickInput.focus();
        else cargoSel.focus();
    }

    function fecharModalMembro() {
        if (membroModal) membroModal.classList.remove('open');
        const grupoMin = qs('#grupoMinistro');
        if (grupoMin) grupoMin.style.display = 'none';
    }

    qs('#membroModalSalvar')?.addEventListener('click', function() {
        const nick = (qs('#membroModalNick').value || '').trim();
        const cargoBase = qs('#membroModalCargo').value;
        // Se Ministro, usa a especialidade selecionada como cargo real
        const cargo = (cargoBase === 'Ministro')
            ? (qs('#membroModalMinistro') ? qs('#membroModalMinistro').value : 'Ministro')
            : cargoBase;
        const editNick = qs('#membroModalEditNick').value;
        const dataInputVal = ((qs('#membroModalData') || {}).value || '').trim();

        if (!nick) { toast('Informe o nickname.', 'error'); qs('#membroModalNick').focus(); return; }

        let membros = getMembrosOrgao();

        if (editNick) {
            // Editar existente
            const idx = membros.findIndex(function(m){ return m.username===editNick; });
            if (idx >= 0) {
                membros[idx].cargo = cargo;
                if (dataInputVal) membros[idx].dataEntrada = dataInputVal;
            }
            toast('Cargo atualizado com sucesso!');
        } else {
            // Adicionar novo
            const jaExiste = membros.some(function(m){ return m.username.toLowerCase()===nick.toLowerCase(); });
            if (jaExiste) { toast('Este membro já está cadastrado.', 'error'); return; }
            // Usar data digitada ou hoje como fallback
            var hoje = new Date();
            var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            var dataHoje = hoje.getDate().toString().padStart(2,'0') + ' ' + meses[hoje.getMonth()] + ' ' + hoje.getFullYear();
            var dataFinal = dataInputVal || dataHoje;
            membros.push({ username: nick, cargo: cargo, dataEntrada: dataFinal });
            toast('Membro adicionado com sucesso!');
        }

        saveMembrosOrgao(membros);
        fecharModalMembro();
        renderMembros((qs('#membrosSearch')||{}).value||'');
        // Atualizar contador no header
        const mC = qs('#membrosCount'); if (mC) mC.textContent = getMembrosOrgao().length;
    });

    // Editar / remover expostos globalmente para botões inline
    window.editarMembro = function(nick) { abrirModalMembro(nick); };
    window.removerMembro = function(nick) {
        confirmar('Remover <strong>' + escH(nick) + '</strong> deste centro?', function() {
            const membros = getMembrosOrgao().filter(function(m){ return m.username !== nick; });
            saveMembrosOrgao(membros);
            toast('Membro removido.');
            renderMembros((qs('#membrosSearch')||{}).value||'');
            const mC = qs('#membrosCount'); if (mC) mC.textContent = getMembrosOrgao().length;
        });
    };

        // ── Documentos ──────────────────────────────────────
    renderDocumentos();

    function renderDocumentos() {
        const docs = get(`dme_docs_${orgao.id}`) || [];
        const list = qs('#documentosList');
        if (!list) return;

        if (docs.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><div class="empty-text">Nenhum documento adicionado.</div></div>`;
            return;
        }
        list.innerHTML = docs.map(d => `
        <div class="documento-item">
            <div class="documento-icon">📄</div>
            <div class="documento-info">
                <div class="documento-nome">${escH(d.nome)}</div>
                <div class="documento-meta">Adicionado por ${escH(d.autor)} · ${d.data}</div>
            </div>
        </div>`).join('');
    }

    // ══════════════════════════════════════════════════════
    // SUB-FÓRUNS
    // ══════════════════════════════════════════════════════
    renderForums();

    function renderForums() {
        const forums = getForums(orgao.id);
        const tbody = qs('#subforumTableBody');
        const empty = qs('#subforumEmpty');
        const _sfTable = qs('#subforumTable');

        if (!tbody || !empty) return;

        if (forums.length === 0) {
            if (_sfTable) _sfTable.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        if (_sfTable) _sfTable.style.display = '';
        empty.style.display = 'none';

        tbody.innerHTML = forums.map((f, i) => `
        <tr>
            <td>
                <div class="subforum-name-cell">
                    <div class="subforum-thumb">💬</div>
                    <div>
                        <div class="subforum-title">${escH(f.nome)}</div>
                        ${f.desc ? `<div class="subforum-desc">${escH(f.desc)}</div>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <div class="subforum-meta">
                    <div class="meta-user">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                        ${escH(f.autor)}
                    </div>
                    <div class="meta-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${escH(f.data)}
                    </div>
                </div>
            </td>
            <td style="color:var(--t2);font-size:.82rem">${escH(f.autor)}</td>
            <td>
                <div class="subforum-actions">
                    <button class="btn-primary btn-see" onclick="openSubForum('${f.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Ver
                    </button>
                    ${isLider(orgao.id) ? `
                    <button class="btn-icon edit" title="Editar" onclick="editForum(${i})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon del" title="Excluir" onclick="deleteForum(${i})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>` : ''}
                </div>
            </td>
        </tr>`).join('');
    }

    // Modal Sub-Fórum
    const forumModal = qs('#forumModal');
    const forumModalId = qs('#forumModalId');
    const forumNome = qs('#forumModalNome');
    const forumDesc = qs('#forumModalDesc');

    qs('#newForumBtn')?.addEventListener('click', () => openForumModal());
    qs('#forumModalClose')?.addEventListener('click', closeForumModal);
    qs('#forumModalCancel')?.addEventListener('click', closeForumModal);
    forumModal?.addEventListener('click', e => { if (e.target === forumModal) closeForumModal(); });

    function openForumModal(data = {}) {
        qs('#forumModalTitle').textContent = data.id ? 'Editar Sub-Fórum' : 'Novo Sub-Fórum';
        forumModalId.value = data.id || '';
        forumNome.value = data.nome || '';
        forumDesc.value = data.desc || '';
        forumModal.classList.add('open');
        forumNome.focus();
    }

    function closeForumModal() {
        forumModal.classList.remove('open');
        forumNome.value = '';
        forumDesc.value = '';
    }

    qs('#forumModalSalvar')?.addEventListener('click', () => {
        const nome = forumNome.value.trim();
        if (!nome) { forumNome.focus(); return; }
        const forums = getForums(orgao.id);
        const id = forumModalId.value;
        const now = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (id) {
            const idx = forums.findIndex(f => f.id === id);
            if (idx > -1) { forums[idx].nome = nome; forums[idx].desc = forumDesc.value.trim(); }
        } else {
            forums.push({ id: 'f' + Date.now(), nome, desc: forumDesc.value.trim(), autor: username, data: now });
        }
        saveForums(orgao.id, forums);
        closeForumModal();
        renderForums();
        refreshInicioStats();
    });

    // Expor globalmente para os botões inline
    window.editForum = (i) => {
        const f = getForums(orgao.id)[i];
        if (f) openForumModal(f);
    };
    window.deleteForum = (i) => {
        if (!confirm('Excluir este sub-fórum?')) return;
        const forums = getForums(orgao.id);
        forums.splice(i, 1);
        saveForums(orgao.id, forums);
        renderForums();
        refreshInicioStats();
    };
    window.openSubForum = (id) => {
        // Salva sub-fórum selecionado e redireciona futuramente
        alert('Sub-fórum: ' + id + '\n(Clique em editar para gerenciar o conteúdo)');
    };

    // ══════════════════════════════════════════════════════
    // HIERARQUIA
    // ══════════════════════════════════════════════════════
    renderHierarquia();

    function renderHierarquia() {
        const list = qs('#hierarquiaList');
        if (!list) return;
        const items = getHier(orgao.id);

        if (items.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Nenhum nível adicionado.${isLider(orgao.id) ? '<br><span>Clique em "Novo Nível" para começar.</span>' : ''}</div></div>`;
            return;
        }

        list.innerHTML = items.map((item, i) => {
            const subs = (item.subs || []).filter(Boolean);
            const hasSubs = subs.length > 0;
            return `
            <div class="hierarquia-item" id="hier-${i}">
                <div class="hierarquia-item-header" ${hasSubs ? `onclick="toggleHier(${i})"` : ''}>
                    <div class="hierarquia-item-left">
                        <div class="hierarquia-rank-icon">${i + 1}</div>
                        <div>
                            <div class="hierarquia-cargo">${escH(item.cargo)}</div>
                            ${item.resp ? `<div class="hierarquia-resp">Responsável: ${escH(item.resp)}</div>` : ''}
                        </div>
                    </div>
                    <div class="hierarquia-actions">
                        ${isLider(orgao.id) ? `
                        <button class="btn-icon edit" title="Editar" onclick="event.stopPropagation(); editHier(${i})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon del" title="Remover" onclick="event.stopPropagation(); deleteHier(${i})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>` : ''}
                        ${hasSubs ? `
                        <div class="hierarquia-expand-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>` : ''}
                    </div>
                </div>
                ${hasSubs ? `
                <div class="hierarquia-subs">
                    ${subs.map(s => `
                    <div class="hierarquia-sub-item">
                        <div class="hierarquia-sub-dot"></div>
                        ${escH(s)}
                    </div>`).join('')}
                </div>` : ''}
            </div>`;
        }).join('');
    }

    window.toggleHier = (i) => {
        qs(`#hier-${i}`)?.classList.toggle('expanded');
    };
    window.editHier = (i) => {
        const item = getHier(orgao.id)[i];
        if (item) openHierModal(i, item);
    };
    window.deleteHier = (i) => {
        confirmar('Remover este nível hierárquico?', () => {
            const h = getHier(orgao.id);
            h.splice(i, 1);
            saveHier(orgao.id, h);
            renderHierarquia();
            refreshInicioStats();
        });
    };

    // Modal Hierarquia
    const hierModal = qs('#hierModal');
    const hierCargo = qs('#hierModalCargo');
    const hierSubs = qs('#hierModalSubs');
    const hierResp = qs('#hierModalResp');
    let hierEditIdx = -1;

    qs('#newHierBtn')?.addEventListener('click', () => openHierModal(-1, {}));
    qs('#hierModalClose')?.addEventListener('click', closeHierModal);
    qs('#hierModalCancel')?.addEventListener('click', closeHierModal);
    hierModal?.addEventListener('click', e => { if (e.target === hierModal) closeHierModal(); });

    function openHierModal(idx, data = {}) {
        hierEditIdx = idx;
        qs('#hierModalTitle').textContent = idx >= 0 ? 'Editar Nível' : 'Novo Nível';
        hierCargo.value = data.cargo || '';
        hierSubs.value = (data.subs || []).join('\n');
        hierResp.value = data.resp || '';
        hierModal.classList.add('open');
        hierCargo.focus();
    }

    function closeHierModal() { hierModal.classList.remove('open'); }

    qs('#hierModalSalvar')?.addEventListener('click', () => {
        const cargo = hierCargo.value.trim();
        if (!cargo) { hierCargo.focus(); return; }
        const subs = hierSubs.value.split('\n').map(s => s.trim()).filter(Boolean);
        const resp = hierResp.value.trim();
        const h = getHier(orgao.id);
        if (hierEditIdx >= 0) {
            h[hierEditIdx] = { cargo, subs, resp };
        } else {
            h.push({ cargo, subs, resp });
        }
        saveHier(orgao.id, h);
        closeHierModal();
        renderHierarquia();
        refreshInicioStats();
    });

    function refreshInicioStats() {
        const f = getForums(orgao.id);
        const h = getHier(orgao.id);
        const membros = get('dme_militar') || [];
        qs('#inicioStats').innerHTML = `
            <div class="inicio-stat-card"><span class="stat-num">${membros.length}</span><span class="stat-lbl">Membros</span></div>
            <div class="inicio-stat-card"><span class="stat-num">${f.length}</span><span class="stat-lbl">Sub-Fóruns</span></div>
            <div class="inicio-stat-card"><span class="stat-num">${h.length}</span><span class="stat-lbl">Níveis</span></div>`;
    }

    // ══════════════════════════════════════════════════════
    // AÇÕES DO MENU LATERAL (Liderança)
    // ══════════════════════════════════════════════════════
    qsa('.quick-menu-item[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'membros-lider') switchTab('membros');
            else if (action === 'publicacao') toast('Funcionalidade de publicação em breve.');
            else if (action === 'grupo') toast('Funcionalidade de grupo em breve.');
            else if (action === 'configuracao') toast('Configurações do centro em breve.');
        });
    });

    // ══════════════════════════════════════════════════════
    // NAVBAR / DROPDOWN / SIDEBAR
    // ══════════════════════════════════════════════════════
    // Dropdown
    const profileBtn = qs('#userProfileBtn');
    const dropdown = qs('#userDropdown');
    profileBtn?.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('active'); });
    document.addEventListener('click', () => dropdown?.classList.remove('active'));

    // Hamburger
    const ham = qs('#hamburger');
    const mSidebar = qs('#mobileSidebar');
    const overlay = qs('#sidebarOverlay');
    const close = qs('#sidebarClose');
    const toggle = () => { mSidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
    ham?.addEventListener('click', toggle);
    close?.addEventListener('click', toggle);
    overlay?.addEventListener('click', toggle);

    // Theme
    window.toggleTheme = function () {
        const light = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('dme_theme', light ? 'light' : 'dark');
        qs('#themeText').textContent = light ? 'Modo Escuro' : 'Modo Claro';
    };

    // Apply current theme text
    const isLight = document.documentElement.classList.contains('light-mode');
    if (qs('#themeText')) qs('#themeText').textContent = isLight ? 'Modo Escuro' : 'Modo Claro';

    // Logout
    window.logout = function () {
        localStorage.removeItem('dme_username');
        window.location.href = '/login';
    };

    // ── STM: Projetos e Emendas ─────────────────────────
    if (orgao.id === 'stm') {
        // Mostrar tab e quick-menu
        const stmTab = document.getElementById('stmTab');
        const stmQS = document.getElementById('stmQuickSection');
        if (stmTab) stmTab.style.display = '';
        if (stmQS) stmQS.style.display = '';

        // Sub-tabs Projetos / Emendas
        document.querySelectorAll('.stm-subtab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.stm-subtab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tipo = btn.dataset.stm;
                document.getElementById('stm-projetos-list').style.display = tipo === 'projetos' ? '' : 'none';
                document.getElementById('stm-emendas-list').style.display = tipo === 'emendas' ? '' : 'none';
            });
        });

        function getPropostas() { return JSON.parse(localStorage.getItem('dme_ouvidoria_propostas') || '[]'); }
        function savePropostas(arr) { localStorage.setItem('dme_ouvidoria_propostas', JSON.stringify(arr)); }
        const resultLabel = { 'aprovado': 'Aprovado', 'aprovado-alt': 'Aprovado c/ Alterações', 'reprovado': 'Reprovado', 'reprovado-unanimidade': 'Reprovado por Unanimidade' };
        const resultColor = { 'aprovado': 'var(--green)', 'aprovado-alt': '#60a5fa', 'reprovado': 'var(--red,#ef4444)', 'reprovado-unanimidade': 'var(--red,#ef4444)' };

        function renderSTMLists() {
            const all = getPropostas();
            const projetos = all.filter(p => p.tipo === 'projeto');
            const emendas = all.filter(p => p.tipo === 'emenda');

            function cardHtml(p) {
                const badge = p.resultado
                    ? `<span style="font-size:.65rem;font-weight:800;padding:3px 10px;border-radius:20px;background:rgba(0,0,0,.2);color:${resultColor[p.resultado]};border:1px solid ${resultColor[p.resultado]}">${resultLabel[p.resultado] || p.resultado}</span>`
                    : `<span style="font-size:.65rem;font-weight:800;padding:3px 10px;border-radius:20px;background:rgba(245,158,11,.1);color:var(--gold,#f59e0b);border:1px solid rgba(245,158,11,.2)">Pendente</span>`;
                return `<div class="stm-card">
                    <div style="flex:1;min-width:0">
                        ${p.tipo === 'emenda' ? `<div style="font-size:.62rem;font-weight:800;text-transform:uppercase;color:#c084fc;margin-bottom:3px">${p.objetivo || 'emenda'}</div>` : ''}
                        <div style="font-size:.88rem;font-weight:700;color:var(--t1);margin-bottom:3px">${escH(p.titulo)}</div>
                        <div style="font-size:.72rem;color:var(--t3)">${escH(p.autor)} · ${p.data}</div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
                        ${badge}
                        <button class="btn-primary stm-ver-btn" data-id="${p.id}" style="padding:5px 14px;font-size:.75rem">Ver</button>
                    </div>
                </div>`;
            }

            const pl = document.getElementById('stm-projetos-list');
            const el = document.getElementById('stm-emendas-list');
            pl.innerHTML = projetos.length ? projetos.map(cardHtml).join('') : '<div style="color:var(--t3);font-size:.82rem;padding:24px;text-align:center">Nenhum projeto enviado.</div>';
            el.innerHTML = emendas.length ? emendas.map(cardHtml).join('') : '<div style="color:var(--t3);font-size:.82rem;padding:24px;text-align:center">Nenhuma emenda enviada.</div>';

            document.querySelectorAll('.stm-ver-btn').forEach(btn => {
                btn.addEventListener('click', () => abrirModalProposta(Number(btn.dataset.id)));
            });
        }

        function abrirModalProposta(id) {
            const all = getPropostas();
            const p = all.find(x => x.id === id);
            if (!p) return;

            const campos = p.tipo === 'projeto'
                ? `<div class="stm-detalhe-row"><strong>Autor:</strong><span>${escH(p.autor)}</span></div>
                   ${p.colaboradores ? `<div class="stm-detalhe-row"><strong>Colaboradores:</strong><span>${escH(p.colaboradores)}</span></div>` : ''}
                   <div class="stm-detalhe-sec">Justificativa</div><p>${escH(p.justificativa)}</p>
                   <div class="stm-detalhe-sec">Objetivo Geral</div><p>${escH(p.objetivo)}</p>
                   <div class="stm-detalhe-sec">Desenvolvimento</div><p>${escH(p.desenvolvimento)}</p>
                   <div class="stm-detalhe-sec">Impactos Esperados</div><p>${escH(p.impactos)}</p>
                   ${p.consideracoes ? `<div class="stm-detalhe-sec">Considerações Finais</div><p>${escH(p.consideracoes)}</p>` : ''}
                   ${p.imagens ? `<div class="stm-detalhe-row"><strong>Imagens:</strong><a href="${escH(p.imagens)}" target="_blank">${escH(p.imagens)}</a></div>` : ''}
                   ${p.anexos ? `<div class="stm-detalhe-row"><strong>Anexos:</strong><a href="${escH(p.anexos)}" target="_blank">${escH(p.anexos)}</a></div>` : ''}`
                : `<div class="stm-detalhe-row"><strong>Autor:</strong><span>${escH(p.autor)}</span></div>
                   <div class="stm-detalhe-row"><strong>Objetivo:</strong><span>${escH(p.objetivo || '—')}</span></div>
                   ${p.documento ? `<div class="stm-detalhe-row"><strong>Documento afetado:</strong><span>${escH(p.documento)}</span></div>` : ''}
                   ${p.dispositivo ? `<div class="stm-detalhe-sec">Dispositivo</div><p>${escH(p.dispositivo)}</p>` : ''}
                   ${p.textoAtual ? `<div class="stm-detalhe-sec">Texto Atual</div><p>${escH(p.textoAtual)}</p>` : ''}
                   ${p.textoProposto ? `<div class="stm-detalhe-sec">Texto Proposto</div><p>${escH(p.textoProposto)}</p>` : ''}
                   <div class="stm-detalhe-sec">Justificativa</div><p>${escH(p.justificativa)}</p>`;

            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(5px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
            wrap.innerHTML = `
                <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:18px;padding:28px;max-width:620px;width:100%;box-shadow:var(--shadow-lg);max-height:90vh;overflow-y:auto;position:relative">
                    <button id="_stmClose" style="position:absolute;top:16px;right:16px;background:var(--bg-3);border:1px solid var(--b2);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                    <h3 style="font-size:.95rem;font-weight:800;color:var(--t1);margin-bottom:4px">${escH(p.titulo)}</h3>
                    <p style="font-size:.72rem;color:var(--t3);margin-bottom:18px">${p.tipo === 'projeto' ? '📄 Projeto' : '✏️ Emenda Legislativa'} · ${p.data} · ${escH(p.submitidoPor)}</p>
                    <div class="stm-detalhe-body">${campos}</div>

                    ${renderVotacaoEletronica()}
                </div>`;
            document.body.appendChild(wrap);
            wrap.querySelector('#_stmClose').onclick = () => wrap.remove();
            wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });

            function renderVotacaoEletronica() {
                const votos = p.votos || [];
                const stmMinistros = JSON.parse(localStorage.getItem('dme_stm_ministros') || '[]');
                const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');

                // Lista de todos os ministros elegíveis a votar
                const todosMinistros = [...new Set([...stmMinistros, ...admins])];
                const totalMinistros = todosMinistros.length;

                const afavor = votos.filter(v => v.decisao === 'aprovado').length;
                const contra = votos.filter(v => v.decisao === 'reprovado').length;

                // Encerrado quando TODOS os ministros já votaram (ou não há ministros cadastrados)
                const isEncerrado = totalMinistros > 0
                    ? todosMinistros.every(nick => votos.some(v => v.nick === nick))
                    : false;

                // Salva resultado assim que todos votaram
                if (isEncerrado && p.status === 'Pendente') {
                    p.resultado = afavor > contra ? 'aprovado' : 'reprovado';
                    if (afavor === 0 && contra === 0) p.resultado = 'reprovado'; // sem votos reprova
                    p.status = 'Concluído';
                    const arr = getPropostas();
                    const idx = arr.findIndex(x => x.id === id);
                    if (idx >= 0) { arr[idx] = p; savePropostas(arr); }
                }

                const getVotoColor = d => d === 'aprovado' ? 'var(--green)' : 'var(--red,#ef4444)';
                const getVotoBg = d => d === 'aprovado' ? 'var(--green-muted)' : 'rgba(239,68,68,.08)';

                let painelHtml = '';
                if (p.status === 'Concluído') {
                    painelHtml = `
                    <div style="background:rgba(0,0,0,.15);border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;border:1px solid ${getVotoColor(p.resultado)}55">
                        <h4 style="color:${getVotoColor(p.resultado)};font-weight:800;font-size:1.05rem;margin-bottom:4px">VOTAÇÃO ENCERRADA: ${p.resultado === 'aprovado' ? 'APROVADO' : 'REPROVADO'}</h4>
                        <p style="color:var(--t3);font-size:.78rem;margin:0">Total de ${votos.length} voto(s) · Placar: ${afavor} a ${contra}</p>
                    </div>`;
                } else {
                    const jaVotou = votos.some(v => v.nick === username);

                    // Verificar se o usuário é ministro do STM
                    const ehMinistro = stmMinistros.includes(username) || admins.includes(username);

                    // Barra de progresso usa ministros restantes
                    painelHtml = `
                    <div style="margin-bottom:20px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                            <h4 style="color:var(--gold,#f59e0b);font-weight:800;font-size:.85rem">⏳ VOTAÇÃO EM ANDAMENTO</h4>
                            <span style="font-size:.7rem;color:var(--gold,#f59e0b);background:rgba(245,158,11,.1);padding:3px 8px;border-radius:8px">${votos.length} de ${totalMinistros} ministro(s)</span>
                        </div>
                        <div style="background:var(--bg-3);border:1px solid var(--b1);border-radius:10px;padding:12px;margin-bottom:14px">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                                <span style="font-size:.72rem;font-weight:700;color:var(--t2)">Placar Parcial</span>
                                <span style="font-size:.68rem;color:var(--t3)">${votos.length} de ${totalMinistros} voto(s) registrado(s)</span>
                            </div>
                            <div style="display:flex;gap:6px;align-items:center;font-size:.78rem;font-weight:700;margin-bottom:8px">
                                <span style="color:var(--green)">👍 ${afavor} a favor</span>
                                <span style="flex:1;text-align:center;color:var(--t3)">·</span>
                                <span style="color:var(--red,#ef4444)">${contra} contra 👎</span>
                            </div>
                            <div style="display:flex;border-radius:6px;overflow:hidden;height:8px;background:var(--bg-4)">
                                <div style="width:${totalMinistros > 0 ? Math.round((votos.length / totalMinistros) * 100) : 0}%;background:var(--gold,#f59e0b);transition:width .4s ease"></div>
                            </div>
                            <div style="font-size:.65rem;color:var(--t3);margin-top:6px;text-align:center">A votação encerra automaticamente quando todos os ministros votarem.</div>
                        </div>`;

                    if (jaVotou) {
                        painelHtml += `<p style="font-size:.75rem;color:var(--t3);text-align:center;padding:12px;background:var(--bg-1);border-radius:10px">✅ Você já registrou o seu voto nesta proposta.</p>`;
                    } else if (!ehMinistro) {
                        painelHtml += `
                        <div style="background:var(--bg-1);border:1px dashed var(--b2);border-radius:12px;padding:16px;text-align:center">
                            <p style="font-size:.78rem;font-weight:700;color:var(--t2);margin-bottom:4px">🔒 Votação restrita</p>
                            <p style="font-size:.72rem;color:var(--t3)">Apenas Ministros do STM podem votar nesta proposta.</p>
                        </div>`;
                    } else {
                        painelHtml += `
                        <div id="_votoArea" style="background:var(--bg-1);border:1px solid var(--b2);border-radius:12px;padding:16px">
                            <label style="display:block;font-size:.72rem;font-weight:700;color:var(--t2);margin-bottom:8px">Seu Voto</label>
                            <div style="display:flex;gap:15px;margin-bottom:14px">
                                <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--t2)">
                                    <input type="radio" name="_votoTipo" value="aprovado"> <span>👍 A Favor</span>
                                </label>
                                <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--t2)">
                                    <input type="radio" name="_votoTipo" value="reprovado"> <span>👎 Contra</span>
                                </label>
                            </div>
                            <label style="display:block;font-size:.72rem;font-weight:700;color:var(--t2);margin-bottom:6px">Justificativa (obrigatória)</label>
                            <textarea id="_votoJust" class="g-input" rows="3" style="width:100%;box-sizing:border-box;margin-bottom:12px" placeholder="Justifique seu voto..."></textarea>
                            <button id="_btnVotar" class="btn-primary" style="width:100%">Confirmar Voto</button>
                        </div>`;
                    }
                    painelHtml += `</div>`;
                }

                const listVotosHtml = votos.length > 0
                    ? votos.map(v => `
                        <div style="background:${getVotoBg(v.decisao)};border:1px solid ${getVotoColor(v.decisao)}55;border-radius:10px;padding:12px;margin-bottom:8px">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                                <strong style="color:${getVotoColor(v.decisao)};font-size:.75rem;display:flex;align-items:center;gap:4px">
                                    ${v.decisao === 'aprovado' ? '✅ Aprovou' : '❌ Reprovou'} <span style="color:var(--t2)">· ${escH(v.nick)}</span>
                                </strong>
                                <span style="color:var(--t3);font-size:.65rem">${escH(v.dataStr || '')}</span>
                            </div>
                            <p style="color:var(--t2);font-size:.72rem;margin:0">${escH(v.justificativa)}</p>
                        </div>
                    `).join('')
                    : `<p style="font-size:.75rem;color:var(--t3);text-align:center;padding:10px">Nenhum voto registrado ainda.</p>`;

                return `
                <div style="border-top:1px solid var(--b1);margin-top:20px;padding-top:18px">
                    ${painelHtml}
                    <div style="margin-top:20px">
                        <h4 style="font-size:.78rem;font-weight:700;color:var(--t2);margin-bottom:10px">Registros de Votos</h4>
                        ${listVotosHtml}
                    </div>
                </div>`;
            }

            // Bind do botão de Votar (timeout para garantir injeção do HTML no fluxo)
            setTimeout(() => {
                const btnVotar = wrap.querySelector('#_btnVotar');
                if (btnVotar) {
                    btnVotar.addEventListener('click', () => {
                        const vTipo = wrap.querySelector('input[name="_votoTipo"]:checked')?.value;
                        const vJust = wrap.querySelector('#_votoJust').value.trim();
                        if (!vTipo) return toast('Selecione A Favor ou Contra.', 'error');
                        if (!vJust) return toast('A justificativa é obrigatória.', 'error');

                        const arr = getPropostas();
                        const idx = arr.findIndex(x => x.id === id);
                        if (idx >= 0) {
                            if (!arr[idx].votos) arr[idx].votos = [];
                            arr[idx].votos.push({
                                nick: username,
                                decisao: vTipo,
                                justificativa: vJust,
                                dataStr: new Date().toLocaleDateString('pt-BR')
                            });
                            savePropostas(arr);
                            toast('Voto registrado com sucesso!');
                            wrap.remove();
                            // Atualiza interface do sistema principal e abre novamente pra refletir
                            renderSTMLists();
                            setTimeout(() => abrirModalProposta(id), 100);
                        }
                    });
                }
            }, 50);
        }

        function abrirModalATA(p) {
            const tipoLabel = p.tipo === 'projeto' ? 'Projeto' : 'Emenda Legislativa';
            const objLabel = p.objetivo ? ` (${p.objetivo})` : '';
            const res = resultLabel[p.resultado] || p.resultado || '—';

            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(5px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
            wrap.innerHTML = `
                <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:18px;padding:28px;max-width:700px;width:100%;box-shadow:var(--shadow-lg);max-height:92vh;overflow-y:auto;position:relative">
                    <button id="_ataClose" style="position:absolute;top:16px;right:16px;background:var(--bg-3);border:1px solid var(--b2);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                    <h3 style="font-size:.92rem;font-weight:800;color:var(--gold,#f59e0b);margin-bottom:4px">📜 Gerar ATA — STM</h3>
                    <p style="font-size:.72rem;color:var(--t3);margin-bottom:20px">Preencha o cabeçalho. O corpo da ata será gerado automaticamente.</p>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
                        <div>
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Número da Reunião</label>
                            <input type="text" id="_ataNum" class="g-input" placeholder="Ex: I" style="width:100%;box-sizing:border-box">
                        </div>
                        <div>
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Data</label>
                            <input type="text" id="_ataData" class="g-input" placeholder="Ex: 28 de fevereiro de 2026" style="width:100%;box-sizing:border-box">
                        </div>
                        <div>
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Horário de Início</label>
                            <input type="text" id="_ataIni" class="g-input" placeholder="Ex: 22h11" style="width:100%;box-sizing:border-box">
                        </div>
                        <div>
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Horário de Término</label>
                            <input type="text" id="_ataFim" class="g-input" placeholder="Ex: 23h28" style="width:100%;box-sizing:border-box">
                        </div>
                        <div style="grid-column:1/-1">
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Prints (link)</label>
                            <input type="text" id="_ataPrints" class="g-input" placeholder="https://imgur.com/..." style="width:100%;box-sizing:border-box">
                        </div>
                        <div style="grid-column:1/-1">
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Ministros Presentes</label>
                            <input type="text" id="_ataPresentes" class="g-input" placeholder="Ex: _Nathan_, _Bruna_, @Fidick" style="width:100%;box-sizing:border-box">
                        </div>
                        <div style="grid-column:1/-1">
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Ministros Ausentes</label>
                            <input type="text" id="_ataAusentes" class="g-input" placeholder="Ex: Saiko, Coelinha_Mal" style="width:100%;box-sizing:border-box">
                        </div>
                        <div>
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Alto Comando</label>
                            <input type="text" id="_ataAlto" class="g-input" placeholder="Ex: Sem participação" style="width:100%;box-sizing:border-box">
                        </div>
                        <div>
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Presidente/Condutor</label>
                            <input type="text" id="_ataPres" class="g-input" placeholder="Ex: Ministro Valdir.25" style="width:100%;box-sizing:border-box">
                        </div>
                        <div style="grid-column:1/-1">
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Escrivão</label>
                            <input type="text" id="_ataEscr" class="g-input" placeholder="Ex: Ministro FelipeME45" style="width:100%;box-sizing:border-box">
                        </div>
                        <div style="grid-column:1/-1">
                            <label style="font-size:.72rem;font-weight:700;color:var(--t2);display:block;margin-bottom:4px">Resumo da Discussão</label>
                            <textarea id="_ataResumo" class="g-input" rows="4" placeholder="Descreva como a discussão se desenvolveu..." style="width:100%;box-sizing:border-box;resize:vertical"></textarea>
                        </div>
                    </div>

                    <div style="display:flex;gap:10px;justify-content:flex-end">
                        <button id="_ataCancel" class="btn-secondary">Cancelar</button>
                        <button id="_ataGerar" class="btn-primary" style="background:var(--gold,#f59e0b);border-color:var(--gold,#f59e0b);color:#000">📜 Gerar ATA</button>
                    </div>
                </div>`;
            document.body.appendChild(wrap);
            wrap.querySelector('#_ataClose').onclick = () => wrap.remove();
            wrap.querySelector('#_ataCancel').onclick = () => wrap.remove();

            wrap.querySelector('#_ataGerar').addEventListener('click', () => {
                const num = wrap.querySelector('#_ataNum').value.trim() || 'I';
                const data = wrap.querySelector('#_ataData').value.trim() || '—';
                const ini = wrap.querySelector('#_ataIni').value.trim() || '—';
                const fim = wrap.querySelector('#_ataFim').value.trim() || '—';
                const prints = wrap.querySelector('#_ataPrints').value.trim() || '—';
                const pres = wrap.querySelector('#_ataPresentes').value.trim() || '—';
                const aus = wrap.querySelector('#_ataAusentes').value.trim() || '—';
                const alto = wrap.querySelector('#_ataAlto').value.trim() || '—';
                const condutor = wrap.querySelector('#_ataPres').value.trim() || '—';
                const escr = wrap.querySelector('#_ataEscr').value.trim() || '—';
                const resumo = wrap.querySelector('#_ataResumo').value.trim() || '—';

                const ata = `ATA DA ${num} REUNIÃO ORDINÁRIA DO SUPERIOR TRIBUNAL MILITAR

Identificação da Reunião
Data: ${data}
Horário do Início: ${ini}
Horário do Término: ${fim}
Prints: ${prints}

Ministros Presentes: ${pres}
Ministros Ausentes: ${aus}
Alto Comando: ${alto}
Presidente/Condutor: ${condutor}
Escrivão: ${escr}

──────────────────────────────────────────
I – Denúncias e Recursos

Não foram apresentadas denúncias ou recursos a serem apreciados pelo Pleno nesta reunião.

──────────────────────────────────────────
II – ${tipoLabel}s

${tipoLabel}${objLabel}
Título: ${p.titulo}
Autor: ${p.autor}
Resumo da discussão: ${resumo}
Resultado: ${res}

──────────────────────────────────────────
`;

                // Exibir ATA gerada
                wrap.remove();
                const wATA = document.createElement('div');
                wATA.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(5px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
                wATA.innerHTML = `
                    <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:18px;padding:28px;max-width:680px;width:100%;box-shadow:var(--shadow-lg);max-height:92vh;overflow-y:auto;position:relative">
                        <button id="_ataFinalClose" style="position:absolute;top:16px;right:16px;background:var(--bg-3);border:1px solid var(--b2);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                        <h3 style="font-size:.92rem;font-weight:800;color:var(--gold,#f59e0b);margin-bottom:16px">📜 ATA Gerada</h3>
                        <textarea id="_ataOutput" style="width:100%;height:360px;background:var(--bg-1);border:1px solid var(--b2);border-radius:10px;padding:16px;font-family:monospace;font-size:.78rem;color:var(--t1);resize:vertical;box-sizing:border-box" readonly>${ata}</textarea>
                        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
                            <button id="_ataCopiar" class="btn-primary">Copiar ATA</button>
                            <button id="_ataFechar" class="btn-secondary">Fechar</button>
                        </div>
                    </div>`;
                document.body.appendChild(wATA);
                wATA.querySelector('#_ataFinalClose').onclick = () => wATA.remove();
                wATA.querySelector('#_ataFechar').onclick = () => wATA.remove();
                wATA.querySelector('#_ataCopiar').addEventListener('click', () => {
                    navigator.clipboard.writeText(ata).then(() => { toast('ATA copiada!'); }).catch(() => {
                        wATA.querySelector('#_ataOutput').select();
                        document.execCommand('copy');
                        toast('ATA copiada!');
                    });
                });
                wATA.addEventListener('click', e => { if (e.target === wATA) wATA.remove(); });
            });
        }

        // Renderizar ao entrar na tab STM
        document.querySelectorAll('.centro-tab[data-tab="stm-painel"], .quick-menu-item[data-tab="stm-painel"]').forEach(btn => {
            btn.addEventListener('click', renderSTMLists);
        });
    }

    // ── Utilitários ──────────────────────────────────────
    function qs(sel, ctx = document) { return ctx.querySelector(sel); }
    function qsa(sel, ctx = document) { return ctx.querySelectorAll(sel); }
    function escH(str) {
        const d = document.createElement('div');
        d.textContent = str ?? '';
        return d.innerHTML;
    }
})();
