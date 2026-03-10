/* ══════════════════════════════════════════════════════
   POSTAR AULA — JavaScript
   Contabilização automática por centro + período
   ══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = 'login.html'; return; }

    // ── Órgãos e suas aulas ──────────────────────────────
    const ORGAOS = [
        { id: 'centro-instrucao', title: 'Centro de Instrução' },
        { id: 'centro-treinamento', title: 'Centro de Treinamento' },
        { id: 'centro-supervisao', title: 'Centro de Supervisão' },
        { id: 'centro-patrulha', title: 'Centro de Patrulha' },
        { id: 'academia-agulhas-negras', title: 'Academia das Agulhas Negras' },
        { id: 'goe', title: 'Grupamento de Operações Especiais' },
        { id: 'instrucao-inicial', title: 'Instrução Inicial' },
        { id: 'guerra-selva', title: 'Centro de Instrução Guerra na Selva' },
        { id: 'cadetes', title: 'Cadetes' },
        { id: 'academia-publicitaria', title: 'Academia Publicitária Militar' },
    ];

    const CENTROS_AULAS = {
        'centro-instrucao': ['Instrução Inicial [INS]', 'Aula de Infraestrutura [AFT]', 'Curso de Formação de Subtenentes [CFS]'],
        'centro-treinamento': ['[AFS] Aula de Formação de Soldados', '[AES] Aula de Especialização para Sargentos', '[AFC] Aula de Formação Complementar'],
        'centro-supervisao': ['[CSP] Curso de Segurança Pessoal', '[CSO] Curso de Segurança Operacional', '[PRO] Aula para Promotor'],
        'centro-patrulha': ['[PAT] Patrulha Básica', '[PAT-A] Patrulha Avançada'],
        'academia-agulhas-negras': ['[AMAN] Formação de Cadetes', '[AMAN] Especialização de Oficiais'],
        'goe': ['[GOE] Operação Especial', '[GOE] Treinamento Tático'],
        'instrucao-inicial': ['Instrução Inicial [INS]'],
        'guerra-selva': ['[CIGS] Operação Selva', '[CIGS] Sobrevivência'],
        'cadetes': ['[CAD] Formação Base', '[CAD] Disciplina Militar'],
        'academia-publicitaria': ['[APM] Marketing Militar', '[APM] Comunicação Institucional'],
    };

    // ── Helpers ──────────────────────────────────────────
    const get = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

    function getAulas() { return get('dme_aulas') || []; }
    function saveAulas(arr) { set('dme_aulas', arr); }

    // Periodo ativo do centro
    function getPeriodo(orgaoId) {
        const saved = get(`dme_periodo_${orgaoId}`);
        if (saved && saved.inicio && saved.fim) return saved;
        // Padrão: semana atual (seg → dom)
        const now = new Date();
        const dia = now.getDay(); // 0=dom
        const offsetSeg = dia === 0 ? -6 : 1 - dia;
        const seg = new Date(now); seg.setDate(now.getDate() + offsetSeg); seg.setHours(0, 0, 0, 0);
        const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23, 59, 59, 999);
        return { inicio: seg.toISOString(), fim: dom.toISOString() };
    }

    function formatPeriodo(orgaoId) {
        const p = getPeriodo(orgaoId);
        const fmt = d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        return `${fmt(p.inicio)} – ${fmt(p.fim)}`;
    }

    // ── Toast ────────────────────────────────────────────
    function toast(msg, tipo = 'success') {
        const tc = document.getElementById('toast-container');
        if (!tc) return;
        const icon = tipo === 'success'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        const el = document.createElement('div');
        el.className = `toast ${tipo}`;
        el.innerHTML = `${icon}<span>${msg}</span>`;
        tc.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }

    // ── Seleção do centro ────────────────────────────────
    const selectCentro = document.getElementById('aula-select-centro');
    const selectTipo = document.getElementById('aula-select-tipo');

    // Popula centros
    ORGAOS.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.title;
        selectCentro.appendChild(opt);
    });

    // Auto-detecta centro selecionado
    const orgaoSel = get('dme_orgao_selecionado');
    if (orgaoSel && orgaoSel.id) {
        selectCentro.value = orgaoSel.id;
        atualizarPeriodoText(orgaoSel.id);
        preencherTipos(orgaoSel.id);
    }

    selectCentro.addEventListener('change', function () {
        preencherTipos(this.value);
        if (this.value) atualizarPeriodoText(this.value);
    });

    function preencherTipos(centroId) {
        selectTipo.innerHTML = '';
        const tipos = CENTROS_AULAS[centroId] || [];
        if (tipos.length === 0) {
            selectTipo.innerHTML = '<option value="">Nenhum tipo disponível</option>';
            return;
        }
        const def = document.createElement('option');
        def.value = ''; def.textContent = 'Selecione o tipo de aula...';
        selectTipo.appendChild(def);
        tipos.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.textContent = t;
            selectTipo.appendChild(opt);
        });
    }

    function atualizarPeriodoText(orgaoId) {
        document.getElementById('aula-hist-periodo').textContent = 'Período: ' + formatPeriodo(orgaoId);
    }

    // ── Aplicador (readonly) ─────────────────────────────
    document.getElementById('aula-aplicador').value = username;

    // Data/hora padrão = agora
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('aula-datahora').value = now.toISOString().slice(0, 16);

    // ── Salvar Aula ──────────────────────────────────────
    document.getElementById('aula-btn-salvar').addEventListener('click', salvar);

    function salvar() {
        const centroId = selectCentro.value;
        const tipo = selectTipo.value;
        const dataHora = document.getElementById('aula-datahora').value;
        const permissor = document.getElementById('aula-permissor').value.trim();
        const aprovados = document.getElementById('aula-aprovados').value.trim();
        const reprovados = document.getElementById('aula-reprovados').value.trim();
        const semAlunos = document.getElementById('aula-sem-alunos').checked;
        const obs = document.getElementById('aula-observacao').value.trim();

        if (!centroId) { toast('Selecione o centro de tarefas.', 'error'); return; }
        if (!tipo) { toast('Selecione o tipo de aula.', 'error'); return; }
        if (!dataHora) { toast('Informe a data e hora da aula.', 'error'); return; }
        if (!obs) { toast('Preencha a observação.', 'error'); return; }
        if (!semAlunos && !aprovados && !reprovados) {
            toast('Informe aprovados/reprovados ou marque "sem alunos".', 'error'); return;
        }

        const registro = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: Date.now(),
            data: new Date().toLocaleString('pt-BR'),
            dataAula: dataHora,
            aplicador: username,
            centro: centroId,
            tipo,
            aprovados,
            reprovados,
            semAlunos,
            permissor,
            observacao: obs,
        };

        const aulas = getAulas();
        aulas.push(registro);
        saveAulas(aulas);

        // ── Criação automática de perfil para INS ────────
        if (centroId === 'instrucao-inicial' && aprovados) {
            const listaAprovados = aprovados
                .split(/[\n,]+/)
                .map(n => n.trim())
                .filter(Boolean);

            if (listaAprovados.length > 0) {
                const militar = get('dme_militar') || [];
                const nicksExistentes = militar.map(m => (m.nick || '').toLowerCase());
                let novos = 0;

                listaAprovados.forEach(nick => {
                    if (!nicksExistentes.includes(nick.toLowerCase())) {
                        militar.push({
                            nick,
                            patente: 'Soldado',
                            tag: 'DME',
                            status: 'Ativo',
                            desde: new Date().toISOString(),
                            dataCadastro: new Date().toLocaleString('pt-BR'),
                            instrutor: username,
                            origem: 'instrucao-inicial'
                        });
                        nicksExistentes.push(nick.toLowerCase());
                        novos++;
                    }
                });

                if (novos > 0) {
                    set('dme_militar', militar);
                    toast(`✅ Aula postada! ${novos} novo(s) perfil(is) criado(s) automaticamente.`, 'success');
                } else {
                    toast('Aula postada! Todos os militares já possuem perfil.', 'success');
                }
            } else {
                toast('Aula postada e contabilizada com sucesso! 🎓', 'success');
            }
        } else {
            toast('Aula postada e contabilizada com sucesso! 🎓', 'success');
        }

        // Limpar formulário
        document.getElementById('aula-aprovados').value = '';
        document.getElementById('aula-reprovados').value = '';
        document.getElementById('aula-observacao').value = '';
        document.getElementById('aula-permissor').value = '';
        document.getElementById('aula-sem-alunos').checked = false;
        const nowN = new Date();
        nowN.setMinutes(nowN.getMinutes() - nowN.getTimezoneOffset());
        document.getElementById('aula-datahora').value = nowN.toISOString().slice(0, 16);

        renderHistorico();
    }

    // ── Histórico pessoal ────────────────────────────────
    renderHistorico();

    function renderHistorico() {
        const orgId = selectCentro.value;
        const periodo = orgId ? getPeriodo(orgId) : null;
        const aulas = getAulas().filter(a => a.aplicador === username);
        const list = document.getElementById('aula-hist-list');

        const filtradas = periodo
            ? aulas.filter(a => {
                const t = a.timestamp;
                return t >= new Date(periodo.inicio).getTime() && t <= new Date(periodo.fim).getTime();
            })
            : aulas;

        filtradas.sort((a, b) => b.timestamp - a.timestamp);

        if (filtradas.length === 0) {
            list.innerHTML = `<div class="empty-state" style="padding:24px;text-align:center;color:var(--t3);font-size:.84rem">
                <div style="font-size:2rem;margin-bottom:8px">📚</div>
                Nenhuma aula postada neste período.
            </div>`;
            return;
        }

        list.innerHTML = filtradas.map(a => {
            const orgao = ORGAOS.find(o => o.id === a.centro);
            const centro = orgao ? orgao.title : a.centro;
            return `
            <div class="aula-hist-item">
                <div class="aula-hist-left">
                    <div class="aula-hist-tipo">${escH(a.tipo)}</div>
                    <div class="aula-hist-meta">
                        <span>${escH(centro)}</span>
                        <span>·</span>
                        <span>${escH(new Date(a.dataAula || a.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</span>
                        ${a.semAlunos ? '<span>· Sem alunos</span>' : (a.aprovados ? `<span>· ${a.aprovados.split(/[,\n]/).filter(Boolean).length} aprovado(s)</span>` : '')}
                    </div>
                </div>
                <span class="aula-hist-badge ok">Contabilizada</span>
            </div>`;
        }).join('');
    }

    // ── Navbar ──────────────────────────────────────────
    const navImg = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std&head_direction=2`;
    const fullImg = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&size=m&direction=2&head_direction=2&gesture=std`;
    document.getElementById('navUserName').textContent = username;
    document.getElementById('dropdownName').textContent = username;
    document.getElementById('navUserImage').src = navImg;
    document.getElementById('dropdownUserImage').src = fullImg;

    const admins = get('dme_admins') || [];
    if (admins.includes(username)) document.getElementById('dropdownPainel').style.display = 'flex';

    // Dropdown
    const profileBtn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('userDropdown');
    profileBtn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('active'); });
    document.addEventListener('click', () => dropdown.classList.remove('active'));

    // Hamburger
    const ham = document.getElementById('hamburger');
    const mSidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarClose');
    const toggle = () => { mSidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
    ham.addEventListener('click', toggle);
    closeBtn.addEventListener('click', toggle);
    overlay.addEventListener('click', toggle);

    // Theme
    window.toggleTheme = function () {
        const light = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('dme_theme', light ? 'light' : 'dark');
        document.getElementById('themeText').textContent = light ? 'Modo Escuro' : 'Modo Claro';
    };
    const isLight = document.documentElement.classList.contains('light-mode');
    document.getElementById('themeText').textContent = isLight ? 'Modo Escuro' : 'Modo Claro';

    window.logout = function () {
        localStorage.removeItem('dme_username');
        window.location.href = 'login.html';
    };

    function escH(str) {
        const d = document.createElement('div');
        d.textContent = str ?? '';
        return d.innerHTML;
    }
})();
