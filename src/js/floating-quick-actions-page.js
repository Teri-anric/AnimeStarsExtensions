import { SETTING_FIELDS, getQuickActionFieldKeys } from '../config/setting-fields.js';
import {
    FLOATING_QUICK_ACTIONS_KEY,
    parseFabConfig,
    stringifyFabConfig,
    collectToggleKeysFromItems,
    newGroupItem,
    FAB_POSITION_PRESETS,
} from './fab-config.js';
import { i18nReady } from './translation.js';

let fabPageLang = 'uk';

/** @typedef {import('./fab-config.js').FabConfigNormalized} FabConfigNormalized */

function trLabel(key) {
    const def = SETTING_FIELDS[key];
    if (!def) return key;
    return window.i18n?.getTranslateText?.(def.labelKey) ?? def.labelKey;
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

function buildPanel(root) {
    root.innerHTML = '';

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

    const offsetWrap = document.createElement('div');
    offsetWrap.className = 'fab-offset-row setting-item';
    const oxLabel = document.createElement('label');
    oxLabel.setAttribute('for', 'fab-offset-x');
    oxLabel.textContent = 'fab_offset_x';
    const ox = document.createElement('input');
    ox.type = 'number';
    ox.id = 'fab-offset-x';
    ox.min = '-400';
    ox.max = '400';
    ox.step = '1';
    ox.className = 'fab-offset-input';
    const oyLabel = document.createElement('label');
    oyLabel.setAttribute('for', 'fab-offset-y');
    oyLabel.textContent = 'fab_offset_y';
    const oy = document.createElement('input');
    oy.type = 'number';
    oy.id = 'fab-offset-y';
    oy.min = '-400';
    oy.max = '400';
    oy.step = '1';
    oy.className = 'fab-offset-input';
    offsetWrap.appendChild(oxLabel);
    offsetWrap.appendChild(ox);
    offsetWrap.appendChild(oyLabel);
    offsetWrap.appendChild(oy);

    const appearanceWrap = document.createElement('div');
    appearanceWrap.className = 'fab-appearance-row setting-item';
    const densLabel = document.createElement('label');
    densLabel.setAttribute('for', 'fab-density');
    densLabel.textContent = 'fab_appearance_density';
    const densSel = document.createElement('select');
    densSel.id = 'fab-density';
    for (const v of ['comfortable', 'compact']) {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = `fab_density_${v}`;
        densSel.appendChild(o);
    }
    const varLabel = document.createElement('label');
    varLabel.setAttribute('for', 'fab-variant');
    varLabel.textContent = 'fab_appearance_variant';
    const varSel = document.createElement('select');
    varSel.id = 'fab-variant';
    for (const v of ['default', 'minimal', 'filled']) {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = `fab_variant_${v}`;
        varSel.appendChild(o);
    }
    appearanceWrap.appendChild(densLabel);
    appearanceWrap.appendChild(densSel);
    appearanceWrap.appendChild(varLabel);
    appearanceWrap.appendChild(varSel);

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

    const layoutLabel = document.createElement('label');
    layoutLabel.id = 'fab-panel-layout-label';
    layoutLabel.textContent = 'fab_panel_layout_label';

    const itemsEditor = document.createElement('div');
    itemsEditor.id = 'fab-items-editor';
    itemsEditor.className = 'fab-items-editor';

    root.appendChild(hint);
    root.appendChild(enableRow);
    root.appendChild(posLabel);
    root.appendChild(posSelect);
    root.appendChild(offsetWrap);
    root.appendChild(appearanceWrap);
    root.appendChild(addSectionLabel);
    root.appendChild(search);
    root.appendChild(availableList);
    root.appendChild(addGroupBtn);
    root.appendChild(layoutLabel);
    root.appendChild(itemsEditor);
}

function wirePanel() {
    const enableInput = /** @type {HTMLInputElement|null} */ (document.getElementById('floating-quick-actions-enabled'));
    const posSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('floating-quick-actions-position'));
    const oxInput = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-offset-x'));
    const oyInput = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-offset-y'));
    const densSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('fab-density'));
    const varSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('fab-variant'));
    const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('fab-add-search'));
    const availableList = document.getElementById('fab-available-list');
    const addGroupBtn = document.getElementById('fab-add-group-btn');
    const itemsEditor = document.getElementById('fab-items-editor');

    if (
        !enableInput ||
        !posSelect ||
        !oxInput ||
        !oyInput ||
        !densSel ||
        !varSel ||
        !searchInput ||
        !availableList ||
        !addGroupBtn ||
        !itemsEditor
    ) {
        return;
    }

    const qaKeys = getQuickActionFieldKeys();

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

    function renderAvailableList(cfg) {
        availableList.innerHTML = '';
        const q = searchInput.value.trim().toLowerCase();
        const used = collectToggleKeysFromItems(cfg.items);

        for (const key of qaKeys) {
            if (used.has(key)) continue;
            const lab = trLabel(key);
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
    function renderEditorItem(item, path, cfg) {
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
            const meta = SETTING_FIELDS[item.key];
            const title = document.createElement('span');
            title.className = 'fab-edit-title';
            title.textContent = meta ? trLabel(item.key) : item.key;
            body.appendChild(title);
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

    function renderEditorNested(cfg) {
        itemsEditor.innerHTML = '';

        const rootList = document.createElement('div');
        rootList.className = 'fab-edit-root-list';

        cfg.items.forEach((item, i) => {
            const block = document.createElement('div');
            block.className = 'fab-edit-block';

            const path = [i];
            const row = renderEditorItem(item, path, cfg);
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
                    o.textContent = trLabel(key);
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
                nest.appendChild(addWrap);

                item.items.forEach((child, ci) => {
                    if (child.kind !== 'toggle') return;
                    const cpath = [i, ci];
                    const crow = renderEditorItem(child, cpath, cfg);
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
        oxInput.value = String(cfg.offsetX ?? 0);
        oyInput.value = String(cfg.offsetY ?? 0);
        densSel.value = cfg.appearance?.density === 'compact' ? 'compact' : 'comfortable';
        densSel.querySelectorAll('option').forEach((opt) => {
            opt.textContent = tMsg(`fab_density_${opt.value}`);
        });
        varSel.value =
            cfg.appearance?.variant === 'minimal' || cfg.appearance?.variant === 'filled'
                ? cfg.appearance.variant
                : 'default';
        varSel.querySelectorAll('option').forEach((opt) => {
            opt.textContent = tMsg(`fab_variant_${opt.value}`);
        });

        const oxLab = document.querySelector('label[for="fab-offset-x"]');
        const oyLab = document.querySelector('label[for="fab-offset-y"]');
        if (oxLab) oxLab.textContent = tMsg('fab_offset_x');
        if (oyLab) oyLab.textContent = tMsg('fab_offset_y');
        const dl = document.querySelector('label[for="fab-density"]');
        const vl = document.querySelector('label[for="fab-variant"]');
        if (dl) dl.textContent = tMsg('fab_appearance_density');
        if (vl) vl.textContent = tMsg('fab_appearance_variant');

        addGroupBtn.textContent = tMsg('fab_add_group_button');
        const addSec = document.getElementById('fab-add-actions-title');
        if (addSec) addSec.textContent = tMsg('fab_add_actions_title');
        const lay = document.getElementById('fab-panel-layout-label');
        if (lay) lay.textContent = tMsg('fab_panel_layout_label');
        const prv = document.getElementById('fab-live-preview-label');
        if (prv) prv.textContent = tMsg('fab_live_preview_label');
        searchInput.placeholder = tMsg('fab_add_search_placeholder');
    }

    function fullRender() {
        readCfg((cfg) => {
            syncStaticControls(cfg);
            renderAvailableList(cfg);
            renderEditorNested(cfg);
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

    function parseOffsetInput(el) {
        const n = Number.parseInt(String(el.value), 10);
        if (Number.isNaN(n)) return 0;
        return Math.min(400, Math.max(-400, n));
    }

    oxInput.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.offsetX = parseOffsetInput(oxInput);
            writeCfg(cfg);
            fullRender();
        });
    });

    oyInput.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.offsetY = parseOffsetInput(oyInput);
            writeCfg(cfg);
            fullRender();
        });
    });

    densSel.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.appearance = cfg.appearance || { density: 'comfortable', variant: 'default' };
            cfg.appearance.density = densSel.value === 'compact' ? 'compact' : 'comfortable';
            writeCfg(cfg);
            fullRender();
        });
    });

    varSel.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.appearance = cfg.appearance || { density: 'comfortable', variant: 'default' };
            const v = varSel.value;
            cfg.appearance.variant = v === 'minimal' || v === 'filled' ? v : 'default';
            writeCfg(cfg);
            fullRender();
        });
    });

    searchInput.addEventListener('input', () => {
        readCfg((cfg) => renderAvailableList(cfg));
    });

    addGroupBtn.addEventListener('click', () => {
        readCfg((cfg) => {
            cfg.items.push(newGroupItem('fab_group_more'));
            writeCfg(cfg);
            fullRender();
        });
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;
        const relevant =
            changes[FLOATING_QUICK_ACTIONS_KEY] ||
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

        const ver = document.getElementById('fab-page-version');
        if (ver) ver.textContent = chrome.runtime.getManifest().version;
    });
});
