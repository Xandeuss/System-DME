(function() {
    // ── Aplicar tema ─────────────────────────────────────────────────────────
    window.applyTheme = function(theme) {
        const html = document.documentElement;
        const body = document.body;
        const themeText = document.getElementById('themeText');

        localStorage.setItem('dme_theme', theme);

        if (theme === 'light') {
            html.classList.add('light-mode');
            if (body) body.classList.add('light-mode');
            if (themeText) themeText.textContent = 'Modo Escuro';
        } else {
            html.classList.remove('light-mode');
            if (body) body.classList.remove('light-mode');
            if (themeText) themeText.textContent = 'Modo Claro';
        }
    };

    // ── Alternar tema (chamado pelo botão) ───────────────────────────────────
    window.toggleTheme = function() {
        const current = localStorage.getItem('dme_theme') || 'dark';
        window.applyTheme(current === 'dark' ? 'light' : 'dark');
    };

    // ── Aplicar imediatamente para evitar flash ──────────────────────────────
    // Adiciona transição suave ANTES de aplicar a classe para não piscar no carregamento
    const saved = localStorage.getItem('dme_theme') || 'dark';

    if (saved === 'light') {
        // Aplicar no html ANTES do body existir (evita o "flash" de tema escuro)
        document.documentElement.classList.add('light-mode');
    }

    // ── Adicionar transição de cores após o carregamento ─────────────────────
    // Só ativa a transição depois do primeiro paint para evitar animação no carregamento
    document.addEventListener('DOMContentLoaded', () => {
        window.applyTheme(saved);

        // Adicionar CSS de transição suave via style tag (somente após DOM pronto)
        const style = document.createElement('style');
        style.textContent = `
            body, .navbar, .panel, .g-panel, .g-input, .g-select, .g-textarea,
            .user-dropdown, .mobile-sidebar, .g-modal, .rank-item, .sc-row,
            .perfil-card, .perfil-header, .hist-item, .tab-btn, .noticia {
                transition: background-color 0.25s ease, border-color 0.25s ease, color 0.15s ease, box-shadow 0.25s ease !important;
            }
        `;
        document.head.appendChild(style);
    });
})();
