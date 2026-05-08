chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
        const STAR_BUTTON_SETTING_KEY = 'card-modal-star-button';
        let isEnabled = true;

        function findRankFromMeta(modalContent) {
            const rankElement = modalContent.querySelector('.ncard__meta-item.ncard__rank');
            if (!rankElement) return null;
            const rankClass = Array.from(rankElement.classList).find((className) => className.startsWith('rank-'));
            if (!rankClass) return null;
            return rankClass.split('-').slice(1).join('-') || null;
        }

        function findCardName(modalContent) {
            const nameElement = modalContent.querySelector('.anime-cards__name');
            return nameElement?.textContent?.trim() || null;
        }

        function createStarButton(cardName, rank) {
            const starLink = document.createElement('a');
            starLink.href = `/update_stars/?rank=${encodeURIComponent(rank)}&search=${encodeURIComponent(cardName)}`;
            starLink.title = `Open stars page for "${cardName}"`;
            starLink.className = 'ncard__meta-item as-ext-star-meta-item';
            starLink.style.display = 'flex';
            starLink.style.alignItems = 'center';
            starLink.style.justifyContent = 'center';
            starLink.style.width = '36px';
            starLink.style.height = '36px';
            starLink.style.borderRadius = '50%';
            starLink.style.textDecoration = 'none';
            starLink.style.padding = '0';
            starLink.style.boxSizing = 'border-box';
            starLink.style.backgroundColor = 'transparent';
            starLink.style.border = '1px solid #555';
            starLink.style.transition = 'background-color 0.2s ease, border-color 0.2s ease';

            const starIcon = document.createElement('i');
            starIcon.className = 'fal fa-star';
            starIcon.style.color = 'gold';
            starIcon.style.fontSize = '20px';
            starLink.appendChild(starIcon);

            starLink.addEventListener('mouseenter', () => {
                starLink.style.backgroundColor = 'rgba(158, 41, 79, 0.9)';
                starLink.style.borderColor = 'rgba(158, 41, 79, 0.9)';
            });
            starLink.addEventListener('mouseleave', () => {
                starLink.style.backgroundColor = 'transparent';
                starLink.style.borderColor = '#555';
            });

            return starLink;
        }

        function addStarButton(modalContent) {
            if (!isEnabled) return;
            const metaContainer = modalContent.querySelector('.ncard__meta');
            if (!metaContainer) return;
            if (metaContainer.querySelector('.as-ext-star-meta-item')) return;

            const rankElement = modalContent.querySelector('.ncard__meta-item.ncard__rank');
            if (!rankElement) return;

            const rank = findRankFromMeta(modalContent);
            const cardName = findCardName(modalContent);
            if (!rank || !cardName) return;

            metaContainer.style.columnGap = '5px';
            const starButton = createStarButton(cardName, rank);
            metaContainer.insertBefore(starButton, rankElement);
        }

        function processDialogElement(dialogElement) {
            const modalContent = dialogElement.querySelector('#card-modal .modal__content');
            if (!modalContent) return;
            setTimeout(() => addStarButton(modalContent), 50);
        }

        function removeAllStarButtons() {
            document.querySelectorAll('.as-ext-star-meta-item').forEach((element) => element.remove());
        }

        function processExistingDialogs() {
            document.querySelectorAll('.ui-dialog').forEach((dialogElement) => {
                processDialogElement(dialogElement);
            });
        }

        const observer = new MutationObserver((mutationsList) => {
            mutationsList.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (node.classList.contains('ui-dialog')) {
                        processDialogElement(node);
                    } else {
                        const nestedDialog = node.querySelector('.ui-dialog');
                        if (nestedDialog) processDialogElement(nestedDialog);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        chrome.storage.sync.get([STAR_BUTTON_SETTING_KEY], (settings) => {
            isEnabled = settings[STAR_BUTTON_SETTING_KEY] ?? true;
            if (isEnabled) {
                processExistingDialogs();
            } else {
                removeAllStarButtons();
            }
        });

        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'sync') return;
            if (!changes[STAR_BUTTON_SETTING_KEY]) return;

            isEnabled = changes[STAR_BUTTON_SETTING_KEY].newValue ?? true;
            if (isEnabled) {
                processExistingDialogs();
            } else {
                removeAllStarButtons();
            }
        });
    })();
});
