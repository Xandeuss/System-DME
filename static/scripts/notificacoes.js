(function () {
    const NOTIF_KEY_PREFIX = 'dme_notificacoes_';
    const currentUser = localStorage.getItem('dme_username');
    if (!currentUser) return;

    function injetarEstilos() {
        // Redundantes, agora usamos .btn-circle do global.css + os específicos de dropdown
        if (document.getElementById('notif-styles')) return;
        const style = document.createElement('style');
        style.id = 'notif-styles';
        style.textContent = `
            .notif-bell-wrapper { position: relative; }
            .notif-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 340px; max-height: 400px; background: var(--bg-card, #0a0f0a); border: 1px solid var(--border-color, #1a2a1a); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.3s ease; z-index: 2000; display: flex; flex-direction: column; }
            .notif-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }
            .notif-dropdown-header { padding: 14px 16px; border-bottom: 1px solid var(--border-color, #1a2a1a); display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem; color: var(--text-white, #fff); }
            .notif-clear-btn { background: none; border: none; color: var(--text-gray, #8c9c8c); font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: color 0.2s; }
            .notif-clear-btn:hover { color: #e74c3c; }
            .notif-dropdown-body { overflow-y: auto; max-height: 330px; padding: 6px; }
            .notif-empty { text-align: center; padding: 30px 10px; color: var(--text-gray, #8c9c8c); font-size: 0.85rem; }
            .notif-item { padding: 12px; border-radius: 8px; margin-bottom: 4px; transition: background 0.2s; border-left: 3px solid transparent; }
            .notif-item:hover { background: var(--hover-bg, #0f1a0f); }
            .notif-item.notif-unread { border-left-color: #e74c3c; background: rgba(231,76,60,0.05); }
            .notif-item-title { font-size: 0.8rem; font-weight: 700; color: #e74c3c; margin-bottom: 3px; }
            .notif-item-msg { font-size: 0.82rem; color: var(--text-white, #fff); line-height: 1.4; }
            .notif-item-time { font-size: 0.7rem; color: var(--text-gray, #8c9c8c); margin-top: 4px; }
            @media (max-width: 480px) { .notif-dropdown { width: 290px; right: -60px; } }
        `;
        document.head.appendChild(style);
    }

    function getNotifKey() {
        return NOTIF_KEY_PREFIX + currentUser;
    }

    function getNotificacoes() {
        return JSON.parse(localStorage.getItem(getNotifKey()) || '[]');
    }

    function salvarNotificacoes(notifs) {
        localStorage.setItem(getNotifKey(), JSON.stringify(notifs));
    }

    function contarNaoLidas() {
        return getNotificacoes().filter(n => !n.lida).length;
    }

    function injetarSinoNaNavbar() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        const bellWrapper = document.createElement('div');
        bellWrapper.className = 'notif-bell-wrapper';
        bellWrapper.id = 'notifBellWrapper';
        bellWrapper.innerHTML = `
            <button class="btn-circle" id="notifBellBtn" title="Central de Alertas">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span class="badge-dot" id="notifBadge" style="display:none;">0</span>
            </button>
            <div class="notif-dropdown" id="notifDropdown">
                <div class="notif-dropdown-header">
                    <span>Central de Alertas</span>
                    <button class="notif-clear-btn" id="notifClearBtn" title="Limpar tudo">Limpar</button>
                </div>
                <div class="notif-dropdown-body" id="notifDropdownBody">
                    <div class="notif-empty">Nenhuma notificacao.</div>
                </div>
            </div>
        `;

        const userProfile = navActions.querySelector('.user-profile');
        if (userProfile) {
            navActions.insertBefore(bellWrapper, userProfile);
        } else {
            navActions.appendChild(bellWrapper);
        }

        document.getElementById('notifBellBtn').addEventListener('click', function (e) {
            e.stopPropagation();
            const dd = document.getElementById('notifDropdown');
            dd.classList.toggle('active');

            if (dd.classList.contains('active')) {
                marcarTodasComoLidas();
            }
        });

        document.addEventListener('click', function (e) {
            const wrapper = document.getElementById('notifBellWrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                document.getElementById('notifDropdown').classList.remove('active');
            }
        });

        document.getElementById('notifClearBtn').addEventListener('click', function (e) {
            e.stopPropagation();
            salvarNotificacoes([]);
            renderNotificacoes();
        });

        renderNotificacoes();
    }

    function marcarTodasComoLidas() {
        const notifs = getNotificacoes();
        let changed = false;
        notifs.forEach(n => {
            if (!n.lida) { n.lida = true; changed = true; }
        });
        if (changed) {
            salvarNotificacoes(notifs);
            atualizarBadge();
        }
    }

    function atualizarBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        const count = contarNaoLidas();
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function renderNotificacoes() {
        const body = document.getElementById('notifDropdownBody');
        if (!body) return;

        const notifs = getNotificacoes();
        atualizarBadge();

        if (notifs.length === 0) {
            body.innerHTML = '<div class="notif-empty">Nenhuma notificacao.</div>';
            return;
        }

        const sorted = [...notifs].reverse();
        body.innerHTML = sorted.map(n => {
            const data = new Date(n.timestamp);
            const hora = data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="notif-item ${n.lida ? '' : 'notif-unread'}">
                    <div class="notif-item-title">Alerta Turno</div>
                    <div class="notif-item-msg">${n.mensagem}</div>
                    <div class="notif-item-time">${hora}</div>
                </div>
            `;
        }).join('');
    }

    window.addEventListener('storage', function (e) {
        if (e.key === getNotifKey()) {
            renderNotificacoes();
        }
    });

    window.criarNotificacaoTurno = function (targetUser, mensagem) {
        const key = NOTIF_KEY_PREFIX + targetUser;
        const notifs = JSON.parse(localStorage.getItem(key) || '[]');
        notifs.push({
            id: '_' + Math.random().toString(36).substr(2, 9),
            mensagem: mensagem,
            timestamp: new Date().toISOString(),
            lida: false
        });
        localStorage.setItem(key, JSON.stringify(notifs));

        if (targetUser === currentUser) {
            renderNotificacoes();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { injetarEstilos(); injetarSinoNaNavbar(); });
    } else {
        injetarEstilos();
        injetarSinoNaNavbar();
    }
})();
