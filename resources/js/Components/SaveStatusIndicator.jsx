import { Check, Loader2 } from 'lucide-react';

/**
 * SaveStatusIndicator — a small, subtle header badge reflecting the auto-save
 * state. Three states:
 *   saved   → green check, "All changes saved"
 *   unsaved → pulsing yellow dot, "Unsaved changes"
 *   saving  → spinner, "Saving…"
 * Works in light and dark mode. The text collapses on very small screens, but
 * the icon (and an aria-live region) always conveys the state.
 */
const STATES = {
    saved: { text: 'All changes saved', className: 'text-green-600 dark:text-green-400' },
    unsaved: { text: 'Unsaved changes', className: 'text-amber-600 dark:text-amber-400' },
    saving: { text: 'Saving…', className: 'text-gray-500 dark:text-gray-400' },
};

export default function SaveStatusIndicator({ state }) {
    const cfg = STATES[state] ?? STATES.saved;
    return (
        <div
            className={`flex items-center gap-1.5 text-xs font-medium ${cfg.className}`}
            role="status"
            aria-live="polite"
        >
            {state === 'saving' ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : state === 'unsaved' ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400" aria-hidden="true" />
            ) : (
                <Check size={13} aria-hidden="true" />
            )}
            <span className="hidden md:inline">{cfg.text}</span>
        </div>
    );
}
