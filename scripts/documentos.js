// Configurações e Estado
const CONFIG = {
    key: 'dme_documentos',
    categorias: [
        { id: 'triplice', titulo: 'Tríplice Documental', icon: '⚖️' },
        { id: 'apendices', titulo: 'Apêndices', icon: '📎' },
        { id: 'portarias', titulo: 'Portarias', icon: '📜' },
        { id: 'tutoriais', titulo: 'Tutoriais', icon: '📚' }
    ]
};

let docsData = { categorias: [] };
let currentDocId = null;
let currentUser = localStorage.getItem('dme_username');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderSidebar();
    checkAdminPermissions();
    setupMobileSidebar();
    loadUserProfile(); // Carrega avatar e nome
});

function loadUserProfile() {
    const user = localStorage.getItem('dme_username');
    if (user) {
        // Navbar
        document.getElementById('navUserName').textContent = user;
        const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${user}&direction=3&head_direction=3&gesture=sml&action=std`;
        document.getElementById('navUserImage').src = avatarUrl;

        // Dropdown
        document.getElementById('dropdownName').textContent = user;
        document.getElementById('dropdownUserImage').src = avatarUrl;

        // Painel link (se admin)
        const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');
        if (admins.includes(user) || ['Xandelicado', 'rafacv', 'Ronaldo'].includes(user)) {
            document.getElementById('dropdownPainel').style.display = 'block';
        }
    } else {
        window.location.href = 'login.html'; // Redireciona se não logado
    }

    // Toggle do dropdown
    const btn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('userDropdown');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.visibility = dropdown.style.visibility === 'visible' ? 'hidden' : 'visible';
        dropdown.style.opacity = dropdown.style.opacity === '1' ? '0' : '1';
    });

    document.addEventListener('click', () => {
        dropdown.style.visibility = 'hidden';
        dropdown.style.opacity = '0';
    });
}


// --- Gerenciamento de Dados ---

function loadData() {
    const saved = localStorage.getItem(CONFIG.key);
    if (saved) {
        docsData = JSON.parse(saved);
        // Migração simples caso novas categorias sejam adicionadas no código
        CONFIG.categorias.forEach(catDefault => {
            if (!docsData.categorias.find(c => c.id === catDefault.id)) {
                docsData.categorias.push({ ...catDefault, documentos: [] });
            }
        });
    } else {
        // Dados Iniciais
        docsData.categorias = CONFIG.categorias.map(c => ({ ...c, documentos: [] }));

        // Exemplo inicial
        docsData.categorias[0].documentos.push({
            id: generateId(),
            titulo: 'Código de Conduta Militar',
            autor: 'Sistema',
            data: new Date().toLocaleDateString('pt-BR'),
            conteudo: '[b]Bem-vindo ao Código de Conduta![/b]\n\nEste é um exemplo de documento. [i]Edite-o para começar.[/i]'
        });
        saveData();
    }
}

function saveData() {
    localStorage.setItem(CONFIG.key, JSON.stringify(docsData));
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// --- Renderização ---

function renderSidebar() {
    const container = document.getElementById('docsCategories');
    container.innerHTML = '';

    docsData.categorias.forEach(cat => {
        const hasDocs = cat.documentos && cat.documentos.length > 0;
        const hasActive = cat.documentos.some(d => d.id === currentDocId);
        const expanded = hasActive || hasDocs;

        const section = document.createElement('div');
        section.className = 'doc-cat-section' + (expanded ? ' expanded' : '') + (hasDocs ? ' has-docs' : '');
        section.id = 'cat-' + cat.id;

        section.innerHTML = `
            <div class="doc-cat-hdr" onclick="toggleCat('${cat.id}')">
                <span class="doc-cat-ico">${cat.icon}</span>
                <span class="doc-cat-name">${cat.titulo}</span>
                <span class="doc-cat-count">${cat.documentos.length}</span>
                <span class="doc-cat-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </span>
            </div>
            <div class="doc-cat-list">
                ${hasDocs ? cat.documentos.map(doc => `
                    <div class="doc-item ${currentDocId === doc.id ? 'active' : ''}" onclick="viewDocument('${doc.id}')">${doc.titulo}</div>
                `).join('') : '<div class="doc-empty-hint">Nenhum documento</div>'}
            </div>
        `;

        container.appendChild(section);
    });

    // Atualiza o select do modal
    const select = document.getElementById('editCategory');
    select.innerHTML = '';
    docsData.categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.titulo;
        select.appendChild(opt);
    });

    renderPlaceholder();
}

function toggleCat(id) {
    const section = document.getElementById('cat-' + id);
    if (section) section.classList.toggle('expanded');
}

function renderPlaceholder() {
    const grid = document.getElementById('cpGrid');
    if (!grid) return;

    grid.innerHTML = docsData.categorias.map(cat => {
        const hasDocs = cat.documentos && cat.documentos.length > 0;
        return `
            <div class="cp-cat-card ${hasDocs ? 'has-docs' : ''}">
                <div class="cp-cat-card-head">
                    <span class="cp-cat-card-ico">${cat.icon}</span>
                    <span class="cp-cat-card-title">${cat.titulo}</span>
                    <span class="cp-cat-card-count">${cat.documentos.length}</span>
                </div>
                ${hasDocs
                ? cat.documentos.slice(0, 5).map(doc => `
                        <button class="cp-doc-link" onclick="viewDocument('${doc.id}')">${doc.titulo}</button>
                    `).join('')
                : '<div class="cp-empty-cat">Nenhum documento ainda</div>'
            }
            </div>
        `;
    }).join('');
}

function viewDocument(id) {
    currentDocId = id;
    let foundDoc = null;
    let foundCat = null;

    for (const cat of docsData.categorias) {
        const doc = cat.documentos.find(d => d.id === id);
        if (doc) { foundDoc = doc; foundCat = cat; break; }
    }

    if (!foundDoc) return;

    document.getElementById('contentPlaceholder').style.display = 'none';
    document.getElementById('documentViewer').style.display = 'block';

    // Breadcrumb
    const bcCat = document.getElementById('docBreadcrumbCat');
    const bcDoc = document.getElementById('docBreadcrumbDoc');
    if (bcCat) bcCat.textContent = foundCat ? foundCat.titulo : '';
    if (bcDoc) bcDoc.textContent = foundDoc.titulo;

    document.getElementById('viewTitle').textContent = foundDoc.titulo;
    document.getElementById('viewAuthor').textContent = foundDoc.autor;
    document.getElementById('viewDate').textContent = foundDoc.data;
    const result = renderContent(foundDoc.conteudo);
    const body = document.getElementById('viewContent');
    body.innerHTML = result.html;
    body.classList.toggle('html-content', result.isHTML);

    renderSidebar();
}

// --- Content Renderer: HTML or BBCode ---
function renderContent(text) {
    if (!text) return { html: '', isHTML: false };
    const isHTML = /<\/?(?:div|table|td|tr|th|tbody|thead|span|p|a|img|br|ul|ol|li|h[1-6]|strong|em|b|i|u|s|section|article|header|footer|hr|blockquote|pre|code|style)[\s>\/]/i.test(text);
    return { html: isHTML ? text : parseBBCode(text), isHTML };
}

// --- BBCode Parser ---
function parseBBCode(text) {
    if (!text) return '';

    let html = text
        .replace(/</g, '&lt;') // Sanitiza HTML
        .replace(/>/g, '&gt;');

    // Tags simples
    html = html.replace(/\[b\](.*?)\[\/b\]/gis, '<b>$1</b>');
    html = html.replace(/\[i\](.*?)\[\/i\]/gis, '<i>$1</i>');
    html = html.replace(/\[u\](.*?)\[\/u\]/gis, '<u>$1</u>');
    html = html.replace(/\[s\](.*?)\[\/s\]/gis, '<s>$1</s>');

    // Alinhamento
    html = html.replace(/\[center\](.*?)\[\/center\]/gis, '<div style="text-align:center">$1</div>');
    html = html.replace(/\[left\](.*?)\[\/left\]/gis, '<div style="text-align:left">$1</div>');
    html = html.replace(/\[right\](.*?)\[\/right\]/gis, '<div style="text-align:right">$1</div>');

    // Cor e Tamanho
    html = html.replace(/\[color=(.*?)\](.*?)\[\/color\]/gis, '<span style="color:$1">$2</span>');
    html = html.replace(/\[size=(.*?)\](.*?)\[\/size\]/gis, '<span style="font-size:$1px">$2</span>');

    // Mídia e Links
    html = html.replace(/\[img\](.*?)\[\/img\]/gis, '<img src="$1" alt="Imagem">');
    html = html.replace(/\[url=(.*?)\](.*?)\[\/url\]/gis, '<a href="$1" target="_blank">$2</a>');

    // Blocos
    html = html.replace(/\[quote\](.*?)\[\/quote\]/gis, '<blockquote>$1</blockquote>');
    html = html.replace(/\[code\](.*?)\[\/code\]/gis, '<code>$1</code>');

    // Quebras de linha
    html = html.replace(/\n/g, '<br>');

    return html;
}

// --- Editor Functions ---

function insertTag(start, end) {
    const textarea = document.getElementById('editContent');
    const scrollPos = textarea.scrollTop;
    let strPos = textarea.selectionStart;
    let endPos = textarea.selectionEnd;

    const front = textarea.value.substring(0, strPos);
    const back = textarea.value.substring(endPos, textarea.value.length);
    const selected = textarea.value.substring(strPos, endPos);

    textarea.value = front + start + selected + end + back;
    textarea.selectionStart = strPos + start.length;
    textarea.selectionEnd = strPos + start.length + selected.length;
    textarea.focus();
    textarea.scrollTop = scrollPos;
}

let isEditing = false;
let editingId = null;

function abrirModalCriar() {
    isEditing = false;
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Novo Documento';
    document.getElementById('editTitle').value = '';
    document.getElementById('editContent').value = '';
    document.getElementById('editCategory').value = 'triplice';

    document.getElementById('modalEditor').style.display = 'flex';
}

function abrirModalEditor() {
    abrirModalCriar();
}

function fecharModal(id) {
    document.getElementById(id).style.display = 'none';
}

function editarDocumentoAtual() {
    if (!currentDocId) return;

    let foundDoc = null;
    let foundCatId = null;

    for (const cat of docsData.categorias) {
        const doc = cat.documentos.find(d => d.id === currentDocId);
        if (doc) {
            foundDoc = doc;
            foundCatId = cat.id;
            break;
        }
    }

    if (!foundDoc) return;

    isEditing = true;
    editingId = currentDocId;

    document.getElementById('modalTitle').textContent = 'Editar Documento';
    document.getElementById('editTitle').value = foundDoc.titulo;
    document.getElementById('editContent').value = foundDoc.conteudo;
    document.getElementById('editCategory').value = foundCatId;

    document.getElementById('modalEditor').style.display = 'flex';
}

function salvarAlteracoes() {
    const titulo = document.getElementById('editTitle').value.trim();
    const conteudo = document.getElementById('editContent').value;
    const catId = document.getElementById('editCategory').value;

    if (!titulo) { alert('Título é obrigatório!'); return; }

    const timestamp = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');

    if (isEditing && editingId) {
        // Modo Edição: Primeiro remove do local antigo (caso tenha mudado de categoria)
        for (const cat of docsData.categorias) {
            const idx = cat.documentos.findIndex(d => d.id === editingId);
            if (idx !== -1) {
                cat.documentos.splice(idx, 1);
                break; // Removeu, agora adiciona na nova (ou mesma) categoria
            }
        }
        // Adiciona atualizado
        const catDestino = docsData.categorias.find(c => c.id === catId);
        if (catDestino) {
            catDestino.documentos.push({
                id: editingId,
                titulo: titulo,
                conteudo: conteudo,
                autor: currentUser + ' (Edição)',
                data: timestamp
            });
        }

    } else {
        // Modo Criação
        const catDestino = docsData.categorias.find(c => c.id === catId);
        if (catDestino) {
            const newId = generateId();
            catDestino.documentos.push({
                id: newId,
                titulo: titulo,
                conteudo: conteudo,
                autor: currentUser,
                data: new Date().toLocaleDateString('pt-BR')
            });
            currentDocId = newId; // Já seleciona o novo
        }
    }

    saveData();
    fecharModal('modalEditor');
    renderSidebar();
    if (currentDocId) viewDocument(currentDocId); // Atualiza visualização
}

function deletarDocumentoAtual() {
    if (!currentDocId || !confirm('Tem certeza que deseja excluir este documento?')) return;

    for (const cat of docsData.categorias) {
        const idx = cat.documentos.findIndex(d => d.id === currentDocId);
        if (idx !== -1) {
            cat.documentos.splice(idx, 1);
            saveData();
            break;
        }
    }

    currentDocId = null;
    document.getElementById('contentPlaceholder').style.display = 'flex';
    document.getElementById('documentViewer').style.display = 'none';
    renderSidebar();
}

// --- Permissões e UI ---

function checkAdminPermissions() {
    const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');
    const isSuperAdmin = ['Xandelicado', 'rafacv', 'Ronaldo'].includes(currentUser);
    const isAdmin = admins.includes(currentUser) || isSuperAdmin;

    if (isAdmin) {
        // Novo botão no header da sidebar
        const btnNew = document.getElementById('btnNewDoc');
        if (btnNew) btnNew.style.display = 'flex';
        // Ações no viewer
        document.getElementById('docActions').style.display = 'flex';
    }
}

function logout() {
    localStorage.removeItem('dme_username');
    window.location.href = 'login.html';
}



function setupMobileSidebar() {
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
}
