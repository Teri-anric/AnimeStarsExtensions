import { SETTING_FIELDS } from '../../config/setting-fields.js';
import { renderCustom } from './custom-blocks.js';
import { renderDeclarativeNode } from './declarative-blocks.js';

export function createToggle(fieldKey) {
    const wrap = document.createElement('label');
    wrap.className = 'toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = fieldKey;
    const slider = document.createElement('span');
    slider.className = 'slider';
    wrap.appendChild(input);
    wrap.appendChild(slider);
    return wrap;
}

export function renderSelect(fieldKey, def) {
    const select = document.createElement('select');
    select.id = fieldKey;
    for (const opt of def.options || []) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.labelKey;
        if (opt.inspect) {
            o.setAttribute('disable-translate', '');
            o.value = '$inspect';
        }
        select.appendChild(o);
    }
    return select;
}

export function renderRange(fieldKey, def) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-container';
    const range = document.createElement('input');
    range.type = 'range';
    range.id = fieldKey;
    range.min = String(def.min ?? 0);
    range.max = String(def.max ?? 100);
    range.step = String(def.step ?? 1);
    const num = document.createElement('input');
    num.type = 'number';
    num.id = `${fieldKey}-number`;
    num.min = range.min;
    num.max = range.max;
    num.step = range.step;
    const unit = document.createElement('span');
    unit.textContent = def.unit || '';
    wrap.appendChild(range);
    wrap.appendChild(num);
    wrap.appendChild(unit);
    return wrap;
}

export function renderFieldRow(fieldKey, showIf, nodeOverrides = {}) {
    const def = SETTING_FIELDS[fieldKey];
    if (!def || def.type === 'custom') return null;

    const row = document.createElement('div');
    row.className = 'setting-item';
    if (showIf) {
        row.setAttribute('data-show-if', JSON.stringify(showIf));
    }

    const label = document.createElement('label');
    label.setAttribute('for', fieldKey);
    label.textContent = def.labelKey;
    row.appendChild(label);

    if (def.type === 'checkbox') {
        row.appendChild(createToggle(fieldKey));
    } else if (def.type === 'select') {
        row.appendChild(renderSelect(fieldKey, def));
    } else if (def.type === 'range') {
        row.appendChild(renderRange(fieldKey, def));
        if (def.descriptionKey) {
            const small = document.createElement('small');
            small.textContent = def.descriptionKey;
            row.appendChild(small);
        }
    } else if (def.type === 'action_property') {
        const span = document.createElement('span');
        span.id = fieldKey;
        span.textContent = '0';
        row.appendChild(span);
    } else if (def.type === 'action' && def.action) {
        if (nodeOverrides.metric) {
            const metricSpan = document.createElement('span');
            metricSpan.id = nodeOverrides.metric;
            metricSpan.textContent = '0';
            row.appendChild(metricSpan);
        }
        const btn = document.createElement('button');
        btn.id = nodeOverrides.id || fieldKey;
        btn.type = 'button';
        btn.className = nodeOverrides.btnClass || 'as-btn as-btn--secondary';
        btn.textContent = nodeOverrides.labelKey || def.labelKey;
        btn.dataset.actionField = fieldKey;
        row.appendChild(btn);
    }

    if (def.descriptionKey && def.type === 'checkbox') {
        const small = document.createElement('small');
        small.textContent = def.descriptionKey;
        row.appendChild(small);
    }

    return row;
}

export function renderSectionHeader(titleKey, tooltipKey) {
    const h = document.createElement('h2');
    if (!tooltipKey) {
        h.textContent = titleKey;
        return h;
    }
    const span = document.createElement('span');
    span.textContent = titleKey;
    const tt = document.createElement('div');
    tt.className = 'tooltip';
    const icon = document.createElement('span');
    icon.className = 'tooltip-icon';
    icon.textContent = '?';
    const ttText = document.createElement('span');
    ttText.className = 'tooltip-text';
    ttText.textContent = tooltipKey;
    tt.appendChild(icon);
    tt.appendChild(ttText);
    h.appendChild(span);
    h.appendChild(tt);
    return h;
}

export function renderNodes(nodes, container) {
    for (const node of nodes) {
        if (node.kind === 'section') {
            const sec = document.createElement('div');
            sec.className = 'settings-section';
            sec.appendChild(renderSectionHeader(node.titleKey, node.tooltipKey));
            renderNodes(node.children, sec);
            container.appendChild(sec);
        } else if (node.kind === 'sub') {
            const sub = document.createElement('div');
            sub.className = 'settings-sub-section hidden';
            sub.id = node.id;
            if (node.showIf) {
                sub.setAttribute('data-show-if', JSON.stringify(node.showIf));
            }
            renderNodes(node.children, sub);
            container.appendChild(sub);
        } else if (node.kind === 'field') {
            const row = renderFieldRow(node.fieldKey, node.showIf);
            if (row) container.appendChild(row);
        } else if (node.kind === 'actionField') {
            const row = renderFieldRow(node.fieldKey, node.showIf, {
                id: node.id,
                labelKey: node.labelKey,
                btnClass: node.btnClass,
                metric: node.metric,
            });
            if (row) container.appendChild(row);
        } else if (node.kind === 'custom') {
            const el = renderCustom(node.customId);
            if (el) container.appendChild(el);
        } else if (
            node.kind === 'pageLink' ||
            node.kind === 'externalLink' ||
            node.kind === 'runtimeRow'
        ) {
            const el = renderDeclarativeNode(node);
            if (el) container.appendChild(el);
        }
    }
}
