(function () {
    'use strict';
    const ORGAO_ID = 'setor-legislativo';
    const MURAL_KEY = 'dme_legis_mural';
    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = '/login'; return; }

    const get = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const getLideres = () => get('dme_centros_lideres') || {};
    const isAdmin = () => (get('dme_admins') || []).includes(username);
    const isLider = () => isAdmin() || (getLideres()[ORGAO_ID] || []).includes(username);
    const getMembros = () => get('dme_membros_' + ORGAO_ID) || [];
    const getForums = () => get('dme_forum_' + ORGAO_ID) || [];
    const getHier = () => get('dme_hier_' + ORGAO_ID) || [];
    const getProjetos = () => get('dme_projetos_' + ORGAO_ID) || [];
    const getMural = () => get(MURAL_KEY) || [];

    function toast(msg, tipo) {
        tipo = tipo || 'success';
        var tc = document.getElementById('toastContainer');
        if (!tc) {
            tc = document.createElement('div');
            tc.id = 'toastContainer';
            tc.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none';
            document.body.appendChild(tc);
        }
        var color = tipo === 'success' ? 'var(--green)' : 'var(--red)';
        var t = document.createElement('div');
        t.style.cssText = 'background:var(--bg2);border:1px solid ' + color + ';color:var(--t1);padding:10px 16px;border-radius:8px;font-size:.85rem;box-shadow:0 4px 12px rgba(0,0,0,.3);pointer-events:auto';
        t.textContent = msg;
        tc.appendChild(t);
        setTimeout(function() { t.remove(); }, 3000);
    }

    document.addEventListener('DOMContentLoaded', function() {
        // User info
        var user = get('dme_user_logged') || {};
        var nick = user.nickname || username;
        var av = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + nick + '&direction=2&head_direction=2&gesture=sml&size=m';
        document.getElementById('navUserName').textContent = nick;
        document.getElementById('navUserImage').src = av;
        document.getElementById('dropdownUserImage').src = av;
        document.getElementById('dropdownName').textContent = nick;
        if (isAdmin()) document.getElementById('dropdownPainel').style.display = '';
        var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        document.getElementById('themeText').textContent = isDark ? 'Modo Claro' : 'Modo Escuro';

        // Dropdown
        document.getElementById('userProfileBtn').addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('userDropdown').classList.toggle('active');
        });
        document.addEventListener('click', function() {
            document.getElementById('userDropdown').classList.remove('active');
        });

        // Sidebar hamburger
        var hamburger = document.getElementById('hamburger');
        var mobileSidebar = document.getElementById('mobileSidebar');
        var sidebarOverlay = document.getElementById('sidebarOverlay');
        var sidebarClose = document.getElementById('sidebarClose');
        hamburger.addEventListener('click', function() { mobileSidebar.classList.toggle('active'); sidebarOverlay.classList.toggle('active'); });
        sidebarClose.addEventListener('click', function() { mobileSidebar.classList.toggle('active'); sidebarOverlay.classList.toggle('active'); });
        sidebarOverlay.addEventListener('click', function() { mobileSidebar.classList.toggle('active'); sidebarOverlay.classList.toggle('active'); });

        // Tabs
        var allTabs = document.querySelectorAll('.centro-tab, .quick-menu-item[data-tab]');
        var allContents = document.querySelectorAll('.tab-content');
        allTabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                var target = tab.dataset.tab;
                if (!target) return;
                allTabs.forEach(function(t) { t.classList.remove('active'); });
                allContents.forEach(function(c) { c.classList.remove('active'); });
                document.querySelectorAll('[data-tab="' + target + '"]').forEach(function(t) { t.classList.add('active'); });
                var el = document.getElementById('tab-' + target);
                if (el) el.classList.add('active');
            });
        });

        // Liderança
        if (isLider()) {
            document.getElementById('liderBadge').style.display = '';
            document.getElementById('liderSection').style.display = '';
            document.getElementById('btnAbrirMural').style.display = '';
            document.getElementById('btnNovoForum').style.display = '';
            document.getElementById('btnNovoNivel').style.display = '';
            document.getElementById('btnNovoProjeto').style.display = '';
        }

        // Contadores
        var membros = getMembros();
        document.getElementById('membrosCount').textContent = membros.length;
        document.getElementById('statMembros').textContent = membros.length;
        var proj = getProjetos();
        document.getElementById('statProjetos').textContent = proj.filter(function(p) { return p.tipo === 'projeto'; }).length;
        document.getElementById('statEmendas').textContent = proj.filter(function(p) { return p.tipo === 'emenda'; }).length;

        renderMural(); renderMembros(); renderForum(); renderHierarquia(); renderProjetos();

        document.getElementById('btnNovoForum').addEventListener('click', function() { abrirForumModal(); });
        document.getElementById('forumModalClose').addEventListener('click', fecharForumModal);
        document.getElementById('forumModalCancel').addEventListener('click', fecharForumModal);
        document.getElementById('forumModalSalvar').addEventListener('click', salvarForum);
        document.getElementById('hierModalClose').addEventListener('click', fecharHierModal);
        document.getElementById('hierModalCancel').addEventListener('click', fecharHierModal);
        document.getElementById('hierModalSalvar').addEventListener('click', salvarHier);
        document.getElementById('btnNovoNivel').addEventListener('click', function() { abrirHierModal(); });
        document.getElementById('btnNovoProjeto').addEventListener('click', abrirProjetoModal);
    });

    window.logout = function() {
        localStorage.removeItem('dme_username');
        localStorage.removeItem('dme_user_logged');
        window.location.href = '/login';
    };

    function renderMural() {
        var container = document.getElementById('mural-posts-list');
        var posts = getMural();
        if (!posts.length) {
            container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><p>Nenhuma publicação ainda.</p></div>';
            return;
        }
        container.innerHTML = '';
        posts.forEach(function(post, index) {
            var el = document.createElement('article');
            el.className = 'pub-card';
            el.innerHTML = '<div class="pub-header"><div class="pub-author-av"><img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + post.autor + '&direction=2&head_direction=2&gesture=sml&size=m" alt="' + post.autor + '"></div><div class="pub-meta"><span class="pub-tag">' + (post.tag || '[STM] Comunicado') + '</span><span style="font-size:.75rem;color:var(--t3)">' + post.autor + '</span></div>' + (isLider() ? '<button class="btn-danger" style="margin-left:auto;padding:4px 8px;font-size:.75rem;border-radius:6px" onclick="deletarPost(' + index + ')">Deletar</button>' : '') + '</div>' + (post.imagem ? '<div class="pub-image"><img src="' + post.imagem + '" alt="Imagem"></div>' : '') + '<div class="pub-content"><h2>' + post.titulo + '</h2><p>' + post.conteudo + '</p></div>';
            container.appendChild(el);
        });
    }

    window.abrirMuralModal = function() { document.getElementById('muralModal').classList.add('active'); };
    window.fecharMuralModal = function() { document.getElementById('muralModal').classList.remove('active'); };
    window.salvarPostagem = function() {
        var titulo = document.getElementById('muralTitulo').value.trim();
        var tag = document.getElementById('muralTag').value.trim();
        var imagem = document.getElementById('muralImagem').value.trim();
        var conteudo = document.getElementById('muralConteudo').value.trim();
        if (!titulo || !conteudo) { toast('Título e Conteúdo são obrigatórios!', 'error'); return; }
        var posts = getMural();
        posts.unshift({ titulo: titulo, tag: tag || '[STM] Comunicado', imagem: imagem, conteudo: conteudo, autor: username, data: new Date().toISOString() });
        set(MURAL_KEY, posts);
        document.getElementById('muralTitulo').value = '';
        document.getElementById('muralTag').value = '';
        document.getElementById('muralImagem').value = '';
        document.getElementById('muralConteudo').value = '';
        fecharMuralModal(); renderMural(); toast('Publicação postada!');
    };
    window.deletarPost = function(index) {
        if (!confirm('Apagar esta publicação?')) return;
        var posts = getMural(); posts.splice(index, 1); set(MURAL_KEY, posts); renderMural(); toast('Publicação removida.');
    };

    function renderMembros() {
        var container = document.getElementById('membros-list');
        var membros = getMembros();
        if (!membros.length) { container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>Nenhum membro registrado ainda.</p></div>'; return; }
        container.innerHTML = membros.map(function(m) { return '<div class="member-row"><div class="member-av"><img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + m.nick + '&direction=2&head_direction=2&gesture=sml&size=m" alt="' + m.nick + '"></div><div class="member-info"><span class="member-nick">' + m.nick + '</span><span class="member-cargo">' + (m.cargo || 'Membro') + '</span></div></div>'; }).join('');
    }

    function renderForum() {
        var container = document.getElementById('forum-list');
        var forums = getForums();
        if (!forums.length) { container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Nenhum sub-fórum criado ainda.</p></div>'; return; }
        container.innerHTML = forums.map(function(f, i) { return '<div class="forum-row"><div class="forum-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="forum-info"><span class="forum-nome">' + f.nome + '</span>' + (f.desc ? '<span class="forum-desc">' + f.desc + '</span>' : '') + '</div>' + (isLider() ? '<button class="btn-danger" style="padding:4px 8px;font-size:.75rem;border-radius:6px" onclick="deletarForum(' + i + ')">Remover</button>' : '') + '</div>'; }).join('');
    }

    function abrirForumModal(id) {
        id = (id !== undefined) ? id : null;
        document.getElementById('forumModalId').value = id !== null ? id : '';
        document.getElementById('forumModalTitle').textContent = id !== null ? 'Editar Sub-Fórum' : 'Novo Sub-Fórum';
        if (id !== null) { var f = getForums()[id]; document.getElementById('forumModalNome').value = f.nome; document.getElementById('forumModalDesc').value = f.desc || ''; }
        else { document.getElementById('forumModalNome').value = ''; document.getElementById('forumModalDesc').value = ''; }
        document.getElementById('forumModal').classList.add('active');
    }
    function fecharForumModal() { document.getElementById('forumModal').classList.remove('active'); }
    function salvarForum() {
        var nome = document.getElementById('forumModalNome').value.trim();
        if (!nome) { toast('Nome é obrigatório!', 'error'); return; }
        var desc = document.getElementById('forumModalDesc').value.trim();
        var id = document.getElementById('forumModalId').value;
        var forums = getForums();
        if (id !== '') forums[parseInt(id)] = { nome: nome, desc: desc };
        else forums.push({ nome: nome, desc: desc });
        set('dme_forum_' + ORGAO_ID, forums);
        fecharForumModal(); renderForum(); toast('Sub-fórum salvo!');
    }
    window.deletarForum = function(i) { if (!confirm('Remover este sub-fórum?')) return; var forums = getForums(); forums.splice(i, 1); set('dme_forum_' + ORGAO_ID, forums); renderForum(); toast('Sub-fórum removido.'); };

    function renderHierarquia() {
        var container = document.getElementById('hierarquia-list');
        var hier = getHier();
        if (!hier.length) { container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg><p>Nenhum nível hierárquico definido.</p></div>'; return; }
        container.innerHTML = hier.map(function(h, i) { return '<div class="hier-row"><div class="hier-cargo">' + h.cargo + '</div>' + (h.resp ? '<div class="hier-resp">' + h.resp + '</div>' : '') + (h.subs && h.subs.length ? '<ul class="hier-subs">' + h.subs.map(function(s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' : '') + (isLider() ? '<button class="btn-danger" style="margin-top:6px;padding:4px 8px;font-size:.75rem;border-radius:6px" onclick="deletarHier(' + i + ')">Remover</button>' : '') + '</div>'; }).join('');
    }
    function abrirHierModal(id) {
        id = (id !== undefined) ? id : null;
        document.getElementById('hierModalId').value = id !== null ? id : '';
        document.getElementById('hierModalTitle').textContent = id !== null ? 'Editar Nível' : 'Novo Nível';
        if (id !== null) { var h = getHier()[id]; document.getElementById('hierModalCargo').value = h.cargo; document.getElementById('hierModalSubs').value = (h.subs || []).join('\n'); document.getElementById('hierModalResp').value = h.resp || ''; }
        else { document.getElementById('hierModalCargo').value = ''; document.getElementById('hierModalSubs').value = ''; document.getElementById('hierModalResp').value = ''; }
        document.getElementById('hierModal').classList.add('active');
    }
    function fecharHierModal() { document.getElementById('hierModal').classList.remove('active'); }
    function salvarHier() {
        var cargo = document.getElementById('hierModalCargo').value.trim();
        if (!cargo) { toast('Cargo é obrigatório!', 'error'); return; }
        var subs = document.getElementById('hierModalSubs').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        var resp = document.getElementById('hierModalResp').value.trim();
        var id = document.getElementById('hierModalId').value;
        var hier = getHier();
        if (id !== '') hier[parseInt(id)] = { cargo: cargo, subs: subs, resp: resp };
        else hier.push({ cargo: cargo, subs: subs, resp: resp });
        set('dme_hier_' + ORGAO_ID, hier);
        fecharHierModal(); renderHierarquia(); toast('Nível salvo!');
    }
    window.deletarHier = function(i) { if (!confirm('Remover este nível?')) return; var hier = getHier(); hier.splice(i, 1); set('dme_hier_' + ORGAO_ID, hier); renderHierarquia(); toast('Nível removido.'); };

    function renderProjetos() {
        var container = document.getElementById('projetos-list');
        var projetos = getProjetos();
        if (!projetos.length) { container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Nenhum projeto registrado ainda.</p></div>'; return; }
        container.innerHTML = projetos.map(function(p, i) { return '<div class="forum-row"><div class="forum-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="forum-info"><span class="forum-nome">' + p.titulo + '</span><span class="forum-desc">' + (p.tipo === 'emenda' ? '📝 Emenda' : '📄 Projeto') + ' · ' + p.autor + '</span></div>' + (isLider() ? '<button class="btn-danger" style="padding:4px 8px;font-size:.75rem;border-radius:6px" onclick="deletarProjeto(' + i + ')">Remover</button>' : '') + '</div>'; }).join('');
    }
    window.abrirProjetoModal = function() {
        var titulo = prompt('Título do Projeto/Emenda:');
        if (!titulo) return;
        var tipo = confirm('É uma Emenda?\nOK = Emenda   |   Cancelar = Projeto') ? 'emenda' : 'projeto';
        var proj = getProjetos();
        proj.push({ titulo: titulo, tipo: tipo, autor: username, data: new Date().toISOString() });
        set('dme_projetos_' + ORGAO_ID, proj);
        renderProjetos();
        document.getElementById('statProjetos').textContent = proj.filter(function(p) { return p.tipo === 'projeto'; }).length;
        document.getElementById('statEmendas').textContent = proj.filter(function(p) { return p.tipo === 'emenda'; }).length;
        toast('Projeto adicionado!');
    };
    window.deletarProjeto = function(i) { if (!confirm('Remover este projeto?')) return; var proj = getProjetos(); proj.splice(i, 1); set('dme_projetos_' + ORGAO_ID, proj); renderProjetos(); toast('Projeto removido.'); };

})();
