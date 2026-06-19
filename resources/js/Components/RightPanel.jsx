import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@particle-academy/react-fancy';
import { MessageSquare, SlidersHorizontal, PanelRightClose, Sparkles, Wand2 } from 'lucide-react';
import ChatPanel from './ChatPanel';
import NodeConfigPanel from './NodeConfigPanel';

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

    // Collapsed: a slim rail with a button to re-open the assistant.
    if (!open) {
        return (
            <aside className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white/80 py-3 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/70 lg:h-[720px]">
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

    return (
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/70 lg:h-[720px]">
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
