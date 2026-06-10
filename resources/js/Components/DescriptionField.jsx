import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';

/**
 * DescriptionField — an inline-editable description. Shows a single truncated
 * line by default (with a subtle "click to edit" hint on hover); clicking it
 * expands into a compact textarea (max ~3 lines) for editing. Clicking outside
 * or pressing Enter collapses it back; Shift+Enter inserts a newline.
 *
 * Controlled via `value`/`onChange`, so edits live in the parent's state and are
 * saved exactly like before.
 *
 * The size change is animated with framer-motion (`layout`), so the row morphs
 * smoothly between the one-line view and the taller textarea.
 */
const MAX_HEIGHT = 76; // ~3 lines at text-sm

export default function DescriptionField({ value, onChange, placeholder = 'Add a description...' }) {
    const [editing, setEditing] = useState(false);
    const taRef = useRef(null);

    // Grow the textarea to fit its content, capped at ~3 lines (then it scrolls).
    const autoSize = () => {
        const el = taRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    };

    // On entering edit mode: size, focus, and place the cursor at the end.
    useLayoutEffect(() => {
        if (!editing) return;
        const el = taRef.current;
        if (!el) return;
        autoSize();
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
    }, [editing]);

    return (
        <motion.div layout transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="w-full">
            {editing ? (
                <textarea
                    ref={taRef}
                    value={value}
                    placeholder={placeholder}
                    rows={1}
                    onChange={(e) => {
                        onChange(e.target.value);
                        autoSize();
                    }}
                    onBlur={() => setEditing(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            setEditing(false);
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditing(false);
                        }
                    }}
                    style={{ maxHeight: MAX_HEIGHT }}
                    className="block w-full resize-none overflow-y-auto rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm leading-relaxed text-gray-600 outline-none ring-2 ring-indigo-500/15 placeholder-gray-400 dark:border-indigo-500/40 dark:bg-gray-800/70 dark:text-gray-300 dark:placeholder-gray-500"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    title="Click to edit"
                    className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                >
                    <span className={`min-w-0 truncate ${value ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {value || placeholder}
                    </span>
                    <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500 sm:flex">
                        <Pencil size={11} aria-hidden="true" />
                        click to edit
                    </span>
                </button>
            )}
        </motion.div>
    );
}
