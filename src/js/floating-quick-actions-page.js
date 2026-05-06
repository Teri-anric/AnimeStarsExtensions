import { SETTING_FIELDS, getQuickActionFieldKeys } from '../config/setting-fields.js';
import {
    FLOATING_QUICK_ACTIONS_KEY,
    parseFabConfig,
    stringifyFabConfig,
    collectToggleKeysFromItems,
    newGroupItem,
    FAB_POSITION_PRESETS,
    fabPanelLayoutIsLauncher,
} from './fab-config.js';
import { i18nReady } from './translation.js';
import { createFabIconField } from './fab-icon-field.js';

let fabPageLang = 'uk';
const CARD_WIDGET_TOGGLE_PREFIX = 'card-widget-toggle:';

/** @typedef {import('./fab-config.js').FabConfigNormalized} FabConfigNormalized */

function trLabel(key, allFields = SETTING_FIELDS) {
    const def = allFields[key];
    if (!def) return key;
    return window.i18n?.getTranslateText?.(def.labelKey) ?? def.labelKey;
}

function parseCardWidgetsConfig(raw) {
    if (typeof raw !== 'string') return [];
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

function buildDynamicWidgetActionFields(data) {
    const out = {};
    const widgets = parseCardWidgetsConfig(data?.['card-widgets']);
    for (const widget of widgets) {
        const id = typeof widget?.id === 'string' ? widget.id.trim() : '';
        if (!id) continue;
        const widgetName = typeof widget?.name === 'string' && widget.name.trim() ? widget.name.trim() : id;
        out[`${CARD_WIDGET_TOGGLE_PREFIX}${id}`] = {
            type: 'widget_toggle',
            labelKey: `Widget: ${widgetName}`,
        };
    }
    return out;
}

function getAllFieldsWithDynamicActions(data) {
    return {
        ...SETTING_FIELDS,
        ...buildDynamicWidgetActionFields(data),
    };
}

/**
 * @param {number[]} path parent [] for root, [gi] for group at root index gi
 * @param {import('./fab-config.js').FabItem[]} items
 */
function getSiblingArray(items, path) {
    if (path.length === 0) return items;
    const gi = path[0];
    const g = items[gi];
    if (!g || g.kind !== 'group') return null;
    return g.items;
}

/**
 * @param {unknown[]} arr
 * @param {number} fromIndex
 * @param {number} toIndex insert position (same semantics as user-card-buttons-editor moveButton)
 */
function moveWithinArray(arr, fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    let to = toIndex;
    if (fromIndex < to) to--;
    const [el] = arr.splice(fromIndex, 1);
    arr.splice(to, 0, el);
}

/**
 * @param {FabConfigNormalized} cfg
 * @param {number[]} path
 */
function removeAtPath(cfg, path) {
    const items = cfg.items;
    if (path.length === 1) {
        items.splice(path[0], 1);
        return;
    }
    const [gi, ci] = path;
    const g = items[gi];
    if (g && g.kind === 'group') g.items.splice(ci, 1);
}

/**
 * @param {FabConfigNormalized} cfg
 * @param {number[]} path
 */
function itemAtPath(cfg, path) {
    if (path.length === 1) return cfg.items[path[0]];
    const g = cfg.items[path[0]];
    if (g && g.kind === 'group') return g.items[path[1]];
    return undefined;
}

function pathStr(path) {
    return JSON.stringify(path);
}

function parsePath(s) {
    try {
        const p = JSON.parse(s);
        return Array.isArray(p) ? p.map((x) => Number(x)) : null;
    } catch {
        return null;
    }
}

function newLinkItem() {
    return {
        kind: 'link',
        label: 'Cards',
        url: '/user/cards/?name={USERNAME}',
        icon: 'fa-solid fa-link',
    };
}

function buildPanel(root) {
    root.innerHTML = '';

    /**
     * @param {string} titleKey
     * @param {Node[]} nodes
     */
    function createSection(titleKey, nodes, extraClass = '') {
        const section = document.createElement('section');
        section.className = `fab-settings-card ${extraClass}`.trim();
        const title = document.createElement('h2');
        title.className = 'fab-settings-card-title';
        title.textContent = titleKey;
        section.appendChild(title);
        nodes.forEach((node) => section.appendChild(node));
        return section;
    }

    const hint = document.createElement('p');
    hint.className = 'ext-page-lead';
    hint.textContent = 'floating_quick_actions_hint';

    const enableRow = document.createElement('div');
    enableRow.className = 'setting-item fab-enable-row';
    const enableLabel = document.createElement('label');
    enableLabel.setAttribute('for', 'floating-quick-actions-enabled');
    enableLabel.textContent = 'floating_quick_actions_enabled';
    const enableToggle = document.createElement('label');
    enableToggle.className = 'toggle';
    const enableInput = document.createElement('input');
    enableInput.type = 'checkbox';
    enableInput.id = 'floating-quick-actions-enabled';
    const slider = document.createElement('span');
    slider.className = 'slider';
    enableToggle.appendChild(enableInput);
    enableToggle.appendChild(slider);
    enableRow.appendChild(enableLabel);
    enableRow.appendChild(enableToggle);

    const posLabel = document.createElement('label');
    posLabel.setAttribute('for', 'floating-quick-actions-position');
    posLabel.textContent = 'floating_quick_actions_position';
    const posSelect = document.createElement('select');
    posSelect.id = 'floating-quick-actions-position';
    for (const preset of FAB_POSITION_PRESETS) {
        const o = document.createElement('option');
        o.value = preset;
        o.textContent = `floating_quick_actions_pos_${preset.replace(/-/g, '_')}`;
        posSelect.appendChild(o);
    }
    const posRow = document.createElement('div');
    posRow.className = 'fab-control-row';
    posRow.appendChild(posLabel);
    posRow.appendChild(posSelect);

    const btnLookWrap = document.createElement('div');
    btnLookWrap.className = 'fab-btn-look-row';
    /**
     * @param {HTMLLabelElement} label
     * @param {HTMLElement} control
     */
    function appendLookControlRow(label, control) {
        const row = document.createElement('div');
        row.className = 'fab-control-row';
        row.appendChild(label);
        row.appendChild(control);
        btnLookWrap.appendChild(row);
    }
    const bgLabel = document.createElement('label');
    bgLabel.setAttribute('for', 'fab-btn-bg');
    bgLabel.textContent = 'fab_button_bg_color';
    const bgInput = document.createElement('input');
    bgInput.type = 'color';
    bgInput.id = 'fab-btn-bg';
    bgInput.className = 'fab-btn-bg-input';
    const textLabel = document.createElement('label');
    textLabel.setAttribute('for', 'fab-btn-text');
    textLabel.textContent = 'fab_button_text_color';
    const textInput = document.createElement('input');
    textInput.type = 'color';
    textInput.id = 'fab-btn-text';
    textInput.className = 'fab-btn-text-input';
    const opLabel = document.createElement('label');
    opLabel.setAttribute('for', 'fab-btn-opacity');
    opLabel.textContent = 'fab_button_opacity';
    const opRange = document.createElement('input');
    opRange.type = 'range';
    opRange.id = 'fab-btn-opacity';
    opRange.min = '0';
    opRange.max = '100';
    opRange.step = '1';
    opRange.className = 'fab-btn-opacity-range';
    const sizeLabel = document.createElement('label');
    sizeLabel.setAttribute('for', 'fab-btn-size');
    sizeLabel.textContent = 'fab_button_size';
    const sizeRange = document.createElement('input');
    sizeRange.type = 'range';
    sizeRange.id = 'fab-btn-size';
    sizeRange.min = '28';
    sizeRange.max = '72';
    sizeRange.step = '1';
    sizeRange.className = 'fab-btn-size-range';
    const launcherSizeLabel = document.createElement('label');
    launcherSizeLabel.setAttribute('for', 'fab-launcher-size');
    launcherSizeLabel.textContent = 'fab_launcher_size';
    const launcherSizeRange = document.createElement('input');
    launcherSizeRange.type = 'range';
    launcherSizeRange.id = 'fab-launcher-size';
    launcherSizeRange.min = '28';
    launcherSizeRange.max = '72';
    launcherSizeRange.step = '1';
    launcherSizeRange.className = 'fab-launcher-size-range';
    const radiusLabel = document.createElement('label');
    radiusLabel.setAttribute('for', 'fab-btn-radius');
    radiusLabel.textContent = 'fab_button_radius';
    const radiusRange = document.createElement('input');
    radiusRange.type = 'range';
    radiusRange.id = 'fab-btn-radius';
    radiusRange.min = '0';
    radiusRange.max = '50';
    radiusRange.step = '1';
    radiusRange.className = 'fab-btn-radius-range';
    const gapLabel = document.createElement('label');
    gapLabel.setAttribute('for', 'fab-btn-gap');
    gapLabel.textContent = 'fab_button_gap';
    const gapRange = document.createElement('input');
    gapRange.type = 'range';
    gapRange.id = 'fab-btn-gap';
    gapRange.min = '0';
    gapRange.max = '32';
    gapRange.step = '1';
    gapRange.className = 'fab-btn-gap-range';
    appendLookControlRow(bgLabel, bgInput);
    appendLookControlRow(textLabel, textInput);
    appendLookControlRow(opLabel, opRange);
    appendLookControlRow(sizeLabel, sizeRange);
    appendLookControlRow(launcherSizeLabel, launcherSizeRange);
    appendLookControlRow(radiusLabel, radiusRange);
    appendLookControlRow(gapLabel, gapRange);

    const actionDisplayRow = document.createElement('div');
    actionDisplayRow.className = 'fab-control-row';

    const panelLayoutWrap = document.createElement('div');
    panelLayoutWrap.className = 'fab-control-row';
    const plLabel = document.createElement('label');
    plLabel.setAttribute('for', 'fab-panel-layout');
    plLabel.textContent = 'fab_panel_layout';
    const plSel = document.createElement('select');
    plSel.id = 'fab-panel-layout';

    const adLabel = document.createElement('label');
    adLabel.setAttribute('for', 'fab-action-display');
    adLabel.textContent = 'fab_action_display';
    const adSel = document.createElement('select');
    adSel.id = 'fab-action-display';
    for (const v of ['icon', 'text']) {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = `fab_action_${v}`;
        adSel.appendChild(o);
    }

    const liLabel = document.createElement('label');
    liLabel.setAttribute('for', 'fab-launcher-icon-mount');
    liLabel.textContent = 'fab_launcher_icon';
    actionDisplayRow.appendChild(adLabel);
    actionDisplayRow.appendChild(adSel);

    panelLayoutWrap.appendChild(plLabel);
    panelLayoutWrap.appendChild(plSel);

    const launcherRow = document.createElement('div');
    launcherRow.className = 'fab-control-row';
    launcherRow.id = 'fab-launcher-row';
    const launcherMount = document.createElement('div');
    launcherMount.id = 'fab-launcher-icon-mount';
    launcherRow.appendChild(liLabel);
    launcherRow.appendChild(launcherMount);

    const addSectionLabel = document.createElement('label');
    addSectionLabel.id = 'fab-add-actions-title';
    addSectionLabel.textContent = 'fab_add_actions_title';

    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'fab-add-search';
    search.className = 'fab-add-search';
    search.placeholder = 'fab_add_search_placeholder';

    const availableList = document.createElement('div');
    availableList.id = 'fab-available-list';
    availableList.className = 'fab-available-list';

    const addGroupBtn = document.createElement('button');
    addGroupBtn.type = 'button';
    addGroupBtn.id = 'fab-add-group-btn';
    addGroupBtn.className = 'as-btn as-btn--secondary';
    addGroupBtn.textContent = 'fab_add_group_button';
    const addLinkBtn = document.createElement('button');
    addLinkBtn.type = 'button';
    addLinkBtn.id = 'fab-add-link-btn';
    addLinkBtn.className = 'as-btn as-btn--secondary';
    addLinkBtn.textContent = 'fab_add_link_button';

    const layoutLabel = document.createElement('label');
    layoutLabel.id = 'fab-panel-layout-label';
    layoutLabel.textContent = 'fab_panel_layout_label';

    const itemsEditor = document.createElement('div');
    itemsEditor.id = 'fab-items-editor';
    itemsEditor.className = 'fab-items-editor';

    root.classList.add('fab-settings-layout');
    const grid = document.createElement('div');
    grid.className = 'fab-settings-grid';
    const leftCol = document.createElement('div');
    leftCol.className = 'fab-settings-col fab-settings-col--left';
    const rightCol = document.createElement('div');
    rightCol.className = 'fab-settings-col fab-settings-col--right';

    leftCol.appendChild(createSection('floating_quick_actions_enabled', [enableRow, posRow], 'fab-card--compact'));
    leftCol.appendChild(createSection('fab_button_bg_color', [btnLookWrap], 'fab-card--compact'));
    leftCol.appendChild(createSection('fab_panel_layout', [actionDisplayRow, panelLayoutWrap, launcherRow], 'fab-card--compact'));
    rightCol.appendChild(createSection('fab_add_actions_title', [search, availableList, addGroupBtn, addLinkBtn]));
    rightCol.appendChild(createSection('fab_panel_layout_label', [layoutLabel, itemsEditor]));
    grid.appendChild(leftCol);
    grid.appendChild(rightCol);

    root.appendChild(hint);
    root.appendChild(grid);
}

function wirePanel() {
    const enableInput = /** @type {HTMLInputElement|null} */ (document.getElementById('floating-quick-actions-enabled'));
    const posSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('floating-quick-actions-position'));
    const plSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('fab-panel-layout'));
    const adSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('fab-action-display'));
    const bgInput = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-btn-bg'));
    const textInput = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-btn-text'));
    const opRange = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-btn-opacity'));
    const sizeRange = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-btn-size'));
    const launcherSizeRange = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-launcher-size'));
    const radiusRange = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-btn-radius'));
    const gapRange = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-btn-gap'));
    const launcherMount = document.getElementById('fab-launcher-icon-mount');
    const launcherRow = document.getElementById('fab-launcher-row');
    const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-add-search'));
    const availableList = document.getElementById('fab-available-list');
    const addGroupBtn = document.getElementById('fab-add-group-btn');
    const addLinkBtn = document.getElementById('fab-add-link-btn');
    const itemsEditor = document.getElementById('fab-items-editor');

    if (
        !enableInput ||
        !posSelect ||
        !plSel ||
        !adSel ||
        !bgInput ||
        !textInput ||
        !opRange ||
        !sizeRange ||
        !launcherSizeRange ||
        !radiusRange ||
        !gapRange ||
        !launcherMount ||
        !launcherRow ||
        !searchInput ||
        !availableList ||
        !addGroupBtn ||
        !addLinkBtn ||
        !itemsEditor
    ) {
        return;
    }

    const qaBaseKeys = getQuickActionFieldKeys();

    function tMsg(key) {
        return window.i18n?.getTranslateText?.(key) ?? key;
    }

    function readCfg(cb) {
        chrome.storage.sync.get(null, (data) => {
            cb(parseFabConfig(data[FLOATING_QUICK_ACTIONS_KEY]), data);
        });
    }

    function writeCfg(cfg) {
        chrome.storage.sync.set({ [FLOATING_QUICK_ACTIONS_KEY]: stringifyFabConfig(cfg) });
    }

    /** @param {FabConfigNormalized} cfg */
    function launcherUiNeeded(cfg) {
        return fabPanelLayoutIsLauncher(cfg.panelLayout);
    }

    /** @param {FabConfigNormalized} cfg */
    function syncPanelLayoutDropdown(cfg) {
        const layouts = /** @type {string[]} */ ([
            'column',
            'radial_open',
            'line_open',
            'radial_launcher',
            'line_launcher',
        ]);
        plSel.innerHTML = '';
        for (const v of layouts) {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = tMsg(`fab_panel_layout_${v.replace(/-/g, '_')}`);
            plSel.appendChild(o);
        }
        const ok = layouts.includes(cfg.panelLayout);
        plSel.value = ok ? cfg.panelLayout : layouts[0];
    }

    /** @type {number|null} */
    let draggedFromIndex = null;
    /** @type {number[]|null} */
    let draggedPath = null;

    function attachRowDrag(row, arr, pathPrefix) {
        row.addEventListener('dragstart', (e) => {
            const path = parsePath(row.dataset.path || '');
            if (!path) return;
            draggedPath = path;
            draggedFromIndex = path[path.length - 1];
            row.classList.add('fab-edit-row--dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', pathStr(path));
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('fab-edit-row--dragging');
            draggedPath = null;
            draggedFromIndex = null;
            document.querySelectorAll('.fab-edit-row').forEach((r) => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const ds = e.dataTransfer.getData('text/plain');
            if (!ds || ds === row.dataset.path) return;
            const rect = row.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (e.clientY < mid) {
                row.classList.add('drag-over-top');
                row.classList.remove('drag-over-bottom');
            } else {
                row.classList.add('drag-over-bottom');
                row.classList.remove('drag-over-top');
            }
        });
        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('drag-over-top', 'drag-over-bottom');
            const fromStr = e.dataTransfer.getData('text/plain');
            const fromPath = parsePath(fromStr);
            const toPath = parsePath(row.dataset.path || '');
            if (!fromPath || !toPath || fromPath.length !== toPath.length) return;
            const pFrom = fromPath.slice(0, -1).join(',');
            const pTo = toPath.slice(0, -1).join(',');
            if (pFrom !== pTo) return;

            readCfg((cfg) => {
                const parentPath =
                    fromPath.length === 1 ? /** @type {number[]} */ ([]) : /** @type {[number]} */ ([fromPath[0]]);
                const sib = getSiblingArray(cfg.items, parentPath);
                if (!sib) return;
                const fromIndex = fromPath[fromPath.length - 1];
                const targetIndex = toPath[toPath.length - 1];
                const rect = row.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                let insertIndex = e.clientY < mid ? targetIndex : targetIndex + 1;
                moveWithinArray(sib, fromIndex, insertIndex);
                writeCfg(cfg);
                fullRender();
            });
        });
    }

    function renderAvailableList(cfg, data) {
        availableList.innerHTML = '';
        const q = searchInput.value.trim().toLowerCase();
        const used = collectToggleKeysFromItems(cfg.items);
        const allFields = getAllFieldsWithDynamicActions(data);
        const qaKeys = Object.keys(allFields).filter((k) => {
            const type = allFields[k]?.type;
            return ['checkbox', 'select', 'range', 'action', 'action_property', 'widget_toggle'].includes(type);
        });

        for (const key of qaKeys) {
            if (used.has(key)) continue;
            const lab = trLabel(key, allFields);
            if (q && !lab.toLowerCase().includes(q) && !key.toLowerCase().includes(q)) continue;

            const row = document.createElement('div');
            row.className = 'fab-available-row';
            const span = document.createElement('span');
            span.className = 'fab-available-row-label';
            span.textContent = lab;
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'as-btn as-btn--primary fab-available-add';
            addBtn.textContent = tMsg('fab_available_add');
            addBtn.addEventListener('click', () => {
                readCfg((c) => {
                    c.items.push({ kind: 'toggle', key });
                    writeCfg(c);
                    fullRender();
                });
            });
            row.appendChild(span);
            row.appendChild(addBtn);
            availableList.appendChild(row);
        }

        if (!availableList.childNodes.length) {
            const empty = document.createElement('p');
            empty.className = 'fab-available-empty';
            empty.textContent = tMsg('fab_available_empty');
            availableList.appendChild(empty);
        }
    }

    /**
     * @param {import('./fab-config.js').FabItem} item
     * @param {number[]} path
     * @param {FabConfigNormalized} cfg
     */
    function renderEditorItem(item, path, cfg, data) {
        const row = document.createElement('div');
        row.className = 'fab-edit-row';
        row.dataset.path = pathStr(path);
        row.draggable = true;

        const handle = document.createElement('div');
        handle.className = 'fab-drag-handle';
        handle.textContent = '⋮⋮';
        handle.title = tMsg('fab_drag_hint');

        const body = document.createElement('div');
        body.className = 'fab-edit-row-body';

        if (item.kind === 'toggle') {
            const allFields = getAllFieldsWithDynamicActions(data);
            const meta = allFields[item.key];
            const title = document.createElement('span');
            title.className = 'fab-edit-title';
            title.textContent = meta ? trLabel(item.key, allFields) : item.key;
            body.appendChild(title);
            const iconMount = document.createElement('div');
            iconMount.className = 'fab-toggle-icon-mount';
            iconMount.appendChild(
                createFabIconField({
                    translate: tMsg,
                    value: item.icon || '',
                    onCommit: (cls) => {
                        readCfg((c) => {
                            const tItem = itemAtPath(c, path);
                            if (tItem && tItem.kind === 'toggle') {
                                const v = cls.trim();
                                if (v) tItem.icon = v.slice(0, 120);
                                else delete tItem.icon;
                                writeCfg(c);
                                fullRender();
                            }
                        });
                    },
                })
            );
            body.appendChild(iconMount);
        } else if (item.kind === 'link') {
            const title = document.createElement('span');
            title.className = 'fab-edit-title';
            title.textContent = tMsg('fab_link_item_title');
            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.className = 'fab-group-label-input';
            labelInput.placeholder = tMsg('fab_link_label_placeholder');
            labelInput.value = item.label || '';
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.className = 'fab-group-label-input';
            urlInput.placeholder = tMsg('fab_link_url_placeholder');
            urlInput.value = item.url || '';
            const persist = () => {
                readCfg((c) => {
                    const tItem = itemAtPath(c, path);
                    if (tItem && tItem.kind === 'link') {
                        tItem.label = labelInput.value.trim().slice(0, 120);
                        tItem.url = urlInput.value.trim().slice(0, 1024);
                        writeCfg(c);
                        fullRender();
                    }
                });
            };
            labelInput.addEventListener('change', persist);
            urlInput.addEventListener('change', persist);
            body.appendChild(title);
            body.appendChild(labelInput);
            body.appendChild(urlInput);
            const iconMount = document.createElement('div');
            iconMount.className = 'fab-toggle-icon-mount';
            iconMount.appendChild(
                createFabIconField({
                    translate: tMsg,
                    value: item.icon || '',
                    onCommit: (cls) => {
                        readCfg((c) => {
                            const tItem = itemAtPath(c, path);
                            if (tItem && tItem.kind === 'link') {
                                const v = cls.trim();
                                if (v) tItem.icon = v.slice(0, 120);
                                else delete tItem.icon;
                                writeCfg(c);
                                fullRender();
                            }
                        });
                    },
                })
            );
            body.appendChild(iconMount);
        } else {
            const title = document.createElement('span');
            title.className = 'fab-edit-title';
            title.textContent = window.i18n?.getTranslateText?.('fab_group_label_prefix') ?? 'Group:';
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'fab-group-label-input';
            inp.value = item.labelKey || 'fab_group_more';
            inp.placeholder = 'fab_group_more';
            inp.addEventListener('change', () => {
                readCfg((c) => {
                    const tItem = path.length === 1 ? c.items[path[0]] : c.items[path[0]]?.items?.[path[1]];
                    if (tItem && tItem.kind === 'group') {
                        tItem.labelKey = inp.value.trim() || 'fab_group_more';
                        writeCfg(c);
                        fullRender();
                    }
                });
            });
            body.appendChild(title);
            body.appendChild(inp);
        }

        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'fab-row-remove';
        rm.innerHTML = '&times;';
        rm.title = tMsg('fab_remove_item');
        rm.addEventListener('click', () => {
            readCfg((c) => {
                removeAtPath(c, path);
                writeCfg(c);
                fullRender();
            });
        });

        row.appendChild(handle);
        row.appendChild(body);
        row.appendChild(rm);

        const parentPath = path.slice(0, -1);
        const sib = getSiblingArray(cfg.items, parentPath);
        if (sib) attachRowDrag(row, sib, parentPath);

        return row;
    }

    function renderEditorNested(cfg, data) {
        itemsEditor.innerHTML = '';
        const allFields = getAllFieldsWithDynamicActions(data);
        const qaKeys = Object.keys(allFields).filter((k) => {
            const type = allFields[k]?.type;
            return ['checkbox', 'select', 'range', 'action', 'action_property', 'widget_toggle'].includes(type);
        });

        const rootList = document.createElement('div');
        rootList.className = 'fab-edit-root-list';

        cfg.items.forEach((item, i) => {
            const block = document.createElement('div');
            block.className = 'fab-edit-block';

            const path = [i];
            const row = renderEditorItem(item, path, cfg, data);
            block.appendChild(row);

            if (item.kind === 'group') {
                const nest = document.createElement('div');
                nest.className = 'fab-edit-nested';

                const used = collectToggleKeysFromItems(cfg.items);
                const addWrap = document.createElement('div');
                addWrap.className = 'fab-group-add-row';
                const sel = document.createElement('select');
                sel.className = 'fab-group-add-select';
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = tMsg('fab_group_pick_action');
                sel.appendChild(placeholder);

                for (const key of qaKeys) {
                    if (used.has(key)) continue;
                    const o = document.createElement('option');
                    o.value = key;
                    o.textContent = trLabel(key, allFields);
                    sel.appendChild(o);
                }

                const addChildBtn = document.createElement('button');
                addChildBtn.type = 'button';
                addChildBtn.className = 'as-btn as-btn--secondary';
                addChildBtn.textContent = tMsg('fab_group_add_selected');
                addChildBtn.addEventListener('click', () => {
                    const key = sel.value;
                    if (!key) return;
                    readCfg((c) => {
                        const g = c.items[i];
                        if (!g || g.kind !== 'group') return;
                        g.items.push({ kind: 'toggle', key });
                        writeCfg(c);
                        fullRender();
                    });
                });

                addWrap.appendChild(sel);
                addWrap.appendChild(addChildBtn);
                const addChildLinkBtn = document.createElement('button');
                addChildLinkBtn.type = 'button';
                addChildLinkBtn.className = 'as-btn as-btn--secondary';
                addChildLinkBtn.textContent = tMsg('fab_add_link_button');
                addChildLinkBtn.addEventListener('click', () => {
                    readCfg((c) => {
                        const g = c.items[i];
                        if (!g || g.kind !== 'group') return;
                        g.items.push(newLinkItem());
                        writeCfg(c);
                        fullRender();
                    });
                });
                addWrap.appendChild(addChildLinkBtn);
                nest.appendChild(addWrap);

                item.items.forEach((child, ci) => {
                    if (child.kind !== 'toggle' && child.kind !== 'link') return;
                    const cpath = [i, ci];
                    const crow = renderEditorItem(child, cpath, cfg, data);
                    nest.appendChild(crow);
                });

                block.appendChild(nest);
            }

            rootList.appendChild(block);
        });

        itemsEditor.appendChild(rootList);
        void window.i18n?.changeLang?.(fabPageLang);
    }

    function syncStaticControls(cfg) {
        enableInput.checked = cfg.enabled;
        posSelect.value = cfg.positionPreset;
        posSelect.querySelectorAll('option').forEach((opt) => {
            const v = opt.value;
            opt.textContent = tMsg(`floating_quick_actions_pos_${v.replace(/-/g, '_')}`);
        });
        bgInput.value = cfg.buttonBgColor || '#ffffff';
        textInput.value = cfg.buttonTextColor || '#222222';
        opRange.value = String(cfg.buttonOpacity ?? 92);
        sizeRange.value = String(cfg.buttonSize ?? 40);
        launcherSizeRange.value = String(cfg.launcherSize ?? 48);
        radiusRange.value = String(cfg.buttonRadius ?? 12);
        gapRange.value = String(cfg.buttonGap ?? 12);

        syncPanelLayoutDropdown(cfg);

        adSel.value = cfg.actionDisplay === 'icon' ? 'icon' : 'text';
        adSel.querySelectorAll('option').forEach((opt) => {
            opt.textContent = tMsg(`fab_action_${opt.value}`);
        });

        launcherRow.hidden = !launcherUiNeeded(cfg);
        launcherMount.innerHTML = '';
        if (launcherUiNeeded(cfg)) {
            launcherMount.appendChild(
                createFabIconField({
                    translate: tMsg,
                    value: cfg.launcherIcon || '',
                    onCommit: (v) => {
                        readCfg((c) => {
                            c.launcherIcon = v.trim().slice(0, 120);
                            writeCfg(c);
                            fullRender();
                        });
                    },
                })
            );
        }

        const plLabEl = document.querySelector('label[for="fab-panel-layout"]');
        if (plLabEl) plLabEl.textContent = tMsg('fab_panel_layout');
        const adLab = document.querySelector('label[for="fab-action-display"]');
        if (adLab) adLab.textContent = tMsg('fab_action_display');
        const liLab = document.querySelector('label[for="fab-launcher-icon-mount"]');
        if (liLab) liLab.textContent = tMsg('fab_launcher_icon');

        const bgLabEl = document.querySelector('label[for="fab-btn-bg"]');
        const opLabEl = document.querySelector('label[for="fab-btn-opacity"]');
        const bsLabEl = document.querySelector('label[for="fab-btn-size"]');
        const lsLabEl = document.querySelector('label[for="fab-launcher-size"]');
        if (bgLabEl) bgLabEl.textContent = tMsg('fab_button_bg_color');
        const txtLabEl = document.querySelector('label[for="fab-btn-text"]');
        if (txtLabEl) txtLabEl.textContent = tMsg('fab_button_text_color');
        if (opLabEl) opLabEl.textContent = tMsg('fab_button_opacity');
        if (bsLabEl) bsLabEl.textContent = tMsg('fab_button_size');
        if (lsLabEl) lsLabEl.textContent = tMsg('fab_launcher_size');
        const radLabEl = document.querySelector('label[for="fab-btn-radius"]');
        const gapLabEl = document.querySelector('label[for="fab-btn-gap"]');
        if (radLabEl) radLabEl.textContent = tMsg('fab_button_radius');
        if (gapLabEl) gapLabEl.textContent = tMsg('fab_button_gap');

        addGroupBtn.textContent = tMsg('fab_add_group_button');
        addLinkBtn.textContent = tMsg('fab_add_link_button');
        const addSec = document.getElementById('fab-add-actions-title');
        if (addSec) addSec.textContent = tMsg('fab_add_actions_title');
        const lay = document.getElementById('fab-panel-layout-label');
        if (lay) lay.textContent = tMsg('fab_panel_layout_label');
        const prv = document.getElementById('fab-live-preview-label');
        if (prv) prv.textContent = tMsg('fab_live_preview_label');
        searchInput.placeholder = tMsg('fab_add_search_placeholder');
    }

    function fullRender() {
        readCfg((cfg, data) => {
            syncStaticControls(cfg);
            renderAvailableList(cfg, data);
            renderEditorNested(cfg, data);
        });
    }

    enableInput.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.enabled = enableInput.checked;
            writeCfg(cfg);
            fullRender();
        });
    });

    posSelect.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.positionPreset = /** @type {FabConfigNormalized['positionPreset']} */ (posSelect.value);
            writeCfg(cfg);
            fullRender();
        });
    });

    bgInput.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.buttonBgColor = bgInput.value;
            writeCfg(cfg);
            fullRender();
        });
    });

    textInput.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.buttonTextColor = textInput.value;
            writeCfg(cfg);
            fullRender();
        });
    });

    opRange.addEventListener('input', () => {
        readCfg((cfg) => {
            const n = Number.parseInt(opRange.value, 10);
            cfg.buttonOpacity = Number.isNaN(n) ? cfg.buttonOpacity : Math.min(100, Math.max(0, n));
            writeCfg(cfg);
            fullRender();
        });
    });

    sizeRange.addEventListener('input', () => {
        readCfg((cfg) => {
            const n = Number.parseInt(sizeRange.value, 10);
            cfg.buttonSize = Number.isNaN(n) ? cfg.buttonSize : Math.min(72, Math.max(28, n));
            writeCfg(cfg);
            fullRender();
        });
    });

    launcherSizeRange.addEventListener('input', () => {
        readCfg((cfg) => {
            const n = Number.parseInt(launcherSizeRange.value, 10);
            cfg.launcherSize = Number.isNaN(n) ? cfg.launcherSize : Math.min(72, Math.max(28, n));
            writeCfg(cfg);
            fullRender();
        });
    });

    radiusRange.addEventListener('input', () => {
        readCfg((cfg) => {
            const n = Number.parseInt(radiusRange.value, 10);
            cfg.buttonRadius = Number.isNaN(n) ? cfg.buttonRadius : Math.min(50, Math.max(0, n));
            writeCfg(cfg);
            fullRender();
        });
    });

    gapRange.addEventListener('input', () => {
        readCfg((cfg) => {
            const n = Number.parseInt(gapRange.value, 10);
            cfg.buttonGap = Number.isNaN(n) ? cfg.buttonGap : Math.min(32, Math.max(0, n));
            writeCfg(cfg);
            fullRender();
        });
    });

    plSel.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.panelLayout = /** @type {FabConfigNormalized['panelLayout']} */ (plSel.value);
            cfg.displayMode = fabPanelLayoutIsLauncher(cfg.panelLayout) ? 'popup' : 'bar';
            writeCfg(cfg);
            fullRender();
        });
    });

    adSel.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.actionDisplay = adSel.value === 'icon' ? 'icon' : 'text';
            writeCfg(cfg);
            fullRender();
        });
    });

    searchInput.addEventListener('input', () => {
        readCfg((cfg, data) => renderAvailableList(cfg, data));
    });

    addGroupBtn.addEventListener('click', () => {
        readCfg((cfg) => {
            cfg.items.push(newGroupItem('fab_group_more'));
            writeCfg(cfg);
            fullRender();
        });
    });

    addLinkBtn.addEventListener('click', () => {
        readCfg((cfg) => {
            cfg.items.push(newLinkItem());
            writeCfg(cfg);
            fullRender();
        });
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;
        const relevant =
            changes[FLOATING_QUICK_ACTIONS_KEY] ||
            changes['card-widgets'] ||
            changes.language ||
            Object.keys(changes).some((k) => SETTING_FIELDS[k]);
        if (relevant) fullRender();
    });

    fullRender();
}

document.addEventListener('DOMContentLoaded', async () => {
    await i18nReady;

    const root = document.getElementById('fab-settings-root');
    if (!root) return;

    chrome.storage.sync.get(['language'], async (r) => {
        fabPageLang = r.language || 'uk';
        buildPanel(root);
        await window.i18n?.changeLang?.(fabPageLang);
        wirePanel();

    });
});
