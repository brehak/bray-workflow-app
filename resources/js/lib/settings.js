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
// Prefix for the per-workflow chat histories ChatPanel persists (one key each).
// Defined here so the Settings page can wipe them all in one place.
export const CHAT_STORAGE_PREFIX = 'workflow-chat:';

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

export const TAG_OPTIONS = [
    'HR',
    'Engineering',
    'Finance',
    'Operations',
    'Design',
    'Marketing',
    'Sales',
    'Legal',
    'IT',
    'Product',
    'Customer Support',
    'DevOps',
    'Security',
    'Procurement',
    'Accounting',
    'Research',
    'Leadership',
    'Admin',
    'QA',
];

export const ANIMATION_SPEED_OPTIONS = [
    { value: 'slow', label: 'Slow' },
    { value: 'normal', label: 'Normal' },
    { value: 'fast', label: 'Fast' },
];

export const TOAST_POSITION_OPTIONS = [
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-left', label: 'Top Left' },
];

export const TOAST_DURATION_OPTIONS = [
    { value: '2000', label: '2 seconds' },
    { value: '3000', label: '3 seconds' },
    { value: '5000', label: '5 seconds' },
];

// Multiplier applied to in-editor run animations (executor pacing + CSS speeds).
// >1 is slower, <1 is faster.
export const ANIMATION_SPEED_FACTORS = { slow: 1.8, normal: 1, fast: 0.5 };

// ── Claude AI settings ──────────────────────────────────────────────────────
export const CHAT_PANEL_DEFAULT_OPTIONS = [
    { value: 'auto', label: 'Opens automatically' },
    { value: 'closed', label: 'Stays closed' },
];

export const CHAT_RESPONSE_LENGTH_OPTIONS = [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'detailed', label: 'Detailed' },
];

export const DEFAULT_SETTINGS = {
    accent: 'indigo',
    autoSaveInterval: '30', // seconds, or 'off'
    canvasBackground: 'dots',
    defaultTags: [],
    defaultNamePrefix: '',
    animationSpeed: 'normal', // 'slow' | 'normal' | 'fast'
    confirmNodeDelete: false, // confirm before deleting a node from the canvas
    toastPosition: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    toastDuration: '3000', // ms, as a string ('2000' | '3000' | '5000')
    showStepCounts: true, // show "X steps · Y connections" on cards
    // ── Claude AI ──
    chatPanelDefault: 'auto', // 'auto' (open on load) | 'closed' (open manually)
    chatResponseLength: 'medium', // 'short' | 'medium' | 'detailed' — sent to the chat API
    forceDemo: false, // force Demo Mode even when an API key is configured
    showAiReasoning: true, // show Claude's 🤖 narration lines in the run feed
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

/** Animation-speed multiplier (slow=1.8, normal=1, fast=0.5). */
export function animationSpeedFactor(settings = getSettings()) {
    return ANIMATION_SPEED_FACTORS[settings.animationSpeed] ?? 1;
}

/** Toast auto-dismiss duration in milliseconds. */
export function toastDurationMs(settings = getSettings()) {
    const ms = parseInt(settings.toastDuration, 10);
    return Number.isFinite(ms) ? ms : 3000;
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

// ── Chat histories (ChatPanel's per-workflow conversations) ─────────────────
/**
 * Delete every persisted Claude chat history (all `workflow-chat:*` keys).
 * Returns the number of conversations cleared. Best-effort — storage may be
 * unavailable.
 */
export function clearAllChatHistories() {
    try {
        const keys = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(CHAT_STORAGE_PREFIX)) keys.push(key);
        }
        keys.forEach((key) => window.localStorage.removeItem(key));
        return keys.length;
    } catch {
        return 0;
    }
}
