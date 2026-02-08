/**
 * Template Editor Module
 * Provides drag-and-drop template editing functionality for card user count display
 */

// Import translation system
import i18n from './translation.js';
import IconPicker from './icon-picker.js';


const parseTypeToVariablesMap = {
    unlocked: ["unlockNeed", "unlockOwner", "unlockTrade"],
    counts: ["need", "owner", "trade"],
    clubNeed: ["clubNeed"],
    clubOwner: ["clubOwner"],
    clubTrade: ["clubTrade"],
    duplicates: ["duplicates"],
    siteCard: ["cardName", "cardRank", "cardAnime", "cardAnimeLink", "cardAuthor"],
    siteDeck: [
      "deckCountASS",
      "deckCountS",
      "deckCountA",
      "deckCountB",
      "deckCountC",
      "deckCountD",
      "deckCountE",
      "deckCountTotal"
    ]
  };

class TemplateEditor {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = {
            previewId: 'template-preview',
            onChange: null,
            ...options
        };
        
        this.currentItems = [
            { type: 'variable', variable: 'need' },
            { type: 'text', text: ' | ' },
            { type: 'variable', variable: 'owner' },
            { type: 'text', text: ' | ' },
            { type: 'variable', variable: 'trade' }
        ];

        this.availableVariables = Object.values(parseTypeToVariablesMap).flat().concat(['cardId', 'newLine']);
        this.availableIcons = [
            'fal fa-search',
            'fal fa-heart',
            'fal fa-unlock',
            'fal fa-lock',
            'fal fa-trophy',
            'fal fa-star',
            'fal fa-fire',
            'fal fa-gem',
            'fal fa-list',
            'fal fa-user',
            'fal fa-users',
            'fal fa-exchange-alt',
            'fal fa-eye',
            'fal fa-plus',
            'fal fa-minus',
            'fal fa-check',
            'fal fa-times',
            'fal fa-filter',
            'fal fa-sort',
            'fal fa-bookmark',
            'fal fa-tag',
            'fal fa-link',
            'fal fa-history'
        ];
        this.iconPicker = null;

        this.draggedItem = null;
        this.draggedIndex = -1;
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error(`Template editor container with id "${this.containerId}" not found`);
            return;
        }
        this.render();
        this.attachEventListeners();
        // Create shared icon picker once
        this.iconPicker = new IconPicker({
            icons: this.availableIcons,
            translate: (key) => this.getTranslatedText(key, this.getCurrentLanguage()),
            resolveIconClass: (cls) => this.resolveIconClass(cls)
        });
    }

    postInit() {
        this.render();
        this.attachEventListeners();
    }

    // Helper method to get translated text
    getTranslatedText(key, lang = 'en') {
        if (typeof window !== 'undefined' && window.i18n) {
            return window.i18n.getTranslateText(key, lang);
        }
        return i18n.getTranslateText(key, lang);
    }

    // Helper method to get current language
    getCurrentLanguage() {
        if (typeof window !== 'undefined' && window.document) {
            const htmlLang = document.documentElement.lang;
            return htmlLang || 'en';
        }
        return 'en';
    }

    resolveIconClass(iconClass) {
        if (!iconClass) return '';
        if (iconClass.startsWith('fal ')) {
            return 'fas ' + iconClass.slice(4);
        }
        return iconClass;
    }

    createTemplateItem(item, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'template-item';
        itemDiv.dataset.index = index;
        itemDiv.draggable = true;

        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '⋮⋮';
        
        const content = document.createElement('div');
        content.className = 'template-item-content';

        const currentLang = this.getCurrentLanguage();

        if (item.type === 'text') {
            const typeLabel = document.createElement('span');
            typeLabel.className = 'item-type-label';
            typeLabel.textContent = this.getTranslatedText('template-item-type-text', currentLang);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'item-input';
            input.value = item.text || '';
            input.placeholder = this.getTranslatedText('template-item-placeholder-text', currentLang);
            
            content.appendChild(typeLabel);
            content.appendChild(input);
        } else if (item.type === 'icon') {
            const typeLabel = document.createElement('span');
            typeLabel.className = 'item-type-label';
            typeLabel.textContent = this.getTranslatedText('template-item-type-icon', currentLang);

            const iconControls = document.createElement('div');
            iconControls.className = 'icon-controls';

            const iconPickerBtn = document.createElement('button');
            iconPickerBtn.type = 'button';
            iconPickerBtn.className = 'icon-picker-btn';
            iconPickerBtn.dataset.index = index;
            if (item.icon) {
                const icon = document.createElement('i');
                icon.className = this.resolveIconClass(item.icon);
                iconPickerBtn.appendChild(icon);
            } else {
                // default indicator to ensure visible click target
                const icon = document.createElement('i');
                icon.className = 'fas fa-icons';
                iconPickerBtn.appendChild(icon);
            }
            iconControls.appendChild(iconPickerBtn);

            content.appendChild(typeLabel);
            content.appendChild(iconControls);
        } else if (item.type === 'variable') {
            const typeLabel = document.createElement('span');
            typeLabel.className = 'item-type-label';
            typeLabel.textContent = this.getTranslatedText('template-item-type-variable', currentLang);
            
            const select = document.createElement('select');
            select.className = 'variable-select';
            
            this.availableVariables.forEach(variable => {
                const option = document.createElement('option');
                option.value = variable;
                option.textContent = variable;
                if (variable === item.variable) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            content.appendChild(typeLabel);
            content.appendChild(select);
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.preventDefault();
            this.removeItem(index);
        };

        // Persist current icon in dataset for later DOM -> state sync
        if (item.type === 'icon') {
            itemDiv.dataset.icon = item.icon || '';
        }

        itemDiv.appendChild(dragHandle);
        itemDiv.appendChild(content);
        itemDiv.appendChild(removeBtn);

        // Add drag event listeners
        this.addDragEventListeners(itemDiv, index);

        return itemDiv;
    }

    addDragEventListeners(itemDiv, index) {
        itemDiv.addEventListener('dragstart', (e) => {
            this.draggedItem = itemDiv;
            this.draggedIndex = index;
            itemDiv.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', itemDiv.outerHTML);
        });

        itemDiv.addEventListener('dragend', () => {
            itemDiv.classList.remove('dragging');
            this.draggedItem = null;
            this.draggedIndex = -1;
        });

        itemDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this.draggedItem && this.draggedItem !== itemDiv) {
                const rect = itemDiv.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                if (e.clientY < midpoint) {
                    itemDiv.classList.add('drag-over-top');
                    itemDiv.classList.remove('drag-over-bottom');
                } else {
                    itemDiv.classList.add('drag-over-bottom');
                    itemDiv.classList.remove('drag-over-top');
                }
            }
        });

        itemDiv.addEventListener('dragleave', () => {
            itemDiv.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        itemDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            itemDiv.classList.remove('drag-over-top', 'drag-over-bottom');
            
            if (this.draggedItem && this.draggedItem !== itemDiv) {
                const targetIndex = parseInt(itemDiv.dataset.index);
                const rect = itemDiv.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const insertIndex = e.clientY < midpoint ? targetIndex : targetIndex + 1;
                
                this.moveItem(this.draggedIndex, insertIndex);
            }
        });
    }

    render() {
        // Clear container
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        const currentLang = this.getCurrentLanguage();
        
        // Create items container
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'template-items-container';
        
        if (this.currentItems.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-plus-circle';
            
            const title = document.createElement('p');
            title.textContent = this.getTranslatedText('template-empty-state-title', currentLang);
            
            const subtitle = document.createElement('small');
            subtitle.textContent = this.getTranslatedText('template-empty-state-subtitle', currentLang);
            
            emptyState.appendChild(icon);
            emptyState.appendChild(title);
            emptyState.appendChild(subtitle);
            itemsContainer.appendChild(emptyState);
        } else {
            this.currentItems.forEach((item, index) => {
                itemsContainer.appendChild(this.createTemplateItem(item, index));
            });
        }

        // Create buttons container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'template-buttons';
        
        // Add Text button
        const addTextBtn = document.createElement('button');
        addTextBtn.className = 'add-template-item add-text';
        addTextBtn.type = 'button';
        
        const textIcon = document.createElement('i');
        textIcon.className = 'fas fa-font';
        addTextBtn.appendChild(textIcon);
        addTextBtn.appendChild(document.createTextNode(' '));
        addTextBtn.appendChild(document.createTextNode(this.getTranslatedText('template-add-text', currentLang)));
        
        // Add Icon button
        const addIconBtn = document.createElement('button');
        addIconBtn.className = 'add-template-item add-icon';
        addIconBtn.type = 'button';
        
        const iconIcon = document.createElement('i');
        iconIcon.className = 'fas fa-icons';
        addIconBtn.appendChild(iconIcon);
        addIconBtn.appendChild(document.createTextNode(' '));
        addIconBtn.appendChild(document.createTextNode(this.getTranslatedText('template-add-icon', currentLang)));
        
        // Add Variable button
        const addVariableBtn = document.createElement('button');
        addVariableBtn.className = 'add-template-item add-variable';
        addVariableBtn.type = 'button';
        
        const variableIcon = document.createElement('i');
        variableIcon.className = 'fas fa-code';
        addVariableBtn.appendChild(variableIcon);
        addVariableBtn.appendChild(document.createTextNode(' '));
        addVariableBtn.appendChild(document.createTextNode(this.getTranslatedText('template-add-variable', currentLang)));
        
        buttonsDiv.appendChild(addTextBtn);
        buttonsDiv.appendChild(addIconBtn);
        buttonsDiv.appendChild(addVariableBtn);

        this.container.appendChild(itemsContainer);
        this.container.appendChild(buttonsDiv);

        this.updatePreview();
    }

    attachEventListeners() {
        // Button event listeners
        this.container.addEventListener('click', (e) => {
            const iconPickerBtn = e.target.closest('.icon-picker-btn');
            if (iconPickerBtn) {
                e.preventDefault();
                const idx = parseInt(iconPickerBtn.dataset.index);
                const current = this.currentItems[idx]?.icon || '';
                if (this.iconPicker) {
                    this.iconPicker.open(current, (iconClass) => {
                        // Update state and DOM dataset for sync
                        if (this.currentItems[idx]) {
                            this.currentItems[idx].icon = iconClass || '';
                            // Update dataset on element if still present
                            const el = this.container.querySelector(`.template-item[data-index="${idx}"]`);
                            if (el) el.dataset.icon = iconClass || '';
                            this.saveItems();
                            this.render();
                        }
                    });
                }
                return;
            }
            if (e.target.closest('.add-text')) {
                this.addItem('text');
            } else if (e.target.closest('.add-icon')) {
                this.addItem('icon');
            } else if (e.target.closest('.add-variable')) {
                this.addItem('variable');
            }
        });

        // Input change event listeners
        this.container.addEventListener('input', () => {
            this.updateItemsFromDOM();
        });

        this.container.addEventListener('change', () => {
            this.updateItemsFromDOM();
        });
    }

    addItem(type) {
        const newItem = this.createNewItem(type);
        this.currentItems.push(newItem);
        this.saveItems();
        this.render();
    }

    createNewItem(type) {
        if (type === 'text') {
            return { type: 'text', text: '' };
        } else if (type === 'icon') {
            return { type: 'icon', icon: '' };
        } else if (type === 'variable') {
            return { type: 'variable', variable: 'need' };
        }
        return {};
    }

    removeItem(index) {
        this.currentItems.splice(index, 1);
        this.saveItems();
        this.render();
    }

    moveItem(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        // Adjust toIndex if moving from lower to higher position
        if (fromIndex < toIndex) {
            toIndex--;
        }

        const item = this.currentItems.splice(fromIndex, 1)[0];
        this.currentItems.splice(toIndex, 0, item);
        
        this.saveItems();
        this.render();
    }

    updateItemsFromDOM() {
        const items = this.container.querySelectorAll('.template-item[data-index]');
        const newItems = [];
        
        const currentLang = this.getCurrentLanguage();
        
        items.forEach((itemDiv) => {
            const typeLabel = itemDiv.querySelector('.item-type-label').textContent;
            
            // Compare with localized text to determine type
            if (typeLabel === this.getTranslatedText('template-item-type-text', currentLang)) {
                const text = itemDiv.querySelector('.item-input').value;
                newItems.push({ type: 'text', text });
            } else if (typeLabel === this.getTranslatedText('template-item-type-icon', currentLang)) {
                const icon = itemDiv.dataset.icon || '';
                newItems.push({ type: 'icon', icon });
            } else if (typeLabel === this.getTranslatedText('template-item-type-variable', currentLang)) {
                const variable = itemDiv.querySelector('.variable-select').value;
                newItems.push({ type: 'variable', variable });
            }
        });
        
        this.currentItems = newItems;
        this.saveItems();
        this.updatePreview();
    }

    updatePreview() {
        const previewDiv = document.getElementById(this.options.previewId);
        if (!previewDiv) return;

        const currentLang = this.getCurrentLanguage();
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
        
        let preview = '';

        this.currentItems.forEach(item => {
            if (item.type === 'text') {
                preview += this.escapeHtml(item.text || '');
            } else if (item.type === 'icon') {
                const cls = this.resolveIconClass(item.icon || '');
                preview += item.icon ? `<i class="${this.escapeHtml(cls)}"></i>` : '';
            } else if (item.type === 'variable') {
                if (item.variable === 'newLine') {
                    preview += "<br>";
                    return;
                }
                preview += this.escapeHtml((mockData[item.variable]) || '?');
            }
        });

        // Clear preview div
        while (previewDiv.firstChild) {
            previewDiv.removeChild(previewDiv.firstChild);
        }

        const previewLabel = document.createElement('div');
        previewLabel.className = 'preview-label';
        
        const eyeIcon = document.createElement('i');
        eyeIcon.className = 'fas fa-eye';
        previewLabel.appendChild(eyeIcon);
        previewLabel.appendChild(document.createTextNode(' '));
        previewLabel.appendChild(document.createTextNode(this.getTranslatedText('template-preview-label', currentLang)));

        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';
        
        if (preview) {
            previewContent.innerHTML = preview;
        } else {
            const emptyText = document.createElement('em');
            emptyText.textContent = this.getTranslatedText('template-preview-empty', currentLang);
            previewContent.appendChild(emptyText);
        }

        previewDiv.appendChild(previewLabel);
        previewDiv.appendChild(previewContent);
    }

    // Migration function to clean up old data with icons in variables
    migrateOldData(items) {
        const migratedItems = [];
        
        items.forEach(item => {
            if (item.type === 'variable' && item.icon) {
                // Split variable with icon into separate icon and variable items
                if (item.icon.trim()) {
                    migratedItems.push({ type: 'icon', icon: item.icon });
                }
                migratedItems.push({ type: 'variable', variable: item.variable });
            } else {
                // Keep other items as is
                migratedItems.push(item);
            }
        });
        
        return migratedItems;
    }

    saveItems() {
        if (this.currentItems.length === 0) return;
        if (this.options.onChange) {
            this.options.onChange(this.currentItems);
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Public API
    getItems() {
        return [...this.currentItems];
    }

    setItems(items) {
        this.currentItems = [...items];
        this.saveItems();
        this.render();
    }

    destroy() {
        if (this.container) {
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TemplateEditor = TemplateEditor;
} 