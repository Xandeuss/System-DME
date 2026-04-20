(function () {
    // Aguarda o home.js (ou qualquer página) definir window.dmeCurrentUser
    let retries = 0;

    function tryInit() {
        const currentUser = window.dmeCurrentUser || null;
        if (!currentUser) {
            retries++;
            if (retries < 25) { setTimeout(tryInit, 200); return; }
            return;
        }
        injetarBotaoChat();
    }

    function injetarBotaoChat() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
