import AnimeStarExtensionTranslationUkraine from './i18n/uk.js';
import AnimeStarExtensionTranslationEnglish from './i18n/en.js';
import AnimeStarExtensionTranslationRussian from './i18n/ru.js';
import { setupUpdateChecks } from './services/update-service.js';

export const AnimeStarExtensionTranslations = {
    'en': AnimeStarExtensionTranslationEnglish,
    'uk': AnimeStarExtensionTranslationUkraine,
    'ru': AnimeStarExtensionTranslationRussian,
};

export const defaultLang = 'en';
export const INSPECT_LANG_KEY = '$inspect';

export const i18n = {
    lang: defaultLang,
    changeLang(lang) {
        this.lang = lang;
        document.querySelectorAll('translate-text').forEach(element => {
            element.translate(element, lang);
        });
    },
    getTranslateText(tralateKey, lang) {
        const defaultLanguage = AnimeStarExtensionTranslations[defaultLang] || {};
        const language = AnimeStarExtensionTranslations[lang] || {};

        return language[tralateKey] || defaultLanguage[tralateKey] || tralateKey;
    }
};

if (typeof window !== 'undefined' && window.document) {
    window.i18n = i18n;

    class TranslateText extends HTMLElement {
        constructor() {
            super();
            
            const lang = this.getAttribute('lang') || defaultLang;
            // const key = this.getAttribute('key') || this.textContent;
            // this.setAttribute('key', key);

            this.translate(this, lang);
        }
        translate(element, lang) {
            this.setAttribute('lang', lang);

            if (element.childNodes.length === 0) {
                return;
            }
            if (element?.getAttribute("disable-translate")) {
                return;
            }   
            if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
                let tralateKey = element.getAttribute("translate-key") || element.textContent?.trim();
                if (tralateKey) {
                    element.setAttribute("translate-key", tralateKey);
                }
                

                if (lang == INSPECT_LANG_KEY) {
                    element.textContent = tralateKey;
                    return;
                }

                element.textContent = i18n.getTranslateText(tralateKey, lang);

                return;
            }
            element.childNodes?.forEach(elm => {
                this.translate(elm, lang);
            })
        }
    }

    customElements.define('translate-text', TranslateText);

    class MutateTranslateText extends TranslateText {
        constructor() {
            super();
            this.observer = new MutationObserver(this.updateTranslate.bind(this));
            this.#connectedObserver();
        }
        updateTranslate() {
            this.#disconnectedObserver();
            this.translate(this, i18n.lang);
            this.#connectedObserver();
        }
        #connectedObserver() {
            this.observer.observe(this, { childList: true, subtree: true });
        }
        #disconnectedObserver() {
            this.observer.disconnect();
        }
    }

    customElements.define('mutate-translate-text', MutateTranslateText);
}

export default i18n;
