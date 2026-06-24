// Custom workflow folders live client-side in localStorage. The `folder` column
// on a workflow is the source of truth for *membership*; this list just lets a
// user create an (initially empty) folder and have it persist — and be offered
// as a target — across the WorkflowList and the Workflow editor before any
// workflow has actually been filed into it.
const KEY = 'workflowCustomFolders';

export function getCustomFolders() {
    try {
        const raw = localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter((f) => typeof f === 'string' && f.trim()) : [];
    } catch {
        return [];
    }
}

export function addCustomFolder(name) {
    const trimmed = (name ?? '').trim();
    const cur = getCustomFolders();
    if (!trimmed || cur.includes(trimmed)) return cur;
    const next = [...cur, trimmed];
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* localStorage unavailable — keep going with the in-memory list */
    }
    return next;
}

export function removeCustomFolder(name) {
    const next = getCustomFolders().filter((f) => f !== name);
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* ignore */
    }
    return next;
}
