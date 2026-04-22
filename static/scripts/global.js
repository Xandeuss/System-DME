/**
 * GLOBAL.JS — DME System v2
 * Gerencia estado global do usuário, Navbar, Sidebar e Acessos (RBAC).
 */

(function() {
    let currentUser = null;

    // Helpers
    const avFull = (nick) => `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=2&head_direction=2&size=m&gesture=std`;
    
    async function apiFetch(url) {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (res.status === 401) {
            window.location.href = '/login';
            return null;
        }
        return res.ok ? await res.json() : null;
    }

    async function initUser() {
        currentUser = await apiFetch('/api/auth/me');
        if (!currentUser) return;

        window.dmeUser = currentUser;
        updateUI();
    }

    function updateUI() {
        const username = currentUser.nick;
        
        // Navbar / Dropdown
        const nameEls = ['navUserName', 'dropdownName'];
        nameEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = username;
        });

        const imgEls = ['navUserImage', 'dropdownUserImage'];
        imgEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = avFull(username);
        });

        const cargoEl = document.getElementById('dropdownCargo');
        if (cargoEl) cargoEl.textContent = currentUser.patente || 'Militar DME';

        // Role-based display (Admin)
        if (currentUser.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
            const painel = document.getElementById('dropdownPainel');
            if (painel) painel.style.display = 'flex';
            const divider = document.getElementById('dropdownDivider');
            if (divider) divider.style.display = 'block';
        }

        // Centro-based display
        if (currentUser.centros && currentUser.centros.length > 0) {
            currentUser.centros.forEach(c => {
                // Mostra itens que pertencem a este centro
                document.querySelectorAll(`.centro-${c}`).forEach(el => el.style.display = 'flex');
            });
        }
    }

    // Sidebar Toggle
    function initMenus() {
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

        // User Dropdown
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');
        if (userProfileBtn && userDropdown) {
            userProfileBtn.addEventListener('click', e => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });
            document.addEventListener('click', () => userDropdown.classList.remove('active'));
        }
    }

    window.logout = async function() {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        window.location.href = '/login';
    };

    document.addEventListener('DOMContentLoaded', () => {
        initMenus();
        initUser();
    });
})();
