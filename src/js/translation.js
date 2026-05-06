import {
    defaultLang,
    INSPECT_LANG_KEY,
    loadLocaleMessages,
    formatMessage,
} from './i18n-runtime.js';

export { defaultLang, INSPECT_LANG_KEY } from './i18n-runtime.js';

let activeMessages = {};
let activeLang = defaultLang;

export async function applyLocale(lang) {
    if (lang === INSPECT_LANG_KEY) {
        activeLang = INSPECT_LANG_KEY;
        return;
    }
    const normalized = ['uk', 'en', 'ru'].includes(lang) ? lang : defaultLang;
    activeMessages = await loadLocaleMessages(normalized);
    activeLang = normalized;
}

function storageLanguage() {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get(['language'], (r) => {
                resolve(r?.language ?? defaultLang);
            });
        } catch {
            resolve(defaultLang);
        }
    });
}

/** Preload locale from storage before first paint (extension pages). */
export const i18nReady = (async () => {
    const lang = await storageLanguage();
    await applyLocale(lang === INSPECT_LANG_KEY ? INSPECT_LANG_KEY : lang);
})();

export const i18n = {
    /**
     * @param {string} lang
     */
    async changeLang(lang) {
        await applyLocale(lang);
        document.querySelectorAll('translate-text').forEach((element) => {
            if (element.translate) element.translate(element, lang);
        });
    },

    /**
     * @param {string} tralateKey
     * @param {string[]|string|undefined} [substitutions] optional Chrome-style substitutions for $1 / placeholders
     */
    getTranslateText(tralateKey, substitutions) {
        if (activeLang === INSPECT_LANG_KEY) return tralateKey;
        const entry = activeMessages[tralateKey];
        if (!entry) return tralateKey;
        return formatMessage(entry, substitutions);
    },
};

if (typeof window !== 'undefined' && window.document) {
    window.i18n = i18n;
    window.__animeStarsI18nReady = i18nReady;

    class TranslateText extends HTMLElement {
        async connectedCallback() {
            if (window.__animeStarsI18nReady) {
                await window.__animeStarsI18nReady;
            }
            const lang = this.getAttribute('lang') || activeLang;
            this.translate(this, lang);
        }

        translate(element, lang) {
            if (element.childNodes.length === 0) {
                return;
            }
            if (element?.getAttribute('disable-translate')) {
                return;
            }
            if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
                let tralateKey = element.getAttribute('translate-key') || element.textContent?.trim();
                if (tralateKey) {
                    element.setAttribute('translate-key', tralateKey);
                }

                if (lang === INSPECT_LANG_KEY) {
                    element.textContent = tralateKey;
                    return;
                }

                element.textContent = i18n.getTranslateText(tralateKey);

                return;
            }
            element.childNodes?.forEach((elm) => {
                this.translate(elm, lang);
            });
        }
    }

    customElements.define('translate-text', TranslateText);
}

export default i18n;
