/**
 * Reusable icon-class picker row for FAB settings (uses IconPicker modal).
 */
import IconPicker from './icon-picker.js';

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

    function resolveForDisplay(cls) {
        const c = (cls || '').trim();
        if (!c) return '';
        if (c.startsWith('fal ')) return 'fas ' + c.slice(4);
        return c;
    }

    function setPreviewClass(cls) {
        const c = (cls || '').trim();
        previewI.className = resolveForDisplay(c) || 'fas fa-icons';
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
        translate: opts.translate,
        resolveIconClass: resolveForDisplay,
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
