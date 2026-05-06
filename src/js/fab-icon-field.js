/**
 * Reusable icon-class picker row for FAB settings (uses IconPicker modal).
 */
import IconPicker from './icon-picker.js';

/** Icons commonly useful for quick actions (Font Awesome 6 class names). */
export const FAB_ICON_CHOICES = [
    'fas fa-bolt',
    'fas fa-ellipsis-vertical',
    'fas fa-grip-lines',
    'fas fa-sliders',
    'fas fa-moon',
    'fas fa-sun',
    'fas fa-eye',
    'fas fa-eye-slash',
    'fas fa-plus',
    'fas fa-minus',
    'fas fa-check',
    'fas fa-list',
    'fas fa-layer-group',
    'fas fa-star',
    'fas fa-fire',
    'fas fa-gem',
    'fas fa-circle',
    'fal fa-search',
    'fal fa-heart',
    'fal fa-user',
    'fal fa-users',
];

/**
 * @param {{
 *   translate: (key: string) => string,
 *   value: string,
 *   onCommit: (iconClass: string) => void,
 * }} opts
 */
export function createFabIconField(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'fab-icon-field';
    wrap.draggable = false;

    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'fab-icon-field-preview as-btn as-btn--secondary';
    previewBtn.title = opts.translate('fab_pick_icon');
    previewBtn.draggable = false;
    const previewI = document.createElement('i');
    previewBtn.appendChild(previewI);

    function setPreviewClass(cls) {
        const c = (cls || '').trim();
        previewI.className = c || 'fas fa-icons';
    }

    setPreviewClass(opts.value);

    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'as-btn as-btn--secondary fab-icon-field-open';
    pickBtn.textContent = opts.translate('fab_pick_icon');
    pickBtn.draggable = false;

    // This field sits inside draggable rows; block drag start so click opens the picker.
    [wrap, previewBtn, pickBtn].forEach((el) => {
        el.addEventListener('pointerdown', (e) => e.stopPropagation());
        el.addEventListener('mousedown', (e) => e.stopPropagation());
        el.addEventListener('dragstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    const picker = new IconPicker({
        icons: FAB_ICON_CHOICES,
        translate: opts.translate,
        resolveIconClass: (c) => c,
    });

    pickBtn.addEventListener('click', () => {
        picker.open(opts.value || '', (cls) => {
            const v = (cls || '').trim();
            setPreviewClass(v);
            opts.onCommit(v);
        });
    });

    wrap.appendChild(previewBtn);
    wrap.appendChild(pickBtn);
    return wrap;
}
