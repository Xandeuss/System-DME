(function () {
    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = '/login'; return; }

    /* ── Dados dos órgãos agrupados por categoria ── */
    const CATEGORIAS = [
        {
            nome: 'Centros Operacionais',
            orgaos: [
                { id: 'centro-instrucao',   title: 'Centro de Instrução',         sub: '',                     icon: '🛡️' },
                { id: 'centro-treinamento', title: 'Centro de Treinamento',        sub: '',                     icon: '🛡️' },
                { id: 'centro-supervisao',  title: 'Centro de Supervisão',         sub: '',                     icon: '🛡️' },
                { id: 'centro-patrulha',    title: 'Centro de Patrulha',           sub: '',                     icon: '🛡️' },
                { id: 'guerra-selva',       title: 'Centro de Instrução Guerra na Selva', sub: '',             icon: '🐆' },
            ]
        },
        {
            nome: 'Academias Militares',
            orgaos: [
                { id: 'academia-agulhas-negras', title: 'Academia Militar das Agulhas Negras', sub: '',        icon: '🦅' },
                { id: 'academia-publicitaria',   title: 'Academia Publicitária Militar',        sub: '',        icon: '📜' },
                { id: 'instrucao-inicial',        title: 'Aplicar Instrução Inicial',            sub: 'Instrutores', icon: '📖' },
                { id: 'cadetes',                  title: 'Cadetes',                              sub: '',        icon: '🪖' },
            ]
        },
        {
            nome: 'Justiça & Fiscalização',
            orgaos: [
                { id: 'auditoria-fiscal',    title: 'Auditoria Fiscal',             sub: '',                     icon: '⚖️' },
                { id: 'ministerio-publico',  title: 'Ministério Público',            sub: '',                     icon: '⚖️' },
                { id: 'corregedoria',        title: 'Corregedoria',                  sub: '',                     icon: '🦅' },
                { id: 'stm',                 title: 'Superior Tribunal Militar',     sub: '',                     icon: '⚔️' },
                { id: 'normas-desligamentos',title: 'Centro de Normas e Desligamentos', sub: '',                 icon: '📄' },
            ]
        },
        {
            nome: 'Corpos & Inteligência',
            orgaos: [
                { id: 'corpo-oficiais-gerais', title: 'Corpo de Oficiais Gerais',   sub: '',                     icon: '⭐' },
                { id: 'corpo-oficiais',        title: 'Corpo de Oficiais',           sub: 'Setor de Inteligência', icon: '🗡️' },
                { id: 'abi',                   title: 'Agência Brasileira de Inteligência', sub: '',             icon: '🦅' },
                { id: 'goe',                   title: 'Grupamento de Operações Especiais', sub: 'Instrutores',   icon: '💀' },
            ]
        },
        {
            nome: 'Órgãos Sociais & RH',
            orgaos: [
                { id: 'centro-rh',           title: 'Centro de Recursos Humanos',   sub: '',                     icon: '👥' },
                { id: 'portadores-direitos', title: 'Portadores de Direitos',        sub: '',                     icon: '🤝' },
                { id: 'comando-feminino',    title: 'Comando Feminino',              sub: '',                     icon: '♀️' },
                { id: 'agencia-eventos',     title: 'Agência de Eventos',            sub: 'Coordenador',          icon: '📅' },
                { id: 'af-dragonas',         title: '[AF] Postagem de Dragonas',     sub: '',                     icon: '🎖️' },
            ]
        },
    ];

    /* Lista plana para busca */
    const ORGAOS_FLAT = CATEGORIAS.flatMap(c => c.orgaos);

    function logout() {
        localStorage.removeItem('dme_username');
        window.location.href = '/login';
    }

    function getOrgaoSelecionado() {
        try { return JSON.parse(localStorage.getItem('dme_orgao_selecionado') || 'null'); }
        catch (_) { return null; }
    }

    function setOrgaoSelecionado(orgao) {
        localStorage.setItem('dme_orgao_selecionado', JSON.stringify(orgao));
    }

    /* SVG de seta para os cards */
    const ARROW_SVG = `<svg class="funcao-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6"/>
    </svg>`;

    function cardHTML(o, selectedId) {
        const isSelected = selectedId === o.id;
        const sub = o.sub ? `<div class="funcao-item-sub">${o.sub}</div>` : '';
        const badge = `<span class="funcao-item-badge">Ativo</span>`;
        return `
            <div class="funcao-item${isSelected ? ' selected' : ''}" data-id="${o.id}" role="button" tabindex="0" aria-label="${o.title}">
                <div class="funcao-item-icon">${o.icon}</div>
                <div class="funcao-item-text">
                    <div class="funcao-item-title">${o.title}</div>
                    ${sub}
                </div>
                ${isSelected ? badge : ARROW_SVG}
            </div>`;
    }

    function renderList(filtro) {
        const container = document.getElementById('funcaoList');
        if (!container) return;
        const selected = getOrgaoSelecionado();
        const selectedId = selected?.id || null;

        if (filtro !== undefined && filtro !== '') {
            /* Modo busca: grid único sem categorias */
            const termo = filtro.toLowerCase();
            const matches = ORGAOS_FLAT.filter(o =>
                o.title.toLowerCase().includes(termo) || o.sub.toLowerCase().includes(termo)
            );
            if (!matches.length) {
                container.innerHTML = `<div class="funcao-grid">
                    <div class="funcao-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Nenhum resultado para "<strong>${filtro}</strong>"
                    </div>
                </div>`;
            } else {
                container.innerHTML = `<div class="funcao-grid">${matches.map(o => cardHTML(o, selectedId)).join('')}</div>`;
                attachEvents(container);
            }
            return;
        }

        /* Modo normal: categorias */
        container.innerHTML = CATEGORIAS.map(cat => `
            <div class="funcao-category">
                <div class="funcao-category-header">
                    <div class="funcao-category-dot"></div>
                    <span class="funcao-category-name">${cat.nome}</span>
                    <span class="funcao-category-count">${cat.orgaos.length}</span>
                </div>
                <div class="funcao-grid">
                    ${cat.orgaos.map(o => cardHTML(o, selectedId)).join('')}
                </div>
            </div>
        `).join('');

        attachEvents(container);
    }

    function attachEvents(container) {
        container.querySelectorAll('.funcao-item').forEach(el => {
            el.addEventListener('click', () => selecionarOrgao(el.getAttribute('data-id')));
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selecionarOrgao(el.getAttribute('data-id')); }
            });
        });
    }

    function selecionarOrgao(id) {
        const orgao = ORGAOS_FLAT.find(o => o.id === id);
        if (!orgao) return;
        setOrgaoSelecionado({ id: orgao.id, title: orgao.title, sub: orgao.sub, icon: orgao.icon });
        window.location.href = '/centro_detalhe';
    }

    document.addEventListener('DOMContentLoaded', () => {
        /* User info */
        document.getElementById('navUserName').textContent = username;
        document.getElementById('dropdownName').textContent = username;
        const avatarHead = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std&head_direction=2`;
        const avatarFull = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&size=m&direction=2&head_direction=2&gesture=std`;
        document.getElementById('navUserImage').src = avatarHead;
        document.getElementById('dropdownUserImage').src = avatarFull;

        /* Setor selecionado no stat do hero */
        const selected = getOrgaoSelecionado();
        const statSel = document.getElementById('statSelecionado');
        if (statSel) statSel.textContent = selected?.icon || '—';

        /* Total de órgãos */
        const statTotal = document.getElementById('statTotalOrgaos');
        if (statTotal) statTotal.textContent = ORGAOS_FLAT.length;

        /* Cargo no dropdown */
        const cargoEl = document.getElementById('dropdownCargo');
        if (cargoEl) {
            cargoEl.textContent = (selected?.title)
                ? (selected.sub ? `${selected.title} · ${selected.sub}` : selected.title)
                : 'Militar DME';
        }

        /* Admin */
        const admins = JSON.parse(localStorage.getItem('dme_admins') || 'null') || [];
        if (admins.includes(username)) {
            const painel = document.getElementById('dropdownPainel');
            if (painel) painel.style.display = 'flex';
        }

        /* Sidebar */
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('mobileSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('sidebarClose');
        if (hamburger && sidebar && overlay) {
            const toggle = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
            hamburger.addEventListener('click', toggle);
            if (closeBtn) closeBtn.addEventListener('click', toggle);
            overlay.addEventListener('click', toggle);
        }

        /* Dropdown */
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');
        if (userProfileBtn && userDropdown) {
            userProfileBtn.addEventListener('click', e => { e.stopPropagation(); userDropdown.classList.toggle('active'); });
            document.addEventListener('click', () => userDropdown.classList.remove('active'));
        }

        renderList();

        /* Busca em tempo real */
        const searchInput = document.getElementById('funcaoSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                renderList(this.value.trim());
            });
        }
    });
})();
