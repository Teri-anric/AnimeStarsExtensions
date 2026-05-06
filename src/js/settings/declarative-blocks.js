/**
 * Renders declarative section nodes (pageLink, externalLink, runtimeRow) from setting-sections.js.
 */

/**
 * @param {{ descriptionKey: string, href: string, titleKey: string, anchorId?: string }} node
 */
export function renderPageLink(node) {
    const row = document.createElement('div');
    row.className = 'setting-item';
    const lb = document.createElement('label');
    lb.textContent = node.descriptionKey;
    const a = document.createElement('a');
    a.className = 'open-card-appearance-btn as-ext-link';
    if (node.anchorId) a.id = node.anchorId;
    a.href = node.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const icon = document.createElement('i');
    icon.className = 'fas fa-external-link-alt';
    const span = document.createElement('span');
    span.textContent = node.titleKey;
    a.appendChild(icon);
    a.appendChild(span);
    row.appendChild(lb);
    row.appendChild(a);
    return row;
}

/**
 * @param {{ labelKey: string, url: string, linkHostText: string, descriptionKey?: string }} node
 */
export function renderExternalLink(node) {
    const row = document.createElement('div');
    row.className = 'setting-item';
    const lb = document.createElement('label');
    lb.textContent = node.labelKey;
    const a = document.createElement('a');
    a.href = node.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'website-link as-ext-link';
    const hostSpan = document.createElement('span');
    hostSpan.textContent = node.linkHostText;
    const extIcon = document.createElement('i');
    extIcon.className = 'fas fa-external-link-alt';
    extIcon.setAttribute('aria-hidden', 'true');
    a.appendChild(hostSpan);
    a.appendChild(extIcon);
    row.appendChild(lb);
    row.appendChild(a);
    if (node.descriptionKey) {
        const small = document.createElement('small');
        small.textContent = node.descriptionKey;
        row.appendChild(small);
    }
    return row;
}

/**
 * @param {{
 *   labelKey: string,
 *   metric?: { message: Record<string, unknown>, displayId: string },
 *   buttons?: Array<{
 *     id: string,
 *     labelKey: string,
 *     message: Record<string, unknown>,
 *     btnClass?: string,
 *     refreshMetric?: boolean,
 *   }>,
 * }} node
 */
export function renderRuntimeRow(node) {
    const row = document.createElement('div');
    row.className = 'setting-item';
    const lb = document.createElement('label');
    lb.textContent = node.labelKey;
    row.appendChild(lb);

    if (node.metric) {
        const span = document.createElement('span');
        span.id = node.metric.displayId;
        span.textContent = '0';
        row.appendChild(span);
    }

    for (const b of node.buttons || []) {
        const btn = document.createElement('button');
        btn.id = b.id;
        btn.type = 'button';
        btn.className = b.btnClass || 'as-btn as-btn--secondary';
        btn.textContent = b.labelKey;
        row.appendChild(btn);
    }

    return row;
}

export function renderDeclarativeNode(node) {
    switch (node.kind) {
        case 'pageLink':
            return renderPageLink(node);
        case 'externalLink':
            return renderExternalLink(node);
        case 'runtimeRow':
            return renderRuntimeRow(node);
        default:
            return null;
    }
}
