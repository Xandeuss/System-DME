(function () {
            const theme = localStorage.getItem('dme_theme') || 'dark';
            if (theme === 'light') document.documentElement.classList.add('light-mode');
        })();

// Auth Guard
        const username = localStorage.getItem('dme_username');
        if (!username) {
            window.location.href = 'login.html';
        }

        function logout() {
            localStorage.removeItem('dme_username');
            window.location.href = 'login.html';
        }

        // Theme Management
        function applyTheme(theme) {
            const body = document.body;
            const themeText = document.getElementById('themeText');

            if (theme === 'light') {
                body.classList.add('light-mode');
                if (themeText) themeText.textContent = 'Modo Escuro';
            } else {
                body.classList.remove('light-mode');
                if (themeText) themeText.textContent = 'Modo Claro';
            }
        }

        function toggleTheme() {
            const currentTheme = localStorage.getItem('dme_theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('dme_theme', newTheme);
            applyTheme(newTheme);
        }

        // Initialize theme
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('dme_theme') || 'dark';
            applyTheme(savedTheme);
        });

        document.getElementById('navUserName').textContent = username;
        document.getElementById('welcomeUser').textContent = username;

        const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${username}&headonly=1&size=m&gesture=std&head_direction=2`;
        const dropdownAvatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${username}&size=m&direction=2&head_direction=2&gesture=std`;
        document.getElementById('navUserImage').src = avatarUrl;
        document.getElementById('dropdownUserImage').src = dropdownAvatarUrl;
        document.getElementById('dropdownName').textContent = username;
        document.getElementById('userAvatarImg').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${username}&direction=4&head_direction=4&size=l&action=wav`;

        // Sistema de Admins
        let admins = JSON.parse(localStorage.getItem('dme_admins')) || [username];
        const isAdmin = admins.includes(username);

        if (isAdmin) {
            document.getElementById('dropdownPainel').style.display = 'flex';
            document.getElementById('dropdownDivider').style.display = 'block';
        }

        // Sidebar Toggle
        const hamburger = document.getElementById('hamburger');
        const mobileSidebar = document.getElementById('mobileSidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebarClose = document.getElementById('sidebarClose');

        function toggleSidebar() {
            mobileSidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        }

        hamburger.addEventListener('click', toggleSidebar);
        sidebarClose.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);

        // Dropdown Toggle
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');

        userProfileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function (e) {
            if (!userProfileBtn.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });

        // Prevenir que cliques dentro do dropdown o fechem
        userDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        // BUSCA RÁPIDA
        document.getElementById('btnSearch').addEventListener('click', buscarMilitar);
        document.getElementById('searchInput').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') buscarMilitar();
        });

        function buscarMilitar() {
            const nick = document.getElementById('searchInput').value.trim();

            if (nick.length < 3) {
                alert('Digite pelo menos 3 caracteres');
                return;
            }

            const dadosMilitar = JSON.parse(localStorage.getItem('dme_militar')) || [];
            const dadosEmpresarial = JSON.parse(localStorage.getItem('dme_empresarial')) || [];
            const historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];

            const encontradoMilitar = dadosMilitar.find(m => m.nick.toLowerCase() === nick.toLowerCase());
            const encontradoEmpresarial = dadosEmpresarial.find(m => m.nick.toLowerCase() === nick.toLowerCase());

            const resultado = document.getElementById('searchResult');

            if (encontradoMilitar || encontradoEmpresarial) {
                const dados = encontradoMilitar || encontradoEmpresarial;
                const corpo = encontradoMilitar ? 'militar' : 'empresarial';

                const acoesUsuario = historico.filter(h =>
                    h.militar && h.militar.toLowerCase() === nick.toLowerCase()
                ).length;

                document.getElementById('resultAvatar').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${dados.nick}&size=m&direction=2&head_direction=2`;
                document.getElementById('resultNick').textContent = dados.nick;
                document.getElementById('resultCorpo').textContent = corpo === 'militar' ? 'Corpo Militar' : 'Corpo Empresarial';
                document.getElementById('resultPatente').textContent = dados.patente;
                document.getElementById('resultStatus').textContent = 'Ativo';
                document.getElementById('resultCorpoFull').textContent = corpo === 'militar' ? 'Militar' : 'Empresarial';
                document.getElementById('resultAcoes').textContent = acoesUsuario + ' registros';

                resultado.style.display = 'block';
            } else {
                alert('Militar não encontrado nas listas!');
                resultado.style.display = 'none';
            }
        }