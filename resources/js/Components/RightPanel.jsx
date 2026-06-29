import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@particle-academy/react-fancy';
import { MessageSquare, SlidersHorizontal, PanelRightClose, Sparkles, Wand2 } from 'lucide-react';
import ChatPanel from './ChatPanel';
import NodeConfigPanel from './NodeConfigPanel';
import { getSettings, saveSettings } from '../lib/settings';

// Resizable-width bounds for the panel. The handle on its left edge drags within
// this range; double-clicking resets to DEFAULT_PANEL_WIDTH. The chosen width is
// persisted to settings.chatPanelWidth so it survives reloads. The sibling editor
// column is `flex-1`, so the canvas simply reflows to fill whatever space is left.
const MIN_PANEL_WIDTH = 250;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 320;
const clampPanelWidth = (w) =>
    Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(w)));

/**
 * RightPanel — the smart right-hand sidebar that hosts both the Claude chat
 * assistant and the per-node config editor inside one shared glassmorphism
 * shell.
 *
 * Behaviour:
 *   - No node selected → the chat assistant is shown (and Config is disabled).
 *   - A node gets selected → we auto-switch to its config editor…
 *   - …but a small toggle at the top lets the user flip back to chat at any
 *     time, even with a node selected.
 *
 * The chat lives here permanently (its message history survives view switches)
 * via an always-mounted layer that's hidden, rather than unmounted, when the
 * config view is on top.
 *
 * The whole panel can be collapsed to a slim rail. Its initial open/closed state
 * comes from `defaultOpen` (the "Chat panel default state" setting). Selecting a
 * node always re-opens it so the config editor is reachable.
 */
export default function RightPanel({
    selectedNode,
    onChange,
    workflow,
    workflowName,
    onApplyWorkflow,
    onRunWorkflow,
    onRunFromChat,
    chatStorageKey,
    defaultOpen = true,
}) {
    const [view, setView] = useState('chat'); // 'chat' | 'config'
    const [open, setOpen] = useState(defaultOpen);
    const prevNodeId = useRef(selectedNode?.id ?? null);

    // ── Resizable width ──────────────────────────────────────────────────────
    // Seed from the persisted setting (clamped, in case an out-of-range value was
    // stored). While dragging, the live width is mirrored into `dragRef.latest`
    // so the mouse-up handler can persist the final value without a stale closure.
    const [width, setWidth] = useState(() => clampPanelWidth(getSettings().chatPanelWidth ?? DEFAULT_PANEL_WIDTH));
    const dragRef = useRef(null);

    const handleDragMove = useCallback((e) => {
        const drag = dragRef.current;
        if (!drag) return;
        // The handle is on the LEFT edge, so dragging left (smaller clientX)
        // widens the panel and dragging right narrows it.
        const next = clampPanelWidth(drag.startWidth + (drag.startX - e.clientX));
        drag.latest = next;
        setWidth(next);
    }, []);

    const stopDrag = useCallback(() => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', stopDrag);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
        if (dragRef.current) {
            saveSettings({ chatPanelWidth: dragRef.current.latest });
            dragRef.current = null;
        }
    }, [handleDragMove]);

    const startDrag = useCallback(
        (e) => {
            e.preventDefault();
            dragRef.current = { startX: e.clientX, startWidth: width, latest: width };
            // Suppress text selection / show the resize cursor for the whole drag.
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', stopDrag);
        },
        [width, handleDragMove, stopDrag],
    );

    // Double-click the handle to snap back to the default width.
    const resetWidth = useCallback(() => {
        setWidth(DEFAULT_PANEL_WIDTH);
        saveSettings({ chatPanelWidth: DEFAULT_PANEL_WIDTH });
    }, []);

    // Safety net: if the panel unmounts mid-drag, drop the global listeners.
    useEffect(
        () => () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', stopDrag);
        },
        [handleDragMove, stopDrag],
    );

    // A prompt queued from the config panel's "Ask Claude" buttons. The bumping
    // `nonce` makes every click a distinct value so ChatPanel re-sends even when
    // the same prompt is asked twice. Sending it also flips the view to chat so
    // Claude's answer is visible.
    const [askPrompt, setAskPrompt] = useState(null);
    const askClaude = (text) => {
        setAskPrompt((p) => ({ text, nonce: (p?.nonce ?? 0) + 1 }));
        setView('chat');
        setOpen(true);
    };

    // Follow the selection: jump to config when a node is (newly) selected — and
    // re-open the panel if it was collapsed, so the config editor is reachable —
    // and back to chat when the selection is cleared. The explicit toggle can
    // still override this between selection changes.
    useEffect(() => {
        const id = selectedNode?.id ?? null;
        if (id !== prevNodeId.current) {
            if (id) {
                setView('config');
                setOpen(true);
            } else {
                setView('chat');
            }
            prevNodeId.current = id;
        }
    }, [selectedNode]);

    const hasNode = Boolean(selectedNode);

    // Collapsed: a slim rail with a button to re-open the assistant. At `lg` it
    // stretches to the left column's height (editor + run feed) via the row's
    // default `align-items: stretch`, so the rail tracks the run feed too.
    if (!open) {
        return (
            <aside className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white/80 py-3 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/70">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open Claude assistant"
                    title="Open Claude assistant"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm transition-transform hover:scale-105"
                >
                    <Sparkles size={16} />
                </button>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 [writing-mode:vertical-rl] dark:text-gray-500">
                    Assistant
                </span>
            </aside>
        );
    }

    // The outer wrapper is the flex item in the editor row. At `lg` it's
    // `relative` with the panel absolutely filling it, so the panel's height is
    // driven by the sibling left column (editor + run feed) rather than by its
    // own chat content — a long conversation can't stretch the row. As the run
    // feed expands/collapses the column grows/shrinks and the panel tracks it,
    // with the message list scrolling inside (see ChatPanel's `overflow-y-auto`).
    // On small screens the wrapper collapses to normal flow so the panel keeps
    // its natural, content-driven height.
    return (
        <div className="shrink-0 lg:relative" style={{ width: `${width}px` }}>
            {/* Drag handle on the LEFT edge — grab and drag left to widen, right to
                narrow; double-click to reset. Shown only at `lg`, where the editor
                and panel sit side by side. The grip's vertical dots signal it's
                draggable and the whole handle highlights on hover. */}
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize chat panel (double-click to reset)"
                title="Drag to resize · double-click to reset"
                onMouseDown={startDrag}
                onDoubleClick={resetWidth}
                className="group absolute inset-y-0 left-0 z-30 hidden w-3 -translate-x-1/2 cursor-col-resize lg:block"
            >
                {/* Full-height hairline that brightens on hover. */}
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-indigo-400/70" />
                {/* Centered grip with three vertical dots. */}
                <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-gray-200 bg-white px-1 py-1.5 shadow-sm transition-colors group-hover:border-indigo-300 group-hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-800 dark:group-hover:border-indigo-500/60 dark:group-hover:bg-indigo-500/10">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="h-1 w-1 rounded-full bg-gray-400 transition-colors group-hover:bg-indigo-500 dark:bg-gray-500"
                        />
                    ))}
                </span>
            </div>

            <aside className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/70 lg:absolute lg:inset-0">
            {/* Segmented toggle: Chat / Config */}
            <div className="flex shrink-0 gap-1 border-b border-gray-100 p-2 dark:border-gray-800">
                <ToggleButton
                    active={view === 'chat'}
                    onClick={() => setView('chat')}
                    icon={<MessageSquare size={14} />}
                    label="Chat"
                />
                <ToggleButton
                    active={view === 'config'}
                    onClick={() => hasNode && setView('config')}
                    disabled={!hasNode}
                    title={hasNode ? undefined : 'Select a step to configure it'}
                    icon={<SlidersHorizontal size={14} />}
                    label="Config"
                />
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Collapse panel"
                    title="Collapse panel"
                    className="flex shrink-0 items-center justify-center rounded-lg px-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                    <PanelRightClose size={16} />
                </button>
            </div>

            {/* Body — chat stays mounted underneath so its history persists; the
                config view animates in on top when active. */}
            <div className="relative min-h-0 flex-1">
                <div className={view === 'chat' ? 'h-full' : 'pointer-events-none invisible h-full'}>
                    <ChatPanel
                        workflow={workflow}
                        workflowName={workflowName}
                        onApplyWorkflow={onApplyWorkflow}
                        onRunWorkflow={onRunWorkflow}
                        onRunFromChat={onRunFromChat}
                        submittedPrompt={askPrompt}
                        storageKey={chatStorageKey}
                    />
                </div>

                <AnimatePresence>
                    {view === 'config' && (
                        <motion.div
                            key="config"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                            className="absolute inset-0 flex flex-col bg-white/90 backdrop-blur-md dark:bg-gray-900/90"
                        >
                            <div className="min-h-0 flex-1">
                                <NodeConfigPanel node={selectedNode} onChange={onChange} />
                            </div>
                            <AskClaudeFooter node={selectedNode} onAsk={askClaude} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </aside>
        </div>
    );
}

/**
 * AskClaudeFooter — the "Ask Claude about this step" actions pinned to the bottom
 * of the config panel. Each button hands a ready-made prompt (referencing the
 * selected node by its label) to `onAsk`, which sends it to the chat and flips
 * the panel over to the conversation so the answer is visible.
 */
function AskClaudeFooter({ node, onAsk }) {
    const label = node?.data?.label?.trim() || 'this';
    const explainPrompt = `Explain what the "${label}" step does in this workflow and why it's important.`;
    const improvePrompt = `How could the "${label}" step be improved or made more detailed?`;

    return (
        <div className="shrink-0 border-t border-gray-100 p-3 dark:border-gray-800">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <Sparkles size={12} aria-hidden="true" />
                Ask Claude about this step
            </p>
            <div className="flex flex-col gap-2">
                <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => onAsk(explainPrompt)}
                >
                    <Sparkles size={14} aria-hidden="true" />
                    Explain this step
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => onAsk(improvePrompt)}
                >
                    <Wand2 size={14} aria-hidden="true" />
                    Improve this step
                </Button>
            </div>
        </div>
    );
}

function ToggleButton({ active, onClick, disabled, title, icon, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-pressed={active}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : disabled
                      ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}
