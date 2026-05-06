/**
 * Fixed strip under the site header: quick links (same idea as the old userscript bar).
 * Config: `header-bookmarks-bar-config` (JSON string, same row shape as user card buttons).
 * Toggle: `header-bookmarks-bar-enabled`.
 */
chrome.storage.sync.get(['custom-hosts'], (data) => {
    (function () {
        const DEFAULT_HEADER_BOOKMARKS = [
            { id: 'hb-base', enabled: true, text: 'База', icon: 'fal fa-database', url: '/cards/' },
            { id: 'hb-trades', enabled: true, text: 'Трейди', icon: 'fal fa-exchange-alt', url: '/trades/' },
            {
                id: 'hb-cards',
                enabled: true,
                text: 'Карти',
                icon: 'fal fa-layer-group',
                url: '/user/cards/?name={USERNAME}',
            },
            { id: 'hb-packs', enabled: true, text: 'Паки', icon: 'fal fa-box-open', url: '/cards/pack/' },
            { id: 'hb-promo', enabled: true, text: 'Промо', icon: 'fal fa-gift', url: '/promo_codes/' },
        ];

        let barEl = null;
        let resizeHandler = null;
        let ro = null;
        let isHostAllowed = false;

        function getUsername() {
            return (
                document.querySelector('.lgn__name > span')?.textContent?.trim() ||
                document.querySelector('.usn__name > h1')?.textContent?.trim() ||
                ''
            );
        }

        function resolveIconClass(iconClass) {
            if (!iconClass) return '';
            if (iconClass.startsWith('fas ')) return 'fal ' + iconClass.slice(4);
            return iconClass;
        }

        function resolveUrl(raw) {
            const user = getUsername();
            let u = String(raw || '')
                .replace(/\{USERNAME\}/g, user)
                .replace(/\{USER\}/g, user);
            if (/^https?:\/\//i.test(u)) return u;
            if (u.startsWith('/')) return window.location.origin + u;
            return u;
        }

        function findHeader() {
            return (
                document.querySelector('header.header') ||
                document.querySelector('header') ||
                document.querySelector('.header')
            );
        }

        function removeBar() {
            if (resizeHandler) {
                window.removeEventListener('resize', resizeHandler);
                resizeHandler = null;
            }
            if (ro) {
                ro.disconnect();
                ro = null;
            }
            if (barEl) {
                barEl.remove();
                barEl = null;
            }
        }

        function positionBar(header) {
            if (!barEl || !header) return;
            barEl.style.top = `${header.offsetHeight}px`;
        }

        function mountBar(cfg) {
            removeBar();
            const header = findHeader();
            if (!header) return;

            const fragment = document.createDocumentFragment();
            let count = 0;
            for (const btn of cfg) {
                if (!btn || !btn.enabled) continue;
                const hasIcon = Boolean(btn.icon && String(btn.icon).trim());
                const hasText = Boolean(btn.text && String(btn.text).trim());
                if (!hasIcon && !hasText) continue;

                const link = document.createElement('a');
                link.href = resolveUrl(btn.url);

                if (hasIcon) {
                    const icon = document.createElement('i');
                    icon.className = resolveIconClass(String(btn.icon).trim());
                    link.appendChild(icon);
                    if (hasText) {
                        const span = document.createElement('span');
                        span.textContent = String(btn.text);
                        link.appendChild(span);
                    }
                } else {
                    link.textContent = String(btn.text);
                }
                fragment.appendChild(link);
                count++;
            }
            if (count === 0) return;

            const root = document.createElement('div');
            root.id = 'as-ext-header-bookmarks';
            root.className = 'as-ext-header-bookmarks';
            root.setAttribute('data-as-ext', 'header-bookmarks');
            root.appendChild(fragment);

            document.body.appendChild(root);
            barEl = root;

            resizeHandler = () => positionBar(findHeader());
            resizeHandler();
            window.addEventListener('resize', resizeHandler);
            try {
                ro = new ResizeObserver(resizeHandler);
                ro.observe(header);
            } catch (e) {
                /* ignore */
            }
        }

        function parseConfig(raw) {
            if (!raw || typeof raw !== 'string') return null;
            try {
                const v = JSON.parse(raw);
                return Array.isArray(v) ? v : null;
            } catch (e) {
                return null;
            }
        }

        function parseHosts(raw) {
            return Array.isArray(raw) ? raw : [];
        }

        function refreshHostPermission(hostsRaw) {
            const hosts = parseHosts(hostsRaw);
            isHostAllowed = hosts.includes(window.location.hostname);
            if (!isHostAllowed) {
                removeBar();
            }
        }

        function load() {
            if (!isHostAllowed) {
                removeBar();
                return;
            }
            chrome.storage.sync.get(['header-bookmarks-bar-enabled', 'header-bookmarks-bar-config'], (s) => {
                if (!s['header-bookmarks-bar-enabled']) {
                    removeBar();
                    return;
                }
                let cfg = parseConfig(s['header-bookmarks-bar-config']);
                if (cfg === null) {
                    cfg = DEFAULT_HEADER_BOOKMARKS;
                }

                let attempts = 0;
                const tryOnce = () => {
                    if (findHeader()) {
                        mountBar(cfg);
                        return;
                    }
                    attempts++;
                    if (attempts < 60) {
                        setTimeout(tryOnce, 150);
                    }
                };
                tryOnce();
            });
        }

        refreshHostPermission(data?.['custom-hosts']);
        load();
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'sync') return;
            if (changes['custom-hosts']) {
                refreshHostPermission(changes['custom-hosts'].newValue);
                load();
                return;
            }
            if (changes['header-bookmarks-bar-enabled'] || changes['header-bookmarks-bar-config']) {
                load();
            }
        });
    })();
});
