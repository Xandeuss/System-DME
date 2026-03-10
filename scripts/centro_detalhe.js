/* ══════════════════════════════════════════════════════
   CENTRO DETALHE — JavaScript
   Página dinâmica por centro selecionado
   ══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ── Auth Guard ──────────────────────────────────────
    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = 'login.html'; return; }

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
    const isAdmin = () => (get('dme_admins') || []).includes(username);
    const isLider = id => isAdmin() || (getLideres()[id] || []).includes(username);
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
    if (!orgaoSel || !orgaoSel.id) { window.location.href = 'centro_tarefas_orgaos.html'; return; }
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
    function getAulasDoPeriodo(orgaoId) {
        const p = getPeriodo(orgaoId);
        const ini = new Date(p.inicio).getTime();
        const fim = new Date(p.fim).getTime();
        return getAulas().filter(a => a.centro === orgaoId && a.timestamp >= ini && a.timestamp <= fim);
    }

    function renderAulas() {
        // Período texto
        if (qs('#aulasPeriodoText')) qs('#aulasPeriodoText').textContent = formatPeriodo(orgao.id);
        renderRanking();
        if (isLider(orgao.id)) renderFiscalizacao();
    }

    // ── Ranking ──────────────────────────────────────────
    renderRanking();

    function renderRanking() {
        const list = qs('#rankingList');
        if (!list) return;
        const aulas = getAulasDoPeriodo(orgao.id);

        if (aulas.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎓</div><div class="empty-text">Nenhuma aula registrada neste período.</div></div>`;
            return;
        }

        // Agrupa por instrutor
        const agrupado = {};
        aulas.forEach(a => {
            if (!agrupado[a.aplicador]) agrupado[a.aplicador] = 0;
            agrupado[a.aplicador]++;
        });

        const ranking = Object.entries(agrupado)
            .sort((a, b) => b[1] - a[1])
            .map(([nick, count], i) => ({ nick, count, pos: i + 1 }));

        const posColors = ['#f59e0b', '#94a3b8', '#cd7c3d'];
        const posEmoji = ['🥇', '🥈', '🥉'];

        list.innerHTML = `
        <table class="subforum-table">
            <thead><tr>
                <th>#</th><th>Instrutor</th><th>Aulas Aplicadas</th>
            </tr></thead>
            <tbody>
            ${ranking.map(r => `
                <tr>
                    <td style="font-weight:800;color:${posColors[r.pos - 1] || 'var(--t2)'}">
                        ${r.pos <= 3 ? posEmoji[r.pos - 1] : r.pos + 'º'}
                    </td>
                    <td>
                        <div style="display:flex;align-items:center;gap:10px">
                            <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(r.nick)}&headonly=1&size=s&gesture=std"
                                style="width:28px;height:28px;border-radius:50%;object-fit:cover" loading="lazy">
                            <span style="font-weight:700;color:var(--t1)">${escH(r.nick)}</span>
                            ${r.nick === username ? '<span style="background:var(--green-muted);color:var(--green);font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:8px;margin-left:4px">Você</span>' : ''}
                        </div>
                    </td>
                    <td>
                        <span style="background:var(--green-muted);color:var(--green);font-weight:800;padding:4px 12px;border-radius:10px;font-size:.85rem">
                            ${r.count} Aula${r.count !== 1 ? 's' : ''}
                        </span>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    // ── Fiscalização ─────────────────────────────────────
    if (isLider(orgao.id)) {
        renderFiscalizacao();
        qs('#fiscSearch')?.addEventListener('input', function () {
            renderFiscalizacao(this.value.toLowerCase());
        });
    }

    function renderFiscalizacao(filtro = '') {
        const list = qs('#fiscalizacaoList');
        if (!list) return;
        let aulas = getAulasDoPeriodo(orgao.id);
        if (filtro) aulas = aulas.filter(a =>
            a.aplicador.toLowerCase().includes(filtro) || a.tipo.toLowerCase().includes(filtro));
        aulas.sort((a, b) => b.timestamp - a.timestamp);

        if (aulas.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Nenhuma aula encontrada.</div></div>`;
            return;
        }

        list.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;padding:12px 16px">` +
            aulas.map((a, i) => `
        <div class="hierarquia-item" style="border-radius:10px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px">
                <div style="flex:1;min-width:0">
                    <div style="font-size:.85rem;font-weight:700;color:var(--t1);margin-bottom:3px">${escH(a.tipo)}</div>
                    <div style="font-size:.72rem;color:var(--t3);display:flex;gap:8px;flex-wrap:wrap">
                        <span>👤 ${escH(a.aplicador)}</span>
                        <span>📅 ${escH(new Date(a.dataAula || a.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</span>
                        ${a.semAlunos ? '<span>Sem alunos</span>' : (a.aprovados ? `<span>✅ ${a.aprovados.split(/[,\n]/).filter(Boolean).length} aprov.</span>` : '')}
                        ${a.reprovados ? `<span>❌ ${a.reprovados.split(/[,\n]/).filter(Boolean).length} reprov.</span>` : ''}
                    </div>
                </div>
                <button class="btn-icon del" title="Remover aula" onclick="removerAulaFisc('${escH(a.id)}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
            </div>
            </div>`).join('') + '</div>';
    }

    window.removerAulaFisc = (id) => {
        confirmar('Remover esta aula do registro? Esta ação é irreversível.', () => {
            const todas = getAulas().filter(a => a.id !== id);
            set('dme_aulas', todas);
            toast('Aula removida.');
            renderFiscalizacao();
            renderRanking();
        });
    };

    // ── Membros ─────────────────────────────────────────
    renderMembros();
    qs('#membrosSearch')?.addEventListener('input', function () {
        renderMembros(this.value.toLowerCase());
    });

    function renderMembros(filter = '') {
        const list = qs('#membrosList');

        // Puxa todos os militares do localStorage
        const militares = [...(get('dme_militar') || []), ...(get('dme_empresarial') || [])];
        let exibir = filter
            ? militares.filter(m => (m.nick || '').toLowerCase().includes(filter))
            : militares;

        if (exibir.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Nenhum membro encontrado.</div></div>`;
            return;
        }
        list.innerHTML = exibir.map(m => {
            const av = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.nick)}&headonly=1&size=m&gesture=std`;
            return `
            <div class="membro-card">
                <img src="${av}" alt="${escH(m.nick)}" loading="lazy">
                <span class="membro-nick">${escH(m.nick)}</span>
                <span class="membro-cargo">${escH(m.patente || 'Militar')}</span>
            </div>`;
        }).join('');
    }

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
        window.location.href = 'login.html';
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
