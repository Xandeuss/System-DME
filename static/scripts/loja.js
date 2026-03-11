/**
 * LOJA - DME TREINO
 * Sistema de recompensas com dragonas (pontos de fidelidade)
 * Inclui: Acúmulo automático de dragonas, catálogo administrável, histórico de compras
 */

(function () {
    'use strict';

    // ── AUTH GUARD ──
    const username = localStorage.getItem('dme_username');
    if (!username) {
        window.location.href = '/login';
        return;
    }

    // ── VARIÁVEIS GLOBAIS ──
    let produtoParaComprar = null;
    let categoriaParaAdicionar = null;

    // ══════════════════════════════════════════════════════════════════════════════
    // FUNÇÕES BÁSICAS
    // ══════════════════════════════════════════════════════════════════════════════

    function logout() {
        localStorage.removeItem('dme_username');
        window.location.href = '/login';
    }



    // ══════════════════════════════════════════════════════════════════════════════
    // SISTEMA DE DRAGONAS
    // ══════════════════════════════════════════════════════════════════════════════

    function getDragonas() {
        const dragonasData = JSON.parse(localStorage.getItem('dme_dragonas') || '{}');
        return dragonasData[username] || 0;
    }

    function setDragonas(valor) {
        const dragonasData = JSON.parse(localStorage.getItem('dme_dragonas') || '{}');
        dragonasData[username] = Math.max(0, valor);
        localStorage.setItem('dme_dragonas', JSON.stringify(dragonasData));
        atualizarSaldoUI();
    }

    function adicionarDragonas(quantidade) {
        const atual = getDragonas();
        setDragonas(atual + quantidade);
    }

    function removerDragonas(quantidade) {
        const atual = getDragonas();
        if (atual >= quantidade) {
            setDragonas(atual - quantidade);
            return true;
        }
        return false;
    }

    function atualizarSaldoUI() {
        const saldo = getDragonas();
        document.getElementById('saldoDragonas').textContent = saldo.toLocaleString('pt-BR');
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // SISTEMA DE ACÚMULO AUTOMÁTICO (1h ininterrupta = 50 dragonas)
    // ══════════════════════════════════════════════════════════════════════════════

    function iniciarContadorDragonas() {
        const INTERVALO_DRAGONAS = 60 * 60 * 1000; // 1 hora em ms
        const DRAGONAS_POR_HORA = 50;

        // Verificar último acúmulo
        const ultimoAcumulo = localStorage.getItem('dme_ultimo_acumulo_dragonas');
        const agora = Date.now();

        if (ultimoAcumulo) {
            const tempoDecorrido = agora - parseInt(ultimoAcumulo);
            if (tempoDecorrido >= INTERVALO_DRAGONAS) {
                const horasCompletas = Math.floor(tempoDecorrido / INTERVALO_DRAGONAS);
                adicionarDragonas(horasCompletas * DRAGONAS_POR_HORA);
                localStorage.setItem('dme_ultimo_acumulo_dragonas', agora.toString());
                console.log(`✅ ${horasCompletas * DRAGONAS_POR_HORA} dragonas adicionadas!`);
            }
        } else {
            localStorage.setItem('dme_ultimo_acumulo_dragonas', agora.toString());
        }

        // Atualizar a cada hora
        setInterval(() => {
            adicionarDragonas(DRAGONAS_POR_HORA);
            localStorage.setItem('dme_ultimo_acumulo_dragonas', Date.now().toString());
            console.log(`✅ ${DRAGONAS_POR_HORA} dragonas adicionadas automaticamente!`);
        }, INTERVALO_DRAGONAS);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // CATÁLOGO (CATEGORIAS E PRODUTOS)
    // ══════════════════════════════════════════════════════════════════════════════

    function getCatalogo() {
        return JSON.parse(localStorage.getItem('dme_loja_catalogo') || '[]');
    }

    function setCatalogo(catalogo) {
        localStorage.setItem('dme_loja_catalogo', JSON.stringify(catalogo));
    }

    function carregarCatalogo() {
        const catalogo = getCatalogo();
        const container = document.getElementById('catalogoContainer');

        if (catalogo.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏪</div>
                    <p>Nenhuma categoria criada ainda</p>
                    ${isAdmin() ? '<p style="font-size:0.85rem;margin-top:8px;">Use o painel administrativo para criar categorias</p>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = catalogo.map(cat => renderCategoria(cat)).join('');
    }

    function renderCategoria(categoria) {
        const produtos = categoria.produtos || [];
        const count = produtos.length;

        const adminButtons = isAdmin() ? `
            <div class="cat-admin-actions">
                <button class="cat-admin-btn" onclick="abrirModalProduto('${categoria.id}')" title="Adicionar produto">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M12 5v14M5 12h14"/></svg>
                    Produto
                </button>
                <button class="cat-admin-btn danger" onclick="excluirCategoria('${categoria.id}')" title="Excluir categoria">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            </div>
        ` : '';

        const produtosHtml = count > 0
            ? `<div class="products-grid">${produtos.map(p => renderProduto(p, categoria.id)).join('')}</div>`
            : `<div class="cat-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <p>Nenhum produto nesta categoria${isAdmin() ? '<br><span>Clique em &ldquo;+ Produto&rdquo; para adicionar</span>' : ''}</p>
               </div>`;

        return `
            <div class="catalog-section">
                <div class="catalog-header">
                    <div class="catalog-title">
                        <span class="cat-ico">${categoria.icone}</span>
                        ${categoria.nome}
                        <span class="cat-count-badge">${count}</span>
                    </div>
                    ${adminButtons}
                </div>
                ${produtosHtml}
            </div>
        `;
    }

    function renderProduto(produto, categoriaId) {
        const esgotado = produto.estoque > 0 && produto.estoque <= (produto.vendidos || 0);
        const disponiveis = produto.estoque > 0 ? produto.estoque - (produto.vendidos || 0) : null;

        const imagemHtml = produto.imagem
            ? `<img src="${produto.imagem}" alt="${produto.nome}">`
            : `<div class="product-img-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>`;

        const stockBadge = produto.estoque > 0
            ? `<div class="product-stock-badge ${esgotado ? 'out' : ''}">${esgotado ? 'Esgotado' : `${disponiveis} disp.`}</div>`
            : '';

        const adminBtns = isAdmin() ? `
            <div class="product-admin-overlay">
                <button class="product-admin-btn" onclick="editarProduto('${categoriaId}', '${produto.id}')" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="product-admin-btn danger" onclick="excluirProduto('${categoriaId}', '${produto.id}')" title="Excluir">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
            </div>
        ` : '';

        return `
            <div class="product-card ${esgotado ? 'sold-out' : ''}">
                <div class="product-image">
                    ${imagemHtml}
                    ${stockBadge}
                    ${adminBtns}
                </div>
                <div class="product-body">
                    <div class="product-name">${produto.nome}</div>
                    <div class="product-desc">${produto.descricao || ''}</div>
                </div>
                <div class="product-footer">
                    <div class="product-price">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ${produto.preco.toLocaleString('pt-BR')}
                    </div>
                    <button class="btn-buy ${esgotado ? 'disabled' : ''}" onclick="abrirModalCompra('${categoriaId}', '${produto.id}')" ${esgotado ? 'disabled' : ''}>
                        ${esgotado ? 'Esgotado' : 'Comprar'}
                    </button>
                </div>
            </div>
        `;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ADMINISTRAÇÃO
    // ══════════════════════════════════════════════════════════════════════════════

    function isAdmin() {
        const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');
        return admins.includes(username);
    }

    function mostrarPainelAdmin() {
        if (isAdmin()) {
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('dropdownPainel').style.display = 'flex';
            document.getElementById('dropdownDivider').style.display = 'block';
        }
    }

    window.salvarCategoria = function () {
        const nome = document.getElementById('inputNomeCategoria').value.trim();
        const icone = document.getElementById('inputIconeCategoria').value.trim() || '🎁';

        if (!nome) {
            alert('❌ Digite o nome da categoria!');
            return;
        }

        const catalogo = getCatalogo();
        catalogo.push({
            id: Date.now().toString(),
            nome,
            icone,
            produtos: []
        });

        setCatalogo(catalogo);
        fecharModal('modalCategoria');
        carregarCatalogo();

        document.getElementById('inputNomeCategoria').value = '';
        document.getElementById('inputIconeCategoria').value = '';
    };

    window.excluirCategoria = function (catId) {
        if (!confirm('⚠️ Deseja realmente excluir esta categoria e todos os seus produtos?')) return;

        let catalogo = getCatalogo();
        catalogo = catalogo.filter(c => c.id !== catId);
        setCatalogo(catalogo);
        carregarCatalogo();
    };

    window.abrirModalProduto = function (catId) {
        categoriaParaAdicionar = catId;
        document.getElementById('produtoCategoriaId').value = catId;
        document.getElementById('produtoEditandoId').value = ''; // Limpar ID de edição

        // Resetar título do modal para "Novo Produto"
        document.querySelector('#modalProduto .g-modal-title').textContent = 'Novo Produto';
        document.querySelector('#modalProduto .btn-primary').textContent = 'Adicionar Produto';

        // Limpar campos
        document.getElementById('inputNomeProduto').value = '';
        document.getElementById('inputDescProduto').value = '';
        document.getElementById('inputPrecoProduto').value = '';
        document.getElementById('inputImagemProduto').value = '';
        document.getElementById('inputEstoqueProduto').value = '';

        abrirModal('modalProduto');
    };

    window.salvarProduto = function () {
        const catId = document.getElementById('produtoCategoriaId').value;
        const produtoEditandoId = document.getElementById('produtoEditandoId').value;
        const nome = document.getElementById('inputNomeProduto').value.trim();
        const descricao = document.getElementById('inputDescProduto').value.trim();
        const preco = parseInt(document.getElementById('inputPrecoProduto').value) || 0;
        const imagem = document.getElementById('inputImagemProduto').value.trim();
        const estoque = parseInt(document.getElementById('inputEstoqueProduto').value) || 0;

        if (!nome || preco <= 0) {
            alert('❌ Preencha nome e preço!');
            return;
        }

        const catalogo = getCatalogo();
        const categoria = catalogo.find(c => c.id === catId);
        if (!categoria) return;

        if (produtoEditandoId) {
            // EDITAR produto existente
            const produto = categoria.produtos.find(p => p.id === produtoEditandoId);
            if (produto) {
                produto.nome = nome;
                produto.descricao = descricao;
                produto.preco = preco;
                produto.imagem = imagem;
                produto.estoque = estoque;
            }
        } else {
            // CRIAR novo produto
            categoria.produtos.push({
                id: Date.now().toString(),
                nome,
                descricao,
                preco,
                imagem,
                estoque,
                vendidos: 0
            });
        }

        setCatalogo(catalogo);
        fecharModal('modalProduto');
        carregarCatalogo();

        // Limpar form
        document.getElementById('produtoEditandoId').value = '';
        document.getElementById('inputNomeProduto').value = '';
        document.getElementById('inputDescProduto').value = '';
        document.getElementById('inputPrecoProduto').value = '';
        document.getElementById('inputImagemProduto').value = '';
        document.getElementById('inputEstoqueProduto').value = '';
    };

    window.editarProduto = function (catId, prodId) {
        const catalogo = getCatalogo();
        const categoria = catalogo.find(c => c.id === catId);
        if (!categoria) return;

        const produto = categoria.produtos.find(p => p.id === prodId);
        if (!produto) return;

        // Preencher o form com os dados atuais
        document.getElementById('produtoCategoriaId').value = catId;
        document.getElementById('produtoEditandoId').value = prodId;
        document.getElementById('inputNomeProduto').value = produto.nome;
        document.getElementById('inputDescProduto').value = produto.descricao;
        document.getElementById('inputPrecoProduto').value = produto.preco;
        document.getElementById('inputImagemProduto').value = produto.imagem || '';
        document.getElementById('inputEstoqueProduto').value = produto.estoque;

        // Mudar título do modal
        document.querySelector('#modalProduto .g-modal-title').textContent = 'Editar Produto';
        document.querySelector('#modalProduto .btn-primary').textContent = 'Salvar Alterações';

        abrirModal('modalProduto');
    };

    window.excluirProduto = function (catId, prodId) {
        if (!confirm('⚠️ Deseja realmente excluir este produto?')) return;

        const catalogo = getCatalogo();
        const categoria = catalogo.find(c => c.id === catId);
        if (!categoria) return;

        categoria.produtos = categoria.produtos.filter(p => p.id !== prodId);
        setCatalogo(catalogo);
        carregarCatalogo();
    };

    // ══════════════════════════════════════════════════════════════════════════════
    // COMPRA
    // ══════════════════════════════════════════════════════════════════════════════

    window.abrirModalCompra = function (catId, prodId) {
        const catalogo = getCatalogo();
        const categoria = catalogo.find(c => c.id === catId);
        if (!categoria) return;

        const produto = categoria.produtos.find(p => p.id === prodId);
        if (!produto) return;

        produtoParaComprar = { categoria: catId, produto: prodId, dados: produto };

        const saldoAtual = getDragonas();
        const podeComprar = saldoAtual >= produto.preco;

        const imagemHtml = produto.imagem
            ? `<img src="${produto.imagem}" alt="${produto.nome}" class="compra-preview-image">`
            : '';

        document.getElementById('compraPreview').innerHTML = `
            ${imagemHtml}
            <div class="compra-preview-nome">${produto.nome}</div>
            <div class="compra-preview-desc">${produto.descricao}</div>
            <div class="compra-preview-preco">💎 ${produto.preco} dragonas</div>
            <div class="compra-preview-saldo" style="color:${podeComprar ? 'var(--primary-green)' : 'var(--red)'}">
                Seu saldo: ${saldoAtual} dragonas
            </div>
        `;

        // Desabilitar botão se não tiver saldo
        const btnConfirmar = document.querySelector('#modalCompra .btn-primary');
        if (btnConfirmar) {
            btnConfirmar.disabled = !podeComprar;
            btnConfirmar.textContent = podeComprar ? 'Confirmar Compra' : 'Saldo Insuficiente';
        }

        abrirModal('modalCompra');
    };

    window.confirmarCompra = function () {
        if (!produtoParaComprar) return;

        const produto = produtoParaComprar.dados;
        const saldoAtual = getDragonas();

        if (saldoAtual < produto.preco) {
            alert('❌ Saldo insuficiente!');
            return;
        }

        // Remover dragonas
        if (!removerDragonas(produto.preco)) {
            alert('❌ Erro ao processar compra!');
            return;
        }

        // Atualizar estoque
        const catalogo = getCatalogo();
        const categoria = catalogo.find(c => c.id === produtoParaComprar.categoria);
        const prod = categoria.produtos.find(p => p.id === produtoParaComprar.produto);
        prod.vendidos = (prod.vendidos || 0) + 1;
        setCatalogo(catalogo);

        // Adicionar ao histórico
        adicionarAoHistorico({
            produto: produto.nome,
            preco: produto.preco,
            data: new Date().toLocaleString('pt-BR')
        });

        alert(`✅ Compra realizada com sucesso!\n\n${produto.nome} adquirido por ${produto.preco} dragonas.`);

        fecharModal('modalCompra');
        carregarCatalogo();
        carregarHistorico();
    };

    // ══════════════════════════════════════════════════════════════════════════════
    // HISTÓRICO
    // ══════════════════════════════════════════════════════════════════════════════

    function getHistorico() {
        const historicos = JSON.parse(localStorage.getItem('dme_loja_historico') || '{}');
        return historicos[username] || [];
    }

    function adicionarAoHistorico(compra) {
        const historicos = JSON.parse(localStorage.getItem('dme_loja_historico') || '{}');
        if (!historicos[username]) historicos[username] = [];
        historicos[username].unshift(compra);
        localStorage.setItem('dme_loja_historico', JSON.stringify(historicos));
    }

    function carregarHistorico() {
        const historico = getHistorico();
        const container = document.getElementById('historicoList');

        if (historico.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🛒</div>
                    <p>Você ainda não realizou nenhuma compra</p>
                </div>
            `;
            return;
        }

        container.innerHTML = historico.map(h => `
            <div class="historico-item">
                <div class="historico-info">
                    <div class="historico-produto">${h.produto}</div>
                    <div class="historico-data">${h.data}</div>
                </div>
                <div class="historico-preco">💎 ${h.preco}</div>
            </div>
        `).join('');
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // MODAIS
    // ══════════════════════════════════════════════════════════════════════════════

    function abrirModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    window.fecharModal = function (modalId) {
        document.getElementById(modalId).classList.remove('active');
    };

    // Fechar ao clicar fora
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    // ══════════════════════════════════════════════════════════════════════════════
    // INICIALIZAÇÃO
    // ══════════════════════════════════════════════════════════════════════════════

    document.addEventListener('DOMContentLoaded', () => {
        // Tema
        window.applyTheme(localStorage.getItem('dme_theme') || 'dark');

        // Usuário
        document.getElementById('navUserName').textContent = username;
        document.getElementById('dropdownName').textContent = username;
        const avatarHead = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&headonly=1&size=m&gesture=std&head_direction=2`;
        const avatarFull = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(username)}&size=m&direction=2&head_direction=2&gesture=std`;
        document.getElementById('navUserImage').src = avatarHead;
        document.getElementById('dropdownUserImage').src = avatarFull;

        // Cargo (órgão selecionado)
        try {
            const orgao = JSON.parse(localStorage.getItem('dme_orgao_atual') || 'null');
            if (orgao) {
                document.getElementById('dropdownCargo').textContent = orgao.sub ? `${orgao.title} · ${orgao.sub}` : orgao.title;
            }
        } catch (_) { }

        // Sidebar
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('mobileSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('sidebarClose');

        const toggleSidebar = () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };

        hamburger.addEventListener('click', toggleSidebar);
        closeBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);

        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        });

        // Dropdown
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');

        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            userDropdown.classList.remove('active');
        });

        // Admin
        mostrarPainelAdmin();

        document.getElementById('btnNovaCategoria')?.addEventListener('click', () => {
            abrirModal('modalCategoria');
        });

        // Carregar dados
        atualizarSaldoUI();
        carregarCatalogo();
        carregarHistorico();

        // Iniciar contador automático de dragonas
        iniciarContadorDragonas();

        console.log('🏪 Loja DME TREINO carregada!');
    });

})();
