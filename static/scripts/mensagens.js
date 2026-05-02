const username = localStorage.getItem('dme_username');
if (!username) location.href = '/login';

// Helpers Habbo
const avHead = nick => `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&headonly=1&size=m`;
const avBody = (nick, dir = 2, hdir = 2, action = 'std') => `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=l&action=${action}`;

window.logout = function() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('dme_username');
        location.href = '/login';
    }
};

window.toggleTheme = function() {
    const cur = localStorage.getItem('dme_theme') || 'dark';
    const nxt = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('dme_theme', nxt);
    document.documentElement.classList.toggle('light-mode', nxt === 'light');
    const el = document.getElementById('themeText');
    if (el) el.textContent = nxt === 'light' ? 'Modo Escuro' : 'Modo Claro';
};

function initNavbar() {
    const navName = document.getElementById('navUserName');
    const navImg = document.getElementById('navUserImage');
    const dropImg = document.getElementById('dropdownUserImage');
    const dropName = document.getElementById('dropdownName');

    if (navName) navName.textContent = username;
    if (navImg) navImg.src = avHead(username);
    if (dropImg) dropImg.src = avBody(username);
    if (dropName) dropName.textContent = username;

    const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');
    if (admins.includes(username)) {
        const painel = document.getElementById('dropdownPainel');
        if (painel) painel.style.display = 'flex';
    }

    const el = document.getElementById('themeText');
    if (el) el.textContent = (localStorage.getItem('dme_theme') || 'dark') === 'light' ? 'Modo Escuro' : 'Modo Claro';
}

function initSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburger');
    const closeBtn = document.getElementById('sidebarClose');
    if (!sidebar || !overlay || !hamburger) return;

    const toggle = () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    };
    hamburger.addEventListener('click', toggle);
    if (closeBtn) closeBtn.addEventListener('click', toggle);
    overlay.addEventListener('click', toggle);
}

function initDropdown() {
    const btn = document.getElementById('userProfileBtn');
    const drop = document.getElementById('userDropdown');
    if (!btn || !drop) return;
    btn.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('active'); });
    document.addEventListener('click', e => { if (!btn.contains(e.target)) drop.classList.remove('active'); });
    drop.addEventListener('click', e => e.stopPropagation());
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialization
    initNavbar();
    initSidebar();
    initDropdown();

    // Current User Info for PM System
    const currentUser = { name: username };
    
    // State
    let currentFolder = 'inbox';
    let messages = JSON.parse(localStorage.getItem('private_messages') || '[]');
    
    // Elements
    const pmList = document.getElementById('pmList');
    const pmListView = document.getElementById('pmListView');
    const pmDetailView = document.getElementById('pmDetailView');
    const pmComposeView = document.getElementById('pmComposeView');
    const folderTitle = document.getElementById('folderTitle');
    const inboxCount = document.getElementById('inboxCount');
    
    // Initialization
    renderList();
    updateInboxCount();

    // Event Listeners for Navigation
    document.querySelectorAll('.pm-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.pm-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFolder = item.dataset.folder;
            
            const titles = {
                'inbox': 'Caixa de Entrada',
                'sent': 'Mensagens Enviadas',
                'archive': 'Arquivo'
            };
            folderTitle.textContent = titles[currentFolder];
            
            showView('list');
            renderList();
        });
    });

    // Compose
    document.getElementById('composeBtn').addEventListener('click', () => showView('compose'));
    document.getElementById('cancelCompose').addEventListener('click', () => showView('list'));

    // Form Submission
    document.getElementById('pmForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newMessage = {
            id: Date.now(),
            from: currentUser.name,
            to: document.getElementById('recipient').value,
            subject: document.getElementById('subject').value,
            body: document.getElementById('message').value,
            date: new Date().toLocaleString('pt-BR'),
            read: false,
            archived: false
        };

        messages.push(newMessage);
        localStorage.setItem('private_messages', JSON.stringify(messages));
        
        Swal.fire({
            icon: 'success',
            title: 'Mensagem enviada!',
            timer: 1500,
            showConfirmButton: false
        });

        document.getElementById('pmForm').reset();
        showView('list');
        renderList();
    });

    // Back to list
    document.getElementById('backToList').addEventListener('click', () => showView('list'));

    // Delete
    document.getElementById('deleteBtn').addEventListener('click', () => {
        const id = pmDetailView.dataset.currentId;
        Swal.fire({
            title: 'Excluir mensagem?',
            text: "Esta ação não pode ser desfeita!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                messages = messages.filter(m => m.id != id);
                localStorage.setItem('private_messages', JSON.stringify(messages));
                showView('list');
                renderList();
                updateInboxCount();
            }
        });
    });

    // Reply
    document.getElementById('replyBtn').addEventListener('click', () => {
        const id = pmDetailView.dataset.currentId;
        const msg = messages.find(m => m.id == id);
        
        showView('compose');
        document.getElementById('recipient').value = msg.from;
        document.getElementById('subject').value = `Re: ${msg.subject}`;
        document.getElementById('message').value = `\n\n-------------------\nEm ${msg.date}, ${msg.from} escreveu:\n${msg.body}`;
        document.getElementById('message').focus();
        document.getElementById('message').setSelectionRange(0, 0);
    });

    // Search functionality
    document.getElementById('pmSearch').addEventListener('input', (e) => {
        renderList(e.target.value.toLowerCase());
    });

    // Helper Functions
    function showView(view) {
        pmListView.style.display = view === 'list' ? 'block' : 'none';
        pmDetailView.style.display = view === 'detail' ? 'flex' : 'none';
        pmComposeView.style.display = view === 'compose' ? 'block' : 'none';
    }

    function renderList(searchTerm = '') {
        pmList.innerHTML = '';
        
        let filtered = [];
        if (currentFolder === 'inbox') {
            filtered = messages.filter(m => m.to === currentUser.name && !m.archived);
        } else if (currentFolder === 'sent') {
            filtered = messages.filter(m => m.from === currentUser.name);
        } else if (currentFolder === 'archive') {
            filtered = messages.filter(m => m.archived);
        }

        // Apply Search
        if (searchTerm) {
            filtered = filtered.filter(m => 
                m.subject.toLowerCase().includes(searchTerm) || 
                m.from.toLowerCase().includes(searchTerm) || 
                m.to.toLowerCase().includes(searchTerm) ||
                m.body.toLowerCase().includes(searchTerm)
            );
        }

        if (filtered.length === 0) {
            pmList.innerHTML = `<div class="pm-empty">${searchTerm ? 'Nenhuma mensagem corresponde à sua pesquisa.' : 'Nenhuma mensagem encontrada.'}</div>`;
            return;
        }

        // Sort by date descending
        filtered.sort((a, b) => b.id - a.id);

        filtered.forEach(msg => {
            const div = document.createElement('div');
            div.className = `pm-item ${!msg.read && msg.to === currentUser.name ? 'unread' : ''}`;
            
            const icon = msg.read ? 
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' :
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="18"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';

            div.innerHTML = `
                <div class="pm-item-icon">${icon}</div>
                <div class="pm-item-subject">${msg.subject}</div>
                <div class="pm-item-author">${currentFolder === 'sent' ? 'Para: ' + msg.to : msg.from}</div>
                <div class="pm-item-date">${msg.date.split(' ')[0]}</div>
            `;
            
            div.onclick = () => showDetail(msg.id);
            pmList.appendChild(div);
        });
    }

    function showDetail(id) {
        const msg = messages.find(m => m.id == id);
        if (!msg) return;

        if (msg.to === currentUser.name && !msg.read) {
            msg.read = true;
            localStorage.setItem('private_messages', JSON.stringify(messages));
            updateInboxCount();
        }

        pmDetailView.dataset.currentId = id;
        document.getElementById('msgSubject').textContent = msg.subject;
        document.getElementById('msgAuthor').textContent = msg.from;
        document.getElementById('msgDate').textContent = msg.date;
        document.getElementById('msgFromToLabel').textContent = currentFolder === 'sent' ? 'Para:' : 'De:';
        
        // BBCode Parsing
        document.getElementById('msgBody').innerHTML = parseBBCode(msg.body);
        
        showView('detail');
    }

    function updateInboxCount() {
        const unreadCount = messages.filter(m => m.to === currentUser.name && !m.read && !m.archived).length;
        inboxCount.textContent = unreadCount;
        inboxCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    function parseBBCode(text) {
        if (!text) return '';
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        html = html.replace(/\n/g, '<br>');
        html = html.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>');
        html = html.replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>');
        html = html.replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>');
        html = html.replace(/\[center\](.*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>');
        html = html.replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>');
        html = html.replace(/\[url\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank">$1</a>');
        html = html.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank">$2</a>');
        html = html.replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" style="max-width:100%; border-radius:8px;">');
        
        return html;
    }

    window.insertBBCode = (tag) => {
        const textarea = document.getElementById('message');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        
        let openTag = `[${tag}]`;
        let closeTag = `[/${tag.split('=')[0]}]`;
        
        const replacement = openTag + selected + closeTag;
        textarea.value = text.substring(0, start) + replacement + text.substring(end);
        
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    };
});
