const CUSTOM_HOSTS_KEY = 'custom-hosts';

export function normalizeHost(input) {
    if (typeof input !== 'string') return null;
    let s = input.trim().toLowerCase();
    if (!s) return null;

    if (s.includes('://')) {
        try {
            s = new URL(s).hostname;
        } catch {
            s = (s.split('://')[1] ?? s);
        }
    }

    s = (s.split('/')[0] ?? '').split('?')[0].split('#')[0];

    if (!s || s.includes(' ')) return null;
    return s;
}

export async function getCustomHosts() {
    const data = await chrome.storage.sync.get([CUSTOM_HOSTS_KEY]);
    const raw = data?.[CUSTOM_HOSTS_KEY];
    if (!Array.isArray(raw)) return [];
    const hosts = raw.map(normalizeHost).filter(Boolean);
    return [...new Set(hosts)];
}

export async function setCustomHosts(hosts) {
    const normalized = (hosts || []).map(normalizeHost).filter(Boolean);
    const unique = [...new Set(normalized)];
    await chrome.storage.sync.set({ [CUSTOM_HOSTS_KEY]: unique });
    return unique;
}

export async function renderCustomDomains() {
    const list = document.getElementById('custom-domains-list');
    if (!list) return;

    const hosts = await getCustomHosts();
    list.innerHTML = '';

    if (hosts.length === 0) {
        const empty = document.createElement('small');
        empty.textContent = 'site-domains-empty';
        list.appendChild(empty);
        const langEl = document.getElementById('language');
        window.i18n?.changeLang?.(langEl?.value || 'en');
        return;
    }

    for (const host of hosts) {
        const row = document.createElement('div');
        row.className = 'domain-row';

        const code = document.createElement('code');
        code.textContent = host;

        const btn = document.createElement('button');
        btn.className = 'domain-remove-btn as-btn as-btn--danger';
        btn.textContent = 'remove';
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                const h = await getCustomHosts();
                await setCustomHosts(h.filter((x) => x !== host));
                await renderCustomDomains();
            } catch (e) {
                console.error('Failed to remove domain:', e);
            } finally {
                btn.disabled = false;
            }
        });

        row.appendChild(code);
        row.appendChild(btn);
        list.appendChild(row);
    }
    const langEl = document.getElementById('language');
    window.i18n?.changeLang?.(langEl?.value || 'en');
}

export async function setupCustomDomainsUI() {
    const input = document.getElementById('custom-domain-input');
    const addBtn = document.getElementById('custom-domain-add');
    if (!input || !addBtn) return;

    await renderCustomDomains();

    const doAdd = async () => {
        const host = normalizeHost(input.value);
        if (!host) return;

        addBtn.disabled = true;
        try {
            const hosts = await getCustomHosts();
            if (!hosts.includes(host)) {
                await setCustomHosts([...hosts, host]);
            }
            input.value = '';
            await renderCustomDomains();
        } catch (e) {
            console.error('Failed to add domain:', e);
        } finally {
            addBtn.disabled = false;
        }
    };

    addBtn.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doAdd();
        }
    });
}
