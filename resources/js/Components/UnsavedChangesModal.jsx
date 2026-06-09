import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button, Heading, Text } from '@particle-academy/react-fancy';

/**
 * UnsavedChangesModal — confirmation shown when the user tries to navigate away
 * from the editor with unsaved changes. Offers to save first, leave anyway, or
 * stay. Animated with framer-motion; built from react-fancy components.
 */
export default function UnsavedChangesModal({ open, saving, onSaveLeave, onLeave, onCancel }) {
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
                    {/* Backdrop — click to cancel (stay on page). */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={saving ? undefined : onCancel}
                        aria-hidden="true"
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="unsaved-changes-title"
                        className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                                <AlertTriangle size={22} aria-hidden="true" />
                            </div>
                            <div className="flex-1">
                                <Heading as="h2" id="unsaved-changes-title" size="lg" weight="semibold">
                                    Unsaved Changes
                                </Heading>
                                <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    You have unsaved changes that will be lost if you leave. Do you want to save before
                                    leaving?
                                </Text>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" color="gray" onClick={onCancel} disabled={saving}>
                                Cancel
                            </Button>
                            <Button variant="outline" onClick={onLeave} disabled={saving}>
                                Leave without saving
                            </Button>
                            <Button variant="primary" onClick={onSaveLeave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save & Leave'}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
