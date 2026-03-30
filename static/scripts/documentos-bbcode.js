(function (global) {
    "use strict";

    const INLINE_TAGS = new Set([
        "b", "i", "u", "s", "sup", "sub",
        "color", "size", "font",
        "url", "email", "br"
    ]);

    const BLOCK_TAGS = new Set([
        "left", "center", "right", "justify",
        "indent", "quote", "code", "spoiler", "hidden",
        "list", "*",
        "table", "thead", "tbody", "tr", "td", "th",
        "img",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "title", "subtitle",
        "hr",
        "panel", "source"
    ]);

    const SUPPORTED_TAGS = new Set([...INLINE_TAGS, ...BLOCK_TAGS]);
    const SELF_CLOSING_TAGS = new Set(["br", "hr"]);
    const RAW_BODY_TAGS = new Set(["code"]);

    const LEGACY_HTML_TAGS = new Set([
        "a", "article", "blockquote", "br", "code", "details", "div", "em",
        "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6",
        "header", "hr", "img", "li", "ol", "p", "pre", "section", "span",
        "strong", "sub", "summary", "sup", "s", "table", "tbody", "td", "th",
        "thead", "tr", "u", "ul"
    ]);

    const LEGACY_GENERIC_ATTRS = new Set(["class", "title"]);
    const LEGACY_STYLE_ATTRS = new Set([
        "background", "background-color", "border", "border-bottom", "border-color",
        "border-style", "border-width", "color", "font-family", "font-size",
        "font-style", "font-weight", "height", "margin", "margin-left",
        "margin-right", "max-width", "padding", "text-align", "vertical-align",
        "white-space", "width"
    ]);

    function render(input) {
        const source = normalizeNewlines(input);
        if (!source) {
            return {
                html: "",
                isHTML: false,
                format: "empty"
            };
        }

        if (looksLikeHtml(source)) {
            return {
                html: sanitizeLegacyHtml(source),
                isHTML: true,
                format: "legacy-html"
            };
        }

        const ast = parseBBCode(source);
        return {
            html: renderFlow(ast.children).trim(),
            isHTML: false,
            format: "bbcode"
        };
    }

    function parseBBCode(source) {
        const root = createTagNode("root");
        const stack = [root];
        let index = 0;

        while (index < source.length) {
            const bracketIndex = source.indexOf("[", index);
            if (bracketIndex === -1) {
                appendText(currentNode(stack), source.slice(index));
                break;
            }

            if (bracketIndex > index) {
                appendText(currentNode(stack), source.slice(index, bracketIndex));
            }

            const token = readTagToken(source, bracketIndex);
            if (!token) {
                appendText(currentNode(stack), "[");
                index = bracketIndex + 1;
                continue;
            }

            index = token.endIndex;

            if (!token.supported) {
                appendText(currentNode(stack), token.raw);
                continue;
            }

            if (token.closing) {
                if (!closeTag(stack, token.name)) {
                    appendText(currentNode(stack), token.raw);
                }
                continue;
            }

            if (RAW_BODY_TAGS.has(token.name)) {
                const closing = findRawClosingTag(source, token.name, token.endIndex);
                if (!closing) {
                    appendText(currentNode(stack), token.raw);
                    continue;
                }

                const rawNode = createTagNode(token.name, token.attrs, token.arg);
                rawNode.rawContent = source.slice(token.endIndex, closing.startIndex);
                currentNode(stack).children.push(rawNode);
                index = closing.endIndex;
                continue;
            }

            if (token.name === "*") {
                if (!openListItem(stack)) {
                    appendText(currentNode(stack), token.raw);
                }
                continue;
            }

            const node = createTagNode(token.name, token.attrs, token.arg);
            currentNode(stack).children.push(node);

            if (!SELF_CLOSING_TAGS.has(token.name) && !token.selfClosing) {
                stack.push(node);
            }
        }

        while (stack.length > 1) {
            stack.pop();
        }

        return root;
    }

    function createTagNode(name, attrs = {}, arg = "") {
        return {
            type: "tag",
            name,
            attrs,
            arg,
            rawContent: "",
            children: []
        };
    }

    function currentNode(stack) {
        return stack[stack.length - 1];
    }

    function appendText(parent, value) {
        if (!value) return;

        const lastChild = parent.children[parent.children.length - 1];
        if (lastChild && lastChild.type === "text") {
            lastChild.value += value;
            return;
        }

        parent.children.push({
            type: "text",
            value
        });
    }

    function readTagToken(source, startIndex) {
        const endBracketIndex = source.indexOf("]", startIndex + 1);
        if (endBracketIndex === -1) return null;

        const raw = source.slice(startIndex, endBracketIndex + 1);
        const inner = raw.slice(1, -1).trim();
        if (!inner) return null;

        if (inner.startsWith("/")) {
            const name = inner.slice(1).trim().toLowerCase();
            return {
                raw,
                endIndex: endBracketIndex + 1,
                closing: true,
                selfClosing: false,
                supported: SUPPORTED_TAGS.has(name),
                name,
                attrs: {},
                arg: ""
            };
        }

        const selfClosing = /\/\s*$/.test(inner);
        const trimmedInner = selfClosing ? inner.replace(/\/\s*$/, "").trim() : inner;
        const nameMatch = trimmedInner.match(/^([*a-zA-Z0-9_+-]+)/);
        if (!nameMatch) return null;

        const name = nameMatch[1].toLowerCase();
        const remainder = trimmedInner.slice(nameMatch[0].length).trim();
        const parsedAttributes = parseTagAttributes(remainder);

        return {
            raw,
            endIndex: endBracketIndex + 1,
            closing: false,
            selfClosing,
            supported: SUPPORTED_TAGS.has(name),
            name,
            attrs: parsedAttributes.attrs,
            arg: parsedAttributes.arg
        };
    }

    function parseTagAttributes(raw) {
        const result = {
            attrs: {},
            arg: ""
        };

        if (!raw) {
            return result;
        }

        if (raw.startsWith("=")) {
            result.arg = stripOuterQuotes(raw.slice(1).trim());
            return result;
        }

        let cursor = 0;
        let firstPlainChunk = "";

        while (cursor < raw.length) {
            while (cursor < raw.length && /\s/.test(raw[cursor])) {
                cursor += 1;
            }

            if (cursor >= raw.length) break;

            const keyMatch = raw.slice(cursor).match(/^([a-zA-Z][\w:-]*)/);
            if (!keyMatch) {
                firstPlainChunk = raw.slice(cursor).trim();
                break;
            }

            const key = keyMatch[1].toLowerCase();
            cursor += keyMatch[0].length;

            while (cursor < raw.length && /\s/.test(raw[cursor])) {
                cursor += 1;
            }

            if (raw[cursor] !== "=") {
                result.attrs[key] = "true";
                continue;
            }

            cursor += 1;
            while (cursor < raw.length && /\s/.test(raw[cursor])) {
                cursor += 1;
            }

            if (cursor >= raw.length) {
                result.attrs[key] = "";
                break;
            }

            let value = "";
            const quote = raw[cursor] === '"' || raw[cursor] === "'" ? raw[cursor] : "";
            if (quote) {
                cursor += 1;
                const endQuote = raw.indexOf(quote, cursor);
                if (endQuote === -1) {
                    value = raw.slice(cursor);
                    cursor = raw.length;
                } else {
                    value = raw.slice(cursor, endQuote);
                    cursor = endQuote + 1;
                }
            } else {
                const tail = raw.slice(cursor);
                const nextKeyMatch = tail.match(/^([^\s]+?)(?=\s+[a-zA-Z][\w:-]*\s*=|\s*$)/);
                value = nextKeyMatch ? nextKeyMatch[1] : tail;
                cursor += value.length;
            }

            result.attrs[key] = stripOuterQuotes(value.trim());
        }

        if (!Object.keys(result.attrs).length && firstPlainChunk) {
            result.arg = stripOuterQuotes(firstPlainChunk);
        }

        return result;
    }

    function stripOuterQuotes(value) {
        const text = String(value || "").trim();
        if (
            (text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'"))
        ) {
            return text.slice(1, -1);
        }
        return text;
    }

    function openListItem(stack) {
        const listIndex = findTagIndex(stack, "list");
        if (listIndex === -1) return false;

        while (stack.length - 1 > listIndex) {
            const node = stack.pop();
            if (node.name === "*") break;
        }

        const itemNode = createTagNode("*");
        currentNode(stack).children.push(itemNode);
        stack.push(itemNode);
        return true;
    }

    function closeTag(stack, name) {
        const foundIndex = findTagIndex(stack, name);
        if (foundIndex === -1) return false;
        stack.length = foundIndex;
        return true;
    }

    function findTagIndex(stack, name) {
        for (let index = stack.length - 1; index > 0; index -= 1) {
            if (stack[index].name === name) return index;
        }
        return -1;
    }

    function findRawClosingTag(source, tagName, fromIndex) {
        const pattern = new RegExp(`\\[\\/${escapeRegex(tagName)}\\]`, "i");
        const match = pattern.exec(source.slice(fromIndex));
        if (!match) return null;

        const startIndex = fromIndex + match.index;
        return {
            startIndex,
            endIndex: startIndex + match[0].length
        };
    }

    function renderFlow(nodes) {
        let html = "";
        let inlineBuffer = "";

        const flushParagraphs = () => {
            if (!inlineBuffer.trim()) {
                inlineBuffer = "";
                return;
            }

            const parts = inlineBuffer.replace(/\n{3,}/g, "\n\n").split(/\n{2,}/);
            html += parts
                .map((part) => part.trim())
                .filter(Boolean)
                .map((part) => `<p>${part.replace(/\n/g, "<br>")}</p>`)
                .join("");
            inlineBuffer = "";
        };

        nodes.forEach((node) => {
            if (node.type === "tag" && isBlockNode(node.name)) {
                flushParagraphs();
                html += renderNode(node, false);
            } else {
                inlineBuffer += renderInlineNode(node);
            }
        });

        flushParagraphs();
        return html;
    }

    function renderInlineChildren(children) {
        return children.map((child) => renderInlineNode(child)).join("");
    }

    function renderInlineNode(node) {
        if (node.type === "text") {
            return escapeHtml(node.value);
        }

        if (isBlockNode(node.name)) {
            return renderNode(node, true);
        }

        switch (node.name) {
            case "b":
                return `<strong>${renderInlineChildren(node.children)}</strong>`;
            case "i":
                return `<em>${renderInlineChildren(node.children)}</em>`;
            case "u":
                return `<u>${renderInlineChildren(node.children)}</u>`;
            case "s":
                return `<s>${renderInlineChildren(node.children)}</s>`;
            case "sup":
                return `<sup>${renderInlineChildren(node.children)}</sup>`;
            case "sub":
                return `<sub>${renderInlineChildren(node.children)}</sub>`;
            case "color":
                return `<span style="color:${escapeAttribute(sanitizeColor(node.arg || node.attrs.color))}">${renderInlineChildren(node.children)}</span>`;
            case "size":
                return `<span style="font-size:${escapeAttribute(sanitizeSize(node.arg || node.attrs.size))}">${renderInlineChildren(node.children)}</span>`;
            case "font":
                return `<span style="font-family:${escapeAttribute(sanitizeFont(node.arg || node.attrs.font))}">${renderInlineChildren(node.children)}</span>`;
            case "url":
                return renderUrlNode(node);
            case "email":
                return renderEmailNode(node);
            case "br":
                return "<br>";
            default:
                return `${escapeHtml(`[${node.name}]`)}${renderInlineChildren(node.children)}${escapeHtml(`[/${node.name}]`)}`;
        }
    }

    function renderNode(node, inlineFallback) {
        switch (node.name) {
            case "left":
            case "center":
            case "right":
            case "justify":
                return `<div class="bb-align bb-align-${node.name}">${renderFlow(node.children)}</div>`;
            case "indent":
                return `<div class="bb-indent">${renderFlow(node.children)}</div>`;
            case "quote":
                return renderQuoteNode(node);
            case "code":
                return renderCodeNode(node);
            case "spoiler":
                return renderRevealNode(node, "bb-spoiler", node.arg || "Mostrar conteudo");
            case "hidden":
                return renderRevealNode(node, "bb-hidden", node.arg || "Conteudo reservado");
            case "list":
                return renderListNode(node);
            case "*":
                return inlineFallback ? renderFlow(node.children) : `<li>${renderFlow(node.children)}</li>`;
            case "table":
                return renderTableNode(node);
            case "thead":
            case "tbody":
                return renderTableSectionNode(node);
            case "tr":
                return renderTableRowNode(node);
            case "td":
            case "th":
                return renderTableCellNode(node);
            case "img":
                return renderImageNode(node);
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
            case "title":
            case "subtitle":
                return renderHeadingNode(node);
            case "hr":
                return '<hr class="bb-hr">';
            case "panel":
            case "source":
                return renderPanelNode(node);
            default:
                return inlineFallback ? renderInlineNode(node) : renderFlow(node.children);
        }
    }

    function renderQuoteNode(node) {
        const author = decodeBasicEntities(node.arg || node.attrs.author || "").trim();
        const cite = author ? `<div class="bb-quote-cite">${escapeHtml(author)}</div>` : "";
        return `
            <blockquote class="bb-quote">
                ${cite}
                <div class="bb-quote-body">${renderFlow(node.children)}</div>
            </blockquote>
        `;
    }

    function renderCodeNode(node) {
        const language = compactLabel(decodeBasicEntities(node.arg || node.attrs.lang || node.attrs.language || "codigo"), 28);
        const codeContent = escapeHtml(normalizeNewlines(node.rawContent || extractPlainText(node.children)));
        return `
            <div class="bb-code-block">
                <div class="bb-code-head">${escapeHtml(language)}</div>
                <pre><code>${codeContent}</code></pre>
            </div>
        `;
    }

    function renderRevealNode(node, className, label) {
        return `
            <details class="${className}">
                <summary>${escapeHtml(label)}</summary>
                <div class="${className}-body">${renderFlow(node.children)}</div>
            </details>
        `;
    }

    function renderListNode(node) {
        const rawType = node.arg || node.attrs.type || node.attrs.list || "";
        const listType = sanitizeListType(rawType);
        const bulletStyle = sanitizeBulletStyle(rawType);
        const items = node.children.filter((child) => child.type === "tag" && child.name === "*");
        const tagName = listType ? "ol" : "ul";
        const typeAttr = listType ? ` type="${escapeAttribute(listType)}"` : "";
        const styleAttr = bulletStyle ? ` style="list-style-type:${escapeAttribute(bulletStyle)}"` : "";

        if (!items.length) {
            return `<${tagName} class="bb-list"${typeAttr}${styleAttr}><li>${renderFlow(node.children)}</li></${tagName}>`;
        }

        return `<${tagName} class="bb-list"${typeAttr}${styleAttr}>${items.map((item) => renderNode(item, false)).join("")}</${tagName}>`;
    }

    function renderTableNode(node) {
        const attrs = buildTableAttributes(node);
        let content = node.children.map((child) => {
            if (child.type !== "tag") return "";
            if (child.name === "thead" || child.name === "tbody" || child.name === "tr") {
                return renderNode(child, false);
            }
            return "";
        }).join("");

        if (content && !/<(?:thead|tbody)\b/i.test(content) && /<tr\b/i.test(content)) {
            content = `<tbody>${content}</tbody>`;
        }

        if (!content) {
            content = "<tbody></tbody>";
        }

        return `
            <div class="bb-table-wrap">
                <table class="bb-table"${attrs}>${content}</table>
            </div>
        `;
    }

    function renderTableSectionNode(node) {
        const tagName = node.name;
        const rows = node.children.map((child) => {
            if (child.type !== "tag" || child.name !== "tr") return "";
            return renderTableRowNode(child);
        }).join("");
        return `<${tagName}>${rows}</${tagName}>`;
    }

    function renderTableRowNode(node) {
        const attrs = buildRowAttributes(node);
        let cells = node.children.map((child) => {
            if (child.type !== "tag" || (child.name !== "td" && child.name !== "th")) return "";
            return renderTableCellNode(child);
        }).join("");

        if (!cells.trim()) {
            const fallback = renderFlow(node.children).trim();
            cells = fallback ? `<td>${fallback}</td>` : "";
        }

        return `<tr${attrs}>${cells}</tr>`;
    }

    function renderTableCellNode(node) {
        const tagName = node.name;
        const attrs = buildCellAttributes(node);
        return `<${tagName}${attrs}>${renderFlow(node.children)}</${tagName}>`;
    }

    function renderImageNode(node) {
        const source = sanitizeUrl(node.arg || extractPlainText(node.children), { allowDataImage: true });
        if (!source) {
            return '<div class="bb-asset-placeholder">Imagem invalida ou nao suportada.</div>';
        }

        const imageStyles = {};
        const width = sanitizeDimension(node.attrs.width || "");
        const height = sanitizeDimension(node.attrs.height || "");
        const align = sanitizeAlign(node.attrs.align || "");
        const alt = compactLabel(decodeBasicEntities(node.attrs.alt || "Imagem do documento"), 120);

        if (width) imageStyles.width = width;
        if (height) imageStyles.height = height;

        const figureStyles = {};
        applyBlockAlignment(figureStyles, align);

        const figureAttr = buildStyleAttribute(figureStyles);
        const imageAttr = buildStyleAttribute(imageStyles);

        return `
            <figure class="bb-media"${figureAttr}>
                <img src="${escapeAttribute(source)}" alt="${escapeAttribute(alt)}" loading="lazy" referrerpolicy="no-referrer"${imageAttr}>
            </figure>
        `;
    }

    function renderHeadingNode(node) {
        const mapping = {
            title: "h1",
            subtitle: "h3"
        };
        const tagName = mapping[node.name] || node.name;
        const level = tagName.replace("h", "");
        return `<${tagName} class="bb-heading bb-heading-${level}">${renderInlineChildren(node.children)}</${tagName}>`;
    }

    function renderPanelNode(node) {
        const isSource = node.name === "source";
        const title = isSource ? "Fonte e observacoes" : "Bloco do documento";
        const modifier = isSource ? " bb-panel-source" : "";
        return `
            <section class="bb-panel${modifier}">
                <div class="bb-panel-title">${title}</div>
                <div class="bb-panel-body">${renderFlow(node.children)}</div>
            </section>
        `;
    }

    function renderUrlNode(node) {
        const href = sanitizeUrl(node.arg || extractPlainText(node.children));
        const label = node.arg ? renderInlineChildren(node.children) : escapeHtml(decodeBasicEntities(extractPlainText(node.children)).trim() || href);
        if (!href) {
            return `<span class="bb-invalid-link">${label || "Link invalido"}</span>`;
        }
        return `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer noopener">${label || escapeHtml(href)}</a>`;
    }

    function renderEmailNode(node) {
        const address = sanitizeEmail(node.arg || extractPlainText(node.children));
        const label = node.arg ? renderInlineChildren(node.children) : escapeHtml(address || extractPlainText(node.children).trim());
        if (!address) {
            return `<span class="bb-invalid-link">${label || "Email invalido"}</span>`;
        }
        return `<a href="mailto:${escapeAttribute(address)}">${label || escapeHtml(address)}</a>`;
    }

    function buildTableAttributes(node) {
        const styles = {};
        const width = sanitizeDimension(node.attrs.width || node.arg || "");
        const height = sanitizeDimension(node.attrs.height || "");
        const align = sanitizeAlign(node.attrs.align || "");
        const background = sanitizeColor(node.attrs.bgcolor || "");
        const border = sanitizePositiveInteger(node.attrs.border || "", 0, 8);
        const cellpadding = sanitizePositiveInteger(node.attrs.cellpadding || "", 0, 32);
        const cellspacing = sanitizePositiveInteger(node.attrs.cellspacing || "", 0, 24);

        if (width) styles.width = width;
        if (height) styles.height = height;
        if (background) styles["background-color"] = background;
        if (border !== "") styles["--bb-table-border-width"] = `${border}px`;
        if (cellpadding !== "") styles["--bb-table-cellpadding"] = `${cellpadding}px`;
        if (cellspacing !== "") styles["--bb-table-cellspacing"] = `${cellspacing}px`;
        applyBlockAlignment(styles, align);

        mergeInlineStyle(styles, node.attrs.style, new Set([
            "background", "background-color", "border", "border-color", "border-style",
            "border-width", "height", "margin", "margin-left", "margin-right",
            "table-layout", "text-align", "vertical-align", "width"
        ]));

        return buildStyleAttribute(styles);
    }

    function buildRowAttributes(node) {
        const styles = {};
        const height = sanitizeDimension(node.attrs.height || "");
        const align = sanitizeAlign(node.attrs.align || "");
        const valign = sanitizeVerticalAlign(node.attrs.valign || "");
        const background = sanitizeColor(node.attrs.bgcolor || "");

        if (height) styles.height = height;
        if (align) styles["text-align"] = align;
        if (valign) styles["vertical-align"] = valign;
        if (background) styles["background-color"] = background;

        mergeInlineStyle(styles, node.attrs.style, new Set([
            "background", "background-color", "border", "border-color", "border-style",
            "border-width", "height", "text-align", "vertical-align"
        ]));

        return buildStyleAttribute(styles);
    }

    function buildCellAttributes(node) {
        const styles = {};
        const attributes = [];
        const width = sanitizeDimension(node.attrs.width || node.arg || "");
        const height = sanitizeDimension(node.attrs.height || "");
        const align = sanitizeAlign(node.attrs.align || "");
        const valign = sanitizeVerticalAlign(node.attrs.valign || "");
        const background = sanitizeColor(node.attrs.bgcolor || "");
        const border = sanitizePositiveInteger(node.attrs.border || "", 0, 8);
        const colspan = sanitizePositiveInteger(node.attrs.colspan || "", 1, 24);
        const rowspan = sanitizePositiveInteger(node.attrs.rowspan || "", 1, 24);

        if (width) styles.width = width;
        if (height) styles.height = height;
        if (align) styles["text-align"] = align;
        if (valign) styles["vertical-align"] = valign;
        if (background) styles["background-color"] = background;
        if (border !== "") styles.border = `${border}px solid rgba(255, 255, 255, 0.08)`;
        if (colspan !== "") attributes.push(` colspan="${escapeAttribute(colspan)}"`);
        if (rowspan !== "") attributes.push(` rowspan="${escapeAttribute(rowspan)}"`);

        mergeInlineStyle(styles, node.attrs.style, new Set([
            "background", "background-color", "border", "border-color", "border-style",
            "border-width", "color", "height", "padding", "text-align",
            "vertical-align", "white-space", "width"
        ]));

        return `${attributes.join("")}${buildStyleAttribute(styles)}`;
    }

    function mergeInlineStyle(target, rawStyle, allowedProperties) {
        const safeDeclarations = sanitizeStyleDeclarations(rawStyle, allowedProperties);
        Object.keys(safeDeclarations).forEach((property) => {
            target[property] = safeDeclarations[property];
        });
    }

    function buildStyleAttribute(styleMap) {
        const entries = Object.entries(styleMap).filter(([, value]) => value !== "" && value != null);
        if (!entries.length) return "";
        const style = entries.map(([property, value]) => `${property}:${value}`).join("; ");
        return ` style="${escapeAttribute(style)}"`;
    }

    function sanitizeStyleDeclarations(rawStyle, allowedProperties) {
        const declarations = {};
        const source = decodeBasicEntities(rawStyle || "");
        if (!source) return declarations;

        source.split(";").forEach((chunk) => {
            const separatorIndex = chunk.indexOf(":");
            if (separatorIndex === -1) return;

            const property = chunk.slice(0, separatorIndex).trim().toLowerCase();
            const value = chunk.slice(separatorIndex + 1).trim();

            if (!allowedProperties.has(property)) return;
            if (!isSafeStyleValue(value)) return;
            declarations[property] = value;
        });

        return declarations;
    }

    function isSafeStyleValue(value) {
        const clean = decodeBasicEntities(value).trim();
        if (!clean) return false;
        if (/(?:expression|javascript:|url\s*\(|@import|<|>)/i.test(clean)) return false;
        return /^[#(),.%\-/"' a-zA-Z0-9_:+]*$/.test(clean);
    }

    function applyBlockAlignment(target, align) {
        switch (align) {
            case "center":
                target["margin-left"] = "auto";
                target["margin-right"] = "auto";
                break;
            case "right":
                target["margin-left"] = "auto";
                target["margin-right"] = "0";
                break;
            case "left":
                target["margin-left"] = "0";
                target["margin-right"] = "auto";
                break;
            default:
                break;
        }
    }

    function extractPlainText(children) {
        return children.map((child) => {
            if (child.type === "text") return child.value;
            if (child.rawContent) return child.rawContent;
            return extractPlainText(child.children || []);
        }).join("");
    }

    function looksLikeHtml(text) {
        return /<\/?(?:div|table|td|tr|th|tbody|thead|span|p|a|img|br|ul|ol|li|h[1-6]|strong|em|b|i|u|s|sub|sup|section|article|header|footer|hr|blockquote|pre|code|style|details|summary)[\s>\/]/i.test(text);
    }

    function sanitizeLegacyHtml(source) {
        if (typeof DOMParser === "undefined") {
            return `<pre class="bb-code-block"><code>${escapeHtml(source)}</code></pre>`;
        }

        const parser = new DOMParser();
        const documentNode = parser.parseFromString(source, "text/html");
        return Array.from(documentNode.body.childNodes).map((node) => sanitizeLegacyNode(node)).join("");
    }

    function sanitizeLegacyNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeHtml(node.textContent || "");
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }

        const tagName = node.tagName.toLowerCase();
        if (!LEGACY_HTML_TAGS.has(tagName)) {
            return Array.from(node.childNodes).map((child) => sanitizeLegacyNode(child)).join("");
        }

        const attrs = sanitizeLegacyAttributes(tagName, node);
        const open = `<${tagName}${attrs}>`;

        if (tagName === "br" || tagName === "hr" || tagName === "img") {
            return open;
        }

        const children = Array.from(node.childNodes).map((child) => sanitizeLegacyNode(child)).join("");
        return `${open}${children}</${tagName}>`;
    }

    function sanitizeLegacyAttributes(tagName, node) {
        const attrs = [];
        const styleMap = {};

        Array.from(node.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value;

            if (LEGACY_GENERIC_ATTRS.has(name) && name === "class") {
                const classes = value
                    .split(/\s+/)
                    .filter((item) => /^bb-[a-z0-9_-]+$/i.test(item))
                    .join(" ");
                if (classes) attrs.push(` class="${escapeAttribute(classes)}"`);
                return;
            }

            if (LEGACY_GENERIC_ATTRS.has(name) && name !== "class") {
                attrs.push(` ${name}="${escapeAttribute(value)}"`);
                return;
            }

            if (name === "style") {
                Object.assign(styleMap, sanitizeStyleDeclarations(value, LEGACY_STYLE_ATTRS));
                return;
            }

            if (tagName === "a" && name === "href") {
                const safeHref = sanitizeUrl(value);
                if (safeHref) attrs.push(` href="${escapeAttribute(safeHref)}" target="_blank" rel="noreferrer noopener"`);
                return;
            }

            if (tagName === "img" && name === "src") {
                const safeSrc = sanitizeUrl(value, { allowDataImage: true });
                if (safeSrc) attrs.push(` src="${escapeAttribute(safeSrc)}"`);
                return;
            }

            if (tagName === "img" && ["alt", "loading", "referrerpolicy"].includes(name)) {
                attrs.push(` ${name}="${escapeAttribute(value)}"`);
                return;
            }

            if (["td", "th"].includes(tagName) && ["colspan", "rowspan"].includes(name)) {
                const safeSpan = sanitizePositiveInteger(value, 1, 24);
                if (safeSpan !== "") attrs.push(` ${name}="${escapeAttribute(safeSpan)}"`);
                return;
            }

            if (["table", "td", "th", "img"].includes(tagName) && ["width", "height"].includes(name)) {
                const safeDimension = sanitizeDimension(value);
                if (safeDimension) styleMap[name] = safeDimension;
            }
        });

        const styleAttr = buildStyleAttribute(styleMap);
        if (styleAttr) attrs.push(styleAttr);
        return attrs.join("");
    }

    function isBlockNode(name) {
        return BLOCK_TAGS.has(name);
    }

    function normalizeNewlines(text) {
        return String(text || "").replace(/\r\n?/g, "\n").trim();
    }

    function decodeBasicEntities(text) {
        return String(text || "")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");
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

    function sanitizeUrl(value, options = {}) {
        const clean = decodeBasicEntities(value).trim();
        if (!clean) return "";

        const allowDataImage = Boolean(options.allowDataImage);
        if (/^(https?:\/\/|mailto:|\/)/i.test(clean)) return clean;
        if (allowDataImage && /^data:image\//i.test(clean)) return clean;
        return "";
    }

    function sanitizeEmail(value) {
        const clean = decodeBasicEntities(value).trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return clean;
        return "";
    }

    function sanitizeColor(value) {
        const clean = decodeBasicEntities(value).trim();
        if (!clean) return "";
        if (/^#[0-9a-fA-F]{3,8}$/.test(clean)) return clean;
        if (/^(rgb|rgba|hsl|hsla)\(([^)]+)\)$/.test(clean)) return clean;
        if (/^[a-zA-Z]{3,20}$/.test(clean)) return clean;
        return "";
    }

    function sanitizeSize(value) {
        const clean = decodeBasicEntities(value).trim().toLowerCase();
        const keywords = {
            xs: "11px",
            small: "13px",
            normal: "16px",
            large: "20px",
            xl: "24px"
        };

        if (keywords[clean]) return keywords[clean];
        return sanitizeDimension(clean, { min: 10, max: 42 }) || "16px";
    }

    function sanitizeFont(value) {
        const clean = decodeBasicEntities(value).trim();
        if (/^[a-zA-Z0-9 ,'"-]{1,80}$/.test(clean)) return clean;
        return "inherit";
    }

    function sanitizeDimension(value, options = {}) {
        const clean = decodeBasicEntities(value).trim().toLowerCase();
        if (!clean) return "";

        const min = Number.isFinite(options.min) ? options.min : 0;
        const max = Number.isFinite(options.max) ? options.max : 4000;

        if (/^auto$/.test(clean)) return clean;

        const numeric = Number.parseFloat(clean);
        if (/^\d+(\.\d+)?$/.test(clean) && Number.isFinite(numeric)) {
            return `${Math.min(max, Math.max(min, numeric))}px`;
        }

        const sizedMatch = clean.match(/^(\d+(?:\.\d+)?)(px|%|em|rem|vw|vh)$/);
        if (sizedMatch) {
            const amount = Number.parseFloat(sizedMatch[1]);
            return `${Math.min(max, Math.max(min, amount))}${sizedMatch[2]}`;
        }

        return "";
    }

    function sanitizeAlign(value) {
        const clean = decodeBasicEntities(value).trim().toLowerCase();
        return ["left", "center", "right", "justify"].includes(clean) ? clean : "";
    }

    function sanitizeVerticalAlign(value) {
        const clean = decodeBasicEntities(value).trim().toLowerCase();
        return ["top", "middle", "bottom", "baseline"].includes(clean) ? clean : "";
    }

    function sanitizePositiveInteger(value, min, max) {
        const numeric = Number.parseInt(decodeBasicEntities(value).trim(), 10);
        if (!Number.isFinite(numeric)) return "";
        return String(Math.min(max, Math.max(min, numeric)));
    }

    function sanitizeListType(value) {
        const clean = decodeBasicEntities(value || "").trim();
        return ["1", "a", "A", "i", "I"].includes(clean) ? clean : "";
    }

    function sanitizeBulletStyle(value) {
        const clean = decodeBasicEntities(value || "").trim().toLowerCase();
        return ["disc", "circle", "square"].includes(clean) ? clean : "";
    }

    function compactLabel(text, maxLength) {
        const value = String(text || "").trim();
        if (value.length <= maxLength) return value;
        return `${value.slice(0, maxLength - 1)}...`;
    }

    function escapeRegex(text) {
        return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    global.DMEBBCode = {
        render,
        parseBBCode,
        helpers: {
            escapeHtml,
            escapeAttribute,
            normalizeNewlines,
            sanitizeUrl
        }
    };
})(window);
