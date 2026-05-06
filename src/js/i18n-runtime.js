/** Chrome-style messages.json: fetch, merge with default locale, format placeholders ($VERSION$ + placeholders). */

export const defaultLang = 'en';
export const INSPECT_LANG_KEY = '$inspect';

const localeCache = new Map();

function placeholderMarker(name) {
    return '$' + name.split('_').map((p) => p.toUpperCase()).join('_') + '$';
}

/**
 * @param {{ message?: string, placeholders?: Record<string, { content: string }> }|undefined} entry
 * @param {string[]|string|undefined} substitutions
 */
export function formatMessage(entry, substitutions) {
    if (!entry || typeof entry.message !== 'string') return '';
    let message = entry.message;
    const ph = entry.placeholders || {};
    const subs = substitutions === undefined || substitutions === null
        ? []
        : Array.isArray(substitutions)
          ? substitutions.map((s) => String(s))
          : [String(substitutions)];

    for (const [name, spec] of Object.entries(ph)) {
        const marker = placeholderMarker(name);
        const m = String(spec?.content || '').match(/\$(\d+)/);
        const idx = m ? Number(m[1]) - 1 : 0;
        const val = subs[idx] !== undefined ? subs[idx] : '';
        message = message.split(marker).join(val);
    }
    return message;
}

async function fetchLocaleJson(locale) {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`i18n fetch ${locale}: ${res.status}`);
    return res.json();
}

/**
 * Load messages for locale, merged with default locale for missing keys.
 * @param {string} locale
 * @returns {Promise<Record<string, { message: string, placeholders?: object }>>}
 */
export async function loadLocaleMessages(locale) {
    const safe = ['uk', 'en', 'ru'].includes(locale) ? locale : defaultLang;
    if (localeCache.has(safe)) {
        return localeCache.get(safe);
    }

    let primary = {};
    try {
        primary = await fetchLocaleJson(safe);
    } catch {
        primary = {};
    }

    let merged = primary;
    if (safe !== defaultLang) {
        let fallback = {};
        try {
            fallback = await fetchLocaleJson(defaultLang);
        } catch {
            fallback = {};
        }
        merged = { ...fallback, ...primary };
    }

    localeCache.set(safe, merged);
    return merged;
}

export function invalidateLocaleCache(locale) {
    if (locale === undefined) localeCache.clear();
    else localeCache.delete(locale);
}

/**
 * @param {Record<string, { message: string }>} messages
 * @param {string} messageName
 * @param {string[]|string|undefined} substitutions
 */
export function getMessageFromMap(messages, messageName, substitutions) {
    const entry = messages[messageName];
    return formatMessage(entry, substitutions);
}
