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
        chatBtn.className = 'chat-toggle-btn';
        chatBtn.id = 'chatToggleBtn';
        chatBtn.title = 'Chat Global DME';
        chatBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="chat-badge" id="chatBadge" style="display:none;">0</span>
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
        if (document.getElementById('chat-global-styles')) return;
        const style = document.createElement('style');
        style.id = 'chat-global-styles';
        style.textContent = `
            .chat-toggle-btn { 
                background: var(--bg-3); 
                border: 1px solid var(--b2); 
                border-radius: 50%; 
                width: 38px; 
                height: 38px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                cursor: pointer; 
                color: var(--t2); 
                transition: all 0.3s ease; 
                position: relative; 
                text-decoration: none;
                margin-right: 8px;
            }
            .chat-toggle-btn:hover { 
                color: var(--green); 
                border-color: var(--green); 
                background: var(--green-muted);
                transform: translateY(-2px);
            }
            .chat-toggle-btn svg { width: 20px; height: 20px; }
            .chat-badge { 
                position: absolute; 
                top: -4px; 
                right: -4px; 
                background: var(--green); 
                color: #fff; 
                font-size: 0.65rem; 
                font-weight: 700; 
                min-width: 18px; 
                height: 18px; 
                border-radius: 9px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                padding: 0 4px; 
                line-height: 1; 
                border: 2px solid var(--bg-1);
            }
        `;
        document.head.appendChild(style);
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
