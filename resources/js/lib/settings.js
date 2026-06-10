// ──────────────────────────────────────────────────────────────────────────
// App settings (localStorage-backed)
//
// A small, framework-free store for user preferences set on the Settings page
// and read across the app (the editor reads auto-save interval, canvas
// background, default tags/name prefix, and accent). Theme (light/dark) keeps
// its own existing key via hooks/useTheme; the beginner-guide flag keeps its
// existing key too — both are exposed here through thin helpers so the Settings
// page has one place to import from.
// ──────────────────────────────────────────────────────────────────────────

export const SETTINGS_KEY = 'workflow-settings';
// Shared with Workflow.jsx's beginner-guide auto-popup gate.
export const GUIDE_SEEN_KEY = 'workflow-guide-seen';
// Fired (same-tab) whenever settings change, so open views can react if they want.
export const SETTINGS_EVENT = 'workflow-settings-changed';

// Option lists — also used to render the Settings controls.
export const ACCENT_OPTIONS = [
    { value: 'indigo', label: 'Indigo' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'violet', label: 'Violet' },
    { value: 'orange', label: 'Orange' },
    { value: 'pink', label: 'Pink' },
    { value: 'teal', label: 'Teal' },
];

export const AUTOSAVE_OPTIONS = [
    { value: '30', label: '30 seconds' },
    { value: '60', label: '1 minute' },
    { value: '120', label: '2 minutes' },
    { value: 'off', label: 'Off' },
];

export const CANVAS_BG_OPTIONS = [
    { value: 'dots', label: 'Dot grid', description: 'Subtle dotted texture (the default).' },
    { value: 'plain', label: 'Plain', description: 'A clean, empty canvas.' },
    { value: 'lines', label: 'Lines', description: 'A faint squared grid.' },
];

export const TAG_OPTIONS = ['HR', 'Engineering', 'Finance', 'Operations', 'Design'];

export const DEFAULT_SETTINGS = {
    accent: 'indigo',
    autoSaveInterval: '30', // seconds, or 'off'
    canvasBackground: 'dots',
    defaultTags: [],
    defaultNamePrefix: '',
};

/** Read the merged settings (defaults + stored overrides). Safe pre-mount. */
export function getSettings() {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

/** Merge `patch` into the stored settings and persist. Returns the new settings. */
export function saveSettings(patch) {
    const next = { ...getSettings(), ...patch };
    try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
    } catch {
        // storage unavailable — settings just won't persist this session.
    }
    return next;
}

/** Auto-save interval in milliseconds, or null when disabled ("off"). */
export function autoSaveIntervalMs(settings = getSettings()) {
    if (settings.autoSaveInterval === 'off') return null;
    const seconds = parseInt(settings.autoSaveInterval, 10);
    return Number.isFinite(seconds) ? seconds * 1000 : 30000;
}

// ── Beginner-guide flag (shares Workflow.jsx's key) ────────────────────────
/** Whether the beginner guide will auto-show on a new blank workflow. */
export function isGuideEnabled() {
    try {
        return window.localStorage.getItem(GUIDE_SEEN_KEY) !== '1';
    } catch {
        return true;
    }
}

/** Enable (clear the seen flag) or disable (set it) the new-workflow guide. */
export function setGuideEnabled(enabled) {
    try {
        if (enabled) window.localStorage.removeItem(GUIDE_SEEN_KEY);
        else window.localStorage.setItem(GUIDE_SEEN_KEY, '1');
    } catch {
        // ignore
    }
}
