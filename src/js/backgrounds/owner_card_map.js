import { AssApiClient } from '../api-client.js';

// -----------------------------------------------------------------------------
// Owner Instance (ownerId) → CardId mapping store and optional sync
// Stores per-instance mapping and username for future preview usage
// -----------------------------------------------------------------------------

const OWNER_INSTANCE_STORAGE_PREFIX = 'cardOwnerIdMapV1_';

function buildInstanceKey(ownerId) {
    return `${OWNER_INSTANCE_STORAGE_PREFIX}${ownerId}`;
}

async function getInstanceRecord(ownerId) {
    if (!ownerId) return null;
    const key = buildInstanceKey(ownerId);
    const stored = await chrome.storage.local.get([key]);
    return stored[key] || null;
}


async function addInstanceRecords(records) {
    if (!Array.isArray(records) || records.length === 0) return 0;
    const toStore = {};
    let count = 0;
    for (const r of records) {
        if (!r || !r.ownerId || !r.cardId) continue;
        const key = buildInstanceKey(r.ownerId);
        toStore[key] = { timestamp: Date.now(), ownerId: r.ownerId, cardId: parseInt(r.cardId), username: r.username || null };
        count++;
    }
    if (count > 0) {
        await chrome.storage.local.set(toStore);
    }
    return count;
}

async function syncInstanceRecords(records) {
    if (!Array.isArray(records) || records.length === 0) return false;
    const syncSettings = await chrome.storage.sync.get(['owner-card-map-sync-enabled']);
    if (!syncSettings['owner-card-map-sync-enabled']) return false;
    try {
        await AssApiClient.makeRequest('/api/owner-instance-map/bulk', {
            method: 'POST',
            body: JSON.stringify({ items: records.map(r => ({ owner_id: r.ownerId, card_id: r.cardId, username: r.username || null })) })
        });
        return true;
    } catch (e) {
        console.warn('Owner instance map sync failed:', e?.message || e);
        return false;
    }
}

async function handleAdd(message) {
    console.log('handleAdd', message);
    const items = Array.isArray(message?.items) ? message.items : [];
    if (items.length === 0) return { success: false };
    const stored = await addInstanceRecords(items);
    // Fire-and-forget sync
    syncInstanceRecords(items);
    return { success: true, stored };
}

async function handleGet(message) {
    const ownerId = message?.ownerId;
    if (!ownerId) return { success: false };
    const record = await getInstanceRecord(ownerId);
    return { success: true, record };
}

async function handleGetMany(message) {
    const ownerIds = Array.isArray(message?.ownerIds) ? message.ownerIds.filter(Boolean) : [];
    if (ownerIds.length === 0) return { success: true, records: {} };
    const keys = ownerIds.map(buildInstanceKey);
    const stored = await chrome.storage.local.get(keys);
    const records = {};
    ownerIds.forEach((oid, idx) => {
        const key = keys[idx];
        const rec = stored[key] || null;
        records[oid] = rec;
    });
    return { success: true, records };
}

const actionMap = {
    'owner_instance_map_add': handleAdd,
    'owner_instance_map_get': handleGet,
    'owner_instance_map_get_many': handleGetMany,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = actionMap?.[message?.action];
    if (!action) return;
    const result = action(message, sender);
    if (result instanceof Promise) {
        result.then((response) => sendResponse(response)).catch((error) => {
            sendResponse({ success: false, error: error?.message || String(error) });
        });
        return true;
    }
    return result;
});


