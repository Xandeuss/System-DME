(function () {
    const username = localStorage.getItem('dme_username');
    if (!username) {
        window.location.href = 'login.html';
        return;
    }

    const ORGAOS = [
        { id: 'centro-instrucao', title: 'Centro de Instrução', sub: 'Ministro', icon: '🛡️' },
        { id: 'centro-treinamento', title: 'Centro de Treinamento', sub: '', icon: '🛡️' },
        { id: 'centro-supervisao', title: 'Centro de Supervisão', sub: '', icon: '🛡️' },
        { id: 'centro-patrulha', title: 'Centro de Patrulha', sub: '', icon: '🛡️' },
        { id: 'academia-agulhas-negras', title: 'Academia Militar das Agulhas Negras', sub: '', icon: '🦅' },
        { id: 'auditoria-fiscal', title: 'Auditoria Fiscal', sub: '', icon: '⚖️' },
        { id: 'academia-publicitaria', title: 'Academia Publicitária Militar', sub: '', icon: '📜' },
        { id: 'corpo-oficiais-gerais', title: 'Corpo de Oficiais Gerais', sub: '', icon: '⭐' },
        { id: 'centro-rh', title: 'Centro de Recursos Humanos', sub: '', icon: '👥' },
        { id: 'corpo-oficiais', title: 'Corpo de Oficiais', sub: 'Setor de Inteligência', icon: '🗡️' },
        { id: 'portadores-direitos', title: 'Portadores de Direitos', sub: '', icon: '🤝' },
        { id: 'comando-feminino', title: 'Comando Feminino', sub: '', icon: '♀️' },
        { id: 'ministerio-publico', title: 'Ministério Público', sub: '', icon: '⚖️' },
        { id: 'corregedoria', title: 'Corregedoria', sub: '', icon: '🦅' },
        { id: 'abi', title: 'Agência Brasileira de Inteligência', sub: '', icon: '🦅' },
        { id: 'goe', title: 'Grupamento de Operações Especiais', sub: 'Instrutores', icon: '💀' },
        { id: 'instrucao-inicial', title: 'Aplicar Instrução Inicial', sub: 'Instrutores', icon: '📖' },
        { id: 'af-dragonas', title: '[AF] Postagem de Dragonas', sub: '', icon: '🎖️' },
        { id: 'guerra-selva', title: 'Centro de Instrução Guerra na Selva', sub: '', icon: '🐆' },
        { id: 'cadetes', title: 'Cadetes', sub: '', icon: '🪖' },
        { id: 'normas-desligamentos', title: 'Centro de Normas e Desligamentos', sub: '', icon: '📄' },
        { id: 'agencia-eventos', title: 'Agência de Eventos', sub: 'Coordenador', icon: '📅' },
        { id: 'stm', title: 'Superior Tribunal Militar', sub: '', icon: '⚔️' }
    ];

    function logout() {
        localStorage.removeItem('dme_username');
        window.location.href = 'login.html';
    }

    // Theme functions moved to theme.js

    function getOrgaoSelecionado() {
        try {
            return JSON.parse(localStorage.getItem('dme_orgao_selecionado') || 'null');
        } catch (_) {
            return null;
        }
    }

    function setOrgaoSelecionado(orgao) {
        localStorage.setItem('dme_orgao_selecionado', JSON.stringify(orgao));
    }

    function renderList() {
        const list = document.getElementById('funcaoList');
        if (!list) return;
        const selected = getOrgaoSelecionado();
        const selectedId = selected && selected.id ? selected.id : null;
        list.innerHTML = ORGAOS.map(o => {
            const isSelected = selectedId === o.id;
            const subHtml = o.sub ? `<div class="funcao-item-sub">${o.sub}</div>` : '';
            return `
                <div class="funcao-item ${isSelected ? 'selected' : ''}" data-id="${o.id}" role="button" tabindex="0">
                    <div class="funcao-item-icon">${o.icon}</div>
                    <div class="funcao-item-text">
                        <div class="funcao-item-title">${o.title}</div>
                        ${subHtml}
                    </div>
                    <div class="funcao-item-check">✓</div>
                </div>`;
        }).join('');

        list.querySelectorAll('.funcao-item').forEach(el => {
            el.addEventListener('click', () => selecionarOrgao(el.getAttribute('data-id')));
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selecionarOrgao(el.getAttribute('data-id'));
                }
            });
        });
    }

    function selecionarOrgao(id) {
        const orgao = ORGAOS.find(o => o.id === id);
        if (!orgao) return;
        setOrgaoSelecionado({ id: orgao.id, title: orgao.title, sub: orgao.sub, icon: orgao.icon, desc: orgao.desc || '' });
        // Redirecionar para a página de detalhes do centro
        window.location.href = 'centro_detalhe.html';
    }


    document.addEventListener('DOMContentLoaded', () => {
        // Theme is handled globally by theme.js

        document.getElementById('navUserName').textContent = username;
        document.getElementById('dropdownName').textContent = username;
        const avatarHead = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std&head_direction=2`;
        const avatarFull = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&size=m&direction=2&head_direction=2&gesture=std`;
        document.getElementById('navUserImage').src = avatarHead;
        document.getElementById('dropdownUserImage').src = avatarFull;

        const selected = getOrgaoSelecionado();
        const cargoEl = document.getElementById('dropdownCargo');
        if (cargoEl) {
            if (selected && selected.title) {
                cargoEl.textContent = selected.sub ? selected.title + ' · ' + selected.sub : selected.title;
            } else {
                cargoEl.textContent = 'Militar DME';
            }
        }

        const admins = JSON.parse(localStorage.getItem('dme_admins')) || [];
        if (admins.includes(username)) {
            const painel = document.getElementById('dropdownPainel');
            if (painel) painel.style.display = 'flex';
            const divider = document.querySelector('.dropdown-divider');
            if (divider) divider.style.display = 'block';
        }

        // ── Sidebar logic ─────────────────────────
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('mobileSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('sidebarClose');

        if (hamburger && sidebar && overlay) {
            const toggle = () => {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            };
            hamburger.addEventListener('click', toggle);
            if (closeBtn) closeBtn.addEventListener('click', toggle);
            overlay.addEventListener('click', toggle);
        }

        // ── Dropdown logic ────────────────────────
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');
        if (userProfileBtn && userDropdown) {
            userProfileBtn.addEventListener('click', e => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });
            document.addEventListener('click', () => userDropdown.classList.remove('active'));
        }

        renderList();

        // ── Busca em tempo real ──────────────────────────
        const searchInput = document.getElementById('funcaoSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                const termo = this.value.toLowerCase().trim();
                document.querySelectorAll('.funcao-item').forEach(el => {
                    const title = el.querySelector('.funcao-item-title')?.textContent.toLowerCase() || '';
                    const sub = el.querySelector('.funcao-item-sub')?.textContent.toLowerCase() || '';
                    el.style.display = (title.includes(termo) || sub.includes(termo)) ? '' : 'none';
                });
            });
        }
    });
})();

