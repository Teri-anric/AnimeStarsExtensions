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
        'card-user-count-cache-enabled',
        'card-user-count-parse-unlocked'
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

/**
 * Initialize template editor
 */
function initializeTemplateEditor() {
    // Since TemplateEditor is loaded as a module, it should be available on window
    const TemplateEditorClass = window.TemplateEditor;
    
    if (TemplateEditorClass) {
        templateEditor = new TemplateEditorClass('template-editor', {
            onChange: updateCardPreview,
            previewId: 'template-preview'
        });
        
        // Load existing template items
        chrome.storage.sync.get(['card-user-count-template-items'], function(settings) {
            if (settings['card-user-count-template-items']) {
                try {
                    const templateItems = JSON.parse(settings['card-user-count-template-items']);
                    templateEditor.setItems(templateItems);
                } catch (e) {
                    console.error('Failed to parse template items:', e);
                }
            }
            // Update preview after template editor is initialized
            updateCardPreview();
        });
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
        'card-user-count-template-items',
        'language'
    ];
    
    chrome.storage.sync.get(allSettings, function(settings) {
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
        
        // Update preview after loading settings
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
    const settingInputs = document.querySelectorAll('select, input[type="color"], input[type="range"], input[type="checkbox"]');
    settingInputs.forEach(input => {
        input.addEventListener('change', () => {
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
    });
}

/**
 * Initialize the card appearance page
 */
function initializeCardAppearancePage() {
    console.log('Initializing card appearance page'); // Debug
    
    // Load settings
    loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize template editor
    setTimeout(initializeTemplateEditor, 100);
    
    // Update preview after template editor is loaded
    setTimeout(updateCardPreview, 500);
    
    // Also update preview immediately for testing
    setTimeout(() => {
        console.log('Force updating preview for testing');
        updateCardPreview();
    }, 1000);
}

/**
 * Update the card preview with current settings
 */
function updateCardPreview() {
    console.log('updateCardPreview called'); // Debug
    
    const previewCard = document.getElementById('preview-card');
    if (!previewCard) {
        console.log('Preview card not found'); // Debug
        return;
    }

    console.log('Preview card found:', previewCard); // Debug

    // Remove existing count element
    const existingCount = previewCard.querySelector('.card-user-count');
    if (existingCount) {
        existingCount.remove();
        console.log('Removed existing count'); // Debug
    }

    // For preview, always show the statistics (ignore enabled checkbox)
    // Check if card user count is enabled (comment out for preview)
    // const isEnabled = document.getElementById('card-user-count')?.checked;
    // if (!isEnabled) return;

    // Get current settings
    const position = document.getElementById('card-user-count-position')?.value || 'bottom-right';
    const style = document.getElementById('card-user-count-style')?.value || 'default';
    const size = document.getElementById('card-user-count-size')?.value || 'medium';
    const backgroundColor = document.getElementById('card-user-count-background-color')?.value || '#000000';
    const textColor = document.getElementById('card-user-count-text-color')?.value || '#ffffff';
    const opacity = document.getElementById('card-user-count-opacity')?.value || '80';
    const hoverAction = document.getElementById('card-user-count-hover-action')?.value || 'none';

    console.log('Settings:', { position, style, size, backgroundColor, textColor, opacity, hoverAction }); // Debug

    // Get template items (either from template editor or from storage)
    let templateItems = [];
    if (templateEditor) {
        templateItems = templateEditor.getItems();
        console.log('Got template items from editor:', templateItems); // Debug
    } else {
        // Fallback to default template
        templateItems = [
            { type: 'variable', variable: 'need' },
            { type: 'text', text: ' | ' },
            { type: 'variable', variable: 'owner' },
            { type: 'text', text: ' | ' },
            { type: 'variable', variable: 'trade' }
        ];
        console.log('Using default template items:', templateItems); // Debug
    }

    // Mock data for preview
    const mockData = {
        need: 14,
        owner: 642,
        trade: 46,
        unlockNeed: 5,
        unlockOwner: 200,
        unlockTrade: 12
    };

    // Format template content
    const content = formatTemplateItems(templateItems, mockData);
    console.log('Formatted content:', content); // Debug
    
    // Create count element
    const countElement = document.createElement('div');
    countElement.className = 'card-user-count';
    
    // Apply position class
    countElement.classList.add(`position-${position}`);
    
    // Apply style class
    if (style !== 'default') {
        countElement.classList.add(`style-${style}`);
    }
    
    // Apply size class
    if (size !== 'medium') {
        countElement.classList.add(`size-${size}`);
    }
    
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
    
    // Apply hover action class
    if (hoverAction !== 'none') {
        countElement.classList.add(`hover-${hoverAction}`);
    }
    
    // Set content
    countElement.innerHTML = content;
    
    console.log('Created count element:', countElement); // Debug
    console.log('Element classes:', countElement.className); // Debug
    console.log('Element style:', countElement.style.cssText); // Debug
    
    // Add to preview card
    if (position === 'under') {
        previewCard.appendChild(countElement);
        console.log('Added count under card'); // Debug
    } else {
        const cardItem = previewCard.querySelector('.anime-cards__item');
        if (cardItem) {
            cardItem.appendChild(countElement);
            console.log('Added count to card item'); // Debug
        } else {
            console.log('Card item not found'); // Debug
        }
    }
    
    // Double check if element was added
    setTimeout(() => {
        const addedElement = previewCard.querySelector('.card-user-count');
        console.log('Element after adding:', addedElement); // Debug
    }, 100);
}

/**
 * Format template items with mock data
 * (Simplified version of the function from card_user_count.js)
 */
function formatTemplateItems(templateItems, values) {
    if (!Array.isArray(templateItems)) return "";
    
    return templateItems.map(item => {
        if (item.type === 'text') {
            return item.text || '';
        } else if (item.type === 'icon') {
            return item.icon ? `<i class="${item.icon.trim()}"></i>` : '';
        } else if (item.type === 'variable') {
            const value = values[item.variable];
            if (value === undefined) return "?";
            
            let result = '';
            
            // Add icon if specified
            if (item.icon && item.icon.trim()) {
                result += `<i class="${item.icon.trim()}"></i>`;
            }
            
            // Add value
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