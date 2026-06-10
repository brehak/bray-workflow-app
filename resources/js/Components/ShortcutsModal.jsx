import { motion, AnimatePresence } from 'framer-motion';
import { Button, Heading, Text } from '@particle-academy/react-fancy';

const SHORTCUTS = [
    { keys: '⌘S', label: 'Save workflow' },
    { keys: '⌘Z', label: 'Undo' },
    { keys: '⌘⇧Z', label: 'Redo' },
    { keys: '⌘E', label: 'Export JSON' },
    { keys: '⌘I', label: 'Import JSON' },
    { keys: 'Space', label: 'Pan canvas' },
    { keys: 'Scroll', label: 'Zoom in / out' },
    { keys: 'Del', label: 'Delete selected step' },
    { keys: 'Esc', label: 'Deselect / Close panel' },
];

/**
 * ShortcutsModal — keyboard-shortcut reference in a two-column layout, on a
 * glassmorphism card animated with framer-motion. Dismiss by clicking the
 * backdrop or the Close button (Escape is handled by the editor's global key
 * listener). Built from react-fancy components.
 */
export default function ShortcutsModal({ open, onClose }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Backdrop — click outside to dismiss. */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

                    {/* Glassmorphism card. */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="shortcuts-title"
                        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70"
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <Heading as="h2" id="shortcuts-title" size="lg" weight="semibold">
                                Work faster with shortcuts
                            </Heading>
                            <Button variant="outline" color="gray" size="sm" onClick={onClose}>
                                Close
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
                            {SHORTCUTS.map((s) => (
                                <div key={s.label} className="flex items-center gap-3">
                                    <kbd className="inline-flex min-w-[3.25rem] justify-center rounded-md border border-gray-300/70 bg-white/80 px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm dark:border-gray-600/60 dark:bg-gray-800/80 dark:text-gray-200">
                                        {s.keys}
                                    </kbd>
                                    <Text className="text-sm text-gray-600 dark:text-gray-300">{s.label}</Text>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
