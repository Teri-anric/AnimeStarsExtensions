/**
 * User Card Buttons Editor Module
 * Provides drag-and-drop button editing functionality for user card buttons
 */

// Import translation system
import i18n from './translation.js';

// Default button configurations
const DEFAULT_BUTTONS = [
    {
        id: 'need',
        enabled: true,
        text: '',
        icon: 'fal fa-search',
        url: '/user/cards/need/?name={USERNAME}'
    },
    {
        id: 'inMyList',
        enabled: true,
        text: '',
        icon: 'fal fa-heart',
        url: '/user/cards/?name={USERNAME}&in_list=1'
    },
    {
        id: 'unlocked',
        enabled: true,
        text: '',
        icon: 'fal fa-unlock',
        url: '/user/cards/?name={USERNAME}&locked=0'
    },
    {
        id: 'rank-a',
        enabled: true,
        text: 'A',
        icon: '',
        url: '/user/cards/?name={USERNAME}&locked=0&rank=a'
    },
    {
        id: 'rank-b',
        enabled: true,
        text: 'B',
        icon: '',
        url: '/user/cards/?name={USERNAME}&locked=0&rank=b'
    },
    {
        id: 'rank-c',
        enabled: true,
        text: 'C',
        icon: '',
        url: '/user/cards/?name={USERNAME}&locked=0&rank=c'
    },
    {
        id: 'rank-d',
        enabled: true,
        text: 'D',
        icon: '',
        url: '/user/cards/?name={USERNAME}&locked=0&rank=d'
    },
    {
        id: 'rank-e',
        enabled: true,
        text: 'E',
        icon: '',
        url: '/user/cards/?name={USERNAME}&locked=0&rank=e'
    },
    {
        id: 'rank-s',
        enabled: true,
        text: 'S',
        icon: '',
        url: '/user/cards/?name={USERNAME}&locked=0&rank=s'
    },
    {
        id: 'rank-ass',
        enabled: true,
        text: 'ASS',
        icon: '',
        url: '/user/cards/?name={USERNAME}&locked=0&rank=ass'
    },
    {
        id: 'trades-history',
        enabled: false,
        text: '',
        icon: 'fal fa-clock-rotate-left',
        url: 'https://animestars.org/trades/history/?kind=calsel_reciever&user={USER}'
    }
];

class UserCardButtonsEditor {
    constructor(options = {}) {
        this.options = {
            containerId: 'buttons-editor',
            previewId: 'preview-buttons',
            storageKey: 'user-card-buttons-config',
            ...options
        };
        
        this.container = document.getElementById(this.options.containerId);
        this.previewContainer = document.getElementById(this.options.previewId);
        this.buttons = [];
        this.draggedItem = null;
        this.draggedIndex = -1;
        this.customButtonCounter = 0;
        this.currentIconPickerIndex = -1;
        
        // Available Font Awesome icons as a simple list (store fal for site, preview as fas)
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
            'fa fa-arrow-right',
            'fa fa-arrow-left',
        ];
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error(`Buttons editor container with id "${this.options.containerId}" not found`);
            return;
        }

        this.createIconPickerModal();
        this.loadSavedButtons();
        this.render();
        this.attachEventListeners();
    }

    // Convert fal -> fas for preview in extension, keep original for storage/site
    resolveIconClass(iconClass) {
        if (!iconClass) return '';
        if (iconClass.startsWith('fal ')) {
            return 'fas ' + iconClass.slice(4);
        }
        return iconClass;
    }

    createIconPickerModal() {
        // Create modal backdrop
        const modal = document.createElement('div');
        modal.id = 'icon-picker-modal';
        modal.className = 'icon-picker-modal hidden';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'icon-picker-content';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'icon-picker-header';
        
        const title = document.createElement('h3');
        title.textContent = this.getTranslatedText('button-icon-select', this.getCurrentLanguage());
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'icon-picker-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => this.closeIconPicker();
        
        modalHeader.appendChild(title);
        modalHeader.appendChild(closeBtn);
        
        const iconsGrid = document.createElement('div');
        iconsGrid.className = 'icons-grid';
        
        // Add "no icon" option
        const noIconBtn = document.createElement('button');
        noIconBtn.className = 'icon-option';
        noIconBtn.dataset.icon = '';
        noIconBtn.textContent = this.getTranslatedText('button-icon-none', this.getCurrentLanguage());
        noIconBtn.onclick = () => {
            if (this.iconPickerCustomInput) this.iconPickerCustomInput.value = '';
            this.selectIcon('');
        };
        iconsGrid.appendChild(noIconBtn);
        
        // Add custom icon input
        const customWrap = document.createElement('div');
        customWrap.className = 'custom-icon-wrap';
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.placeholder = 'fal fa-...';
        customInput.className = 'custom-icon-input';
        this.iconPickerCustomInput = customInput;
        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.textContent = this.getTranslatedText('button-icon-select', this.getCurrentLanguage());
        customBtn.onclick = () => {
            const cls = (customInput.value || '').trim();
            if (cls) this.selectIcon(cls);
        };
        customWrap.appendChild(customInput);
        customWrap.appendChild(customBtn);
        modalContent.appendChild(customWrap);

        // Add all icons
        this.availableIcons.forEach(iconClass => {
            if (!iconClass) return;
            const iconBtn = document.createElement('button');
            iconBtn.className = 'icon-option';
            iconBtn.dataset.icon = iconClass;
            const icon = document.createElement('i');
            icon.className = this.resolveIconClass(iconClass);
            iconBtn.appendChild(icon);
            iconBtn.onclick = () => {
                if (this.iconPickerCustomInput) this.iconPickerCustomInput.value = iconClass;
                this.selectIcon(iconClass);
            };
            iconsGrid.appendChild(iconBtn);
        });
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(iconsGrid);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        this.iconPickerModal = modal;
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeIconPicker();
            }
        });
    }

    openIconPicker(buttonIndex) {
        this.currentIconPickerIndex = buttonIndex;
        // Prefill custom input with current icon of the button
        const current = this.buttons[buttonIndex]?.icon || '';
        if (this.iconPickerCustomInput) this.iconPickerCustomInput.value = current;
        this.iconPickerModal.classList.remove('hidden');
    }

    closeIconPicker() {
        this.iconPickerModal.classList.add('hidden');
        this.currentIconPickerIndex = -1;
    }

    selectIcon(iconClass) {
        if (this.currentIconPickerIndex >= 0) {
            this.buttons[this.currentIconPickerIndex].icon = iconClass;
            this.saveButtons();
            this.render();
        }
        this.closeIconPicker();
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

    createButtonItem(button, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'button-item';
        if (!button.enabled) {
            itemDiv.classList.add('disabled');
        }
        itemDiv.dataset.index = index;
        itemDiv.draggable = true;

        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '⋮⋮';
        
        const content = document.createElement('div');
        content.className = 'button-item-content';

        const currentLang = this.getCurrentLanguage();

        // No inline icon preview here to avoid duplicate visuals

        // Text field
        const textField = document.createElement('div');
        textField.className = 'form-field';
        
        const textLabel = document.createElement('div');
        textLabel.className = 'field-label';
        textLabel.textContent = this.getTranslatedText('button-text-label', currentLang);
        
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'item-input text-input';
        textInput.value = button.text || '';
        textInput.placeholder = this.getTranslatedText('button-text-placeholder', currentLang);
        textInput.dataset.field = 'text';
        
        textField.appendChild(textLabel);
        textField.appendChild(textInput);
        content.appendChild(textField);

        // Icon field with picker button and text input
        const iconField = document.createElement('div');
        iconField.className = 'form-field';
        
        const iconLabel = document.createElement('div');
        iconLabel.className = 'field-label';
        iconLabel.textContent = this.getTranslatedText('button-icon-label', currentLang);
        
        const iconControls = document.createElement('div');
        iconControls.className = 'icon-controls';
        
        const iconPickerBtn = document.createElement('button');
        iconPickerBtn.type = 'button';
        iconPickerBtn.className = 'icon-picker-btn';
        iconPickerBtn.dataset.index = index;
        
        if (button.icon) {
            const icon = document.createElement('i');
            icon.className = this.resolveIconClass(button.icon);
            iconPickerBtn.appendChild(icon);
        }
        
        iconControls.appendChild(iconPickerBtn);
        
        iconField.appendChild(iconLabel);
        iconField.appendChild(iconControls);
        content.appendChild(iconField);

        // URL input (for all button types)
        const urlField = document.createElement('div');
        urlField.className = 'form-field url-field full-width';
        
        const urlLabel = document.createElement('div');
        urlLabel.className = 'field-label';
        urlLabel.textContent = this.getTranslatedText('button-url-label', currentLang);
        
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.className = 'item-input url-input';
        urlInput.value = button.url || '';
        urlInput.placeholder = '/user/cards/?name={USERNAME}';
        urlInput.dataset.field = 'url';
        
        urlField.appendChild(urlLabel);
        urlField.appendChild(urlInput);
        content.appendChild(urlField);

        // Enabled toggle
        const toggleDiv = document.createElement('div');
        toggleDiv.className = 'toggle-switch';
        
        const toggleLabel = document.createElement('span');
        toggleLabel.textContent = this.getTranslatedText('button-enabled', currentLang);
        
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = button.enabled;
        toggleInput.dataset.field = 'enabled';
        
        toggleDiv.appendChild(toggleLabel);
        toggleDiv.appendChild(toggleInput);
        content.appendChild(toggleDiv);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.preventDefault();
            this.removeButton(index);
        };

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
                
                this.moveButton(this.draggedIndex, insertIndex);
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
        itemsContainer.className = 'buttons-items-container';
        
        if (this.buttons.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-link';
            
            const title = document.createElement('p');
            title.textContent = this.getTranslatedText('buttons-empty-state-title', currentLang);
            
            const subtitle = document.createElement('small');
            subtitle.textContent = this.getTranslatedText('buttons-empty-state-subtitle', currentLang);
            
            emptyState.appendChild(icon);
            emptyState.appendChild(title);
            emptyState.appendChild(subtitle);
            itemsContainer.appendChild(emptyState);
        } else {
            this.buttons.forEach((button, index) => {
                itemsContainer.appendChild(this.createButtonItem(button, index));
            });
        }

        this.container.appendChild(itemsContainer);
        this.updatePreview();
    }

    attachEventListeners() {
        // Add button clicks
        document.querySelectorAll('.add-custom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addButton();
            });
        });

        // Icon picker button clicks
        this.container.addEventListener('click', (e) => {
            const iconPickerBtn = e.target.closest('.icon-picker-btn');
            if (iconPickerBtn) {
                e.preventDefault();
                const index = parseInt(iconPickerBtn.dataset.index);
                this.openIconPicker(index);
            }
        });

        // Input change event listeners
        this.container.addEventListener('input', (e) => {
            this.updateButtonsFromDOM();
        });

        this.container.addEventListener('change', (e) => {
            this.updateButtonsFromDOM();
            // If toggled enabled, immediately re-render to drop disabled class
            if (e.target && e.target.matches('input[type="checkbox"][data-field="enabled"]')) {
                this.render();
            }
        });

        // Import/Export buttons
        const exportBtn = document.getElementById('export-config');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportConfig();
            });
        }

        const importBtn = document.getElementById('import-config');
        const importFileInput = document.getElementById('import-file-input');
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => {
                importFileInput.click();
            });

            importFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importConfig(file);
                }
            });
        }

        const resetBtn = document.getElementById('reset-config');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm(this.getTranslatedText('confirm-reset', this.getCurrentLanguage()))) {
                    this.resetToDefault();
                }
            });
        }
    }

    addButton() {
        const button = {
            id: `button-${Date.now()}`,
            enabled: true,
            text: '',
            icon: '',
            url: '/user/cards/?name={USERNAME}'
        };

        this.buttons.push(button);
        this.saveButtons();
        this.render();
    }

    removeButton(index) {
        this.buttons.splice(index, 1);
        this.saveButtons();
        this.render();
    }

    moveButton(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        // Adjust toIndex if moving from lower to higher position
        if (fromIndex < toIndex) {
            toIndex--;
        }

        const button = this.buttons.splice(fromIndex, 1)[0];
        this.buttons.splice(toIndex, 0, button);
        
        this.saveButtons();
        this.render();
    }

    updateButtonsFromDOM() {
        const items = this.container.querySelectorAll('.button-item[data-index]');
        const newButtons = [];
        
        items.forEach((itemDiv) => {
            const index = parseInt(itemDiv.dataset.index);
            const button = { ...this.buttons[index] };

            // Update fields from inputs
            itemDiv.querySelectorAll('[data-field]').forEach(input => {
                const field = input.dataset.field;
                if (input.type === 'checkbox') {
                    button[field] = input.checked;
                } else {
                    button[field] = input.value;
                }
            });

            newButtons.push(button);
        });
        
        this.buttons = newButtons;
        this.saveButtons();
        this.updatePreview();
    }

    updatePreview() {
        if (!this.previewContainer) return;

        // Clear preview
        while (this.previewContainer.firstChild) {
            this.previewContainer.removeChild(this.previewContainer.firstChild);
        }

        // Add buttons to preview
        this.buttons.forEach(button => {
            if (!button.enabled) return;

            const link = document.createElement('a');
            const url = String(button.url || '').replace('{USERNAME}', 'TestUser').replace('{USER}', 'TestUser');
            link.href = url;

            if (button.icon) {
                const icon = document.createElement('i');
                icon.className = this.resolveIconClass(button.icon);
                link.appendChild(icon);
                if (button.text) {
                    link.appendChild(document.createTextNode(' ' + button.text));
                }
            } else if (button.text) {
                link.textContent = button.text;
            } else {
                link.textContent = '?';
            }

            this.previewContainer.appendChild(link);
        });
    }

    saveButtons() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({ 
                [this.options.storageKey]: JSON.stringify(this.buttons) 
            });
        }
    }

    loadSavedButtons() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.get([this.options.storageKey], (settings) => {
                if (settings[this.options.storageKey]) {
                    try {
                        this.buttons = JSON.parse(settings[this.options.storageKey]);
                    } catch (e) {
                        console.error('Failed to parse button config:', e);
                        this.buttons = [...DEFAULT_BUTTONS];
                    }
                } else {
                    // Use default buttons
                    this.buttons = [...DEFAULT_BUTTONS];
                }
                this.render();
            });
        }
    }

    exportConfig() {
        const config = {
            version: 1,
            buttons: this.buttons
        };
        
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'user-card-buttons-config.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    importConfig(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                if (config.buttons && Array.isArray(config.buttons)) {
                    this.buttons = config.buttons;
                    this.saveButtons();
                    this.render();
                    alert(this.getTranslatedText('import-success', this.getCurrentLanguage()));
                } else {
                    throw new Error('Invalid config format');
                }
            } catch (error) {
                console.error('Failed to import config:', error);
                alert(this.getTranslatedText('import-error', this.getCurrentLanguage()));
            }
        };
        reader.readAsText(file);
    }

    resetToDefault() {
        this.buttons = JSON.parse(JSON.stringify(DEFAULT_BUTTONS));
        this.saveButtons();
        this.render();
    }

    // Public API
    getButtons() {
        return [...this.buttons];
    }

    setButtons(buttons) {
        this.buttons = [...buttons];
        this.saveButtons();
        this.render();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for translations to load
    setTimeout(() => {
        window.userCardButtonsEditor = new UserCardButtonsEditor();
    }, 100);
});

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UserCardButtonsEditor = UserCardButtonsEditor;
}

export default UserCardButtonsEditor;

