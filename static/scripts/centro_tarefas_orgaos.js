(function () {

    /* ── Estado global ── */
    let CATEGORIAS = [];
    let ORGAOS_FLAT = [];
    let isAdmin = false;

    /* ── Helpers ── */
    function logout() {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}).finally(() => {
            window.location.href = '/login';
        });
    }

    function getOrgaoSelecionado() {
        try { return JSON.parse(localStorage.getItem('dme_orgao_selecionado') || 'null'); }
        catch (_) { return null; }
    }

    function setOrgaoSelecionado(orgao) {
        localStorage.setItem('dme_orgao_selecionado', JSON.stringify(orgao));
    }

    async function apiFetch(url, opts = {}) {
        const r = await fetch(url, { credentials: 'include', ...opts });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.detail || 'Erro ' + r.status);
        }
        return r.json();
    }

    /* ── Carregar dados da API ── */
    async function carregarDados() {
        try {
            const res = await apiFetch('/api/orgaos');
            const { categorias, orgaos } = res.data;
            CATEGORIAS = categorias.map(cat => ({
                ...cat,
                orgaos: orgaos
                    .filter(o => o.categoria_slug === cat.slug && o.ativo)
                    .sort((a, b) => a.ordem - b.ordem || a.nome_oficial.localeCompare(b.nome_oficial))
            })).filter(cat => cat.orgaos.length > 0);
            ORGAOS_FLAT = orgaos.filter(o => o.ativo);
        } catch (e) {
            CATEGORIAS = _FALLBACK_CATEGORIAS;
            ORGAOS_FLAT = _FALLBACK_CATEGORIAS.flatMap(c => c.orgaos);
        }
        renderList();
        const statTotal = document.getElementById('statTotalOrgaos');
        if (statTotal) statTotal.textContent = ORGAOS_FLAT.length;
    }

    /* ── Fallback estático ── */
    const _FALLBACK_CATEGORIAS = [
        { slug: 'centros-operacionais', nome: 'Centros Operacionais', icone: '🛡️', orgaos: [
            { nick: 'centro-instrucao',   nome_oficial: 'Centro de Instrução',                icone: '🛡️', sub: '' },
            { nick: 'centro-treinamento', nome_oficial: 'Centro de Treinamento',               icone: '🛡️', sub: '' },
            { nick: 'centro-supervisao',  nome_oficial: 'Centro de Supervisão',                icone: '🛡️', sub: '' },
            { nick: 'centro-patrulha',    nome_oficial: 'Centro de Patrulha',                  icone: '🛡️', sub: '' },
            { nick: 'guerra-selva',       nome_oficial: 'Centro de Instrução Guerra na Selva', icone: '🐆', sub: '' },
        ]},
        { slug: 'academias-militares', nome: 'Academias Militares', icone: '🦅', orgaos: [
            { nick: 'academia-agulhas-negras', nome_oficial: 'Academia Militar das Agulhas Negras', icone: '🦅', sub: '' },
            { nick: 'academia-publicitaria',   nome_oficial: 'Academia Publicitária Militar',        icone: '📜', sub: '' },
            { nick: 'instrucao-inicial',        nome_oficial: 'Aplicar Instrução Inicial',            icone: '📖', sub: 'Instrutores' },
            { nick: 'cadetes',                  nome_oficial: 'Cadetes',                              icone: '🪖', sub: '' },
        ]},
        { slug: 'justica-fiscalizacao', nome: 'Justiça & Fiscalização', icone: '⚖️', orgaos: [
            { nick: 'auditoria-fiscal',    nome_oficial: 'Auditoria Fiscal',          icone: '⚖️', sub: '' },
            { nick: 'ministerio-publico',  nome_oficial: 'Ministério Público',         icone: '⚖️', sub: '' },
            { nick: 'corregedoria',        nome_oficial: 'Corregedoria',              icone: '🦅', sub: '' },
            { nick: 'stm',                 nome_oficial: 'Superior Tribunal Militar', icone: '⚔️', sub: '' },
        ]},
        { slug: 'corpos-inteligencia', nome: 'Corpos & Inteligência', icone: '🗡️', orgaos: [
            { nick: 'corpo-oficiais-gerais', nome_oficial: 'Corpo de Oficiais Generais',          icone: '⭐', sub: '' },
            { nick: 'corpo-oficiais',        nome_oficial: 'Corpo de Oficiais',                   icone: '🗡️', sub: 'Setor de Inteligência' },
            { nick: 'abi',                   nome_oficial: 'Agência Brasileira de Inteligência',  icone: '🦅', sub: '' },
            { nick: 'goe',                   nome_oficial: 'Grupamento de Operações Especiais',   icone: '💀', sub: 'Instrutores' },
        ]},
        { slug: 'orgaos-sociais-rh', nome: 'Órgãos Sociais & RH', icone: '👥', orgaos: [
            { nick: 'centro-rh',           nome_oficial: 'Centro de Recursos Humanos', icone: '👥', sub: '' },
            { nick: 'portadores-direitos', nome_oficial: 'Portadores de Direitos',      icone: '🤝', sub: '' },
            { nick: 'comando-feminino',    nome_oficial: 'Comando Feminino',            icone: '♀️', sub: '' },
        ]},
    ];

    /* ── Render ── */
    const ARROW_SVG = '<svg class="funcao-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';

    function getTitle(o) { return o.nome_oficial || o.title || ''; }
    function getNick(o)  { return o.nick || o.id || ''; }
    function getIcon(o)  { return o.icone || o.icon || '🏛️'; }
    function getSub(o)   { return o.sub || ''; }

    function cardHTML(o, selectedNick) {
        const nick = getNick(o);
        const isSelected = selectedNick === nick;
        const sub  = getSub(o) ? '<div class="funcao-item-sub">' + getSub(o) + '</div>' : '';
        const badge = '<span class="funcao-item-badge">Ativo</span>';
        return '<div class="funcao-item' + (isSelected ? ' selected' : '') + '" data-id="' + nick + '" role="button" tabindex="0" aria-label="' + getTitle(o) + '">' +
            '<div class="funcao-item-icon">' + getIcon(o) + '</div>' +
            '<div class="funcao-item-text"><div class="funcao-item-title">' + getTitle(o) + '</div>' + sub + '</div>' +
            (isSelected ? badge : ARROW_SVG) +
        '</div>';
    }

    function renderList(filtro) {
        const container = document.getElementById('funcaoList');
        if (!container) return;
        const selected = getOrgaoSelecionado();
        const selectedNick = selected ? (selected.nick || selected.id || null) : null;

        if (filtro !== undefined && filtro !== '') {
            const termo = filtro.toLowerCase();
            const matches = ORGAOS_FLAT.filter(o =>
                getTitle(o).toLowerCase().includes(termo) || getSub(o).toLowerCase().includes(termo)
            );
            if (!matches.length) {
                container.innerHTML = '<div class="funcao-grid"><div class="funcao-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Nenhum resultado para "<strong>' + filtro + '</strong>"</div></div>';
            } else {
                container.innerHTML = '<div class="funcao-grid">' + matches.map(o => cardHTML(o, selectedNick)).join('') + '</div>';
                attachEvents(container);
            }
            return;
        }

        container.innerHTML = CATEGORIAS.map(function(cat) {
            const editBtn = isAdmin
                ? '<button class="btn-edit-cat" onclick="abrirModalEditCat(\'' + cat.slug + '\',\'' + encodeURIComponent(cat.nome) + '\',\'' + (cat.icone||'🏛️') + '\')" title="Editar categoria"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'
                : '';
            return '<div class="funcao-category">' +
                '<div class="funcao-category-header">' +
                '<div class="funcao-category-dot"></div>' +
                '<span class="funcao-category-name">' + cat.nome + '</span>' +
                '<span class="funcao-category-count">' + cat.orgaos.length + '</span>' +
                editBtn +
                '</div>' +
                '<div class="funcao-grid">' + cat.orgaos.map(o => cardHTML(o, selectedNick)).join('') + '</div>' +
                '</div>';
        }).join('');

        attachEvents(container);
    }

    function attachEvents(container) {
        container.querySelectorAll('.funcao-item').forEach(function(el) {
            el.addEventListener('click', function() { selecionarOrgao(el.getAttribute('data-id')); });
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selecionarOrgao(el.getAttribute('data-id')); }
            });
        });
    }

    function selecionarOrgao(id) {
        const orgao = ORGAOS_FLAT.find(o => getNick(o) === id);
        if (!orgao) return;
        setOrgaoSelecionado({ nick: getNick(orgao), id: getNick(orgao), title: getTitle(orgao), nome_oficial: getTitle(orgao), sub: getSub(orgao), icon: getIcon(orgao), icone: getIcon(orgao) });
        window.location.href = '/centro_detalhe';
    }

    /* ── Modais (admin) ── */
    window.abrirModalEditCat = function(slug, nome, icone) {
        document.getElementById('editCatSlug').value = slug;
        document.getElementById('editCatNome').value = decodeURIComponent(nome);
        document.getElementById('editCatIcone').value = icone;
        document.getElementById('modalEditCat').classList.add('active');
    };

    window.fecharModalEditCat = function() {
        document.getElementById('modalEditCat').classList.remove('active');
    };

    window.salvarCategoria = async function() {
        const slug  = document.getElementById('editCatSlug').value;
        const nome  = document.getElementById('editCatNome').value.trim();
        const icone = document.getElementById('editCatIcone').value.trim() || '🏛️';
        const ordemEl = document.getElementById('editCatOrdem');
        const ordem = ordemEl ? (parseInt(ordemEl.value) || 99) : 99;
        if (!nome) return showToast('Informe o nome da categoria.', 'erro');
        try {
            await apiFetch('/api/orgaos/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, nome, icone, ordem }) });
            fecharModalEditCat();
            showToast('Categoria atualizada!', 'ok');
            await carregarDados();
        } catch (e) { showToast(e.message, 'erro'); }
    };

    window.abrirModalNovaCat = function() {
        document.getElementById('editCatSlug').value = 'cat-' + Date.now();
        document.getElementById('editCatNome').value = '';
        document.getElementById('editCatIcone').value = '🏛️';
        if (document.getElementById('editCatOrdem')) document.getElementById('editCatOrdem').value = '99';
        document.getElementById('modalEditCat').classList.add('active');
    };

    window.abrirModalNovoOrgao = function() {
        const sel = document.getElementById('novoOrgaoCat');
        if (sel) sel.innerHTML = CATEGORIAS.map(c => '<option value="' + c.slug + '">' + c.nome + '</option>').join('');
        document.getElementById('modalNovoOrgao').classList.add('active');
    };

    window.fecharModalNovoOrgao = function() {
        document.getElementById('modalNovoOrgao').classList.remove('active');
        document.getElementById('formNovoOrgao').reset();
    };

    window.salvarNovoOrgao = async function() {
        const nick         = document.getElementById('novoOrgaoNick').value.trim();
        const nome_oficial = document.getElementById('novoOrgaoNome').value.trim();
        const categoria_slug = document.getElementById('novoOrgaoCat').value;
        const imagem_url   = document.getElementById('novoOrgaoImagem').value.trim() || null;
        const ordem        = parseInt(document.getElementById('novoOrgaoOrdem').value) || 99;
        if (!nick || !nome_oficial) return showToast('Preencha nick e nome.', 'erro');
        try {
            await apiFetch('/api/orgaos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick, nome_oficial, categoria_slug, imagem_url, ordem }) });
            fecharModalNovoOrgao();
            showToast('Órgão/Centro criado!', 'ok');
            await carregarDados();
        } catch (e) { showToast(e.message, 'erro'); }
    };

    /* ── Toast ── */
    function showToast(msg, tipo) {
        tipo = tipo || 'ok';
        const t = document.createElement('div');
        t.className = 'dme-toast dme-toast-' + tipo;
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function() { t.classList.add('show'); });
        setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 3000);
    }

    /* ── Init ── */
    document.addEventListener('DOMContentLoaded', async function() {

        try {
            const me = await apiFetch('/api/auth/me');
            const username = me.nick || me.sub || '';
            isAdmin = (me.role === 'admin');

            document.getElementById('navUserName').textContent = username;
            document.getElementById('dropdownName').textContent = username;
            document.getElementById('navUserImage').src = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + encodeURIComponent(username) + '&headonly=1&size=m&gesture=std&head_direction=2';
            document.getElementById('dropdownUserImage').src = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + encodeURIComponent(username) + '&size=m&direction=2&head_direction=2&gesture=std';

            if (isAdmin) {
                const painel = document.getElementById('dropdownPainel');
                if (painel) painel.style.display = 'flex';
                const adminBar = document.getElementById('adminToolbar');
                if (adminBar) adminBar.style.display = 'flex';
            }

            const cargoEl = document.getElementById('dropdownCargo');
            if (cargoEl) {
                const sel = getOrgaoSelecionado();
                cargoEl.textContent = (sel && (sel.title || sel.nome_oficial)) ? (sel.title || sel.nome_oficial) : 'Militar DME';
            }
        } catch (e) {
            window.location.href = '/login';
            return;
        }

        const selected = getOrgaoSelecionado();
        const statSel = document.getElementById('statSelecionado');
        if (statSel) statSel.textContent = (selected && (selected.icone || selected.icon)) ? (selected.icone || selected.icon) : '—';

        await carregarDados();

        /* Sidebar */
        const hamburger = document.getElementById('hamburger');
        const sidebar   = document.getElementById('mobileSidebar');
        const overlay   = document.getElementById('sidebarOverlay');
        const closeBtn  = document.getElementById('sidebarClose');
        if (hamburger && sidebar && overlay) {
            var toggle = function() { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
            hamburger.addEventListener('click', toggle);
            if (closeBtn) closeBtn.addEventListener('click', toggle);
            overlay.addEventListener('click', toggle);
        }

        /* Dropdown usuário */
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown   = document.getElementById('userDropdown');
        if (userProfileBtn && userDropdown) {
            userProfileBtn.addEventListener('click', function(e) { e.stopPropagation(); userDropdown.classList.toggle('active'); });
            document.addEventListener('click', function() { userDropdown.classList.remove('active'); });
        }

        /* Busca */
        const searchInput = document.getElementById('funcaoSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function() { renderList(this.value.trim()); });
        }

        window.logout = logout;

        /* Fechar modais clicando no fundo */
        document.querySelectorAll('.modal-co-wrap').forEach(function(m) {
            m.addEventListener('click', function(e) { if (e.target === m) m.classList.remove('active'); });
        });
    });

})();
