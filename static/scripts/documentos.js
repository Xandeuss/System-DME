const CONFIG = {
    key: "dme_documentos",
    categorias: [
        { id: "triplice", titulo: "Triplice Documental", icon: "⚖️" },
        { id: "apendices", titulo: "Apendices", icon: "📎" },
        { id: "portarias", titulo: "Portarias", icon: "📜" },
        { id: "tutoriais", titulo: "Tutoriais", icon: "📚" }
    ]
};

let docsData = { categorias: [] };
let currentDocId = null;
let currentUser = localStorage.getItem("dme_username") || "";
let isEditing = false;
let editingId = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!currentUser) {
        window.location.href = "/login";
        return;
    }

    loadData();
    loadUserProfile();
    renderSidebar();
    checkAdminPermissions();
    setupMobileSidebar();
    setupEditorBindings();
    setupModalBehavior();
    updateEditorPreview();
});

function loadUserProfile() {
    const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(currentUser)}&headonly=1&size=m&direction=2&head_direction=2`;
    const navUserName = document.getElementById("navUserName");
    const navUserImage = document.getElementById("navUserImage");
    const dropdownName = document.getElementById("dropdownName");
    const dropdownUserImage = document.getElementById("dropdownUserImage");
    const dropdownCargo = document.getElementById("dropdownCargo");

    if (navUserName) navUserName.textContent = currentUser;
    if (navUserImage) navUserImage.src = avatarUrl;
    if (dropdownName) dropdownName.textContent = currentUser;
    if (dropdownUserImage) dropdownUserImage.src = avatarUrl;
    if (dropdownCargo) dropdownCargo.textContent = "Militar DME";

    const admins = JSON.parse(localStorage.getItem("dme_admins") || "[]");
    const isAdmin = admins.includes(currentUser) || ["Xandelicado", "rafacv", "Ronaldo"].includes(currentUser);
    if (isAdmin) {
        const painel = document.getElementById("dropdownPainel");
        const divider = document.getElementById("dropdownDivider");
        if (painel) painel.style.display = "block";
        if (divider) divider.style.display = "block";
    }

    const btn = document.getElementById("userProfileBtn");
    const dropdown = document.getElementById("userDropdown");
    if (btn && dropdown) {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            dropdown.classList.toggle("active");
        });

        document.addEventListener("click", () => dropdown.classList.remove("active"));
        dropdown.addEventListener("click", (event) => event.stopPropagation());
    }
}

function loadData() {
    try {
        const saved = localStorage.getItem(CONFIG.key);
        if (saved) {
            const parsed = JSON.parse(saved);
            docsData.categorias = buildCategoriesFromStorage(parsed.categorias || []);
        } else {
            docsData.categorias = CONFIG.categorias.map((cat) => ({
                ...cat,
                documentos: []
            }));
            createSeedDocument();
            saveData();
        }
    } catch (error) {
        console.warn("Documentos: erro ao carregar dados, recriando estrutura local.", error);
        docsData.categorias = CONFIG.categorias.map((cat) => ({
            ...cat,
            documentos: []
        }));
        createSeedDocument();
        saveData();
    }
}

function buildCategoriesFromStorage(savedCategories) {
    const map = new Map(savedCategories.map((cat) => [cat.id, cat]));
    const categories = CONFIG.categorias.map((defaultCategory) => {
        const stored = map.get(defaultCategory.id) || {};
        const documentos = Array.isArray(stored.documentos) ? stored.documentos.map((doc) => normalizeDocument(doc, defaultCategory.id)) : [];
        return {
            ...defaultCategory,
            documentos
        };
    });

    savedCategories.forEach((cat) => {
        if (!categories.find((existing) => existing.id === cat.id)) {
            categories.push({
                id: cat.id,
                titulo: cat.titulo || "Categoria",
                icon: cat.icon || "DOC",
                documentos: Array.isArray(cat.documentos) ? cat.documentos.map((doc) => normalizeDocument(doc, cat.id)) : []
            });
        }
    });

    return categories;
}

function normalizeDocument(doc, categoryId) {
    const author = doc.autor || doc.author || doc.createdBy || "Sistema";
    const createdAt = doc.createdAt || doc.dataCriacao || doc.data || formatDateTime();
    const updatedAt = doc.updatedAt || doc.dataEdicao || doc.data || createdAt;
    const lastEditor = doc.lastEditor || doc.ultimoEditor || author;
    const source = doc.source || doc.fonte || "";

    return {
        id: doc.id || generateId(),
        titulo: doc.titulo || "Documento sem titulo",
        conteudo: doc.conteudo || "",
        autor: author,
        createdAt,
        updatedAt,
        data: updatedAt,
        lastEditor,
        source,
        categoryId: categoryId || doc.categoryId || "triplice"
    };
}

function createSeedDocument() {
    const categoriaInicial = docsData.categorias.find((cat) => cat.id === "triplice");
    if (!categoriaInicial) return;

    categoriaInicial.documentos.unshift(normalizeDocument({
        id: generateId(),
        titulo: "Codigo de Conduta Militar",
        conteudo: [
            "[h1]Codigo de Conduta Militar[/h1]",
            "",
            "[quote=Estado-Maior]Este documento demonstra a nova estrutura de BBCode da area de Documentos.[/quote]",
            "",
            "[panel][b]Objetivo:[/b] padronizar textos longos, com secoes, blocos e tabelas mais legiveis.[/panel]",
            "",
            "[h2]Diretrizes gerais[/h2]",
            "[list]",
            "[*][b]Disciplina[/b] em todos os atos oficiais.",
            "[*][i]Clareza[/i] nos comunicados internos.",
            "[*][u]Registro[/u] estruturado de conteudos institucionais.",
            "[/list]",
            "",
            "[h2]Tabela de exemplo[/h2]",
            "[table]",
            "[tr][th]Item[/th][th]Descricao[/th][/tr]",
            "[tr][td]Portarias[/td][td]Normas internas e atos oficiais.[/td][/tr]",
            "[tr][td]Apendices[/td][td]Complementos tecnicos e anexos.[/td][/tr]",
            "[/table]",
            "",
            "[source]Use este campo para importar observacoes, referencia institucional ou observacoes de origem externa.[/source]"
        ].join("\n"),
        autor: "Sistema",
        lastEditor: "Sistema",
        createdAt: formatDateTime(),
        updatedAt: formatDateTime(),
        source: ""
    }, "triplice"));
}

function saveData() {
    localStorage.setItem(CONFIG.key, JSON.stringify(docsData));
}

function generateId() {
    return "_" + Math.random().toString(36).slice(2, 11);
}

function formatDateTime(date = new Date()) {
    const baseDate = date instanceof Date ? date : new Date(date);
    return `${baseDate.toLocaleDateString("pt-BR")} ${baseDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    })}`;
}

function getCategoryById(categoryId) {
    return docsData.categorias.find((cat) => cat.id === categoryId) || null;
}

function findDocumentById(id) {
    for (const category of docsData.categorias) {
        const index = category.documentos.findIndex((doc) => doc.id === id);
        if (index !== -1) {
            return {
                category,
                document: category.documentos[index],
                index
            };
        }
    }
    return null;
}

function renderSidebar() {
    const container = document.getElementById("docsCategories");
    if (!container) return;

    container.innerHTML = docsData.categorias.map((category) => {
        const hasDocs = category.documentos.length > 0;
        const hasActive = category.documentos.some((doc) => doc.id === currentDocId);
        const expanded = hasDocs || hasActive;

        return `
            <div class="doc-cat-section ${expanded ? "expanded" : ""} ${hasDocs ? "has-docs" : ""}" id="cat-${category.id}">
                <div class="doc-cat-hdr" onclick="toggleCat('${category.id}')">
                    <span class="doc-cat-ico">${category.icon}</span>
                    <span class="doc-cat-name">${escapeHtml(category.titulo)}</span>
                    <span class="doc-cat-count">${category.documentos.length}</span>
                    <span class="doc-cat-chevron">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </span>
                </div>
                <div class="doc-cat-list">
                    ${hasDocs ? category.documentos.map((doc) => `
                        <button type="button" class="doc-item ${currentDocId === doc.id ? "active" : ""}" onclick="viewDocument('${doc.id}')">
                            ${escapeHtml(doc.titulo)}
                        </button>
                    `).join("") : '<div class="doc-empty-hint">Nenhum documento</div>'}
                </div>
            </div>
        `;
    }).join("");

    renderCategorySelect();
    renderPlaceholder();
}

function renderCategorySelect() {
    const select = document.getElementById("editCategory");
    if (!select) return;

    select.innerHTML = docsData.categorias.map((category) => `
        <option value="${category.id}">${escapeHtml(category.titulo)}</option>
    `).join("");
}

function toggleCat(categoryId) {
    const section = document.getElementById(`cat-${categoryId}`);
    if (section) {
        section.classList.toggle("expanded");
    }
}

function renderPlaceholder() {
    const grid = document.getElementById("cpGrid");
    if (!grid) return;

    grid.innerHTML = docsData.categorias.map((category) => {
        const items = category.documentos.slice(0, 5);
        return `
            <div class="cp-cat-card ${items.length ? "has-docs" : ""}">
                <div class="cp-cat-card-head">
                    <span class="cp-cat-card-ico">${category.icon}</span>
                    <span class="cp-cat-card-title">${escapeHtml(category.titulo)}</span>
                    <span class="cp-cat-card-count">${category.documentos.length}</span>
                </div>
                ${items.length ? items.map((doc) => `
                    <button type="button" class="cp-doc-link" onclick="viewDocument('${doc.id}')">${escapeHtml(doc.titulo)}</button>
                `).join("") : '<div class="cp-empty-cat">Nenhum documento nesta categoria.</div>'}
            </div>
        `;
    }).join("");
}

function viewDocument(id) {
    const found = findDocumentById(id);
    if (!found) return;

    currentDocId = id;
    const doc = found.document;
    const category = found.category;
    const result = renderContent(doc.conteudo);

    const placeholder = document.getElementById("contentPlaceholder");
    const viewer = document.getElementById("documentViewer");
    const body = document.getElementById("viewContent");
    const title = document.getElementById("viewTitle");
    const author = document.getElementById("viewAuthor");
    const date = document.getElementById("viewDate");
    const breadcrumbCat = document.getElementById("docBreadcrumbCat");
    const breadcrumbDoc = document.getElementById("docBreadcrumbDoc");

    if (placeholder) placeholder.style.display = "none";
    if (viewer) viewer.style.display = "block";
    if (title) title.textContent = doc.titulo;
    if (author) author.textContent = doc.autor;
    if (date) date.textContent = doc.updatedAt || doc.data;
    if (breadcrumbCat) breadcrumbCat.textContent = category.titulo;
    if (breadcrumbDoc) breadcrumbDoc.textContent = doc.titulo;
    if (body) {
        body.innerHTML = result.html;
        body.classList.toggle("html-content", result.isHTML);
        if (result.isHTML) {
            // Aguarda o layout ser calculado antes de escalar
            requestAnimationFrame(() => fitHtmlContent(body));
        }
    }

    renderSourceMeta(doc);
    renderEditorMeta(doc);
    renderSidebar();
}

/**
 * Envolve o conteudo HTML legado num scaler e aplica transform:scale
 * para que o documento caiba corretamente no container sem quebrar
 * o layout interno (tabelas, imagens lado a lado, etc).
 */
function fitHtmlContent(container) {
    // Remove scaler anterior se existir
    const existing = container.querySelector(".doc-html-scaler");
    if (existing) {
        const children = Array.from(existing.childNodes);
        children.forEach((child) => container.appendChild(child));
        existing.remove();
    }

    // Cria o wrapper scaler
    const scaler = document.createElement("div");
    scaler.className = "doc-html-scaler";

    // Move todos os filhos para dentro do scaler
    while (container.firstChild) {
        scaler.appendChild(container.firstChild);
    }
    container.appendChild(scaler);

    // Mede a largura natural do conteudo
    const naturalWidth = scaler.scrollWidth;
    const availableWidth = container.clientWidth;

    if (naturalWidth > 0 && naturalWidth > availableWidth) {
        const scale = availableWidth / naturalWidth;
        scaler.style.transform = `scale(${scale})`;
        scaler.style.transformOrigin = "top left";
        // Ajusta a altura do container para refletir o conteudo escalado
        scaler.style.height = "auto";
        requestAnimationFrame(() => {
            container.style.minHeight = `${scaler.scrollHeight * scale}px`;
        });
    } else {
        scaler.style.transform = "";
        scaler.style.transformOrigin = "";
        container.style.minHeight = "";
    }

    // Re-aplica ao redimensionar janela
    if (!container._fitResizeListener) {
        container._fitResizeListener = () => fitHtmlContent(container);
        window.addEventListener("resize", container._fitResizeListener);
    }
}

function renderSourceMeta(doc) {
    const chip = document.getElementById("viewSourceChip");
    const link = document.getElementById("viewSourceLink");
    const text = document.getElementById("viewSourceText");
    if (!chip || !link || !text) return;

    const sourceValue = (doc.source || "").trim();
    if (!sourceValue) {
        chip.style.display = "none";
        link.style.display = "none";
        text.style.display = "none";
        return;
    }

    const safeUrl = sanitizeUrl(sourceValue);
    chip.style.display = "inline-flex";
    if (safeUrl) {
        link.style.display = "inline";
        text.style.display = "none";
        link.href = safeUrl;
        link.textContent = compactLabel(sourceValue, 36);
    } else {
        link.style.display = "none";
        text.style.display = "inline";
        text.textContent = compactLabel(sourceValue, 36);
    }
}

function renderEditorMeta(doc) {
    const container = document.getElementById("viewEditorMeta");
    const initials = document.getElementById("viewEditorInitials");
    const editorName = document.getElementById("viewLastEditorName");
    const editorDate = document.getElementById("viewLastEditorDate");
    const createdBy = document.getElementById("viewCreatedBy");
    if (!container || !initials || !editorName || !editorDate || !createdBy) return;

    const editor = doc.lastEditor || doc.autor || "Sistema";
    container.style.display = "inline-flex";
    container.style.setProperty("--editor-hue", String(computeHue(editor)));
    initials.textContent = getInitials(editor);
    editorName.textContent = editor;
    editorDate.textContent = doc.updatedAt || doc.data || "-";
    createdBy.textContent = doc.autor || "Sistema";
}

function renderContent(text) {
    if (!text) {
        return {
            html: "",
            isHTML: false,
            format: "empty"
        };
    }

    if (window.DMEBBCode && typeof window.DMEBBCode.render === "function") {
        return window.DMEBBCode.render(text);
    }

    return {
        html: escapeHtml(normalizeNewlines(text)).replace(/\n/g, "<br>"),
        isHTML: false,
        format: "plain"
    };
}

function parseBBCode(text) {
    const result = renderContent(text);
    return result.html;
}

function normalizeNewlines(text) {
    return String(text || "").replace(/\r\n?/g, "\n").trim();
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttribute(text) {
    return escapeHtml(text).replace(/`/g, "&#96;");
}

function decodeBasicEntities(text) {
    return String(text || "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function sanitizeUrl(value, options = {}) {
    const clean = decodeBasicEntities(value).trim();
    if (!clean) return "";

    const allowDataImage = Boolean(options.allowDataImage);
    if (/^(https?:\/\/|mailto:|\/)/i.test(clean)) return clean;
    if (allowDataImage && /^data:image\//i.test(clean)) return clean;
    return "";
}

function compactLabel(text, maxLength) {
    const value = String(text || "").trim();
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}…`;
}

function computeHue(text) {
    let hash = 0;
    const value = String(text || "");
    for (let index = 0; index < value.length; index += 1) {
        hash = value.charCodeAt(index) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}

function getInitials(name) {
    const parts = String(name || "SI").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "SI";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function setupEditorBindings() {
    ["editTitle", "editCategory", "editSource", "editContent"].forEach((fieldId) => {
        const element = document.getElementById(fieldId);
        if (!element) return;

        const eventName = element.tagName === "SELECT" ? "change" : "input";
        element.addEventListener(eventName, updateEditorPreview);
    });
}

function setupModalBehavior() {
    const modal = document.getElementById("modalEditor");
    if (!modal) return;

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            fecharModal("modalEditor");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "flex") {
            fecharModal("modalEditor");
        }
    });
}

function updateEditorPreview() {
    const titleInput = document.getElementById("editTitle");
    const categoryInput = document.getElementById("editCategory");
    const sourceInput = document.getElementById("editSource");
    const contentInput = document.getElementById("editContent");
    const previewTitle = document.getElementById("editPreviewTitle");
    const previewCategory = document.getElementById("editPreviewCategory");
    const previewAuthor = document.getElementById("editPreviewAuthor");
    const previewDate = document.getElementById("editPreviewDate");
    const previewContent = document.getElementById("editPreviewContent");
    const previewMode = document.getElementById("previewModeLabel");
    const previewSourceLink = document.getElementById("editPreviewSourceLink");
    const previewSourceText = document.getElementById("editPreviewSourceText");
    const editorStats = document.getElementById("editorStats");

    const title = titleInput ? titleInput.value.trim() : "";
    const content = contentInput ? contentInput.value : "";
    const category = getCategoryById(categoryInput ? categoryInput.value : "triplice");
    const source = sourceInput ? sourceInput.value.trim() : "";

    if (previewTitle) previewTitle.textContent = title || "Titulo do documento";
    if (previewCategory) previewCategory.textContent = category ? category.titulo : "Categoria";
    if (previewAuthor) previewAuthor.textContent = `Editor: ${currentUser || "Sistema"}`;
    if (previewDate) previewDate.textContent = isEditing ? "Preview da edicao" : "Preview do rascunho";

    const safeSource = sanitizeUrl(source);
    if (previewSourceLink && previewSourceText) {
        if (source && safeSource) {
            previewSourceLink.style.display = "inline-flex";
            previewSourceLink.href = safeSource;
            previewSourceLink.textContent = compactLabel(source, 32);
            previewSourceText.style.display = "none";
        } else if (source) {
            previewSourceLink.style.display = "none";
            previewSourceText.style.display = "inline-flex";
            previewSourceText.textContent = compactLabel(source, 32);
        } else {
            previewSourceLink.style.display = "none";
            previewSourceText.style.display = "none";
        }
    }

    if (editorStats) {
        const lines = content ? content.split(/\r\n|\r|\n/).length : 0;
        editorStats.textContent = `${content.length} caracteres · ${lines} linhas`;
    }

    if (!previewContent) return;

    if (!content.trim()) {
        previewContent.classList.remove("html-content");
        previewContent.innerHTML = '<div class="bb-preview-empty">O preview do documento aparece aqui conforme voce edita.</div>';
        if (previewMode) previewMode.textContent = "Aguardando conteudo";
        return;
    }

    const result = renderContent(content);
    previewContent.classList.toggle("html-content", result.isHTML);
    previewContent.innerHTML = result.html;
    if (previewMode) {
        previewMode.textContent = result.isHTML ? "HTML detectado" : "BBCode renderizado";
    }
}

function abrirModalCriar() {
    isEditing = false;
    editingId = null;

    const modalTitle = document.getElementById("modalTitle");
    const editTitle = document.getElementById("editTitle");
    const editCategory = document.getElementById("editCategory");
    const editContent = document.getElementById("editContent");
    const editSource = document.getElementById("editSource");
    const modal = document.getElementById("modalEditor");

    if (modalTitle) modalTitle.textContent = "Novo Documento";
    if (editTitle) editTitle.value = "";
    if (editCategory) editCategory.value = "triplice";
    if (editContent) editContent.value = "";
    if (editSource) editSource.value = "";
    if (modal) modal.style.display = "flex";

    updateEditorPreview();
}

function abrirModalEditor() {
    abrirModalCriar();
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

function editarDocumentoAtual() {
    const found = currentDocId ? findDocumentById(currentDocId) : null;
    if (!found) return;

    isEditing = true;
    editingId = found.document.id;

    const modalTitle = document.getElementById("modalTitle");
    const editTitle = document.getElementById("editTitle");
    const editCategory = document.getElementById("editCategory");
    const editContent = document.getElementById("editContent");
    const editSource = document.getElementById("editSource");
    const modal = document.getElementById("modalEditor");

    if (modalTitle) modalTitle.textContent = "Editar Documento";
    if (editTitle) editTitle.value = found.document.titulo;
    if (editCategory) editCategory.value = found.category.id;
    if (editContent) editContent.value = found.document.conteudo;
    if (editSource) editSource.value = found.document.source || "";
    if (modal) modal.style.display = "flex";

    updateEditorPreview();
}

function salvarAlteracoes() {
    const titleField = document.getElementById("editTitle");
    const contentField = document.getElementById("editContent");
    const categoryField = document.getElementById("editCategory");
    const sourceField = document.getElementById("editSource");

    const titulo = titleField ? titleField.value.trim() : "";
    const conteudo = contentField ? contentField.value : "";
    const categoryId = categoryField ? categoryField.value : "triplice";
    const source = sourceField ? sourceField.value.trim() : "";

    if (!titulo) {
        alert("O titulo do documento e obrigatorio.");
        if (titleField) titleField.focus();
        return;
    }

    const targetCategory = getCategoryById(categoryId);
    if (!targetCategory) {
        alert("Selecione uma categoria valida.");
        return;
    }

    const timestamp = formatDateTime();

    if (isEditing && editingId) {
        const existing = findDocumentById(editingId);
        if (!existing) return;

        existing.category.documentos.splice(existing.index, 1);
        targetCategory.documentos.unshift(normalizeDocument({
            ...existing.document,
            id: editingId,
            titulo,
            conteudo,
            autor: existing.document.autor || currentUser,
            createdAt: existing.document.createdAt || existing.document.data,
            updatedAt: timestamp,
            data: timestamp,
            lastEditor: currentUser,
            source,
            categoryId
        }, categoryId));

        currentDocId = editingId;
    } else {
        const newId = generateId();
        targetCategory.documentos.unshift(normalizeDocument({
            id: newId,
            titulo,
            conteudo,
            autor: currentUser,
            createdAt: timestamp,
            updatedAt: timestamp,
            data: timestamp,
            lastEditor: currentUser,
            source,
            categoryId
        }, categoryId));

        currentDocId = newId;
    }

    saveData();
    fecharModal("modalEditor");
    renderSidebar();
    viewDocument(currentDocId);
}

function deletarDocumentoAtual() {
    if (!currentDocId) return;
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) return;

    const found = findDocumentById(currentDocId);
    if (!found) return;

    found.category.documentos.splice(found.index, 1);
    saveData();

    currentDocId = null;

    const placeholder = document.getElementById("contentPlaceholder");
    const viewer = document.getElementById("documentViewer");
    if (placeholder) placeholder.style.display = "flex";
    if (viewer) viewer.style.display = "none";

    renderSidebar();
}

function checkAdminPermissions() {
    // Verifica permissoes via backend
    fetch("/api/auth/me", { credentials: "include" })
        .then((res) => res.ok ? res.json() : null)
        .then((user) => {
            // Concede acesso a qualquer usuario autenticado pelo backend
            const isAdmin = !!user;

            const newButton = document.getElementById("btnNewDoc");
            const actions = document.getElementById("docActions");

            if (newButton) newButton.style.display = isAdmin ? "inline-flex" : "none";
            if (actions) actions.style.display = isAdmin ? "flex" : "none";

            // Atualiza nome e cargo se disponivel
            const dropdownCargo = document.getElementById("dropdownCargo");
            if (dropdownCargo && user && user.cargo) {
                dropdownCargo.textContent = user.cargo;
            }
        })
        .catch(() => {
            // Fallback: verifica lista local de admins
            const admins = JSON.parse(localStorage.getItem("dme_admins") || "[]");
            const isSuperAdmin = ["Xandelicado", "rafacv", "Ronaldo"].includes(currentUser);
            const isAdmin = admins.includes(currentUser) || isSuperAdmin;

            const newButton = document.getElementById("btnNewDoc");
            const actions = document.getElementById("docActions");

            if (newButton) newButton.style.display = isAdmin ? "inline-flex" : "none";
            if (actions) actions.style.display = isAdmin ? "flex" : "none";
        });
}

function logout() {
    localStorage.removeItem("dme_username");
    window.location.href = "/login";
}

function setupMobileSidebar() {
    const hamburger = document.getElementById("hamburger");
    const mobileSidebar = document.getElementById("mobileSidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidebarClose = document.getElementById("sidebarClose");

    if (!hamburger || !mobileSidebar || !sidebarOverlay || !sidebarClose) return;

    const toggleSidebar = () => {
        mobileSidebar.classList.toggle("active");
        sidebarOverlay.classList.toggle("active");
    };

    hamburger.addEventListener("click", toggleSidebar);
    sidebarClose.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);
}

function getEditorTextarea() {
    return document.getElementById("editContent");
}

function wrapSelection(openTag, closeTag) {
    const textarea = getEditorTextarea();
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);

    textarea.value = `${before}${openTag}${selected}${closeTag}${after}`;
    textarea.selectionStart = start + openTag.length;
    textarea.selectionEnd = start + openTag.length + selected.length;
    textarea.focus();
    updateEditorPreview();
}

function insertSnippetText(text) {
    const textarea = getEditorTextarea();
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const needsBreakBefore = before && !before.endsWith("\n") ? "\n" : "";
    const needsBreakAfter = after && !after.startsWith("\n") ? "\n" : "";

    textarea.value = `${before}${needsBreakBefore}${text}${needsBreakAfter}${after}`;
    const caret = before.length + needsBreakBefore.length + text.length;
    textarea.selectionStart = caret;
    textarea.selectionEnd = caret;
    textarea.focus();
    updateEditorPreview();
}

function applyEditorAction(action) {
    switch (action) {
        case "bold":
            wrapSelection("[b]", "[/b]");
            break;
        case "italic":
            wrapSelection("[i]", "[/i]");
            break;
        case "underline":
            wrapSelection("[u]", "[/u]");
            break;
        case "strike":
            wrapSelection("[s]", "[/s]");
            break;
        case "sup":
            wrapSelection("[sup]", "[/sup]");
            break;
        case "sub":
            wrapSelection("[sub]", "[/sub]");
            break;
        case "h1":
            wrapSelection("[h1]", "[/h1]");
            break;
        case "h2":
            wrapSelection("[h2]", "[/h2]");
            break;
        case "h3":
            wrapSelection("[h3]", "[/h3]");
            break;
        case "left":
            wrapSelection("[left]", "[/left]");
            break;
        case "center":
            wrapSelection("[center]", "[/center]");
            break;
        case "right":
            wrapSelection("[right]", "[/right]");
            break;
        case "justify":
            wrapSelection("[justify]", "[/justify]");
            break;
        case "indent":
            wrapSelection("[indent]", "[/indent]");
            break;
        case "divider":
            insertSnippetText("[hr]");
            break;
        case "linebreak":
            insertSnippetText("[br]");
            break;
        case "color": {
            const color = window.prompt("Cor em nome ou hexadecimal", "#22c55e");
            if (color) wrapSelection(`[color=${color}]`, "[/color]");
            break;
        }
        case "size": {
            const size = window.prompt("Tamanho em px ou nome (small, normal, large)", "18");
            if (size) wrapSelection(`[size=${size}]`, "[/size]");
            break;
        }
        case "font": {
            const font = window.prompt("Fonte. Ex: Georgia, Times New Roman", "Georgia");
            if (font) wrapSelection(`[font=${font}]`, "[/font]");
            break;
        }
        case "quote": {
            const author = window.prompt("Autor da citacao (opcional)", "");
            if (author) {
                wrapSelection(`[quote=${author}]`, "[/quote]");
            } else {
                wrapSelection("[quote]", "[/quote]");
            }
            break;
        }
        case "code": {
            const language = window.prompt("Linguagem do bloco de codigo (opcional)", "text");
            if (language) {
                wrapSelection(`[code=${language}]`, "[/code]");
            } else {
                wrapSelection("[code]", "[/code]");
            }
            break;
        }
        case "spoiler": {
            const title = window.prompt("Titulo do spoiler (opcional)", "Detalhes");
            if (title) {
                wrapSelection(`[spoiler=${title}]`, "[/spoiler]");
            } else {
                wrapSelection("[spoiler]", "[/spoiler]");
            }
            break;
        }
        case "hidden":
            wrapSelection("[hidden]", "[/hidden]");
            break;
        case "list":
            insertSnippet("list");
            break;
        case "table":
            insertSnippet("table");
            break;
        case "url": {
            const url = window.prompt("URL do link", "https://");
            if (!url) break;
            const textarea = getEditorTextarea();
            const selected = textarea ? textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) : "";
            const label = selected || window.prompt("Texto do link", "Abrir documento") || "Abrir documento";
            wrapSelection(`[url=${url}]`, "[/url]");
            if (!selected && textarea) {
                const start = textarea.selectionStart;
                textarea.setRangeText(label, start, start, "end");
                updateEditorPreview();
            }
            break;
        }
        case "image": {
            const url = window.prompt("URL da imagem", "https://");
            if (url) insertSnippetText(`[img]${url}[/img]`);
            break;
        }
        case "email": {
            const email = window.prompt("Endereco de email", "contato@exemplo.com");
            if (email) wrapSelection(`[email=${email}]`, "[/email]");
            break;
        }
        default:
            break;
    }
}

function insertSnippet(type) {
    const snippets = {
        section: "[h2]Titulo da secao[/h2]\n[panel]Descreva aqui o conteudo principal da secao.[/panel]",
        panel: "[panel]\n[b]Resumo:[/b] bloco util para destacar trechos institucionais, avisos e observacoes.\n[/panel]",
        quote: "[quote=Autor]\nCole aqui a citacao ou o trecho institucional.\n[/quote]",
        code: "[code=text]\nCole aqui um bloco tecnico, modelo ou instrucoes.\n[/code]",
        list: "[list]\n[*]Primeiro item\n[*]Segundo item\n[*]Terceiro item\n[/list]",
        table: "[table width=100% border=1 cellpadding=10 cellspacing=0]\n[tr][th width=35% align=center]Coluna 1[/th][th]Coluna 2[/th][/tr]\n[tr][td bgcolor=#101a12 colspan=1]Conteudo[/td][td]Conteudo[/td][/tr]\n[/table]",
        image: "[img]https://exemplo.com/imagem.png[/img]",
        source: "[source]\nOrigem, observacoes de importacao ou referencia externa.\n[/source]",
        spoiler: "[spoiler=Detalhes]\nConteudo recolhido para consulta pontual.\n[/spoiler]"
    };

    if (snippets[type]) {
        insertSnippetText(snippets[type]);
    }
}
