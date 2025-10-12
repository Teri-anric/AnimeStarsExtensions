/**
 * Reusable Icon Picker modal
 */

class IconPicker {
    constructor(options = {}) {
        this.icons = options.icons || [];
        this.translate = options.translate || ((key) => key);
        this.resolveIconClass = options.resolveIconClass || ((cls) => cls);
        this.iconPickerCustomInput = null;
        this.onSelect = null;
        this._ensureModal();
    }

    _ensureModal() {
        if (this.modal) return;

        // Reuse existing modal if present (same id as buttons editor to share CSS)
        const existing = document.getElementById('icon-picker-modal');
        if (existing) {
            this.modal = existing;
            this.iconPickerCustomInput = existing.querySelector('.custom-icon-input');
            return;
        }

        // Defer until body is available
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => this._ensureModal(), { once: true });
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'icon-picker-modal';
        modal.className = 'icon-picker-modal hidden';

        const modalContent = document.createElement('div');
        modalContent.className = 'icon-picker-content';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'icon-picker-header';

        const title = document.createElement('h3');
        title.textContent = this.translate('button-icon-select');

        const closeBtn = document.createElement('button');
        closeBtn.className = 'icon-picker-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => this.close();

        modalHeader.appendChild(title);
        modalHeader.appendChild(closeBtn);

        const iconsGrid = document.createElement('div');
        iconsGrid.className = 'icons-grid';

        const noIconBtn = document.createElement('button');
        noIconBtn.className = 'icon-option';
        noIconBtn.dataset.icon = '';
        noIconBtn.textContent = this.translate('button-icon-none');
        noIconBtn.onclick = () => {
            if (this.iconPickerCustomInput) this.iconPickerCustomInput.value = '';
            this._select('');
        };
        iconsGrid.appendChild(noIconBtn);

        const customWrap = document.createElement('div');
        customWrap.className = 'custom-icon-wrap';
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.placeholder = 'fal fa-...';
        customInput.className = 'custom-icon-input';
        this.iconPickerCustomInput = customInput;
        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.textContent = this.translate('button-icon-select');
        customBtn.onclick = () => {
            const cls = (customInput.value || '').trim();
            this._select(cls);
        };
        customWrap.appendChild(customInput);
        customWrap.appendChild(customBtn);
        modalContent.appendChild(customWrap);

        this.icons.forEach(iconClass => {
            if (!iconClass) return;
            const iconBtn = document.createElement('button');
            iconBtn.className = 'icon-option';
            iconBtn.dataset.icon = iconClass;
            const icon = document.createElement('i');
            icon.className = this.resolveIconClass(iconClass);
            iconBtn.appendChild(icon);
            iconBtn.onclick = () => {
                if (this.iconPickerCustomInput) this.iconPickerCustomInput.value = iconClass;
                this._select(iconClass);
            };
            iconsGrid.appendChild(iconBtn);
        });

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(iconsGrid);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
        this.modal = modal;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });
    }

    open(currentIcon, onSelect) {
        this.onSelect = onSelect;
        if (!this.modal) {
            this._ensureModal();
            // If still not ready, wait for DOMContentLoaded
            if (!this.modal) {
                document.addEventListener('DOMContentLoaded', () => this.open(currentIcon, onSelect), { once: true });
                return;
            }
        }
        if (this.iconPickerCustomInput) this.iconPickerCustomInput.value = currentIcon || '';
        this.modal.classList.remove('hidden');
    }

    close() {
        if (this.modal) this.modal.classList.add('hidden');
        this.onSelect = null;
    }

    _select(iconClass) {
        if (typeof this.onSelect === 'function') {
            this.onSelect(iconClass);
        }
        this.close();
    }
}

if (typeof window !== 'undefined') {
    window.IconPicker = IconPicker;
}

export default IconPicker;


