(function () {
    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = 'login.html'; return; }

    let orgao = null;

    // Funções auxiliares
    const getElement = (id) => document.getElementById(id);
    const getOrgaoAtual = () => {
        try { return JSON.parse(localStorage.getItem('dme_orgao_atual') || 'null'); }
        catch (_) { return null; }
    };

    const getOrgaoData = (id) => {
        const all = JSON.parse(localStorage.getItem('dme_orgaos') || '{}');
        if (!all[id]) {
            all[id] = { lider: null, viceLider: null, tarefas: [], membros: [], cargos: [] };
            localStorage.setItem('dme_orgaos', JSON.stringify(all));
        }
        return all[id];
    };

    const saveOrgaoData = (id, data) => {
        const all = JSON.parse(localStorage.getItem('dme_orgaos') || '{}');
        all[id] = data;
        localStorage.setItem('dme_orgaos', JSON.stringify(all));
    };

    const isLiderOuVice = () => {
        if (!orgao) return false;
        const d = getOrgaoData(orgao.id);
        return d.lider === username || d.viceLider === username;
    };



    // Gerenciamento de Usuário
    function logout() {
        localStorage.removeItem('dme_username');
        window.location.href = 'login.html';
    }

    // Carregamento de Dados
    function loadOrgao() {
        orgao = getOrgaoAtual();
        if (!orgao) {
            getElement('orgaoTitle').textContent = 'Nenhum Órgão Selecionado';
            getElement('orgaoSub').textContent = 'Volte ao Centro de Tarefas';
            return;
        }

        const d = getOrgaoData(orgao.id);
        getElement('orgaoTitle').textContent = orgao.title;
        getElement('orgaoSub').textContent = orgao.sub || 'Gerenciamento';
        getElement('orgaoIcon').textContent = orgao.icon || '🏛️';

        const h = [];
        if (d.lider) h.push(`<div class="cargo-badge lider"><span class="cargo-label">Líder</span><span class="cargo-name">${d.lider}</span></div>`);
        if (d.viceLider) h.push(`<div class="cargo-badge vice"><span class="cargo-label">Vice</span><span class="cargo-name">${d.viceLider}</span></div>`);
        getElement('hierarquia').innerHTML = h.join('');

        if (isLiderOuVice()) {
            getElement('btnConfig').style.display = 'block';
            getElement('btnAddTask').style.display = 'block';
            getElement('btnAddCargo').style.display = 'block';
        }

        loadTasks();
        loadMembros();
        loadCargos();
    }

    function loadTasks() {
        if (!orgao) return;
        const d = getOrgaoData(orgao.id);
        const container = getElement('tasksList');

        if (d.tarefas.length === 0) {
            container.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">📋</div><div>Nenhuma tarefa criada</div></div>';
            return;
        }

        container.innerHTML = d.tarefas.map(t => `
            <div class="task-card" data-id="${t.id}">
                <div class="task-icon">${t.icon}</div>
                <div class="task-title">${t.titulo}</div>
                <div class="task-desc">${t.descricao}</div>
            </div>
        `).join('');

        // Reattach event listeners to new elements
        container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', () => runTask(card.dataset.id));
        });
    }

    function runTask(id) {
        const d = getOrgaoData(orgao.id);
        const t = d.tarefas.find(x => x.id === id);
        if (t) alert(`🎯 ${t.titulo}\n\n${t.descricao}\n\n(Em desenvolvimento)`);
    }

    function saveTask() {
        const icon = getElement('taskIcon').value.trim() || '📝';
        const titulo = getElement('taskTitle').value.trim();
        const descricao = getElement('taskDesc').value.trim();

        if (!titulo) { alert('❌ Digite um título!'); return; }

        const d = getOrgaoData(orgao.id);
        d.tarefas.push({ id: Date.now().toString(), icon, titulo, descricao, autor: username });
        saveOrgaoData(orgao.id, d);

        closeModal('modalTask');
        loadTasks();

        getElement('taskIcon').value = '';
        getElement('taskTitle').value = '';
        getElement('taskDesc').value = '';
    }

    function loadMembros() {
        if (!orgao) return;
        const d = getOrgaoData(orgao.id);
        const m = [];
        if (d.lider) m.push({ nick: d.lider, cargo: 'Líder' });
        if (d.viceLider) m.push({ nick: d.viceLider, cargo: 'Vice-Líder' });
        m.push(...d.membros);

        const container = getElement('membrosList');
        if (m.length === 0) {
            container.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">👥</div><div>Nenhum membro</div></div>';
            return;
        }

        container.innerHTML = m.map(x => `
            <div class="membro-card">
                <div class="membro-avatar">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${x.nick}&size=m&direction=2&head_direction=2&gesture=std" alt="">
                </div>
                <div class="membro-name">${x.nick}</div>
                <div class="membro-cargo">${x.cargo}</div>
            </div>
        `).join('');
    }

    function loadCargos() {
        if (!orgao) return;
        const d = getOrgaoData(orgao.id);
        const fixos = [
            { nome: 'Líder', nivel: 'Gestão', usuario: d.lider || 'Vago' },
            { nome: 'Vice-Líder', nivel: 'Gestão', usuario: d.viceLider || 'Vago' }
        ];
        const todos = [...fixos, ...d.cargos];

        const container = getElement('cargosList');
        if (todos.length === 0) {
            container.innerHTML = '<div class="empty"><div class="empty-icon">🎖️</div><div>Nenhum cargo</div></div>';
            return;
        }

        container.innerHTML = todos.map(x => `
            <div class="cargo-item">
                <div>
                    <div class="cargo-info-title">${x.nome}</div>
                    <div class="cargo-info-sub">${x.nivel}</div>
                </div>
                <div class="cargo-usuario">${x.usuario || '-'}</div>
            </div>
        `).join('');
    }

    function saveCargo() {
        const nome = getElement('cargoNome').value.trim();
        const nivel = getElement('cargoNivel').value;

        if (!nome) { alert('❌ Digite um nome!'); return; }

        const d = getOrgaoData(orgao.id);
        d.cargos.push({ id: Date.now().toString(), nome, nivel, usuario: null });
        saveOrgaoData(orgao.id, d);

        closeModal('modalCargo');
        loadCargos();
        getElement('cargoNome').value = '';
    }

    function closeModal(id) {
        getElement(id).classList.remove('active');
    }

    function mudarAba(t) {
        document.querySelectorAll('.tab-content').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        getElement('tab-' + t).classList.add('active');
        document.querySelector(`.tab[data-tab="${t}"]`).classList.add('active');
    }

    // Inicialização e Event Listeners
    document.addEventListener('DOMContentLoaded', () => {
        window.applyTheme(localStorage.getItem('dme_theme') || 'dark');

        getElement('navUserName').textContent = username;
        getElement('dropdownName').textContent = username;
        getElement('navUserImage').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std&head_direction=2`;
        getElement('dropdownUserImage').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&size=m&direction=2&head_direction=2&gesture=std`;

        const o = getOrgaoAtual();
        if (o) getElement('dropdownCargo').textContent = o.sub ? `${o.title} · ${o.sub}` : o.title;

        // Menu Toggle
        const toggleSidebar = () => {
            getElement('sidebar').classList.toggle('active');
            getElement('sidebarOverlay').classList.toggle('active');
        };
        getElement('hamburger').addEventListener('click', toggleSidebar);
        getElement('sidebarClose').addEventListener('click', toggleSidebar);
        getElement('sidebarOverlay').addEventListener('click', toggleSidebar);

        // User Dropdown
        const btn = getElement('userProfileBtn');
        const dd = getElement('userDropdown');
        btn.addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('active'); });
        document.addEventListener('click', () => dd.classList.remove('active'));

        // Theme Toggle
        document.querySelector('a[onclick="toggleTheme()"]')?.removeAttribute('onclick');
        document.getElementById('themeText').parentElement.addEventListener('click', window.toggleTheme);

        // Logout
        document.querySelector('a[onclick="logout()"]')?.removeAttribute('onclick');
        document.querySelector('.dropdown-item.danger').addEventListener('click', logout);

        // Tabs
        document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => mudarAba(t.getAttribute('data-tab'))));

        // Modais e Botões
        getElement('btnConfig')?.addEventListener('click', function () {
            if (!isLiderOuVice()) { alert('⚠️ Apenas Líder/Vice podem gerenciar.'); return; }
            const d = getOrgaoData(orgao.id);
            const l = prompt('👤 Líder (nickname):', d.lider || '');
            if (l === null) return;
            const v = prompt('👤 Vice-Líder (nickname):', d.viceLider || '');
            if (v === null) return;
            d.lider = l.trim() || null;
            d.viceLider = v.trim() || null;
            saveOrgaoData(orgao.id, d);
            alert('✅ Hierarquia atualizada!');
            loadOrgao();
        });

        getElement('btnAddTask')?.addEventListener('click', () => getElement('modalTask').classList.add('active'));
        getElement('btnAddCargo')?.addEventListener('click', () => getElement('modalCargo').classList.add('active'));

        document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => {
            if (e.target === o) o.classList.remove('active');
        }));

        // Botões de Salvar/Cancelar Modais
        // Remove onlicks do HTML e adiciona listeners aqui
        const btnSaveTask = document.querySelector('#modalTask .btn-save');
        if (btnSaveTask) btnSaveTask.addEventListener('click', saveTask);

        const btnCancelTask = document.querySelector('#modalTask .btn-cancel');
        if (btnCancelTask) btnCancelTask.addEventListener('click', () => closeModal('modalTask'));

        const btnSaveCargo = document.querySelector('#modalCargo .btn-save');
        if (btnSaveCargo) btnSaveCargo.addEventListener('click', saveCargo);

        const btnCancelCargo = document.querySelector('#modalCargo .btn-cancel');
        if (btnCancelCargo) btnCancelCargo.addEventListener('click', () => closeModal('modalCargo'));

        loadOrgao();
    });
})();
