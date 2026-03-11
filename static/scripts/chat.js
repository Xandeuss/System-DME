/* ── theme IIFE (anti-flash) ─────────────────────────── */
; (function () {
    const t = localStorage.getItem('dme_theme') || 'dark';
    if (t === 'light') document.documentElement.classList.add('light-mode');
})();

(function () {
    'use strict';

    // ══════════════════════════════════════════════════════
    // AUTH
    // ══════════════════════════════════════════════════════
    const username = localStorage.getItem('dme_username');
    if (!username) { location.href = '/login'; return; }

    const admins = () => JSON.parse(localStorage.getItem('dme_admins') || '[]');
    const isAdmin = () => admins().includes(username);

    // ══════════════════════════════════════════════════════
    // HELPERS HABBO
    // ══════════════════════════════════════════════════════
    const avHead = nick =>
        `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&headonly=1&size=m`;

    const avBody = (nick, dir = 2, hdir = 2, action = 'std') =>
        `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=${dir}&head_direction=${hdir}&size=l&action=${action}`;

    // ══════════════════════════════════════════════════════
    // ESTADO GLOBAL
    // ══════════════════════════════════════════════════════
    const CHANNELS = {
        geral: { name: 'Geral', desc: 'Comunicado geral para todos os militares', key: 'dme_chat_geral' },
        anuncios: { name: 'Anúncios', desc: 'Comunicados e anúncios oficiais do comando', key: 'dme_chat_anuncios' },
        staff: { name: 'Staff', desc: 'Canal interno restrito ao staff do sistema', key: 'dme_chat_staff' },
        servico: { name: 'Serviço', desc: 'Comunicações sobre operações em andamento', key: 'dme_chat_servico' },
    };

    let currentChannel = 'geral';
    let allUsers = [];
    let replyingTo = null;   // { id, user, text }
    let newMsgsSinceTop = 0;
    const MAX_MSGS = 150;
    const MAX_CHARS = 1000;
    const GROUP_THRESHOLD_MS = 2 * 60 * 1000; // 2 min

    // ══════════════════════════════════════════════════════
    // ELEMENTOS
    // ══════════════════════════════════════════════════════
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    const userList = document.getElementById('userList');
    const onlineCountEl = document.getElementById('onlineCount');
    const headerOnlineEl = document.getElementById('headerOnlineCount');
    const userSearch = document.getElementById('userSearch');
    const charCounter = document.getElementById('charCounter');
    const channelName = document.getElementById('channelName');
    const channelDesc = document.getElementById('channelDesc');

    const pinnedBar = document.getElementById('pinnedBar');
    const pinnedBarText = document.getElementById('pinnedBarText');
    const pinnedClearBtn = document.getElementById('pinnedClearBtn');

    const scrollDownBtn = document.getElementById('scrollDownBtn');
    const scrollBadge = document.getElementById('scrollBadge');

    const replyPreview = document.getElementById('replyPreview');
    const replyPreviewUser = document.getElementById('replyPreviewUser');
    const replyCancelBtn = document.getElementById('replyCancelBtn');

    const clearChatBtn = document.getElementById('clearChatBtn');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const chatSidebar = document.getElementById('chatSidebar');
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');

    // ══════════════════════════════════════════════════════
    // FUNÇÕES GLOBAIS
    // ══════════════════════════════════════════════════════
    window.logout = function () {
        if (confirm('Deseja realmente sair do sistema?')) {
            localStorage.removeItem('dme_username');
            location.href = '/login';
        }
    };

    window.toggleTheme = function () {
        const cur = localStorage.getItem('dme_theme') || 'dark';
        const nxt = cur === 'dark' ? 'light' : 'dark';
        localStorage.setItem('dme_theme', nxt);
        document.body.classList.toggle('light-mode', nxt === 'light');
        const el = document.getElementById('themeText');
        if (el) el.textContent = nxt === 'light' ? 'Modo Escuro' : 'Modo Claro';
    };

    // ══════════════════════════════════════════════════════
    // NAVBAR
    // ══════════════════════════════════════════════════════
    function initNavbar() {
        const navName = document.getElementById('navUserName');
        const navImg = document.getElementById('navUserImage');
        const dropImg = document.getElementById('dropdownUserImage');
        const dropName = document.getElementById('dropdownName');

        if (navName) navName.textContent = username;
        if (navImg) navImg.src = avHead(username);
        if (dropImg) dropImg.src = avBody(username);
        if (dropName) dropName.textContent = username;

        if (isAdmin()) {
            const painel = document.getElementById('dropdownPainel');
            const divider = document.getElementById('dropdownDivider');
            if (painel) painel.style.display = 'flex';
            if (divider) divider.style.display = 'block';
            if (clearChatBtn) clearChatBtn.style.display = 'flex';
        }

        const el = document.getElementById('themeText');
        if (el) el.textContent = (localStorage.getItem('dme_theme') || 'dark') === 'light'
            ? 'Modo Escuro' : 'Modo Claro';
    }

    function initMobileSidebar() {
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

    // ══════════════════════════════════════════════════════
    // CANAIS
    // ══════════════════════════════════════════════════════
    function initChannels() {
        document.querySelectorAll('.channel-btn[data-channel]').forEach(btn => {
            btn.addEventListener('click', () => {
                const ch = btn.dataset.channel;
                if (ch === currentChannel) return;
                switchChannel(ch);
            });
        });
    }

    function switchChannel(ch) {
        if (!CHANNELS[ch]) return;
        currentChannel = ch;

        // Atualizar botões
        document.querySelectorAll('.channel-btn[data-channel]').forEach(b => {
            b.classList.toggle('active', b.dataset.channel === ch);
        });

        // Atualizar cabeçalho
        const info = CHANNELS[ch];
        if (channelName) channelName.textContent = info.name;
        if (channelDesc) channelDesc.textContent = info.desc;

        // Atualizar placeholder
        if (chatInput) chatInput.placeholder = `Escreva uma mensagem em #${ch.toLowerCase()}...`;

        // Cancelar reply ao trocar de canal
        cancelReply();

        // Atualizar pinned
        renderPinned();

        // Renderizar mensagens
        renderMessages();
    }

    // ══════════════════════════════════════════════════════
    // STORAGE
    // ══════════════════════════════════════════════════════
    function storageKey() {
        return CHANNELS[currentChannel]?.key || 'dme_chat_geral';
    }

    function getMessages() {
        return JSON.parse(localStorage.getItem(storageKey()) || '[]');
    }

    function saveMessages(msgs) {
        localStorage.setItem(storageKey(), JSON.stringify(msgs));
    }

    function getPinned() {
        return JSON.parse(localStorage.getItem(storageKey() + '_pinned') || 'null');
    }

    function setPinned(msg) {
        if (msg) localStorage.setItem(storageKey() + '_pinned', JSON.stringify(msg));
        else localStorage.removeItem(storageKey() + '_pinned');
    }

    // ══════════════════════════════════════════════════════
    // ENVIAR MENSAGEM
    // ══════════════════════════════════════════════════════
    function sendMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text || text.length > MAX_CHARS) return;

        const msgs = getMessages();
        const newMsg = {
            id: Date.now(),
            user: username,
            text: text,
            timestamp: new Date().toISOString(),
            channel: currentChannel,
            deleted: false,
            pinned: false,
            replyTo: replyingTo ? { id: replyingTo.id, user: replyingTo.user, text: replyingTo.text } : null,
        };
        msgs.push(newMsg);
        if (msgs.length > MAX_MSGS) msgs.shift();
        saveMessages(msgs);

        chatInput.value = '';
        chatInput.style.height = 'auto';
        updateCharCounter();
        sendBtn.disabled = true;
        cancelReply();
        renderMessages(true);
    }

    // ══════════════════════════════════════════════════════
    // DELETAR MENSAGEM (admin)
    // ══════════════════════════════════════════════════════
    function deleteMessage(id) {
        if (!isAdmin() && !isOwnMessage(id)) return;
        if (!confirm('Remover esta mensagem?')) return;
        const msgs = getMessages().map(m => m.id === id ? { ...m, deleted: true, text: '' } : m);
        saveMessages(msgs);
        renderMessages();
    }

    function isOwnMessage(id) {
        return getMessages().some(m => m.id === id && m.user === username);
    }

    // ══════════════════════════════════════════════════════
    // FIXAR MENSAGEM (admin)
    // ══════════════════════════════════════════════════════
    function pinMessage(id) {
        if (!isAdmin()) return;
        const msgs = getMessages();
        const msg = msgs.find(m => m.id === id);
        if (!msg || msg.deleted) return;
        setPinned({ id: msg.id, user: msg.user, text: msg.text });
        renderPinned();
    }

    function renderPinned() {
        const pinned = getPinned();
        if (pinned && pinnedBar && pinnedBarText) {
            pinnedBarText.innerHTML = `📌 <strong>${escapeHTML(pinned.user)}</strong>: ${escapeHTML(pinned.text.slice(0, 80))}${pinned.text.length > 80 ? '…' : ''}`;
            pinnedBar.classList.add('visible');
        } else if (pinnedBar) {
            pinnedBar.classList.remove('visible');
        }
    }

    if (pinnedClearBtn) {
        pinnedClearBtn.addEventListener('click', () => {
            if (!isAdmin()) return;
            setPinned(null);
            renderPinned();
        });
    }

    // ══════════════════════════════════════════════════════
    // REPLY
    // ══════════════════════════════════════════════════════
    function setReply(msg) {
        replyingTo = { id: msg.id, user: msg.user, text: msg.text };
        if (replyPreviewUser) replyPreviewUser.textContent = msg.user;
        if (replyPreview) replyPreview.classList.add('visible');
        if (chatInput) chatInput.focus();
    }

    function cancelReply() {
        replyingTo = null;
        if (replyPreview) replyPreview.classList.remove('visible');
    }

    if (replyCancelBtn) replyCancelBtn.addEventListener('click', cancelReply);

    // ══════════════════════════════════════════════════════
    // RENDER MESSAGES
    // ══════════════════════════════════════════════════════
    function isAtBottom() {
        return messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 80;
    }

    function renderMessages(scrollToBottom = false) {
        if (!messagesContainer) return;
        const atBottom = isAtBottom();
        const msgs = getMessages();

        messagesContainer.innerHTML = '';

        if (msgs.length === 0) {
            messagesContainer.innerHTML = `
              <div class="welcome-msg">
                <div class="welcome-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h3>Bem-vindo ao Canal ${CHANNELS[currentChannel]?.name || ''}!</h3>
                <p>Seja o primeiro a enviar uma mensagem. Mantenha o profissionalismo e o respeito.</p>
              </div>`;
            return;
        }

        // Agrupar por data e mensagens consecutivas
        let lastDate = null;
        let lastUser = null;
        let lastTime = null;
        let lastGroup = null;

        msgs.forEach((msg, i) => {
            const date = new Date(msg.timestamp);
            const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Separador de data
            if (dateStr !== lastDate) {
                const div = document.createElement('div');
                div.className = 'date-divider';
                div.textContent = dateStr;
                messagesContainer.appendChild(div);
                lastDate = dateStr;
                lastUser = null;
                lastTime = null;
                lastGroup = null;
            }

            // Agrupamento: mesmo usuário < 2 min após última mensagem
            const timeDiff = lastTime ? (date - new Date(lastTime)) : Infinity;
            const grouped = msg.user === lastUser && timeDiff < GROUP_THRESHOLD_MS && !msg.replyTo;

            if (!grouped) {
                // Novo grupo
                lastGroup = document.createElement('div');
                lastGroup.className = 'msg-group';
                messagesContainer.appendChild(lastGroup);
            }

            const row = document.createElement('div');
            row.className = `msg-row${grouped ? ' grouped' : ''}`;
            row.dataset.id = msg.id;

            // ── Avatar
            const avatarCol = document.createElement('div');
            avatarCol.className = 'msg-avatar-col';

            const avatarEl = document.createElement('div');
            avatarEl.className = 'msg-avatar';
            if (!grouped) {
                const img = document.createElement('img');
                img.src = avBody(msg.user);
                img.alt = msg.user;
                img.loading = 'lazy';
                avatarEl.appendChild(img);
            }
            avatarCol.appendChild(avatarEl);

            // ── Conteúdo
            const content = document.createElement('div');
            content.className = 'msg-content';

            // Reply quote
            if (msg.replyTo && !grouped) {
                const quote = document.createElement('div');
                quote.style.cssText = 'border-left:2px solid var(--green);padding:4px 8px;margin-bottom:6px;font-size:0.72rem;color:var(--t3);border-radius:3px;background:var(--bg-3);';
                quote.innerHTML = `<strong style="color:var(--green)">${escapeHTML(msg.replyTo.user)}</strong>: ${escapeHTML((msg.replyTo.text || '').slice(0, 80))}${msg.replyTo.text?.length > 80 ? '…' : ''}`;
                content.appendChild(quote);
            }

            // Meta (nome + hora)
            if (!grouped) {
                const meta = document.createElement('div');
                meta.className = 'msg-meta';

                const userAdmins = admins();
                const authorIsAdmin = userAdmins.includes(msg.user);

                meta.innerHTML = `
                  <span class="msg-author${authorIsAdmin ? ' is-admin' : ''}">${escapeHTML(msg.user)}</span>
                  ${authorIsAdmin ? '<span class="msg-rank-badge admin">Admin</span>' : ''}
                  <span class="msg-time">${timeStr}</span>`;
                content.appendChild(meta);
            }

            // Texto
            const textEl = document.createElement('div');
            textEl.className = `msg-text${msg.deleted ? ' deleted' : ''}`;
            if (msg.deleted) {
                textEl.textContent = '🚫 Mensagem removida por um administrador.';
            } else {
                textEl.innerHTML = formatText(msg.text);
            }
            content.appendChild(textEl);

            // Hover time (para mensagens agrupadas)
            if (grouped) {
                const hoverTime = document.createElement('span');
                hoverTime.className = 'msg-hover-time';
                hoverTime.textContent = timeStr;
                row.appendChild(hoverTime);
            }

            // ── Ações (hover)
            if (!msg.deleted) {
                const actions = document.createElement('div');
                actions.className = 'msg-actions';

                // Responder
                const replyBtn = document.createElement('button');
                replyBtn.className = 'msg-action-btn';
                replyBtn.title = 'Responder';
                replyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`;
                replyBtn.addEventListener('click', () => setReply(msg));
                actions.appendChild(replyBtn);

                // Fixar (admin)
                if (isAdmin()) {
                    const pinBtn = document.createElement('button');
                    pinBtn.className = 'msg-action-btn pin';
                    pinBtn.title = 'Fixar mensagem';
                    pinBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17H19V13L21 7H3L5 13V17Z"/><line x1="12" y1="7" x2="12" y2="2"/></svg>`;
                    pinBtn.addEventListener('click', () => pinMessage(msg.id));
                    actions.appendChild(pinBtn);
                }

                // Deletar (admin ou própria msg)
                if (isAdmin() || msg.user === username) {
                    const delBtn = document.createElement('button');
                    delBtn.className = 'msg-action-btn delete';
                    delBtn.title = 'Remover mensagem';
                    delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
                    delBtn.addEventListener('click', () => deleteMessage(msg.id));
                    actions.appendChild(delBtn);
                }

                row.appendChild(actions);
            }

            row.appendChild(avatarCol);
            row.appendChild(content);
            lastGroup.appendChild(row);

            lastUser = msg.user;
            lastTime = msg.timestamp;
        });

        // Scroll
        if (scrollToBottom || atBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            newMsgsSinceTop = 0;
            updateScrollBtn();
        } else {
            newMsgsSinceTop++;
            updateScrollBtn();
        }
    }

    // ══════════════════════════════════════════════════════
    // FORMATAÇÃO DE TEXTO
    // ══════════════════════════════════════════════════════
    function escapeHTML(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function formatText(text) {
        // Detectar se a mensagem é exclusivamente uma URL de imagem (renderiza só a img)
        const imgOnlyRx = /^https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|bmp|svg)(\?[^\s]*)?$/i;
        const inlineImgRx = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|bmp|svg)(\?[^\s]*)?)/gi;

        if (imgOnlyRx.test(text.trim())) {
            const url = escapeHTML(text.trim());
            return `<span class="msg-image-wrap"><img class="msg-image" src="${url}" alt="imagem" loading="lazy" data-src="${url}"></span>`;
        }

        let escaped = escapeHTML(text);
        // Menções @usuario
        escaped = escaped.replace(/@(\w+)/g, '<span class="msg-mention">@$1</span>');
        // Imagens inline detectadas por extensão
        escaped = escaped.replace(
            inlineImgRx,
            (url) => {
                const safe = url; // já escaped
                return `<br><span class="msg-image-wrap"><img class="msg-image" src="${safe}" alt="imagem" loading="lazy" data-src="${safe}"></span>`;
            }
        );
        // Demais URLs (links)
        escaped = escaped.replace(
            /(https?:\/\/(?!\S+\.(?:jpg|jpeg|png|gif|webp|avif|bmp|svg))[^\s<>"']+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        return escaped;
    }

    // ══════════════════════════════════════════════════════
    // SCROLL DOWN BUTTON
    // ══════════════════════════════════════════════════════
    function updateScrollBtn() {
        const atBot = isAtBottom();
        scrollDownBtn?.classList.toggle('visible', !atBot);
        if (scrollBadge) {
            if (!atBot && newMsgsSinceTop > 0) {
                scrollBadge.textContent = newMsgsSinceTop > 9 ? '9+' : newMsgsSinceTop;
                scrollBadge.classList.add('visible');
            } else {
                scrollBadge.classList.remove('visible');
            }
        }
    }

    if (scrollDownBtn) {
        scrollDownBtn.addEventListener('click', () => {
            messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
            newMsgsSinceTop = 0;
            updateScrollBtn();
        });
    }

    if (messagesContainer) {
        messagesContainer.addEventListener('scroll', updateScrollBtn);
    }

    // ══════════════════════════════════════════════════════
    // LISTA DE USUÁRIOS ONLINE
    // ══════════════════════════════════════════════════════
    function updateOnlineStatus() {
        const militares = JSON.parse(localStorage.getItem('dme_militar') || '[]');
        const empresarial = JSON.parse(localStorage.getItem('dme_empresarial') || '[]');
        allUsers = [...militares, ...empresarial];
        if (!allUsers.find(u => u.nick === username)) {
            allUsers.push({ nick: username, patente: 'Militar' });
        }
        renderUserList(allUsers);
    }

    function renderUserList(users) {
        if (!userList) return;
        userList.innerHTML = '';
        const sorted = [...users].sort((a, b) => (a.nick || '').localeCompare(b.nick || ''));
        const count = sorted.length;

        if (onlineCountEl) onlineCountEl.textContent = `${count} online`;
        if (headerOnlineEl) headerOnlineEl.textContent = `${count} online`;

        if (count === 0) {
            userList.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--t3);font-size:0.78rem;">Nenhum militar conectado</div>`;
            return;
        }

        sorted.forEach(user => {
            if (!user.nick) return;
            const item = document.createElement('div');
            item.className = 'chat-user-item';
            item.innerHTML = `
              <div class="user-badge">
                <img src="${avBody(user.nick)}" alt="${escapeHTML(user.nick)}" loading="lazy">
                <div class="user-online-dot"></div>
              </div>
              <div class="user-info">
                <span class="user-nick">${escapeHTML(user.nick)}</span>
                <span class="user-status">${escapeHTML(user.patente || 'Militar')}</span>
              </div>`;
            // Clique: preencher @menção
            item.addEventListener('click', () => {
                if (!chatInput) return;
                chatInput.value += `@${user.nick} `;
                chatInput.focus();
                updateCharCounter();
                sendBtn.disabled = chatInput.value.trim() === '';
            });
            userList.appendChild(item);
        });
    }

    // ══════════════════════════════════════════════════════
    // INPUT & CONTADOR
    // ══════════════════════════════════════════════════════
    function updateCharCounter() {
        if (!charCounter || !chatInput) return;
        const len = chatInput.value.length;
        charCounter.textContent = `${len} / ${MAX_CHARS}`;
        charCounter.classList.toggle('warn', len > 800);
        charCounter.classList.toggle('limit', len >= MAX_CHARS);
    }

    // ══════════════════════════════════════════════════════
    // SIDEBAR TOGGLE
    // ══════════════════════════════════════════════════════
    function initSidebarToggle() {
        if (!toggleSidebarBtn || !chatSidebar) return;
        toggleSidebarBtn.addEventListener('click', () => {
            chatSidebar.classList.toggle('collapsed');
        });
    }

    // ══════════════════════════════════════════════════════
    // EMOJI PICKER
    // ══════════════════════════════════════════════════════
    function initEmojiPicker() {
        if (!emojiBtn || !emojiPicker) return;

        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPicker.classList.toggle('open');
        });

        emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (chatInput) {
                    chatInput.value += btn.dataset.emoji;
                    chatInput.focus();
                    updateCharCounter();
                    sendBtn.disabled = chatInput.value.trim() === '';
                }
                emojiPicker.classList.remove('open');
            });
        });

        document.addEventListener('click', (e) => {
            if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
                emojiPicker.classList.remove('open');
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // IMAGE PICKER
    // ══════════════════════════════════════════════════════
    function initImgPicker() {
        const imgBtn = document.getElementById('imgBtn');
        const imgPicker = document.getElementById('imgPicker');
        const imgInput = document.getElementById('imgPickerInput');
        const imgSend = document.getElementById('imgPickerSend');
        const imgPreview = document.getElementById('imgPickerPreview');
        if (!imgBtn || !imgPicker || !imgInput || !imgSend) return;

        // Abrir/fechar popover
        imgBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            imgPicker.classList.toggle('open');
            emojiPicker.classList.remove('open');
            if (imgPicker.classList.contains('open')) {
                imgInput.focus();
            }
        });

        // Preview em tempo real
        let previewTimer = null;
        imgInput.addEventListener('input', () => {
            clearTimeout(previewTimer);
            const url = imgInput.value.trim();
            imgPreview.classList.remove('visible');
            if (!url) return;
            previewTimer = setTimeout(() => {
                imgPreview.src = url;
                imgPreview.onload = () => imgPreview.classList.add('visible');
                imgPreview.onerror = () => imgPreview.classList.remove('visible');
            }, 400);
        });

        // Enviar imagem
        const sendImage = () => {
            const url = imgInput.value.trim();
            if (!url) return;
            // Injetar URL diretamente como texto e enviar
            const old = chatInput.value;
            chatInput.value = url;
            sendMessage();
            chatInput.value = old;
            imgPicker.classList.remove('open');
            imgInput.value = '';
            imgPreview.classList.remove('visible');
        };

        imgSend.addEventListener('click', sendImage);
        imgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendImage(); }
            if (e.key === 'Escape') imgPicker.classList.remove('open');
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!imgPicker.contains(e.target) && e.target !== imgBtn) {
                imgPicker.classList.remove('open');
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // LIGHTBOX
    // ══════════════════════════════════════════════════════
    function initLightbox() {
        const lightbox = document.getElementById('imgLightbox');
        const lightboxImg = document.getElementById('imgLightboxImg');
        const lightboxClose = document.getElementById('imgLightboxClose');
        if (!lightbox || !lightboxImg) return;

        // Delegação: ouvir cliques em .msg-image dentro do container de mensagens
        if (messagesContainer) {
            messagesContainer.addEventListener('click', (e) => {
                const img = e.target.closest('.msg-image');
                if (!img) return;
                const src = img.dataset.src || img.src;
                lightboxImg.src = src;
                lightbox.classList.add('open');
                document.body.style.overflow = 'hidden';
            });
        }

        const closeLightbox = () => {
            lightbox.classList.remove('open');
            lightboxImg.src = '';
            document.body.style.overflow = '';
        };

        lightbox.addEventListener('click', closeLightbox);
        if (lightboxClose) lightboxClose.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
    }

    // ══════════════════════════════════════════════════════
    // CLEAR CHAT (admin)
    // ══════════════════════════════════════════════════════
    function initClearChat() {
        if (!clearChatBtn) return;
        clearChatBtn.addEventListener('click', () => {
            if (!isAdmin()) return;
            const ch = CHANNELS[currentChannel]?.name || currentChannel;
            if (!confirm(`Limpar todo o histórico do canal #${ch}? Esta ação não pode ser desfeita.`)) return;
            if (!confirm('Tem certeza? O histórico será apagado permanentemente.')) return;
            saveMessages([]);
            setPinned(null);
            renderPinned();
            renderMessages();
        });
    }

    // ══════════════════════════════════════════════════════
    // EVENTOS DO INPUT
    // ══════════════════════════════════════════════════════
    function initInput() {
        if (!chatInput || !sendBtn) return;

        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            updateCharCounter();
            sendBtn.disabled = this.value.trim() === '';
        });

        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) sendMessage();
            }
            if (e.key === 'Escape') {
                cancelReply();
                emojiPicker.classList.remove('open');
            }
        });

        sendBtn.addEventListener('click', () => {
            if (!sendBtn.disabled) sendMessage();
        });

        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allUsers.filter(u => (u.nick || '').toLowerCase().includes(term));
                renderUserList(filtered);
            });
        }
    }

    // ══════════════════════════════════════════════════════
    // STORAGE EVENT (multi-aba)
    // ══════════════════════════════════════════════════════
    window.addEventListener('storage', e => {
        const keys = Object.values(CHANNELS).map(c => c.key);
        if (keys.includes(e.key)) {
            renderMessages();
        }
    });

    // ══════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════
    initNavbar();
    initMobileSidebar();
    initDropdown();
    initChannels();
    initSidebarToggle();
    initEmojiPicker();
    initImgPicker();
    initLightbox();
    initClearChat();
    initInput();

    renderMessages(true);
    renderPinned();
    updateOnlineStatus();
    updateCharCounter();

    // Scroll para o fim após imagens carregarem
    setTimeout(() => {
        if (messagesContainer)
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 200);

})();
