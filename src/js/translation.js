import AnimeStarExtensionTranslationUkraine from './i18n/uk.js';
import AnimeStarExtensionTranslationEnglish from './i18n/en.js';
import AnimeStarExtensionTranslationRussian from './i18n/ru.js';

const AnimeStarExtensionTranslations = {
    'en': AnimeStarExtensionTranslationEnglish,
    'uk': AnimeStarExtensionTranslationUkraine,
    'ru': AnimeStarExtensionTranslationRussian,
};

const defaultLang = 'en';
const INSPECT_LANG_KEY = '$inspect';

class TranslateText extends HTMLElement {
    constructor() {
        super();
        
        const lang = this.getAttribute('lang') || defaultLang;
        // const key = this.getAttribute('key') || this.textContent;
        this.setAttribute('lang', lang);
        // this.setAttribute('key', key);

        this.translate(this, lang);
    }
    translate(element, lang) {
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

            const defaultLanguage = AnimeStarExtensionTranslations[defaultLang] || {};
            const language = AnimeStarExtensionTranslations[lang] || {};

            element.textContent = language[tralateKey] || defaultLanguage[tralateKey] || tralateKey;

            return;
        }
        element.childNodes?.forEach(elm => {
            this.translate(elm, lang);
        })
    }
}
window.i18n = {
    changeLang(lang) {
        document.querySelectorAll('translate-text').forEach(element => {
            element.translate(element, lang);
        });
    }
};
customElements.define('translate-text', TranslateText);