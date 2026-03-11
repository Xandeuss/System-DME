(function () {
    // ===== AUTH GUARD =====
    const username = localStorage.getItem('dme_username');
    if (!username) { window.location.href = '/login'; return; }

    // ===== ÓRGÃOS MAPEADOS =====
    const ORGAOS_MAP = {
        'centro-instrucao': { title: 'Centro de Instrução' },
        'centro-treinamento': { title: 'Centro de Treinamento' },
        'centro-supervisao': { title: 'Centro de Supervisão' },
        'centro-patrulha': { title: 'Centro de Patrulha' },
        'academia-agulhas-negras': { title: 'Academia Militar das Agulhas Negras' },
        'auditoria-fiscal': { title: 'Auditoria Fiscal' },
        'academia-publicitaria': { title: 'Academia Publicitária Militar' },
        'corpo-oficiais-gerais': { title: 'Corpo de Oficiais Gerais' },
        'centro-rh': { title: 'Centro de Recursos Humanos' },
        'corpo-oficiais': { title: 'Corpo de Oficiais' },
        'portadores-direitos': { title: 'Portadores de Direitos' },
        'comando-feminino': { title: 'Comando Feminino' },
        'ministerio-publico': { title: 'Ministério Público' },
        'corregedoria': { title: 'Corregedoria' },
        'abi': { title: 'Agência Brasileira de Inteligência' },
        'goe': { title: 'Grupamento de Operações Especiais' },
        'instrucao-inicial': { title: 'Aplicar Instrução Inicial' },
        'af-dragonas': { title: '[AF] Postagem de Dragonas' },
        'guerra-selva': { title: 'Centro de Instrução Guerra na Selva' },
        'cadetes': { title: 'Cadetes' },
        'normas-desligamentos': { title: 'Centro de Normas e Desligamentos' },
        'agencia-eventos': { title: 'Agência de Eventos' },
        'stm': { title: 'Superior Tribunal Militar' }
    };

    // ===== CARGOS PADRÃO =====
    const CARGOS_PADRAO = [
        { nome: 'Líder', fixo: true, perms: { subtopicos: true, membros: true, publicacao: true, lideranca: true } },
        { nome: 'Suboficial', fixo: false, perms: { subtopicos: true, membros: false, publicacao: true, lideranca: false } },
        { nome: 'Membro', fixo: true, perms: { subtopicos: false, membros: false, publicacao: false, lideranca: false } }
    ];

    // ===== ESTADO GLOBAL =====
    let orgaoId = null;
    let orgaoData = null;
    let meuCargo = null;
    let secaoAtual = 'inicio';

    // Pilha de navegação para tópicos aninhados: [{ secao, topicoId, titulo }]
    // secao = 'documentos' | 'forum' | etc.
    // topicoId = null (raiz) ou id do tópico pai
    let navStack = [];

    // Modal de subtópico
    let modalCtx = { secao: null, parentId: null, editId: null };

    // ===== STORAGE =====
    function getOrgaoData(id) {
        try { return JSON.parse(localStorage.getItem('dme_orgao_' + id) || 'null'); } catch (_) { return null; }
    }
    function saveOrgaoData(id, data) {
        localStorage.setItem('dme_orgao_' + id, JSON.stringify(data));
    }
    function initOrgaoData(id) {
        const existing = getOrgaoData(id);
        if (existing) return existing;
        const novo = {
            cargos: JSON.parse(JSON.stringify(CARGOS_PADRAO)),
            membros: [],
            // Cada seção tem uma lista de tópicos raiz.
            // Cada tópico: { id, titulo, conteudo, autor, data, filhos: [] }
            secoes: { documentos: [], forum: [] },
            publicacoes: []
        };
        saveOrgaoData(id, novo);
        return novo;
    }

    // ===== PERMISSÕES =====
    function getCargoObj(nome) {
        return orgaoData.cargos.find(c => c.nome === nome) || null;
    }
    function temPermissao(perm) {
        const cargo = getCargoObj(meuCargo);
        return cargo ? !!cargo.perms[perm] : false;
    }
    function isLider() { return temPermissao('lideranca'); }

    // ===== HELPERS =====
    function escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    function dataAtual() {
        return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    function atualizarContadorMembros() {
        const el = document.getElementById('orgaoMembros');
        if (el) el.textContent = `${orgaoData.membros.length} Membro(s)`;
    }

    // ===== BUSCA RECURSIVA DE TÓPICO POR ID =====
    // Retorna o objeto tópico dentro da árvore, ou null
    function encontrarTopico(lista, id) {
        for (const t of lista) {
            if (t.id === id) return t;
            if (t.filhos && t.filhos.length) {
                const found = encontrarTopico(t.filhos, id);
                if (found) return found;
            }
        }
        return null;
    }

    // Remove tópico recursivamente
    function removerTopico(lista, id) {
        const idx = lista.findIndex(t => t.id === id);
        if (idx !== -1) { lista.splice(idx, 1); return true; }
        for (const t of lista) {
            if (t.filhos && removerTopico(t.filhos, id)) return true;
        }
        return false;
    }

    // ===== NAVEGAÇÃO PRINCIPAL (MENU RÁPIDO) =====
    window.navigateTo = function (secao) {
        secaoAtual = secao;
        navStack = []; // reset da pilha ao trocar de seção
        document.querySelectorAll('.quick-menu-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-section') === secao);
        });
        renderContentArea();
    };

    // ===== NAVEGAÇÃO DENTRO DE TÓPICOS (ANINHADA) =====
    // Entrar em um tópico (empilha)
    window.entrarTopico = function (topicoId, titulo) {
        navStack.push({ topicoId, titulo });
        renderContentArea();
    };

    // Voltar um nível na pilha
    window.voltarNivel = function () {
        navStack.pop();
        renderContentArea();
    };

    // Ir direto para um nível específico do breadcrumb
    window.irParaNivel = function (idx) {
        navStack = navStack.slice(0, idx);
        renderContentArea();
    };

    // ===== RENDER PRINCIPAL =====
    function renderContentArea() {
        const area = document.getElementById('contentArea');
        switch (secaoAtual) {
            case 'inicio': area.innerHTML = renderInicio(); break;
            case 'membros': area.innerHTML = renderMembros(); break;
            case 'documentos': area.innerHTML = renderSecaoTopicos('documentos', 'Documentos'); break;
            case 'forum': area.innerHTML = renderSecaoTopicos('forum', 'Fórum'); break;
            case 'configuracao': area.innerHTML = renderConfiguracao(); break;
            case 'controle-membros': area.innerHTML = renderControleMembros(); break;
            case 'publicacao': area.innerHTML = renderPublicacao(); break;
            case 'grupo': area.innerHTML = renderGrupo(); break;
            default: area.innerHTML = '<div class="empty-state"><div class="empty-state-text">Seção não encontrada.</div></div>';
        }
    }

    // ===== SEÇÃO: INÍCIO =====
    function renderInicio() {
        const totalMembros = orgaoData.membros.length;
        const totalDocs = (orgaoData.secoes.documentos || []).length;
        const totalForum = (orgaoData.secoes.forum || []).length;
        const totalPubs = orgaoData.publicacoes.length;

        const recentes = [...orgaoData.publicacoes].reverse().slice(0, 3);
        const recentesHtml = recentes.length === 0
            ? '<div class="empty-state" style="padding:20px 0"><div class="empty-state-text">Nenhuma publicação ainda.</div></div>'
            : recentes.map(p => `
                <div class="publicacao-item">
                    <div class="publicacao-item-header">
                        <div class="publicacao-item-title">${escHtml(p.titulo)}</div>
                        <div class="publicacao-item-date">${p.data}</div>
                    </div>
                    <div class="publicacao-item-content">${escHtml(p.conteudo.substring(0, 140))}${p.conteudo.length > 140 ? '...' : ''}</div>
                </div>`).join('');

        return `
            <div class="section-header">
                <div class="section-title">Início</div>
            </div>
            <div class="inicio-stats">
                <div class="stat-card"><div class="stat-card-value">${totalMembros}</div><div class="stat-card-label">Membros</div></div>
                <div class="stat-card"><div class="stat-card-value">${totalDocs}</div><div class="stat-card-label">Documentos</div></div>
                <div class="stat-card"><div class="stat-card-value">${totalForum}</div><div class="stat-card-label">Tópicos no Fórum</div></div>
                <div class="stat-card"><div class="stat-card-value">${totalPubs}</div><div class="stat-card-label">Publicações</div></div>
            </div>
            <div class="inicio-recentes-title">Publicações Recentes</div>
            <div class="publicacoes-list">${recentesHtml}</div>`;
    }

    // ===== SEÇÃO: MEMBROS =====
    function renderMembros() {
        const membros = orgaoData.membros;
        const addBtn = isLider() ? `<button class="btn-add" onclick="abrirModalMembro()">+ Adicionar Membro</button>` : '';
        const membrosHtml = membros.length === 0
            ? '<div class="empty-state"><div class="empty-state-text">Nenhum membro cadastrado ainda.</div></div>'
            : membros.map(m => {
                const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.username)}&headonly=1&size=m&gesture=std&head_direction=2`;
                return `
                    <div class="membro-item">
                        <div class="membro-avatar"><img src="${avatarUrl}" alt="${escHtml(m.username)}" onerror="this.style.display='none'"></div>
                        <div class="membro-info">
                            <div class="membro-name">${escHtml(m.username)}</div>
                            <span class="membro-cargo-badge ${m.cargo === 'Líder' ? 'lider' : 'default'}">${escHtml(m.cargo)}</span>
                        </div>
                    </div>`;
            }).join('');

        return `
            <div class="section-header">
                <div class="section-title">Membros</div>
                ${addBtn}
            </div>
            <div class="membros-list">${membrosHtml}</div>`;
    }

    // ===== SEÇÃO: TÓPICOS ANINHADOS (Documentos / Fórum) =====
    function renderSecaoTopicos(chave, tituloSecao) {
        if (!orgaoData.secoes) orgaoData.secoes = {};
        if (!orgaoData.secoes[chave]) orgaoData.secoes[chave] = [];

        const raiz = orgaoData.secoes[chave];
        const podeCriar = temPermissao('subtopicos');

        // Determinar lista atual com base na pilha de navegação
        let listaAtual = raiz;
        let topicoAtualObj = null;
        for (const frame of navStack) {
            topicoAtualObj = encontrarTopico(raiz, frame.topicoId);
            if (topicoAtualObj) {
                if (!topicoAtualObj.filhos) topicoAtualObj.filhos = [];
                listaAtual = topicoAtualObj.filhos;
            }
        }

        // Breadcrumb
        const breadcrumbHtml = renderBreadcrumb(tituloSecao);

        // Conteúdo do tópico atual (se estiver dentro de um)
        let conteudoTopicoHtml = '';
        if (topicoAtualObj && topicoAtualObj.conteudo) {
            const acoesTopico = podeCriar
                ? `<button class="btn-icon-sm edit" onclick="abrirModalTopico('${chave}', '${navStack.length >= 2 ? navStack[navStack.length - 2].topicoId : null}', '${topicoAtualObj.id}')" title="Editar">Editar</button>
                   <button class="btn-icon-sm delete" onclick="deletarTopicoAtual('${chave}', '${topicoAtualObj.id}')" title="Excluir">Excluir</button>`
                : '';
            conteudoTopicoHtml = `
                <div class="topico-conteudo-box">
                    <div class="topico-conteudo-header">
                        <div class="topico-conteudo-autor">
                            <div class="forum-post-avatar">
                                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(topicoAtualObj.autor || username)}&headonly=1&size=m&gesture=std&head_direction=2" alt="" onerror="this.style.display='none'">
                            </div>
                            <div>
                                <div class="forum-post-author">${escHtml(topicoAtualObj.autor || username)}</div>
                                <div class="forum-post-date">${topicoAtualObj.data || ''}</div>
                            </div>
                        </div>
                        <div class="topico-acoes">${acoesTopico}</div>
                    </div>
                    <div class="topico-conteudo-texto">${escHtml(topicoAtualObj.conteudo)}</div>
                </div>`;
        }

        // Botão adicionar
        const parentIdParaModal = navStack.length > 0 ? navStack[navStack.length - 1].topicoId : null;
        const addBtn = podeCriar
            ? `<button class="btn-add" onclick="abrirModalTopico('${chave}', ${parentIdParaModal ? `'${parentIdParaModal}'` : 'null'}, null)">+ Novo Tópico</button>`
            : '';

        // Lista de sub-tópicos
        const subtituloLista = navStack.length > 0 ? 'Sub-tópicos' : 'Tópicos';
        const listaHtml = listaAtual.length === 0
            ? `<div class="empty-state"><div class="empty-state-text">${navStack.length > 0 ? 'Nenhum sub-tópico criado.' : 'Nenhum tópico criado ainda.'}</div></div>`
            : listaAtual.map(t => {
                const temFilhos = t.filhos && t.filhos.length > 0;
                const acoesCard = podeCriar
                    ? `<div class="topico-card-actions">
                        <button class="btn-icon-sm edit" onclick="event.stopPropagation();abrirModalTopico('${chave}','${parentIdParaModal || 'null'}','${t.id}')" title="Editar">Editar</button>
                        <button class="btn-icon-sm delete" onclick="event.stopPropagation();deletarTopico('${chave}','${t.id}')" title="Excluir">Excluir</button>
                       </div>`
                    : '';
                return `
                    <div class="topico-card" onclick="entrarTopico('${t.id}', '${escHtml(t.titulo).replace(/'/g, "\\'")}')">
                        <div class="topico-card-body">
                            <div class="topico-card-title">${escHtml(t.titulo)}</div>
                            <div class="topico-card-meta">
                                <span>${escHtml(t.autor || username)}</span>
                                <span>${t.data || ''}</span>
                                ${temFilhos ? `<span class="topico-card-filhos">${t.filhos.length} sub-tópico(s)</span>` : ''}
                            </div>
                            ${t.conteudo ? `<div class="topico-card-preview">${escHtml(t.conteudo.substring(0, 100))}${t.conteudo.length > 100 ? '...' : ''}</div>` : ''}
                        </div>
                        ${acoesCard}
                    </div>`;
            }).join('');

        return `
            ${breadcrumbHtml}
            <div class="section-header" style="margin-top:16px">
                <div class="section-title">${navStack.length > 0 ? subtituloLista : tituloSecao}</div>
                ${addBtn}
            </div>
            ${conteudoTopicoHtml}
            ${navStack.length > 0 ? `<div class="subtopicos-label">Sub-tópicos</div>` : ''}
            <div class="topicos-list">${listaHtml}</div>`;
    }

    // ===== BREADCRUMB =====
    function renderBreadcrumb(tituloSecao) {
        if (navStack.length === 0) return '';
        let html = `<div class="breadcrumb">
            <span class="breadcrumb-item link" onclick="irParaNivel(0)">${escHtml(tituloSecao)}</span>`;
        navStack.forEach((frame, idx) => {
            html += `<span class="breadcrumb-sep">›</span>`;
            if (idx < navStack.length - 1) {
                html += `<span class="breadcrumb-item link" onclick="irParaNivel(${idx + 1})">${escHtml(frame.titulo)}</span>`;
            } else {
                html += `<span class="breadcrumb-item current">${escHtml(frame.titulo)}</span>`;
            }
        });
        html += `</div>`;
        return html;
    }

    // ===== MODAL TÓPICO =====
    window.abrirModalTopico = function (secao, parentId, editId) {
        modalCtx = { secao, parentId: parentId === 'null' ? null : parentId, editId };
        document.getElementById('modalTopicoTitle').textContent = editId ? 'Editar Tópico' : 'Novo Tópico';
        if (editId) {
            const raiz = orgaoData.secoes[secao] || [];
            const t = encontrarTopico(raiz, editId);
            document.getElementById('topicoTitulo').value = t ? t.titulo : '';
            document.getElementById('topicoConteudo').value = t ? t.conteudo : '';
        } else {
            document.getElementById('topicoTitulo').value = '';
            document.getElementById('topicoConteudo').value = '';
        }
        abrirModal('modalTopico');
    };

    window.salvarTopico = function () {
        const titulo = document.getElementById('topicoTitulo').value.trim();
        const conteudo = document.getElementById('topicoConteudo').value.trim();
        if (!titulo) { alert('Informe um título.'); return; }

        const { secao, parentId, editId } = modalCtx;
        if (!orgaoData.secoes) orgaoData.secoes = {};
        if (!orgaoData.secoes[secao]) orgaoData.secoes[secao] = [];
        const raiz = orgaoData.secoes[secao];

        if (editId) {
            // Editar existente
            const t = encontrarTopico(raiz, editId);
            if (t) { t.titulo = titulo; t.conteudo = conteudo; }
        } else if (parentId) {
            // Adicionar como filho
            const pai = encontrarTopico(raiz, parentId);
            if (pai) {
                if (!pai.filhos) pai.filhos = [];
                pai.filhos.push({ id: gerarId(), titulo, conteudo, autor: username, data: dataAtual(), filhos: [] });
            }
        } else {
            // Adicionar na raiz
            raiz.push({ id: gerarId(), titulo, conteudo, autor: username, data: dataAtual(), filhos: [] });
        }

        saveOrgaoData(orgaoId, orgaoData);
        fecharModal('modalTopico');
        renderContentArea();
    };

    window.deletarTopico = function (secao, id) {
        if (!confirm('Excluir este tópico e todos os seus sub-tópicos?')) return;
        const raiz = orgaoData.secoes[secao] || [];
        removerTopico(raiz, id);
        saveOrgaoData(orgaoId, orgaoData);
        renderContentArea();
    };

    // Deletar o tópico em que estamos atualmente (volta um nível)
    window.deletarTopicoAtual = function (secao, id) {
        if (!confirm('Excluir este tópico e todos os seus sub-tópicos?')) return;
        const raiz = orgaoData.secoes[secao] || [];
        removerTopico(raiz, id);
        saveOrgaoData(orgaoId, orgaoData);
        navStack.pop();
        renderContentArea();
    };

    // ===== SEÇÃO: CONFIGURAÇÃO =====
    function renderConfiguracao() {
        if (!isLider()) return semPermissao();
        const cargosHtml = orgaoData.cargos.map(c => {
            const permsTexto = Object.entries(c.perms)
                .filter(([, v]) => v)
                .map(([k]) => ({ subtopicos: 'Tópicos', membros: 'Membros', publicacao: 'Publicação', lideranca: 'Liderança' }[k] || k))
                .join(', ') || 'Apenas visualização';
            const deleteBtn = c.fixo
                ? `<span class="cargo-item-fixed">Padrão</span>`
                : `<button class="btn-delete-cargo" onclick="deletarCargo('${escHtml(c.nome)}')">Remover</button>`;
            return `
                <div class="cargo-item">
                    <div>
                        <div class="cargo-item-name">${escHtml(c.nome)}</div>
                        <div class="cargo-item-perms">Permissões: ${permsTexto}</div>
                    </div>
                    ${deleteBtn}
                </div>`;
        }).join('');

        return `
            <div class="section-header">
                <div class="section-title">Configuração</div>
                <button class="btn-add" onclick="abrirModalCargo()">+ Novo Cargo</button>
            </div>
            <div class="config-section">
                <div class="config-section-title">Cargos do Órgão</div>
                <div class="cargos-list">${cargosHtml}</div>
            </div>`;
    }

    // ===== SEÇÃO: CONTROLE DE MEMBROS =====
    function renderControleMembros() {
        if (!temPermissao('membros')) return semPermissao();
        const membros = orgaoData.membros;
        const membrosHtml = membros.length === 0
            ? '<div class="empty-state"><div class="empty-state-text">Nenhum membro cadastrado.</div></div>'
            : membros.map(m => {
                const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.username)}&headonly=1&size=m&gesture=std&head_direction=2`;
                const opcoesCargoHtml = orgaoData.cargos.map(c =>
                    `<option value="${escHtml(c.nome)}" ${c.nome === m.cargo ? 'selected' : ''}>${escHtml(c.nome)}</option>`
                ).join('');
                return `
                    <div class="membro-item">
                        <div class="membro-avatar"><img src="${avatarUrl}" alt="" onerror="this.style.display='none'"></div>
                        <div class="membro-info">
                            <div class="membro-name">${escHtml(m.username)}</div>
                            <span class="membro-cargo-badge ${m.cargo === 'Líder' ? 'lider' : 'default'}">${escHtml(m.cargo)}</span>
                        </div>
                        <div class="membro-actions">
                            <select class="btn-cargo-select" onchange="alterarCargo('${escHtml(m.username)}', this.value)">${opcoesCargoHtml}</select>
                            <button class="btn-remove-membro" onclick="removerMembro('${escHtml(m.username)}')">Remover</button>
                        </div>
                    </div>`;
            }).join('');

        return `
            <div class="section-header">
                <div class="section-title">Controle de Membros</div>
                <button class="btn-add" onclick="abrirModalMembro()">+ Adicionar</button>
            </div>
            <div class="membros-list">${membrosHtml}</div>`;
    }

    // ===== SEÇÃO: PUBLICAÇÃO =====
    function renderPublicacao() {
        if (!temPermissao('publicacao')) return semPermissao();
        const pubs = [...orgaoData.publicacoes].reverse();
        const pubsHtml = pubs.length === 0
            ? '<div class="empty-state" style="padding:20px 0"><div class="empty-state-text">Nenhuma publicação ainda.</div></div>'
            : pubs.map(p => `
                <div class="publicacao-item">
                    <div class="publicacao-item-header">
                        <div class="publicacao-item-title">${escHtml(p.titulo)}</div>
                        <div style="display:flex;gap:8px;align-items:center">
                            <div class="publicacao-item-date">${p.data}</div>
                            <button class="btn-icon-sm delete" onclick="deletarPublicacao('${p.id}')">Excluir</button>
                        </div>
                    </div>
                    <div class="publicacao-item-content">${escHtml(p.conteudo)}</div>
                </div>`).join('');

        return `
            <div class="section-header">
                <div class="section-title">Publicação</div>
            </div>
            <div class="publicacao-form">
                <div class="form-group">
                    <label class="form-label">Título</label>
                    <input type="text" class="form-input" id="pubTitulo" placeholder="Ex: Aviso Importante">
                </div>
                <div class="form-group">
                    <label class="form-label">Conteúdo</label>
                    <textarea class="form-textarea" id="pubConteudo" rows="5" placeholder="Escreva o conteúdo..."></textarea>
                </div>
                <div style="display:flex;justify-content:flex-end">
                    <button class="btn-primary" onclick="publicar()">Publicar</button>
                </div>
            </div>
            <div class="publicacoes-list">${pubsHtml}</div>`;
    }

    // ===== SEÇÃO: GRUPO =====
    function renderGrupo() {
        if (!isLider()) return semPermissao();
        const orgaoInfo = ORGAOS_MAP[orgaoId] || {};
        return `
            <div class="section-header">
                <div class="section-title">Grupo</div>
            </div>
            <div class="config-section">
                <div class="config-section-title">Informações do Órgão</div>
                <div class="publicacao-item">
                    <div class="publicacao-item-header"><div class="publicacao-item-title">Nome</div></div>
                    <div class="publicacao-item-content">${escHtml(orgaoInfo.title || orgaoId)}</div>
                </div>
                <div class="publicacao-item" style="margin-top:10px">
                    <div class="publicacao-item-header"><div class="publicacao-item-title">Total de Membros</div></div>
                    <div class="publicacao-item-content">${orgaoData.membros.length} membro(s)</div>
                </div>
                <div class="publicacao-item" style="margin-top:10px">
                    <div class="publicacao-item-header"><div class="publicacao-item-title">Cargos Cadastrados</div></div>
                    <div class="publicacao-item-content">${orgaoData.cargos.map(c => escHtml(c.nome)).join(', ')}</div>
                </div>
            </div>`;
    }

    function semPermissao() {
        return `<div class="empty-state"><div class="empty-state-text">Você não tem permissão para acessar esta seção.</div></div>`;
    }

    // ===== MODAIS =====
    function abrirModal(id) { document.getElementById(id).classList.add('active'); }
    window.fecharModal = function (id) { document.getElementById(id).classList.remove('active'); };

    // Modal Cargo
    window.abrirModalCargo = function () {
        document.getElementById('cargoNome').value = '';
        document.getElementById('permSubtopicos').checked = false;
        document.getElementById('permMembros').checked = false;
        document.getElementById('permPublicacao').checked = false;
        abrirModal('modalCargo');
    };
    window.salvarCargo = function () {
        const nome = document.getElementById('cargoNome').value.trim();
        if (!nome) { alert('Informe o nome do cargo.'); return; }
        if (orgaoData.cargos.find(c => c.nome.toLowerCase() === nome.toLowerCase())) { alert('Cargo já existe.'); return; }
        orgaoData.cargos.push({
            nome, fixo: false,
            perms: {
                subtopicos: document.getElementById('permSubtopicos').checked,
                membros: document.getElementById('permMembros').checked,
                publicacao: document.getElementById('permPublicacao').checked,
                lideranca: false
            }
        });
        saveOrgaoData(orgaoId, orgaoData);
        fecharModal('modalCargo');
        renderContentArea();
    };
    window.deletarCargo = function (nome) {
        if (!confirm(`Remover o cargo "${nome}"?`)) return;
        orgaoData.cargos = orgaoData.cargos.filter(c => c.nome !== nome);
        orgaoData.membros.forEach(m => { if (m.cargo === nome) m.cargo = 'Membro'; });
        saveOrgaoData(orgaoId, orgaoData);
        renderContentArea();
    };

    // Modal Membro
    window.abrirModalMembro = function () {
        document.getElementById('membroUsername').value = '';
        const sel = document.getElementById('membroCargo');
        sel.innerHTML = orgaoData.cargos.map(c => `<option value="${escHtml(c.nome)}">${escHtml(c.nome)}</option>`).join('');
        abrirModal('modalMembro');
    };
    window.salvarMembro = function () {
        const uname = document.getElementById('membroUsername').value.trim();
        const cargo = document.getElementById('membroCargo').value;
        if (!uname) { alert('Informe o nome de usuário.'); return; }
        if (orgaoData.membros.find(m => m.username.toLowerCase() === uname.toLowerCase())) { alert('Membro já cadastrado.'); return; }
        orgaoData.membros.push({ username: uname, cargo });
        saveOrgaoData(orgaoId, orgaoData);
        fecharModal('modalMembro');
        atualizarContadorMembros();
        renderContentArea();
    };
    window.removerMembro = function (uname) {
        if (!confirm(`Remover ${uname} do órgão?`)) return;
        orgaoData.membros = orgaoData.membros.filter(m => m.username !== uname);
        saveOrgaoData(orgaoId, orgaoData);
        atualizarContadorMembros();
        renderContentArea();
    };
    window.alterarCargo = function (uname, novoCargo) {
        const m = orgaoData.membros.find(m => m.username === uname);
        if (m) { m.cargo = novoCargo; saveOrgaoData(orgaoId, orgaoData); renderContentArea(); }
    };

    // Publicação
    window.publicar = function () {
        const titulo = document.getElementById('pubTitulo').value.trim();
        const conteudo = document.getElementById('pubConteudo').value.trim();
        if (!titulo || !conteudo) { alert('Preencha título e conteúdo.'); return; }
        orgaoData.publicacoes.push({ id: gerarId(), titulo, conteudo, autor: username, data: dataAtual() });
        saveOrgaoData(orgaoId, orgaoData);
        renderContentArea();
    };
    window.deletarPublicacao = function (id) {
        if (!confirm('Excluir publicação?')) return;
        orgaoData.publicacoes = orgaoData.publicacoes.filter(p => p.id !== id);
        saveOrgaoData(orgaoId, orgaoData);
        renderContentArea();
    };

    // ===== TEMA (delegado ao theme.js global) =====
    window.logout = function () {
        localStorage.removeItem('dme_username');
        window.location.href = '/login';
    };

    // ===== INIT =====
    document.addEventListener('DOMContentLoaded', () => {
        window.applyTheme(localStorage.getItem('dme_theme') || 'dark');

        let orgaoSel = null;
        try { orgaoSel = JSON.parse(localStorage.getItem('dme_orgao_selecionado') || 'null'); } catch (_) { }
        if (!orgaoSel || !orgaoSel.id) { window.location.href = '/centro_tarefas_orgaos'; return; }

        orgaoId = orgaoSel.id;
        const orgaoInfo = ORGAOS_MAP[orgaoId] || { title: orgaoSel.title || orgaoId };

        orgaoData = initOrgaoData(orgaoId);

        // Migração: se ainda tiver estrutura antiga (subtopicos), converter para secoes
        if (orgaoData.subtopicos && !orgaoData.secoes) {
            orgaoData.secoes = {
                documentos: (orgaoData.subtopicos.documentos || []).map(s => ({ ...s, filhos: [] })),
                forum: (orgaoData.subtopicos.forum || []).map(s => ({ ...s, filhos: [] }))
            };
            delete orgaoData.subtopicos;
            saveOrgaoData(orgaoId, orgaoData);
        }

        // Cargo do usuário
        const membroAtual = orgaoData.membros.find(m => m.username.toLowerCase() === username.toLowerCase());
        if (!membroAtual) {
            orgaoData.membros.push({ username, cargo: 'Membro' });
            saveOrgaoData(orgaoId, orgaoData);
            meuCargo = 'Membro';
        } else {
            meuCargo = membroAtual.cargo;
        }

        // Admin do sistema → Líder automático se não houver
        const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');
        const isAdmin = admins.includes(username);
        const temLider = orgaoData.membros.some(m => m.cargo === 'Líder');
        if (isAdmin && !temLider) {
            const me = orgaoData.membros.find(m => m.username.toLowerCase() === username.toLowerCase());
            if (me) { me.cargo = 'Líder'; meuCargo = 'Líder'; saveOrgaoData(orgaoId, orgaoData); }
        }

        // Atualizar UI
        document.getElementById('pageTitle').textContent = `DME TREINO | ${orgaoInfo.title}`;
        document.getElementById('orgaoTitle').textContent = orgaoInfo.title;
        document.getElementById('orgaoIcon').textContent = '';
        document.getElementById('orgaoMembros').textContent = `${orgaoData.membros.length} Membro(s)`;
        document.getElementById('orgaoBadge').textContent = meuCargo;

        document.getElementById('navUserName').textContent = username;
        document.getElementById('dropdownName').textContent = username;
        document.getElementById('dropdownCargo').textContent = meuCargo + ' · ' + orgaoInfo.title;
        const avatarHead = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std&head_direction=2`;
        const avatarFull = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&size=m&direction=2&head_direction=2&gesture=std`;
        document.getElementById('navUserImage').src = avatarHead;
        document.getElementById('dropdownUserImage').src = avatarFull;

        if (isAdmin) {
            document.getElementById('dropdownPainel').style.display = 'flex';
            document.getElementById('dropdownDivider').style.display = 'block';
        }
        if (isLider()) {
            document.getElementById('liderancaSection').style.display = 'block';
        }

        // Hamburger
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('mobileSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('sidebarClose');
        const toggle = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
        hamburger.addEventListener('click', toggle);
        closeBtn.addEventListener('click', toggle);
        overlay.addEventListener('click', toggle);

        // Dropdown usuário
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');
        userProfileBtn.addEventListener('click', e => { e.stopPropagation(); userDropdown.classList.toggle('active'); });
        document.addEventListener('click', () => userDropdown.classList.remove('active'));

        // Fechar modais ao clicar fora
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
        });

        navigateTo('inicio');
    });
})();
