(function () {
    const currentUser = localStorage.getItem('dme_username');
    if (!currentUser) return;

    function injetarBotaoChat() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        // Evita duplicatas
        if (document.getElementById('chatToggleBtn')) return;

        const chatBtn = document.createElement('a');
        chatBtn.href = '/chat';
        chatBtn.className = 'btn-circle';
        chatBtn.id = 'chatToggleBtn';
        chatBtn.title = 'Chat Global DME';
        chatBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="badge-dot" id="chatBadge" style="display:none;">0</span>
        `;

        // Inserir antes das notificações (se houver) ou antes do perfil
        const notifBell = document.getElementById('notifBellWrapper');
        const userProfile = navActions.querySelector('.user-profile');

        if (notifBell) {
            navActions.insertBefore(chatBtn, notifBell);
        } else if (userProfile) {
            navActions.insertBefore(chatBtn, userProfile);
        } else {
            navActions.appendChild(chatBtn);
        }
    }

    function injetarEstilosExtra() {
        // Redundantes, agora usamos .btn-circle do global.css
    }

    // Inicialização
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injetarEstilosExtra();
            injetarBotaoChat();
        });
    } else {
        injetarEstilosExtra();
        injetarBotaoChat();
    }
})();
