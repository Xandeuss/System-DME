/* ══════════════════════════════════════════════════════
   POSTAR AULA — JavaScript
   ══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = '/login'; return; }

    // ── Helpers ──────────────────────────────────────────
    const get = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const qs = id => document.getElementById(id);

    // ── Órgãos e tipos de aula ───────────────────────────
    const ORGAOS = [
        { id: 'centro-instrucao',       title: 'Centro de Instrução' },
        { id: 'centro-treinamento',     title: 'Centro de Treinamento' },
        { id: 'centro-supervisao',      title: 'Centro de Supervisão' },
        { id: 'centro-patrulha',        title: 'Centro de Patrulha' },
        { id: 'academia-agulhas-negras',title: 'Academia das Agulhas Negras' },
        { id: 'goe',                    title: 'Grupamento de Operações Especiais' },
        { id: 'instrucao-inicial',      title: 'Instrução Inicial' },
        { id: 'guerra-selva',           title: 'Centro de Instrução Guerra na Selva' },
        { id: 'cadetes',                title: 'Cadetes' },
        { id: 'academia-publicitaria',  title: 'Academia Publicitária Militar' },
    ];

    const CENTROS_AULAS = {
        'centro-instrucao':        ['Instrução Inicial [INS]', 'Aula de Infraestrutura [AFT]', 'Curso de Formação de Subtenentes [CFS]'],
        'centro-treinamento':      ['Instrução Inicial [INS]', '[AFS] Aula de Formação de Soldados', '[AES] Aula de Especialização para Sargentos', '[AFC] Aula de Formação Complementar'],
        'centro-supervisao':       ['Instrução Inicial [INS]', '[CSP] Curso de Segurança Pessoal', '[CSO] Curso de Segurança Operacional', '[PRO] Aula para Promotor'],
        'centro-patrulha':         ['[PAT] Patrulha Básica', '[PAT-A] Patrulha Avançada'],
        'academia-agulhas-negras': ['[AMAN] Formação de Cadetes', '[AMAN] Especialização de Oficiais'],
        'goe':                     ['[GOE] Operação Especial', '[GOE] Treinamento Tático'],
        'instrucao-inicial':       ['Instrução Inicial [INS]'],
        'guerra-selva':            ['[CIGS] Operação Selva', '[CIGS] Sobrevivência'],
        'cadetes':                 ['[CAD] Formação Base', '[CAD] Disciplina Militar'],
        'academia-publicitaria':   ['[APM] Marketing Militar', '[APM] Comunicação Institucional'],
    };

    // ── Período ──────────────────────────────────────────
    function getPeriodo(orgaoId) {
        const saved = get('dme_periodo_' + orgaoId);
        if (saved && saved.inicio && saved.fim) return saved;
        const now = new Date();
        const dia = now.getDay();
        const offsetSeg = dia === 0 ? -6 : 1 - dia;
        const seg = new Date(now); seg.setDate(now.getDate() + offsetSeg); seg.setHours(0,0,0,0);
        const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23,59,59,999);
        return { inicio: seg.toISOString(), fim: dom.toISOString() };
    }

    function formatPeriodo(orgaoId) {
        const p = getPeriodo(orgaoId);
        const fmt = d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        return fmt(p.inicio) + ' – ' + fmt(p.fim);
    }

    // ── Toast ─────────────────────────────────────────────
    function toast(msg, tipo) {
        tipo = tipo || 'success';
        const tc = document.getElementById('toast-container');
        if (!tc) return;
        const icon = tipo === 'success'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        const el = document.createElement('div');
        el.className = 'toast ' + tipo;
        el.innerHTML = icon + '<span>' + msg + '</span>';
        tc.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function escH(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    // ── Aulas ─────────────────────────────────────────────
    function getAulas() { return get('dme_aulas') || []; }
    function saveAulas(arr) { set('dme_aulas', arr); }

    // ── Inicializar UI ────────────────────────────────────
    function init() {
        // Navbar
        const admins = get('dme_admins') || ['Xandelicado', 'rafacv', 'Ronaldo'];
        const navImg = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + encodeURIComponent(username) + '&headonly=1&size=m&gesture=std&head_direction=2';
        const fullImg = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + encodeURIComponent(username) + '&size=m&direction=2&head_direction=2&gesture=std';

        if (qs('navUserName'))       qs('navUserName').textContent = username;
        if (qs('dropdownName'))      qs('dropdownName').textContent = username;
        if (qs('navUserImage'))      qs('navUserImage').src = navImg;
        if (qs('dropdownUserImage')) qs('dropdownUserImage').src = fullImg;
        if (qs('dropdownPainel') && admins.map(a => a.toLowerCase()).includes(username.toLowerCase())) {
            qs('dropdownPainel').style.display = 'flex';
        }

        // Dropdown do perfil — idêntico ao home.js
        const profileBtn = document.getElementById('userProfileBtn');
        const dropdown   = document.getElementById('userDropdown');
        if (profileBtn && dropdown) {
            profileBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
            document.addEventListener('click', function(e) {
                if (!profileBtn.contains(e.target)) dropdown.classList.remove('active');
            });
            dropdown.addEventListener('click', function(e) { e.stopPropagation(); });
        }

        // Hamburger (mobile)
        const ham      = qs('hamburger');
        const mSidebar = qs('mobileSidebar');
        const overlay  = qs('sidebarOverlay');
        const closeBtn = qs('sidebarClose');
        if (ham && mSidebar) {
            const toggle = function() {
                mSidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            };
            ham.addEventListener('click', toggle);
            if (closeBtn) closeBtn.addEventListener('click', toggle);
            if (overlay)  overlay.addEventListener('click', toggle);
        }

        // Theme
        window.toggleTheme = function() {
            const light = document.documentElement.classList.toggle('light-mode');
            localStorage.setItem('dme_theme', light ? 'light' : 'dark');
            if (qs('themeText')) qs('themeText').textContent = light ? 'Modo Escuro' : 'Modo Claro';
        };
        const isLight = document.documentElement.classList.contains('light-mode');
        if (qs('themeText')) qs('themeText').textContent = isLight ? 'Modo Escuro' : 'Modo Claro';

        window.logout = function() {
            localStorage.removeItem('dme_username');
            window.location.href = '/login';
        };

        // ── Select de Centro ─────────────────────────────
        const selectCentro = qs('aula-select-centro');
        const selectTipo   = qs('aula-select-tipo');
        if (!selectCentro || !selectTipo) return;

        ORGAOS.forEach(function(o) {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = o.title;
            selectCentro.appendChild(opt);
        });

        function preencherTipos(centroId) {
            selectTipo.innerHTML = '';
            const tipos = CENTROS_AULAS[centroId] || [];
            if (!tipos.length) {
                selectTipo.innerHTML = '<option value="">Nenhum tipo disponível</option>';
                return;
            }
            const def = document.createElement('option');
            def.value = ''; def.textContent = 'Selecione o tipo de aula...';
            selectTipo.appendChild(def);
            tipos.forEach(function(t) {
                const opt = document.createElement('option');
                opt.value = t; opt.textContent = t;
                selectTipo.appendChild(opt);
            });
        }

        function atualizarPeriodoText(orgaoId) {
            const el = qs('aula-hist-periodo');
            if (el) el.textContent = 'Período: ' + formatPeriodo(orgaoId);
        }

        // Auto-detectar centro do contexto atual
        const orgaoSel = get('dme_orgao_selecionado');
        if (orgaoSel && orgaoSel.id) {
            selectCentro.value = orgaoSel.id;
        }
        const centroInicial = selectCentro.value || (selectCentro.options[0] && selectCentro.options[0].value);
        if (centroInicial) {
            selectCentro.value = centroInicial;
            preencherTipos(centroInicial);
            atualizarPeriodoText(centroInicial);
        }

        selectCentro.addEventListener('change', function() {
            preencherTipos(this.value);
            atualizarPeriodoText(this.value);
        });

        // ── Aplicador ────────────────────────────────────
        if (qs('aula-aplicador')) qs('aula-aplicador').value = username;

        // ── Tags Aprovados / Reprovados ───────────────────
        let tagsAprovados  = [];
        let tagsReprovados = [];

        function renderTags(arr, containerId, inputId, cls, emoji) {
            const container = qs(containerId);
            const input     = qs(inputId);
            if (!container || !input) return;
            container.querySelectorAll('.tag-chip').forEach(function(c) { c.remove(); });
            arr.forEach(function(nick, idx) {
                const chip = document.createElement('div');
                chip.className = 'tag-chip ' + cls;
                chip.innerHTML = emoji + ' ' + nick + '<button type="button" data-idx="' + idx + '">&times;</button>';
                chip.querySelector('button').addEventListener('click', function() {
                    arr.splice(parseInt(this.dataset.idx), 1);
                    renderTags(arr, containerId, inputId, cls, emoji);
                });
                container.insertBefore(chip, input);
            });
        }

        function renderAprov()  { renderTags(tagsAprovados,  'aprovados-container',  'aprovados-input',  'aprov', '✅'); }
        function renderReprov() { renderTags(tagsReprovados, 'reprovados-container', 'reprovados-input', 'reprov', '❌'); }

        function addTag(arr, renderFn, nick) {
            const n = nick.trim();
            if (!n) return;
            if (arr.some(function(x) { return x.toLowerCase() === n.toLowerCase(); })) return;
            arr.push(n);
            renderFn();
        }

        function bindTagInput(inputId, arr, renderFn) {
            const el = qs(inputId);
            if (!el) return;
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    addTag(arr, renderFn, this.value);
                    this.value = '';
                }
            });
            el.addEventListener('blur', function() {
                if (this.value.trim()) { addTag(arr, renderFn, this.value); this.value = ''; }
            });
        }

        bindTagInput('aprovados-input',  tagsAprovados,  renderAprov);
        bindTagInput('reprovados-input', tagsReprovados, renderReprov);

        // ── Salvar Aula ───────────────────────────────────
        const btnSalvar = qs('aula-btn-salvar');
        if (btnSalvar) btnSalvar.addEventListener('click', salvar);

        function salvar() {
            const centroId = selectCentro.value;
            const tipo     = selectTipo.value;

            // Confirmar tags não finalizadas
            const inputAprov  = qs('aprovados-input');
            const inputReprov = qs('reprovados-input');
            if (inputAprov  && inputAprov.value.trim())  { addTag(tagsAprovados,  renderAprov,  inputAprov.value);  inputAprov.value  = ''; }
            if (inputReprov && inputReprov.value.trim()) { addTag(tagsReprovados, renderReprov, inputReprov.value); inputReprov.value = ''; }

            const aprovados  = tagsAprovados.join(', ');
            const reprovados = tagsReprovados.join(', ');
            const semAlunos  = qs('aula-sem-alunos') && qs('aula-sem-alunos').checked;
            const obs        = qs('aula-observacao') ? qs('aula-observacao').value.trim() : '';

            if (!centroId) { toast('Selecione o centro.', 'error'); return; }
            if (!tipo)     { toast('Escolha o treinamento.', 'error'); return; }
            if (!obs)      { toast('Preencha a observação.', 'error'); return; }
            if (!semAlunos && !aprovados && !reprovados) {
                toast('Informe aprovados/reprovados ou marque "sem alunos".', 'error'); return;
            }

            const aulas        = getAulas();
            const agora        = Date.now();
            const aulascentro  = aulas.filter(function(a) { return a.centro === centroId; });
            const numFormatado = String(aulascentro.length + 1).padStart(3, '0');

            const INTERVALO    = 10 * 60 * 1000;
            const alertaIntervalo = aulas.some(function(a) {
                return a.centro === centroId &&
                       a.aplicador.toLowerCase() === username.toLowerCase() &&
                       (agora - a.timestamp) < INTERVALO;
            });

            const blacklist  = get('dme_blacklist_' + centroId) || [];
            const naBlacklist = blacklist.some(function(b) { return b.toLowerCase() === username.toLowerCase(); });

            const registro = {
                id:         Date.now().toString(36) + Math.random().toString(36).slice(2),
                numero:     numFormatado,
                timestamp:  agora,
                data:       new Date().toLocaleString('pt-BR'),
                dataAula:   new Date().toISOString().slice(0, 16),
                aplicador:  username,
                centro:     centroId,
                tipo:       tipo,
                aprovados:  aprovados,
                reprovados: reprovados,
                semAlunos:  semAlunos,
                observacao: obs,
                flags: { intervalo_curto: alertaIntervalo, blacklist: naBlacklist }
            };

            aulas.push(registro);
            saveAulas(aulas);

            if (naBlacklist)      toast('⚠️ Você está na blacklist deste centro!', 'error');
            else if (alertaIntervalo) toast('⚠️ Aula em intervalo inferior a 10 minutos.', 'error');

            // Criar perfis automáticos para INS
            if (centroId === 'instrucao-inicial' && aprovados) {
                const lista = aprovados.split(/[\n,]+/).map(function(n) { return n.trim(); }).filter(Boolean);
                if (lista.length) {
                    const militar = get('dme_militar') || [];
                    const existentes = militar.map(function(m) { return (m.nick || '').toLowerCase(); });
                    let novos = 0;
                    lista.forEach(function(nick) {
                        if (!existentes.includes(nick.toLowerCase())) {
                            militar.push({ nick: nick, patente: 'Soldado', tag: 'DME', status: 'Ativo',
                                desde: new Date().toISOString(), dataCadastro: new Date().toLocaleString('pt-BR'),
                                instrutor: username, origem: 'instrucao-inicial' });
                            existentes.push(nick.toLowerCase());
                            novos++;
                        }
                    });
                    if (novos > 0) {
                        set('dme_militar', militar);
                        toast('Aula postada! ' + novos + ' perfil(is) criado(s) automaticamente.', 'success');
                    } else {
                        toast('Aula postada! Todos os militares já têm perfil.', 'success');
                    }
                } else {
                    toast('Aula postada com sucesso! 🎓', 'success');
                }
            } else {
                toast('Aula postada com sucesso! 🎓', 'success');
            }

            // Limpar
            tagsAprovados  = []; renderAprov();
            tagsReprovados = []; renderReprov();
            if (qs('aula-observacao')) qs('aula-observacao').value = '';
            if (qs('aula-sem-alunos')) qs('aula-sem-alunos').checked = false;
            renderHistorico();
        }

        // ── Histórico ─────────────────────────────────────
        renderHistorico();

        function renderHistorico() {
            const orgId  = selectCentro.value;
            const periodo = orgId ? getPeriodo(orgId) : null;
            const aulas   = getAulas().filter(function(a) { return a.aplicador === username; });
            const list    = qs('aula-hist-list');
            if (!list) return;

            const filtradas = periodo ? aulas.filter(function(a) {
                return a.timestamp >= new Date(periodo.inicio).getTime() &&
                       a.timestamp <= new Date(periodo.fim).getTime();
            }) : aulas;

            filtradas.sort(function(a, b) { return b.timestamp - a.timestamp; });

            if (!filtradas.length) {
                list.innerHTML = '<div class="empty-state" style="padding:24px;text-align:center;color:var(--t3);font-size:.84rem"><div style="font-size:2rem;margin-bottom:8px">📚</div>Nenhuma aula postada neste período.</div>';
                return;
            }

            list.innerHTML = filtradas.map(function(a) {
                const orgao  = ORGAOS.find(function(o) { return o.id === a.centro; });
                const centro = orgao ? orgao.title : a.centro;
                const dt     = new Date(a.dataAula || a.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                const apCount = a.aprovados ? a.aprovados.split(/[,\n]/).filter(Boolean).length : 0;
                return '<div class="aula-hist-item">' +
                    '<div class="aula-hist-left">' +
                    '<div class="aula-hist-tipo">' + escH(a.tipo) + '</div>' +
                    '<div class="aula-hist-meta">' +
                    '<span>' + escH(centro) + '</span><span>·</span><span>' + dt + '</span>' +
                    (a.semAlunos ? '<span>· Sem alunos</span>' : (apCount ? '<span>· ' + apCount + ' aprovado(s)</span>' : '')) +
                    '</div></div>' +
                    '<span class="aula-hist-badge ok">Contabilizada</span>' +
                    '</div>';
            }).join('');
        }
    }

    // Aguardar DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
