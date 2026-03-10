(function() {
    // Função para aplicar o tema
    window.applyTheme = function(theme) {
        const body = document.body;
        const themeText = document.getElementById('themeText');

        // Salvar preferência
        localStorage.setItem('dme_theme', theme);

        if (theme === 'light') {
            document.documentElement.classList.add('light-mode');
            if (body) body.classList.add('light-mode');
            if (themeText) themeText.textContent = 'Modo Escuro';
        } else {
            document.documentElement.classList.remove('light-mode');
            if (body) body.classList.remove('light-mode');
            if (themeText) themeText.textContent = 'Modo Claro';
        }
    };

    // Função de alternância chamada pelo botão
    window.toggleTheme = function() {
        const currentTheme = localStorage.getItem('dme_theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        window.applyTheme(newTheme);
    };

    // Inicialização imediata para evitar "flicker"
    const savedTheme = localStorage.getItem('dme_theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        // Body pode não estar pronto ainda, mas tentamos
        if (document.body) document.body.classList.add('light-mode');
    }

    // Inicialização quando o DOM estiver pronto (garante que body e elementos existam)
    document.addEventListener('DOMContentLoaded', () => {
        window.applyTheme(savedTheme);
    });
})();
