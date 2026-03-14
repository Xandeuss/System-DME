const CONFIG = {
    key: "dme_documentos",
    categorias: [
        { id: "triplice", titulo: "TrÃ­plice Documental", icon: "âš–ï¸" },
        { id: "apendices", titulo: "ApÃªndices", icon: "ðŸ“Ž" },
        { id: "portarias", titulo: "Portarias", icon: "ðŸ“œ" },
        { id: "tutoriais", titulo: "Tutoriais", icon: "ðŸ“š" }
    ]
};

const BBCODE_TABLE_SNIPPET = "[table]\n[tr][th]Campo[/th][th]Detalhe[/th][/tr]\n[tr][td]Item[/td][td]Preencha aqui[/td][/tr]\n[/table]";

let docsData = { categorias: [] };
let currentDocId = null;
let currentUser = localStorage.getItem("dme_username");
let isEditing = false;
let editingId = null;
let editorPreviewBound = false;
let editorFormBound = false;
let editorPreviewOpen = false;

document.addEventListener("DOMContentLoaded", () => {
    loadData();
    renderSidebar();
    checkAdminPermissions();
    setupMobileSidebar();
    loadUserProfile();
    bindEditorPreview();
    updateDocumentProfileCard(null, null);
    setEditorPreviewVisibility(false);
    hydrateExistingDocumentContent();
    updateBBCodePreview();
});

function loadUserProfile() {
    const user = localStorage.getItem("dme_username");
    if (!user) {
        window.location.href = "/login";
        return;
    }

    document.getElementById("navUserName").textContent = user;
    const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${user}&direction=3&head_direction=3&gesture=sml&action=std`;
    document.getElementById("navUserImage").src = avatarUrl;

    document.getElementById("dropdownName").textContent = user;
    document.getElementById("dropdownUserImage").src = avatarUrl;

    const admins = JSON.parse(localStorage.getItem("dme_admins") || "[]");
    if (admins.includes(user) || ["Xandelicado", "rafacv", "Ronaldo"].includes(user)) {
        document.getElementById("dropdownPainel").style.display = "block";
    }

    const btn = document.getElementById("userProfileBtn");
    const dropdown = document.getElementById("userDropdown");

    btn.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.style.visibility = dropdown.style.visibility === "visible" ? "hidden" : "visible";
        dropdown.style.opacity = dropdown.style.opacity === "1" ? "0" : "1";
    });

    document.addEventListener("click", () => {
        dropdown.style.visibility = "hidden";
        dropdown.style.opacity = "0";
    });
}

function loadData() {
    const saved = localStorage.getItem(CONFIG.key);

    if (saved) {
        docsData = JSON.parse(saved);

        CONFIG.categorias.forEach((categoriaPadrao) => {
            if (!docsData.categorias.find((categoria) => categoria.id === categoriaPadrao.id)) {
                docsData.categorias.push({ ...categoriaPadrao, documentos: [] });
            }
        });

        return;
    }

    docsData.categorias = CONFIG.categorias.map((categoria) => ({ ...categoria, documentos: [] }));
    docsData.categorias[0].documentos.push({
        id: generateId(),
        titulo: "CÃ³digo de Conduta Militar",
        autor: "Sistema",
        data: new Date().toLocaleDateString("pt-BR"),
        conteudo: "[b]Bem-vindo ao CÃ³digo de Conduta![/b]\n\nEste Ã© um exemplo de documento. [i]Edite-o para comeÃ§ar.[/i]"
    });
    saveData();
}

function saveData() {
    localStorage.setItem(CONFIG.key, JSON.stringify(docsData));
}

function generateId() {
    return "_" + Math.random().toString(36).slice(2, 11);
}

function renderSidebar() {
    const container = document.getElementById("docsCategories");
    container.innerHTML = "";

    docsData.categorias.forEach((categoria) => {
        const hasDocs = categoria.documentos && categoria.documentos.length > 0;
        const hasActive = categoria.documentos.some((documento) => documento.id === currentDocId);
        const expanded = hasActive || hasDocs;

        const section = document.createElement("div");
        section.className = "doc-cat-section" + (expanded ? " expanded" : "") + (hasDocs ? " has-docs" : "");
        section.id = "cat-" + categoria.id;

        section.innerHTML = `
            <div class="doc-cat-hdr" onclick="toggleCat('${categoria.id}')">
                <span class="doc-cat-ico">${categoria.icon}</span>
                <span class="doc-cat-name">${categoria.titulo}</span>
                <span class="doc-cat-count">${categoria.documentos.length}</span>
                <span class="doc-cat-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </span>
            </div>
            <div class="doc-cat-list">
                ${hasDocs
                    ? categoria.documentos.map((documento) => `
                        <div class="doc-item ${currentDocId === documento.id ? "active" : ""}" onclick="viewDocument('${documento.id}')">${documento.titulo}</div>
                    `).join("")
                    : '<div class="doc-empty-hint">Nenhum documento</div>'}
            </div>
        `;

        container.appendChild(section);
    });

    const select = document.getElementById("editCategory");
    select.innerHTML = "";
    docsData.categorias.forEach((categoria) => {
        const option = document.createElement("option");
        option.value = categoria.id;
        option.textContent = categoria.titulo;
        select.appendChild(option);
    });

    renderPlaceholder();
}

function toggleCat(id) {
    const section = document.getElementById("cat-" + id);
    if (section) {
        section.classList.toggle("expanded");
    }
}

function renderPlaceholder() {
    const grid = document.getElementById("cpGrid");
    if (!grid) {
        return;
    }

    grid.innerHTML = docsData.categorias.map((categoria) => {
        const hasDocs = categoria.documentos && categoria.documentos.length > 0;

        return `
            <div class="cp-cat-card ${hasDocs ? "has-docs" : ""}">
                <div class="cp-cat-card-head">
                    <span class="cp-cat-card-ico">${categoria.icon}</span>
                    <span class="cp-cat-card-title">${categoria.titulo}</span>
                    <span class="cp-cat-card-count">${categoria.documentos.length}</span>
                </div>
                ${hasDocs
                    ? categoria.documentos.slice(0, 5).map((documento) => `
                        <button class="cp-doc-link" onclick="viewDocument('${documento.id}')">${documento.titulo}</button>
                    `).join("")
                    : '<div class="cp-empty-cat">Nenhum documento ainda</div>'}
            </div>
        `;
    }).join("");
}

function viewDocument(id) {
    currentDocId = id;
    let foundDoc = null;
    let foundCat = null;

    for (const categoria of docsData.categorias) {
        const documento = categoria.documentos.find((item) => item.id === id);
        if (documento) {
            foundDoc = documento;
            foundCat = categoria;
            break;
        }
    }

    if (!foundDoc) {
        return;
    }

    document.getElementById("contentPlaceholder").style.display = "none";
    document.getElementById("documentViewer").style.display = "block";

    document.getElementById("docBreadcrumbCat").textContent = foundCat ? foundCat.titulo : "";
    document.getElementById("docBreadcrumbDoc").textContent = foundDoc.titulo;
    document.getElementById("viewTitle").textContent = foundDoc.titulo;
    document.getElementById("viewDate").textContent = foundDoc.data;

    updateDocumentProfileCard(foundDoc, foundCat);

    const body = document.getElementById("viewContent");
    applyRenderedContent(body, foundDoc.conteudo);

    renderSidebar();
}

function updateDocumentProfileCard(documento, categoria) {
    const author = documento && documento.autor ? normalizeAuthorName(documento.autor) : "-";
    const avatar = author !== "-"
        ? `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(author)}&direction=2&head_direction=2&gesture=sml&size=l`
        : "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=720&q=80";

    const authorTarget = document.getElementById("viewAuthor");
    const profileAuthor = document.getElementById("viewProfileAuthor");
    const profileAvatar = document.getElementById("viewProfileAvatar");

    if (authorTarget) {
        authorTarget.textContent = author;
    }

    if (profileAuthor) {
        profileAuthor.textContent = author;
    }

    if (profileAvatar) {
        profileAvatar.src = avatar;
        profileAvatar.alt = author !== "-" ? `Foto de ${author}` : "Foto do autor do documento";
    }
}

function wrapDocumentRender(html) {
    if (!html) {
        return '<div class="bbcode-document-render"></div>';
    }

    if (/class=(["'])[^"']*bbcode-document-render[^"']*\1/i.test(html)) {
        return html;
    }

    return `<div class="bbcode-document-render">${html}</div>`;
}

function containsBBCode(text) {
    return /\[(\/?)(table|tr|th|td|div|font|span|center|justify|b|i|u|img|url|quote|list|\*|color|size|left|right|s|code)([^\]]*?)\]/i.test(String(text || ""));
}

function applyRenderedContent(target, rawText) {
    if (!target) {
        return { html: "", isHTML: false };
    }

    target.dataset.bbcode = String(rawText || "");

    const result = renderContent(rawText);
    target.innerHTML = result.html;
    target.classList.toggle("html-content", result.isHTML);

    return result;
}

function hydrateExistingDocumentContent() {
    const body = document.getElementById("viewContent");
    if (!body) {
        return;
    }

    const rawText = body.dataset.bbcode || body.innerHTML;
    if (!rawText || !containsBBCode(rawText)) {
        return;
    }

    applyRenderedContent(body, rawText);
}

function renderContent(text) {
    if (!text) {
        return { html: wrapDocumentRender(""), isHTML: false };
    }

    const normalized = String(text);
    const hasBBCode = containsBBCode(normalized);
    const isHTML = !hasBBCode && /<\/?(?:div|table|td|tr|th|tbody|thead|span|p|a|img|br|ul|ol|li|h[1-6]|strong|em|b|i|u|s|section|article|header|footer|hr|blockquote|pre|code|style)[\s>\/]/i.test(normalized);
    const renderedHTML = hasBBCode
        ? parseBBCode(normalized)
        : (isHTML ? normalized : escapeHtml(normalized).replace(/\n/g, "<br>"));

    return {
        html: wrapDocumentRender(renderedHTML),
        isHTML
    };
}

function decodeEntities(value) {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = value;
    return decoder.value;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function sanitizeUrl(value) {
    const normalized = decodeEntities(String(value || "").trim());

    try {
        const parsed = new URL(normalized, window.location.origin);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.href;
        }
    } catch (error) {
        return "#";
    }

    return "#";
}

function sanitizeColor(value) {
    const normalized = decodeEntities(String(value || "").trim());
    const safeColor = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\)|[a-zA-Z]{3,20})$/;
    return safeColor.test(normalized) ? normalized : "#081E3D";
}

function sanitizeSize(value) {
    const normalized = Number.parseInt(decodeEntities(String(value || "")).replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(normalized)) {
        return 16;
    }

    return Math.min(32, Math.max(10, normalized));
}

function normalizeAuthorName(value) {
    return String(value || "").trim().replace(/\s*\(.*?\)\s*$/g, "") || "-";
}

function sanitizeBBCodeAttributes(rawAttributes, tagName) {
    const source = decodeEntities(String(rawAttributes || "")).trim();
    if (!source) {
        return "";
    }

    const allowedAttributes = new Set([
        "style",
        "bgcolor",
        "align",
        "color",
        "size",
        "face",
        "width",
        "height",
        "border",
        "cellpadding",
        "cellspacing",
        "class",
        "colspan",
        "rowspan"
    ]);

    const parts = [];
    const shorthand = source.startsWith("=") ? source.slice(1).trim() : "";

    if (shorthand && tagName === "font") {
        parts.push(` face="${escapeHtml(shorthand.replace(/^["']|["']$/g, ""))}"`);
    }

    source.replace(/([a-zA-Z:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g, (_, name, value) => {
        const attribute = String(name || "").toLowerCase();
        if (!allowedAttributes.has(attribute)) {
            return "";
        }

        let normalized = String(value || "").replace(/^['"]|['"]$/g, "");
        if (attribute === "style") {
            normalized = normalized.replace(/expression\s*\(|javascript:/gi, "");
        }

        if (!normalized) {
            return "";
        }

        parts.push(` ${attribute}="${escapeHtml(normalized)}"`);
        return "";
    });

    return parts.join("");
}

function replaceStructuredBBCodeTags(fragment) {
    let html = fragment;
    ["table", "tr", "td", "div", "font"].forEach((tag) => {
        const openTag = new RegExp(`\\[${tag}([^\\]]*)\\]`, "gi");
        const closeTag = new RegExp(`\\[\\/${tag}\\]`, "gi");

        html = html.replace(openTag, (_, attributes) => `<${tag}${sanitizeBBCodeAttributes(attributes, tag)}>`);
        html = html.replace(closeTag, `</${tag}>`);
    });

    html = html.replace(/<table([^>]*)>/gi, '<div class="bbcode-table-wrap"><table$1>');
    html = html.replace(/<\/table>/gi, "</table></div>");

    return html;
}

function cleanupStructuredBreaks(fragment) {
    let html = fragment;
    let previous = "";

    while (html !== previous) {
        previous = html;
        html = html
            .replace(/(<\/?(?:table|tr|th|td|div|font|span|center|justify)[^>]*>)<br\s*\/?>/gi, "$1")
            .replace(/<br\s*\/?>(<\/?(?:table|tr|th|td|div|font|span|center|justify)[^>]*>)/gi, "$1")
            .replace(/(<\/(?:table|tr|th|td|div|font|span|center|justify)>)(?:<br\s*\/?>)+/gi, "$1");
    }

    return html;
}

function applyInlineBBCode(fragment) {
    let html = fragment;

    for (let i = 0; i < 4; i += 1) {
        const previous = html;

        html = html
            .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>")
            .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>")
            .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>")
            .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, "<s>$1</s>")
            .replace(/\[color=(.*?)\]([\s\S]*?)\[\/color\]/gi, (_, color, content) => `<span style="color:${sanitizeColor(color)}">${content}</span>`)
            .replace(/\[size=(.*?)\]([\s\S]*?)\[\/size\]/gi, (_, size, content) => `<span style="font-size:${sanitizeSize(size)}px">${content}</span>`);

        if (html === previous) {
            break;
        }
    }

    return html;
}

function parseListMarkup(listMarkup) {
    const items = listMarkup.split(/\[\*\]/).map((item) => item.trim()).filter(Boolean);
    if (!items.length) {
        return listMarkup;
    }

    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function parseBBCode(text) {
    if (!text) {
        return "";
    }

    text = escapeHtml(String(text).replace(/\r\n?/g, "\n")).replace(/&quot;/g, '"');
    const codeBlocks = [];

    text = text.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, code) => {
        const token = "__BBCODE_CODE_" + codeBlocks.length + "__";
        codeBlocks.push(`<pre><code>${code}</code></pre>`);
        return token;
    });

    text = text.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_, listMarkup) => parseListMarkup(listMarkup));

    // Replace structural tags keeping their inline attributes
    text = text.replace(/\[(\/?)(table|tr|td|div|font|span|center|justify)([^\]]*?)\]/gi, '<$1$2$3>');
    text = text.replace(/\[(\/?)(th)([^\]]*?)\]/gi, '<$1$2$3>');

    // Replace basic formatting
    text = text.replace(/\[b\]/gi, '<strong>').replace(/\[\/b\]/gi, '</strong>');
    text = text.replace(/\[i\]/gi, '<em>').replace(/\[\/i\]/gi, '</em>');
    text = text.replace(/\[u\]/gi, '<u>').replace(/\[\/u\]/gi, '</u>');

    // Replace Images and URLs
    text = text.replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" style="max-width: 100%; border-radius: 8px;">');
    text = text.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" style="color: #3498db;">$2</a>');

    text = text
        .replace(/\[url\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" style="color: #3498db;">$1</a>')
        .replace(/\[s\]/gi, "<s>")
        .replace(/\[\/s\]/gi, "</s>")
        .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, "<blockquote>$1</blockquote>")
        .replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div style="text-align:left;">$1</div>')
        .replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div style="text-align:right;">$1</div>')
        .replace(/\[color=(.*?)\]([\s\S]*?)\[\/color\]/gi, (_, color, content) => `<span style="color:${sanitizeColor(color)}">${content}</span>`)
        .replace(/\[size=(.*?)\]([\s\S]*?)\[\/size\]/gi, (_, size, content) => `<span style="font-size:${sanitizeSize(size)}px">${content}</span>`);

    text = text.replace(/<table([^>]*)>/gi, '<div class="bbcode-table-wrap"><table$1>');
    text = text.replace(/<\/table>/gi, "</table></div>");
    text = text.replace(/\n/g, "<br>");
    text = cleanupStructuredBreaks(text);

    codeBlocks.forEach((block, index) => {
        text = text.replace("__BBCODE_CODE_" + index + "__", block);
    });

    return text;
}

function bindEditorForm() {
    if (editorFormBound) {
        return;
    }

    const form = document.getElementById("documentEditorForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        salvarAlteracoes();
    });

    editorFormBound = true;
}

function bindEditorPreview() {
    if (editorPreviewBound) {
        return;
    }

    const textarea = document.getElementById("editContent");
    if (!textarea) {
        return;
    }

    textarea.addEventListener("input", updateBBCodePreview);
    textarea.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "t") {
            event.preventDefault();
            insertSnippet(BBCODE_TABLE_SNIPPET);
        }
    });

    editorPreviewBound = true;
}

function setEditorPreviewVisibility(open) {
    const previewPane = document.getElementById("bbcodePreviewPane");
    const previewToggle = document.getElementById("bbcodePreviewToggle");

    editorPreviewOpen = Boolean(open);

    if (previewPane) {
        previewPane.hidden = !editorPreviewOpen;
        previewPane.classList.toggle("is-open", editorPreviewOpen);
    }

    if (previewToggle) {
        previewToggle.setAttribute("aria-expanded", String(editorPreviewOpen));
        previewToggle.classList.toggle("is-active", editorPreviewOpen);
        previewToggle.textContent = editorPreviewOpen ? "Ocultar prÃ©via" : "PrÃ©-visualizar";
    }
}

function toggleEditorPreview(forceState) {
    const nextState = typeof forceState === "boolean" ? forceState : !editorPreviewOpen;
    setEditorPreviewVisibility(nextState);
    updateBBCodePreview();
}

function updateBBCodePreview() {
    const textarea = document.getElementById("editContent");
    const preview = document.getElementById("bbcodePreview");
    const status = document.getElementById("editorStatus");

    if (!textarea || !preview || !status) {
        return;
    }

    if (!textarea.value.trim()) {
        preview.classList.add("is-empty");
        preview.innerHTML = "A prÃ©-visualizaÃ§Ã£o BBCode aparecerÃ¡ aqui.";
        status.textContent = editorPreviewOpen ? "PrÃ©via vazia" : "PrÃ©via recolhida";
        return;
    }

    const rendered = renderContent(textarea.value);
    preview.classList.remove("is-empty");
    preview.innerHTML = rendered.html;
    status.textContent = editorPreviewOpen
        ? (rendered.isHTML ? "HTML detectado" : "PrÃ©via sincronizada")
        : "PrÃ©via recolhida";
}

function insertTag(start, end) {
    const textarea = document.getElementById("editContent");
    const scrollPos = textarea.scrollTop;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const selected = textarea.value.substring(startPos, endPos);

    textarea.value = textarea.value.substring(0, startPos) + start + selected + end + textarea.value.substring(endPos);
    textarea.selectionStart = startPos + start.length;
    textarea.selectionEnd = startPos + start.length + selected.length;
    textarea.focus();
    textarea.scrollTop = scrollPos;

    updateBBCodePreview();
}

function insertSnippet(snippet) {
    const textarea = document.getElementById("editContent");
    if (!textarea) {
        return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    textarea.setRangeText(snippet, start, end, "end");
    textarea.focus();
    updateBBCodePreview();
}

function abrirModalCriar() {
    isEditing = false;
    editingId = null;

    document.getElementById("modalTitle").textContent = "Novo Documento";
    document.getElementById("editTitle").value = "";
    document.getElementById("editContent").value = "";
    document.getElementById("editCategory").value = "triplice";
    document.getElementById("modalEditor").style.display = "flex";

    setEditorPreviewVisibility(false);
    updateBBCodePreview();
}

function abrirModalEditor() {
    abrirModalCriar();
}

function fecharModal(id) {
    document.getElementById(id).style.display = "none";
}

function editarDocumentoAtual() {
    if (!currentDocId) {
        return;
    }

    let foundDoc = null;
    let foundCatId = null;

    for (const categoria of docsData.categorias) {
        const documento = categoria.documentos.find((item) => item.id === currentDocId);
        if (documento) {
            foundDoc = documento;
            foundCatId = categoria.id;
            break;
        }
    }

    if (!foundDoc) {
        return;
    }

    isEditing = true;
    editingId = currentDocId;

    document.getElementById("modalTitle").textContent = "Editar Documento";
    document.getElementById("editTitle").value = foundDoc.titulo;
    document.getElementById("editContent").value = foundDoc.conteudo;
    document.getElementById("editCategory").value = foundCatId;
    document.getElementById("modalEditor").style.display = "flex";

    setEditorPreviewVisibility(false);
    updateBBCodePreview();
}

function salvarAlteracoes(event) {
    if (event) {
        event.preventDefault();
    }

    const titulo = document.getElementById("editTitle").value.trim();
    const conteudo = document.getElementById("editContent").value;
    const catId = document.getElementById("editCategory").value;

    if (!titulo) {
        alert("TÃ­tulo Ã© obrigatÃ³rio!");
        return false;
    }

    const timestamp = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR");

    if (isEditing && editingId) {
        for (const categoria of docsData.categorias) {
            const index = categoria.documentos.findIndex((documento) => documento.id === editingId);
            if (index !== -1) {
                categoria.documentos.splice(index, 1);
                break;
            }
        }

        const categoriaDestino = docsData.categorias.find((categoria) => categoria.id === catId);
        if (categoriaDestino) {
            categoriaDestino.documentos.push({
                id: editingId,
                titulo,
                conteudo,
                autor: currentUser + " (EdiÃ§Ã£o)",
                data: timestamp
            });
            currentDocId = editingId;
        }
    } else {
        const categoriaDestino = docsData.categorias.find((categoria) => categoria.id === catId);
        if (categoriaDestino) {
            const newId = generateId();
            categoriaDestino.documentos.push({
                id: newId,
                titulo,
                conteudo,
                autor: currentUser,
                data: new Date().toLocaleDateString("pt-BR")
            });
            currentDocId = newId;
        }
    }

    saveData();
    fecharModal("modalEditor");
    renderSidebar();

    if (currentDocId) {
        viewDocument(currentDocId);
    }

    return false;
}

function deletarDocumentoAtual() {
    if (!currentDocId || !confirm("Tem certeza que deseja excluir este documento?")) {
        return;
    }

    for (const categoria of docsData.categorias) {
        const index = categoria.documentos.findIndex((documento) => documento.id === currentDocId);
        if (index !== -1) {
            categoria.documentos.splice(index, 1);
            saveData();
            break;
        }
    }

    currentDocId = null;
    document.getElementById("contentPlaceholder").style.display = "flex";
    document.getElementById("documentViewer").style.display = "none";
    updateDocumentProfileCard(null, null);
    renderSidebar();
}

function checkAdminPermissions() {
    const admins = JSON.parse(localStorage.getItem("dme_admins") || "[]");
    const isSuperAdmin = ["Xandelicado", "rafacv", "Ronaldo"].includes(currentUser);
    const isAdmin = admins.includes(currentUser) || isSuperAdmin;

    if (isAdmin) {
        const btnNew = document.getElementById("btnNewDoc");
        if (btnNew) {
            btnNew.style.display = "flex";
        }

        const docActions = document.getElementById("docActions");
        if (docActions) {
            docActions.style.display = "flex";
        }
    }
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

    function toggleSidebar() {
        mobileSidebar.classList.toggle("active");
        sidebarOverlay.classList.toggle("active");
    }

    if (hamburger) {
        hamburger.addEventListener("click", toggleSidebar);
    }

    if (sidebarClose) {
        sidebarClose.addEventListener("click", toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", toggleSidebar);
    }
}

