/**
 * Card Appearance Page JavaScript
 * Handles template editor initialization, preview updates, and settings management
 */

// Import TemplateEditor from module
// Note: This will be loaded via script tag, so we'll check for it globally

// Settings configuration
const SETTINGS_CONFIG = {
    checkboxes: [
        'card-user-count',
        'card-user-count-cache-enabled'
    ],
    selects: [
        'card-user-count-event-target',
        'card-user-count-position',
        'card-user-count-style',
        'card-user-count-size',
        'card-user-count-hover-action'
    ],
    ranges: [
        'card-user-count-opacity'
    ],
    colors: [
        'card-user-count-background-color',
        'card-user-count-text-color'
    ]
};

// Template editor instance
let templateEditor = null;
let widgetsState = { list: [], selectedId: null };

function newWidgetDefaults() {
    return {
        id: `w${Date.now()}`,
        name: '',
        enabled: true,
        position: 'bottom-right',
        positionTopPercent: null,
        positionLeftPercent: null,
        positionRightPercent: null,
        positionBottomPercent: null,
        style: 'default',
        size: 'medium',
        backgroundColor: '#000000',
        textColor: '#ffffff',
        opacity: 80,
        hoverAction: 'none',
        templateItems: [
            { type: 'variable', variable: 'need' },
            { type: 'text', text: ' | ' },
            { type: 'variable', variable: 'owner' },
            { type: 'text', text: ' | ' },
            { type: 'variable', variable: 'trade' }
        ],
        conditions: []
    };
}

function saveWidgets() {
    chrome.storage.sync.set({ 'card-widgets': JSON.stringify(widgetsState.list) });
}

function getSelectedWidget() {
    return widgetsState.list.find(x => x.id === widgetsState.selectedId);
}

function renderConditionsEditor() {
    const container = document.getElementById('conditions-editor');
    const addBtn = document.getElementById('add-condition-btn');
    if (!container) return;

    // Clear
    while (container.firstChild) container.removeChild(container.firstChild);

    const w = getSelectedWidget();
    if (!w) return;

    if (!Array.isArray(w.conditions)) w.conditions = [];

    // Helper to create input controls for one condition
    function createConditionRow(cond, index) {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '120px 110px 1fr 140px 140px 36px';
        row.style.gap = '8px';
        row.style.alignItems = 'center';

        const field = document.createElement('select');
        field.innerHTML = `
            <option value="rank">rank</option>
            <option value="name">name</option>
            <option value="anime-name">anime-name</option>
            <option value="owner-id">owner-id</option>
            <option value="can-trade">can-trade</option>`;
        field.value = cond.field || 'rank';

        const op = document.createElement('select');
        op.innerHTML = `
            <option value="eq">=</option>
            <option value="neq">!=</option>`;
        op.value = cond.op || 'eq';

        const val = document.createElement('input');
        val.type = 'text';
        val.placeholder = 'value';
        val.value = cond.value ?? '';

        const bg = document.createElement('input');
        bg.type = 'color';
        bg.value = cond.backgroundColor || '#000000';
        bg.title = 'background color';

        const text = document.createElement('input');
        text.type = 'color';
        text.value = cond.textColor || '#ffffff';
        text.title = 'text color';

        const remove = document.createElement('button');
        remove.className = 'tab-btn';
        remove.innerHTML = '<i class="fas fa-trash" style="color:#e74c3c"></i>';
        remove.title = 'remove';

        function commit() {
            const target = getSelectedWidget();
            if (!target) return;
            target.conditions[index] = {
                field: field.value,
                op: op.value,
                value: val.value,
                backgroundColor: bg.value,
                textColor: text.value
            };
            saveWidgets();
            updateCardPreview();
        }

        field.addEventListener('change', commit);
        op.addEventListener('change', commit);
        val.addEventListener('input', commit);
        bg.addEventListener('change', commit);
        text.addEventListener('change', commit);

        remove.addEventListener('click', () => {
            const target = getSelectedWidget();
            if (!target) return;
            target.conditions.splice(index, 1);
            saveWidgets();
            renderConditionsEditor();
            updateCardPreview();
        });

        row.appendChild(field);
        row.appendChild(op);
        row.appendChild(val);
        row.appendChild(bg);
        row.appendChild(text);
        row.appendChild(remove);
        return row;
    }

    w.conditions.forEach((c, i) => container.appendChild(createConditionRow(c, i)));

    if (addBtn) {
        addBtn.onclick = () => {
            const target = getSelectedWidget();
            if (!target) return;
            target.conditions.push({ field: 'rank', op: 'eq', value: 'a', backgroundColor: '#000000', textColor: '#ffffff' });
            saveWidgets();
            renderConditionsEditor();
            updateCardPreview();
        };
    }
}

function renderWidgetsList() {
    const tabs = document.getElementById('widgets-tabs');
    if (!tabs) return;
    while (tabs.firstChild) tabs.removeChild(tabs.firstChild);

    widgetsState.list.forEach((w) => {
        const label = document.createElement('p');
        label.className = 'widget-tab__label';
        label.textContent = (w.name && w.name.trim()) ? w.name : w.id;

        const del = document.createElement('button');
        del.className = 'tab-btn';
        del.innerHTML = '<i class="fas fa-trash" style="color:#e74c3c"></i>';
        del.style.padding = '4px 8px';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            widgetsState.list = widgetsState.list.filter(x => x.id !== w.id);
            if (widgetsState.selectedId === w.id) widgetsState.selectedId = widgetsState.list[0]?.id || null;
            saveWidgets();
            renderWidgetsList();
            syncSelectedWidgetToControls();
            updateCardPreview();
        });

        const holder = document.createElement('div');
        holder.className = 'widget-tab' + (widgetsState.selectedId === w.id ? ' active' : '');
        holder.addEventListener('click', () => {
            widgetsState.selectedId = w.id;
            renderWidgetsList();
            syncSelectedWidgetToControls();
        });
        holder.appendChild(label);
        holder.appendChild(del);
        tabs.appendChild(holder);
    });
}

function syncSelectedWidgetToControls() {
    const w = widgetsState.list.find(x => x.id === widgetsState.selectedId);
    if (!w) return;

    const nameInput = document.getElementById('widget-name-input');
    if (nameInput) {
        nameInput.value = w.name || '';
    }

    const m = new Map([
        ['card-user-count-enabled', 'enabled'],
        ['card-user-count-position', 'position'],
        ['card-user-count-style', 'style'],
        ['card-user-count-size', 'size'],
        ['card-user-count-background-color', 'backgroundColor'],
        ['card-user-count-text-color', 'textColor'],
        ['card-user-count-opacity', 'opacity'],
        ['card-user-count-hover-action', 'hoverAction'],
    ]);
    m.forEach((wk, elId) => {
        const el = document.getElementById(elId);
        if (!el) return;
        if (el.type === 'color' || el.tagName === 'SELECT' || el.type === 'range') {
            el.value = w[wk] ?? el.value;
        } else if (el.type === 'checkbox') {
            el.checked = !!w[wk];
        }
        if (el.type === 'range') {
            const span = el.parentNode.querySelector('.slider-value');
            if (span) span.textContent = el.value;
        }
    });

    // Custom position controls visibility and values
    const customControls = document.getElementById('custom-position-controls');
    if (customControls) {
        customControls.style.display = (w.position === 'custom') ? '' : 'none';
    }

    const topInput = document.getElementById('card-user-count-position-top');
    const leftInput = document.getElementById('card-user-count-position-left');
    const rightInput = document.getElementById('card-user-count-position-right');
    const bottomInput = document.getElementById('card-user-count-position-bottom');
    if (topInput) topInput.value = (w.positionTopPercent ?? '') === null ? '' : (w.positionTopPercent ?? '');
    if (leftInput) leftInput.value = (w.positionLeftPercent ?? '') === null ? '' : (w.positionLeftPercent ?? '');
    if (rightInput) rightInput.value = (w.positionRightPercent ?? '') === null ? '' : (w.positionRightPercent ?? '');
    if (bottomInput) bottomInput.value = (w.positionBottomPercent ?? '') === null ? '' : (w.positionBottomPercent ?? '');

    if (templateEditor) templateEditor.setItems(w.templateItems || []);
    renderConditionsEditor();
}

function saveControlsToSelectedWidget() {
    const w = widgetsState.list.find(x => x.id === widgetsState.selectedId);
    if (!w) return;
    const idForSave = w.id; // stabilize target
    const m = new Map([
        ['card-user-count-enabled', 'enabled'],
        ['card-user-count-position', 'position'],
        ['card-user-count-style', 'style'],
        ['card-user-count-size', 'size'],
        ['card-user-count-background-color', 'backgroundColor'],
        ['card-user-count-text-color', 'textColor'],
        ['card-user-count-opacity', 'opacity'],
        ['card-user-count-hover-action', 'hoverAction'],
        ['card-user-count-position-top', 'positionTopPercent'],
        ['card-user-count-position-left', 'positionLeftPercent'],
        ['card-user-count-position-right', 'positionRightPercent'],
        ['card-user-count-position-bottom', 'positionBottomPercent'],
    ]);
    m.forEach((wk, elId) => {
        const el = document.getElementById(elId);
        if (!el) return;
        if (el.type === 'color' || el.tagName === 'SELECT' || el.type === 'range' || el.type === 'number') {
            if (el.type === 'range') {
                w[wk] = parseInt(el.value);
            } else if (el.type === 'number') {
                const n = el.value === '' ? null : Number(el.value);
                if (n === null || Number.isNaN(n)) {
                    w[wk] = null;
                } else {
                    const clamped = Math.max(0, Math.min(100, n));
                    w[wk] = clamped;
                }
            } else {
                w[wk] = el.value;
            }
        } else if (el.type === 'checkbox') {
            w[wk] = el.checked;
        }
    });

    if (templateEditor) w.templateItems = templateEditor.getItems();
    // Ensure we save the same widget even if selection changed mid-edit
    const idx = widgetsState.list.findIndex(x => x.id === idForSave);
    if (idx >= 0) widgetsState.list[idx] = { ...widgetsState.list[idx], ...w };
    saveWidgets();
}

/**
 * Initialize template editor
 */
function initializeTemplateEditor() {
    // Since TemplateEditor is loaded as a module, it should be available on window
    const TemplateEditorClass = window.TemplateEditor;

    if (TemplateEditorClass) {
        templateEditor = new TemplateEditorClass('template-editor', {
            onChange: () => { saveControlsToSelectedWidget(); updateCardPreview(); },
            previewId: 'template-preview'
        });
        // Template items now come from selected widget
        syncSelectedWidgetToControls();
        updateCardPreview();
    } else {
        console.error('TemplateEditor class not found. Make sure template-editor.js is loaded.');
        // Try again after a delay
        setTimeout(initializeTemplateEditor, 200);
    }
}

/**
 * Load settings from Chrome storage
 */
function loadSettings() {
    const allSettings = [
        ...SETTINGS_CONFIG.checkboxes,
        ...SETTINGS_CONFIG.selects,
        ...SETTINGS_CONFIG.ranges,
        ...SETTINGS_CONFIG.colors,
        'card-widgets',
        'language'
    ];

    chrome.storage.sync.get(allSettings, function (settings) {
        // Load language settings
        window.i18n.changeLang(settings.language);
        // Load checkbox settings
        SETTINGS_CONFIG.checkboxes.forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.checked = settings[key] || false;
            }
        });

        // Load select settings
        SETTINGS_CONFIG.selects.forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = settings[key] || '';
            }
        });

        // Load range settings
        SETTINGS_CONFIG.ranges.forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = settings[key] || element.getAttribute('value') || 0;
                const valueSpan = element.parentNode.querySelector('.slider-value');
                if (valueSpan) {
                    valueSpan.textContent = element.value;
                }
            }
        });

        // Load color settings
        SETTINGS_CONFIG.colors.forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                const defaultValue = key.includes('background') ? '#000000' : '#ffffff';
                element.value = settings[key] || defaultValue;
            }
        });

        // Load widgets
        let widgets = [];
        if (settings['card-widgets']) {
            try {
                widgets = typeof settings['card-widgets'] === 'string' ? JSON.parse(settings['card-widgets']) : settings['card-widgets'];
            } catch { }
        }
        if (!Array.isArray(widgets) || widgets.length === 0) {
            widgets = [newWidgetDefaults()];
        }
        widgetsState.list = widgets;
        widgetsState.selectedId = widgets[0].id;
        renderWidgetsList();
        syncSelectedWidgetToControls();
        setTimeout(updateCardPreview, 100);
    });
}

/**
 * Save settings to Chrome storage
 */
function saveSettings() {
    const settings = {};
    const inputs = document.querySelectorAll('input, select');

    inputs.forEach(input => {
        if (input.id) {
            if (input.type === 'checkbox') {
                settings[input.id] = input.checked;
            } else {
                settings[input.id] = input.value;
            }
        }
    });

    chrome.storage.sync.set(settings);
}

/**
 * Setup event listeners for settings inputs
 */
function setupEventListeners() {
    // Add event listeners for preview updates
    const settingInputs = document.querySelectorAll('select, input[type="color"], input[type="range"], input[type="checkbox"], input[type="number"]');
    settingInputs.forEach(input => {
        input.addEventListener('change', () => {
            saveControlsToSelectedWidget();
            updateCardPreview();
            saveSettings();
        });

        if (input.type === 'range') {
            input.addEventListener('input', (e) => {
                const valueSpan = e.target.parentNode.querySelector('.slider-value');
                if (valueSpan) {
                    valueSpan.textContent = e.target.value;
                }
                updateCardPreview();
                saveSettings();
            });
        }

        if (input.id === 'card-user-count-position') {
            input.addEventListener('change', () => {
                // Toggle custom controls
                const el = document.getElementById('custom-position-controls');
                if (el) {
                    el.style.display = input.value === 'custom' ? '' : 'none';
                }
            });
        }
    });
}

/**
 * Initialize the card appearance page
 */
function initializeCardAppearancePage() {
    // Card appearance page initialization

    // Load settings
    loadSettings();

    // Setup event listeners
    setupEventListeners();
    initializeTemplateEditor();

    const addWidgetBtn = document.getElementById('add-widget-btn');
    if (addWidgetBtn) {
        addWidgetBtn.addEventListener('click', () => {
            const w = newWidgetDefaults();
            widgetsState.list.push(w);
            widgetsState.selectedId = w.id;
            saveWidgets();
            renderWidgetsList();
            syncSelectedWidgetToControls();
            updateCardPreview();
        });
    }

    const nameInput = document.getElementById('widget-name-input');
    if (nameInput) {
        let saveTimer = null;
        nameInput.addEventListener('input', () => {
            const w = widgetsState.list.find(x => x.id === widgetsState.selectedId);
            if (!w) return;
            w.name = nameInput.value;
            // debounce save to avoid rapid overwrite issues
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => { saveWidgets(); renderWidgetsList(); }, 200);
        });
    }

    // Tabs
    // Sub-tabs (style/template/conditions)
    function bindSubtabs() {
        const subtabs = Array.from(document.querySelectorAll('.subtab-btn'));
        const contents = Array.from(document.querySelectorAll('.tab-content'));
        subtabs.forEach(btn => btn.addEventListener('click', () => {
            subtabs.forEach(x => x.classList.remove('active'));
            contents.forEach(x => x.classList.remove('active'));
            btn.classList.add('active');
            const t = btn.getAttribute('data-subtab');
            const content = document.getElementById(`tab-${t}`);
            if (content) content.classList.add('active');
            if (t === 'conditions') renderConditionsEditor();
        }));
    }
    bindSubtabs();

    // Force right-side preview always
    const layout = document.getElementById('appearance-layout');
    if (layout) layout.classList.remove('preview-left');

    // Update preview after template editor is loaded
    setTimeout(updateCardPreview, 500);

    // Also update preview immediately for testing
    setTimeout(() => {
        console.log('Force updating preview for testing');
        updateCardPreview();
    }, 1000);

    // Setup import/export event listeners
    setupImportExportListeners();
}

/**
 * Setup event listeners for import/export functionality
 */
function setupImportExportListeners() {
    // Export button
    const exportBtn = document.getElementById('export-widgets-config');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportWidgetsConfig);
    }

    // Import button and file input
    const importBtn = document.getElementById('import-widgets-config');
    const importFileInput = document.getElementById('import-widgets-config-file');
    
    if (importBtn && importFileInput) {
        importBtn.addEventListener('click', () => {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importWidgetsConfig(file);
                // Reset file input
                e.target.value = '';
            }
        });
    }

    // Reset button
    const resetBtn = document.getElementById('reset-widgets-config');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetWidgetsConfig);
    }
}

/**
 * Update the card preview with current settings
 */
function updateCardPreview() {
    // Update card preview

    const previewCard = document.getElementById('preview-card');
    if (!previewCard) {
        // Preview card not found
        return;
    }

    // Preview card found

    // Remove existing widget elements
    previewCard.querySelectorAll('.card-user-count').forEach(el => el.remove());

    // For preview, always show the statistics (ignore enabled checkbox)
    // Check if card user count is enabled (comment out for preview)
    // const isEnabled = document.getElementById('card-user-count')?.checked;
    // if (!isEnabled) return;

    const selected = widgetsState.list.find(x => x.id === widgetsState.selectedId);
    if (!selected) return;

    // Apply settings

    const templateItems = (templateEditor ? templateEditor.getItems() : selected.templateItems) || [];

    // Mock data for preview
    const mockData = { 
        cardId: 4779,
        need: 14, 
        owner: 642, 
        trade: 46, 
        unlockNeed: 5, 
        unlockOwner: 200, 
        unlockTrade: 12,
        clubNeed: 3,
        clubOwner: 28,
        clubTrade: 7,
        duplicates: 2,
        cardName: 'Кируко',
        cardRank: 'A',
        cardAnime: 'Великая небесная стена',
        cardAnimeLink: '/1811-velikaja-nebesnaja-stena-2023.html',
        cardAuthor: 'declover',
        deckCountASS: 0,
        deckCountS: 1,
        deckCountA: 2,
        deckCountB: 4,
        deckCountC: 6,
        deckCountD: 17,
        deckCountE: 20,
        deckCountTotal: 50,
    };

    // Render all enabled widgets in consistent order
    widgetsState.list.filter(w => w.enabled).forEach(w => {
        const position = w.position || 'bottom-right';
        const style = w.style || 'default';
        const size = w.size || 'medium';
        let backgroundColor = w.backgroundColor || '#000000';
        let textColor = w.textColor || '#ffffff';
        const opacity = typeof w.opacity === 'number' ? w.opacity : 80;
        const hoverAction = w.hoverAction || 'none';


        const countElement = document.createElement('div');
        countElement.className = 'card-user-count';
        if (position !== 'custom') {
            countElement.classList.add(`position-${position}`);
        }
        if (style !== 'default') countElement.classList.add(`style-${style}`);
        if (size !== 'medium') countElement.classList.add(`size-${size}`);
        if (hoverAction !== 'none') countElement.classList.add(`hover-${hoverAction}`);

        // Apply custom colors
        if (backgroundColor) {
            // Apply opacity to background color only
            const bgColor = backgroundColor;
            const opacityValue = parseInt(opacity) / 100;

            // Convert hex to rgba if needed
            let r, g, b;
            if (bgColor.startsWith('#')) {
                const hex = bgColor.slice(1);
                r = parseInt(hex.substr(0, 2), 16);
                g = parseInt(hex.substr(2, 2), 16);
                b = parseInt(hex.substr(4, 2), 16);
            } else {
                // If already in rgb format, extract values
                const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (match) {
                    r = parseInt(match[1]);
                    g = parseInt(match[2]);
                    b = parseInt(match[3]);
                } else {
                    // Fallback to solid color
                    countElement.style.backgroundColor = bgColor;
                }
            }

            if (r !== undefined && g !== undefined && b !== undefined) {
                countElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacityValue})`;
            }
        } else {
            // Apply opacity to default background color
            const opacityValue = parseInt(opacity) / 100;
            countElement.style.backgroundColor = `rgba(0, 0, 0, ${opacityValue * 0.8})`; // Default is rgba(0,0,0,0.8)
        }

        if (textColor) {
            countElement.style.color = textColor;
        }

        // Use the selected widget's current template items to preview small variations
        const renderItems = w.id === widgetsState.selectedId ? templateItems : (w.templateItems || []);
        countElement.innerHTML = formatTemplateItems(renderItems, mockData);

        // Apply custom percent-based positioning inline when position is custom
        if (position === 'custom') {
            countElement.style.top = '';
            countElement.style.left = '';
            countElement.style.right = '';
            countElement.style.bottom = '';
            const topP = (typeof w.positionTopPercent === 'number') ? w.positionTopPercent : null;
            const leftP = (typeof w.positionLeftPercent === 'number') ? w.positionLeftPercent : null;
            const rightP = (typeof w.positionRightPercent === 'number') ? w.positionRightPercent : null;
            const bottomP = (typeof w.positionBottomPercent === 'number') ? w.positionBottomPercent : null;
            if (topP !== null) countElement.style.top = `${topP}%`;
            if (leftP !== null) countElement.style.left = `${leftP}%`;
            if (rightP !== null) countElement.style.right = `${rightP}%`;
            if (bottomP !== null) countElement.style.bottom = `${bottomP}%`;
        }

        if (position === 'under') {
            previewCard.appendChild(countElement);
        } else {
            const cardItem = previewCard.querySelector('.anime-cards__item');
            if (cardItem) cardItem.appendChild(countElement);
        }
    });

    // Double check if element was added
    setTimeout(() => { /* preview rendered */ }, 100);
}

/**
 * Format template items with mock data
 * (Simplified version of the function from card_user_count.js)
 */
function formatTemplateItems(templateItems, values) {
    if (!Array.isArray(templateItems)) return '';

    return templateItems.map(item => {
        if (item.type === 'text') {
            return item.text || '';
        } else if (item.type === 'icon') {
            return item.icon ? `<i class="${item.icon.trim()}"></i>` : '';
        } else if (item.type === 'variable') {
            if (item.variable === 'newLine') {
                return '<br>';
            }
            const value = values[item.variable] || '?';
            if (value === undefined) return '?';

            let result = '';
            if (item.icon && item.icon.trim()) {
                result += `<i class="${item.icon.trim()}"></i>`;
            }
            result += value;
            return result;
        }
        return '';
    }).join('');
}
// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeCardAppearancePage);

    // Also add a global function for manual testing
    window.testPreview = updateCardPreview;

/**
 * Export widgets configuration to JSON file
 */
function exportWidgetsConfig() {
    try {
        const config = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            widgets: widgetsState.list,
            settings: {
                'card-user-count': document.getElementById('card-user-count')?.checked || false,
                'card-user-count-cache-enabled': document.getElementById('card-user-count-cache-enabled')?.checked || false,
                'card-user-count-event-target': document.getElementById('card-user-count-event-target')?.value || 'only-cache',
                'card-user-count-position': document.getElementById('card-user-count-position')?.value || 'bottom-right',
                'card-user-count-style': document.getElementById('card-user-count-style')?.value || 'default',
                'card-user-count-size': document.getElementById('card-user-count-size')?.value || 'medium',
                'card-user-count-background-color': document.getElementById('card-user-count-background-color')?.value || '#000000',
                'card-user-count-text-color': document.getElementById('card-user-count-text-color')?.value || '#ffffff',
                'card-user-count-opacity': document.getElementById('card-user-count-opacity')?.value || 80,
                'card-user-count-hover-action': document.getElementById('card-user-count-hover-action')?.value || 'none'
            }
        };

        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `card-widgets-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        showNotification('export-success', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('export-error', 'error');
    }
}

/**
 * Import widgets configuration from JSON file
 */
function importWidgetsConfig(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            
            // Validate config structure
            if (!config.widgets || !Array.isArray(config.widgets)) {
                throw new Error('Invalid configuration format');
            }

            // Import widgets
            widgetsState.list = config.widgets.map(widget => ({
                ...newWidgetDefaults(),
                ...widget,
                id: `w${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Generate new IDs
            }));

            // Import settings if available
            if (config.settings) {
                Object.keys(config.settings).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = config.settings[key];
                        } else {
                            element.value = config.settings[key];
                        }
                    }
                });
            }

            // Save to storage
            saveWidgets();
            saveSettings();

            // Update UI
            widgetsState.selectedId = widgetsState.list[0]?.id || null;
            renderWidgetsList();
            syncSelectedWidgetToControls();
            updateCardPreview();

            showNotification('import-success', 'success');
        } catch (error) {
            console.error('Import error:', error);
            showNotification('invalid-config-file', 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * Reset widgets to default configuration
 */
function resetWidgetsConfig() {
    if (confirm(window.i18n?.getTranslateText('reset-widgets-confirm', 'en') || 'Are you sure you want to reset all widgets to default?')) {
        widgetsState.list = [newWidgetDefaults()];
        widgetsState.selectedId = widgetsState.list[0].id;
        
        // Reset settings to default
        const defaultSettings = {
            'card-user-count': false,
            'card-user-count-cache-enabled': false,
            'card-user-count-event-target': 'only-cache',
            'card-user-count-position': 'bottom-right',
            'card-user-count-style': 'default',
            'card-user-count-size': 'medium',
            'card-user-count-background-color': '#000000',
            'card-user-count-text-color': '#ffffff',
            'card-user-count-opacity': 80,
            'card-user-count-hover-action': 'none'
        };

        Object.keys(defaultSettings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = defaultSettings[key];
                } else {
                    element.value = defaultSettings[key];
                }
            }
        });

        saveWidgets();
        saveSettings();
        renderWidgetsList();
        syncSelectedWidgetToControls();
        updateCardPreview();

        showNotification('Configuration reset to default', 'success');
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;

    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#27ae60';
            break;
        case 'error':
            notification.style.backgroundColor = '#e74c3c';
            break;
        default:
            notification.style.backgroundColor = '#3498db';
    }

    // Set message text
    const messageText = window.i18n?.getTranslateText(message, 'en') || message;
    notification.textContent = messageText;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}