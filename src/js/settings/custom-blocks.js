/** Truly custom rows (no declarative schema): update check + domain editor. */

export function renderCustom(customId) {
    switch (customId) {
        case 'check-update-row': {
            const row = document.createElement('div');
            row.className = 'setting-item';
            const btn = document.createElement('button');
            btn.className = 'check-update-btn as-btn as-btn--primary';
            btn.textContent = 'check-update';
            row.appendChild(btn);
            return row;
        }
        case 'custom-domains': {
            const row = document.createElement('div');
            row.className = 'setting-item multi-line';
            const lb = document.createElement('label');
            lb.setAttribute('for', 'custom-domain-input');
            lb.textContent = 'site-domains-add-label';
            const controls = document.createElement('div');
            controls.className = 'domain-controls';
            const input = document.createElement('input');
            input.id = 'custom-domain-input';
            input.type = 'text';
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.placeholder = 'animestars.org або https://animestars.org';
            const addBtn = document.createElement('button');
            addBtn.id = 'custom-domain-add';
            addBtn.className = 'as-btn as-btn--primary';
            addBtn.textContent = 'site-domains-add-btn';
            controls.appendChild(input);
            controls.appendChild(addBtn);
            const lb2 = document.createElement('label');
            lb2.textContent = 'site-domains';
            const list = document.createElement('div');
            list.className = 'domain-list';
            list.id = 'custom-domains-list';
            row.appendChild(lb);
            row.appendChild(controls);
            row.appendChild(lb2);
            row.appendChild(list);
            return row;
        }
        default:
            return null;
    }
}
