const usuarioLogado = localStorage.getItem('dme_username');
if (!usuarioLogado) window.location.href = 'login.html';

const STORAGE_KEY = 'dme_recrutamentos';
const PER_PAGE = 10;

let abaAtual = 'aplicar';
let paginaAtual = 1;
let indexModal = -1;

function getRecrutamentos() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function salvarRecrutamentos(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function isAdmin() {
    const admins = JSON.parse(localStorage.getItem('dme_admins')) || [];
    const cargosPermitidos = JSON.parse(localStorage.getItem('dme_cargos_recrutamento')) || [];
    const userCargo = localStorage.getItem('dme_cargo_' + usuarioLogado) || '';
    return admins.includes(usuarioLogado) || cargosPermitidos.includes(userCargo);
}

function logout() {
    localStorage.removeItem('dme_username');
    window.location.href = 'login.html';
}

function applyTheme(theme) {
    const themeText = document.getElementById('themeText');
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        if (themeText) themeText.textContent = 'Modo Escuro';
    } else {
        document.body.classList.remove('light-mode');
        if (themeText) themeText.textContent = 'Modo Claro';
    }
}

function toggleTheme() {
    const current = localStorage.getItem('dme_theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('dme_theme', next);
    applyTheme(next);
}

function mudarAba(aba) {
    abaAtual = aba;
    paginaAtual = 1;

    document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sidebar-nav-btn[data-aba="${aba}"]`).classList.add('active');

    document.getElementById('area-aplicar').style.display = aba === 'aplicar' ? 'block' : 'none';
    document.getElementById('area-lista').style.display = aba === 'todos' ? 'block' : 'none';

    if (aba === 'todos') renderLista();
}

function salvarRecrutamento() {
    const recrutas = document.getElementById('input-recrutas').value.trim();
    const print = document.getElementById('input-print').value.trim();

    if (!recrutas) {
        alert('Preencha os recrutas!');
        return;
    }

    const lista = getRecrutamentos();
    const nextId = lista.length > 0 ? Math.max(...lista.map(r => r.id || 0)) + 1 : 1;

    lista.push({
        id: nextId,
        aplicador: usuarioLogado,
        recrutas: recrutas,
        print: print,
        dataHora: new Date().toLocaleString('pt-BR'),
        timestamp: Date.now(),
        status: 'pendente'
    });

    salvarRecrutamentos(lista);
    alert('Recrutamento salvo com sucesso!');

    document.getElementById('input-recrutas').value = '';
    document.getElementById('input-print').value = '';

    mudarAba('todos');
}

function renderLista() {
    const lista = getRecrutamentos();
    const filtro = (document.getElementById('filtro-lista')?.value || '').toLowerCase();

    let filtrados = lista.filter(r => {
        const texto = `${r.id} ${r.aplicador} ${r.status}`.toLowerCase();
        return texto.includes(filtro);
    });

    filtrados.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const totalPages = Math.max(1, Math.ceil(filtrados.length / PER_PAGE));
    if (paginaAtual > totalPages) paginaAtual = totalPages;

    const start = (paginaAtual - 1) * PER_PAGE;
    const pagina = filtrados.slice(start, start + PER_PAGE);

    const tbody = document.getElementById('tbody-lista');
    const paginacao = document.getElementById('paginacao');

    if (pagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">---</div>Nenhum recrutamento encontrado</div></td></tr>`;
        paginacao.innerHTML = '';
        return;
    }

    tbody.innerHTML = pagina.map(r => {
        const badgeClass = r.status === 'aprovado' ? 'badge-aprovado' : r.status === 'reprovado' ? 'badge-reprovado' : 'badge-pendente';
        const statusLabel = r.status.charAt(0).toUpperCase() + r.status.slice(1);
        const realIndex = lista.indexOf(r);

        return `
            <tr>
                <td>${r.id}</td>
                <td>${r.aplicador}</td>
                <td><span class="badge-status ${badgeClass}">${statusLabel}</span></td>
                <td><button class="btn-ver" onclick="abrirModal(${realIndex})">Ver</button></td>
            </tr>
        `;
    }).join('');

    paginacao.innerHTML = `
        <button onclick="mudarPagina(-1)" ${paginaAtual <= 1 ? 'disabled' : ''}>&laquo;</button>
        <span>${paginaAtual} de ${totalPages} Paginas</span>
        <button onclick="mudarPagina(1)" ${paginaAtual >= totalPages ? 'disabled' : ''}>&raquo;</button>
    `;
}

function mudarPagina(dir) {
    paginaAtual += dir;
    renderLista();
}

function abrirModal(index) {
    const lista = getRecrutamentos();
    const rec = lista[index];
    if (!rec) return;

    indexModal = index;

    document.getElementById('modal-titulo-text').textContent = 'Ver Recrutamento';
    document.getElementById('modal-status-badge').textContent = rec.status.charAt(0).toUpperCase() + rec.status.slice(1);
    document.getElementById('modal-status-badge').className = 'badge-status ' +
        (rec.status === 'aprovado' ? 'badge-aprovado' : rec.status === 'reprovado' ? 'badge-reprovado' : 'badge-pendente');

    document.getElementById('modal-aplicador').value = rec.aplicador;
    document.getElementById('modal-print').value = rec.print || '';
    document.getElementById('modal-datahora').value = rec.dataHora || '';

    const tagsContainer = document.getElementById('modal-recrutas-tags');
    const recrutas = rec.recrutas.split('\n').map(r => r.trim()).filter(Boolean);
    tagsContainer.innerHTML = recrutas.map(r => `<span class="recruta-tag">${r}</span>`).join('');

    const adminActions = document.getElementById('modal-admin-actions');
    if (isAdmin()) {
        adminActions.style.display = 'flex';
    } else {
        adminActions.style.display = 'none';
    }

    document.getElementById('modal-recrutamento').classList.add('active');
}

function fecharModal() {
    document.getElementById('modal-recrutamento').classList.remove('active');
    indexModal = -1;
}

function acaoAdmin(acao) {
    if (indexModal === -1) return;
    const lista = getRecrutamentos();
    const rec = lista[indexModal];

    if (acao === 'aprovar') {
        if (!confirm('Confirmar aprovacao?')) return;
        rec.status = 'aprovado';
        rec.aprovador = usuarioLogado;
        rec.dataAprovacao = new Date().toLocaleString('pt-BR');
    } else if (acao === 'reprovar') {
        const motivo = prompt('Motivo da reprovacao:');
        if (!motivo) return;
        rec.status = 'reprovado';
        rec.reprovador = usuarioLogado;
        rec.motivoReprovacao = motivo;
        rec.dataReprovacao = new Date().toLocaleString('pt-BR');
    } else if (acao === 'editar') {
        const novosRecritas = prompt('Recrutas (um por linha, separados por virgula):', rec.recrutas.replace(/\n/g, ', '));
        if (novosRecritas === null) return;
        rec.recrutas = novosRecritas.replace(/, /g, '\n');
        const novoPrint = prompt('Link do print:', rec.print || '');
        if (novoPrint !== null) rec.print = novoPrint;
    } else if (acao === 'apagar') {
        if (!confirm('Confirmar exclusao? Acao irreversivel.')) return;
        lista.splice(indexModal, 1);
        salvarRecrutamentos(lista);
        fecharModal();
        renderLista();
        return;
    }

    lista[indexModal] = rec;
    salvarRecrutamentos(lista);
    alert('Acao realizada com sucesso!');
    fecharModal();
    renderLista();
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('dme_theme') || 'dark';
    applyTheme(savedTheme);

    document.getElementById('navUserName').textContent = usuarioLogado;
    document.getElementById('dropdownName').textContent = usuarioLogado;

    const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${usuarioLogado}&headonly=1&size=m&gesture=std&head_direction=2`;
    const dropdownAvatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${usuarioLogado}&size=m&direction=2&head_direction=2&gesture=std`;
    document.getElementById('navUserImage').src = avatarUrl;
    document.getElementById('dropdownUserImage').src = dropdownAvatarUrl;

    document.getElementById('input-aplicador').value = usuarioLogado;

    const admins = JSON.parse(localStorage.getItem('dme_admins')) || ["Xandelicado", "rafacv", "Ronaldo"];
    if (admins.includes(usuarioLogado)) {
        if (document.getElementById('dropdownPainel')) document.getElementById('dropdownPainel').style.display = 'flex';
        if (document.getElementById('dropdownDivider')) document.getElementById('dropdownDivider').style.display = 'block';
    }

    document.querySelectorAll('.sidebar-nav-btn[data-aba]').forEach(btn => {
        btn.addEventListener('click', function () {
            mudarAba(this.getAttribute('data-aba'));
        });
    });

    document.getElementById('btn-salvar-rec').addEventListener('click', salvarRecrutamento);

    const filtroInput = document.getElementById('filtro-lista');
    if (filtroInput) {
        filtroInput.addEventListener('input', () => {
            paginaAtual = 1;
            renderLista();
        });
    }

    const sidebarSearch = document.getElementById('sidebar-search');
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', () => {
            paginaAtual = 1;
            renderLista();
        });
    }

    // Sidebar toggle
    const hamburger = document.getElementById('hamburger');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');

    function toggleSidebar() {
        mobileSidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    if (hamburger) hamburger.addEventListener('click', toggleSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            mobileSidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    });

    // Profile dropdown
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userProfileBtn && userDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (userDropdown && !userProfileBtn.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // Modal close on backdrop
    document.getElementById('modal-recrutamento').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) fecharModal();
    });

    mudarAba('aplicar');
});
