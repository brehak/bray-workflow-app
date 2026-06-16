import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, SlashSquare, ArrowUp, Check, Play } from 'lucide-react';

/**
 * ChatPanel — the "Claude Assistant" conversational sidebar that lives on the
 * right of the workflow editor. It keeps a local message history, renders
 * user/assistant bubbles, and offers a slash-command palette.
 *
 * Stage 2 wires it to Claude: each message is POSTed to /api/workflow/chat
 * along with the live workflow graph and the running conversation history, so
 * Claude has full context and remembers the conversation. When Claude proposes
 * workflow changes, it returns the complete new graph; we hand that to
 * `onApplyWorkflow` so the canvas updates automatically.
 *
 * Conversation history persists in localStorage keyed by the workflow (id, or
 * name for unsaved ones), so it survives navigating away and back. It's wiped
 * only when the user explicitly clears the chat (`/clear`).
 *
 * Props:
 *   workflow         — the current { nodes, edges } graph (live from the editor)
 *   workflowName     — the workflow's name, for context
 *   onApplyWorkflow  — (graph) => void, applies an AI-proposed graph to the canvas
 *   onRunWorkflow    — () => bool, triggers the canvas's real Run button
 *   storageKey       — stable per-workflow key for persisting chat history
 *
 * Styling intentionally mirrors the rest of the app: glassmorphism cards, full
 * dark/light support, and framer-motion for the message + palette transitions.
 */

// Maps a slash command to a fuller, explicit instruction for Claude. The user
// still sees what they typed in their bubble; this is only what we send to the
// model so terse commands like "/explain" become clear, actionable prompts.
// `/clear` (clears the conversation) and `/run` (triggers the real canvas run)
// are handled locally and aren't here.
const COMMAND_PROMPTS = {
    '/build': 'Build a complete workflow from this description, replacing the current canvas:',
    '/add': 'Add a new step to the current workflow:',
    '/modify': 'Modify the current workflow:',
    '/remove': 'Remove the following from the current workflow:',
    '/connect': 'Connect these steps in the current workflow:',
    '/branch': 'Add a decision branch to the current workflow:',
    '/explain': 'Explain what this workflow does, step by step.',
    '/summarize': 'Give a short, plain-English summary of this workflow.',
    '/review': 'Review this workflow for issues, gaps, or mistakes, and list what you find.',
    '/optimize': 'Suggest specific ways to improve or optimize this workflow.',
    '/suggest': 'Suggest a sensible next step to add to this workflow, and offer to add it.',
    '/example': 'Show an example workflow I could build, and offer to create it.',
    '/expand': 'Expand the current workflow with additional useful steps.',
    '/save': 'The user wants to save this workflow. Let them know they can save with the Save button (or ⌘S), and note anything worth checking first.',
    '/reset': 'The user wants to reset this workflow. Confirm what resetting would do and ask them to confirm before you propose any change.',
};

// ── Chat history persistence ────────────────────────────────────────────────
// Keyed by workflow so each workflow keeps its own conversation across visits.
const STORAGE_PREFIX = 'workflow-chat:';
const storageKeyFor = (key) => `${STORAGE_PREFIX}${key}`;

const loadStored = (key) => {
    if (!key) return null;
    try {
        const raw = localStorage.getItem(storageKeyFor(key));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const saveStored = (key, messages) => {
    if (!key) return;
    try {
        // A pristine, welcome-only chat isn't worth storing — clear the slot so a
        // fresh visit (or a cleared chat) falls back to the default welcome.
        if (messages.length <= 1) localStorage.removeItem(storageKeyFor(key));
        else localStorage.setItem(storageKeyFor(key), JSON.stringify(messages));
    } catch {
        // Storage unavailable (private mode, quota) — persistence is best-effort.
    }
};

const removeStored = (key) => {
    if (!key) return;
    try {
        localStorage.removeItem(storageKeyFor(key));
    } catch {
        // ignore storage failures
    }
};

// Is this input the explicit "/run" command (optionally with trailing space)?
const isRunCommand = (text) => /^\/run(\s.*)?$/i.test(text.trim());

// Turn a raw input into the text we send to Claude: if it starts with a known
// slash command, swap in that command's fuller instruction and append any extra
// text the user typed after it. Otherwise send the text as-is.
function expandCommand(text) {
    const trimmed = text.trim();
    const match = trimmed.match(/^(\/\S+)\s*(.*)$/s);
    if (match && COMMAND_PROMPTS[match[1]]) {
        const rest = match[2].trim();
        return rest ? `${COMMAND_PROMPTS[match[1]]} ${rest}` : COMMAND_PROMPTS[match[1]];
    }
    return trimmed;
}

const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

// Slash commands, grouped by category, surfaced through the `/` palette. These
// are presentational for now — selecting one just drops it into the input.
export const COMMAND_CATEGORIES = [
    {
        category: 'Workflow Building',
        commands: [
            { cmd: '/build', desc: 'Generate a workflow from a description' },
            { cmd: '/add', desc: 'Add a new step to the workflow' },
            { cmd: '/modify', desc: 'Change an existing step' },
            { cmd: '/remove', desc: 'Delete a step' },
            { cmd: '/connect', desc: 'Connect two steps together' },
            { cmd: '/branch', desc: 'Add a decision branch' },
        ],
    },
    {
        category: 'Understanding & Analysis',
        commands: [
            { cmd: '/explain', desc: 'Explain what this workflow does' },
            { cmd: '/summarize', desc: 'Give a short summary' },
            { cmd: '/review', desc: 'Review the workflow for issues' },
            { cmd: '/optimize', desc: 'Suggest ways to improve it' },
        ],
    },
    {
        category: 'Actions',
        commands: [
            { cmd: '/run', desc: 'Run the workflow' },
            { cmd: '/save', desc: 'Save the workflow' },
            { cmd: '/clear', desc: 'Clear the conversation' },
            { cmd: '/reset', desc: 'Reset the workflow' },
        ],
    },
    {
        category: 'Templates & Inspiration',
        commands: [
            { cmd: '/suggest', desc: 'Suggest a next step' },
            { cmd: '/example', desc: 'Show an example workflow' },
            { cmd: '/expand', desc: 'Expand on the current workflow' },
        ],
    },
];

const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant',
    text: "Hi! I can help you build and modify workflows. Type a message or use / for commands.",
};

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

// Loaded (persisted) messages carry ids like "m7"; bump the module counter past
// them so freshly-generated ids can't collide with restored ones.
const ensureSeqPast = (messages) => {
    for (const m of messages) {
        const n = parseInt(String(m?.id ?? '').replace(/^m/, ''), 10);
        if (Number.isFinite(n) && n > messageSeq) messageSeq = n;
    }
};

function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`flex max-w-[85%] gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isUser && (
                    <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm"
                    >
                        <Sparkles size={13} />
                    </span>
                )}
                <div
                    className={
                        isUser
                            ? 'rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-sm text-white shadow-sm'
                            : 'rounded-2xl rounded-tl-sm border border-gray-200/70 bg-white/70 px-3 py-2 text-sm text-gray-700 shadow-sm backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/60 dark:text-gray-200'
                    }
                >
                    <span className="whitespace-pre-wrap break-words">{message.text}</span>
                    {message.applied && (
                        <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <Check size={12} />
                            Applied to canvas
                        </span>
                    )}
                    {message.ran && (
                        <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                            <Play size={11} />
                            Running on canvas
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

/**
 * TypingIndicator — the assistant "…" bubble shown while we wait on Claude.
 * Mirrors MessageBubble's assistant styling with three bouncing dots.
 */
function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="flex justify-start"
            aria-label="Claude is typing"
        >
            <div className="flex max-w-[85%] flex-row gap-2">
                <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm"
                >
                    <Sparkles size={13} />
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-gray-200/70 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/60">
                    {[0, 1, 2].map((i) => (
                        <motion.span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

/**
 * CommandPalette — the dropdown shown when the `/` button is pressed. Lists the
 * available slash commands grouped by category; clicking one calls `onSelect`.
 */
function CommandPalette({ open, onSelect, query }) {
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q.startsWith('/') || q.length < 2) return COMMAND_CATEGORIES;
        return COMMAND_CATEGORIES.map((group) => ({
            ...group,
            commands: group.commands.filter((c) => c.cmd.toLowerCase().startsWith(q)),
        })).filter((group) => group.commands.length > 0);
    }, [query]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="command-palette"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    role="listbox"
                    aria-label="Slash commands"
                    className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white/90 p-1.5 shadow-xl backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/90"
                >
                    {filtered.length === 0 && (
                        <p className="px-2 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                            No matching commands
                        </p>
                    )}
                    {filtered.map((group) => (
                        <div key={group.category} className="mb-1 last:mb-0">
                            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                {group.category}
                            </p>
                            {group.commands.map((c) => (
                                <button
                                    key={c.cmd}
                                    type="button"
                                    role="option"
                                    onClick={() => onSelect(c.cmd)}
                                    className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                >
                                    <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                        {c.cmd}
                                    </span>
                                    <span className="truncate text-xs text-gray-500 dark:text-gray-400">{c.desc}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function ChatPanel({ workflow, workflowName, onApplyWorkflow, onRunWorkflow, storageKey }) {
    // Seed messages from this workflow's persisted history (if any) on first mount.
    const [messages, setMessages] = useState(() => {
        const stored = loadStored(storageKey);
        if (stored && stored.length) {
            ensureSeqPast(stored);
            return stored;
        }
        return [WELCOME_MESSAGE];
    });
    const [draft, setDraft] = useState('');
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Latest workflow/handlers, read at send time so the in-flight request and
    // the apply/run steps always see the live canvas (props change as the user edits).
    const workflowRef = useRef(workflow);
    const nameRef = useRef(workflowName);
    const applyRef = useRef(onApplyWorkflow);
    const runRef = useRef(onRunWorkflow);
    useEffect(() => {
        workflowRef.current = workflow;
        nameRef.current = workflowName;
        applyRef.current = onApplyWorkflow;
        runRef.current = onRunWorkflow;
    });

    // ── Persist conversation per workflow ───────────────────────────────────
    // `reconcileKeyRef` tracks the workflow `messages` currently belong to, so
    // we can react when the workflow key changes (navigating to another saved
    // workflow, or a new one getting an id on first save). `renderKeyRef` lets
    // the persist effect skip the single transition render (where `messages`
    // still holds the previous workflow's chat) so we never write it to the new
    // key.
    const reconcileKeyRef = useRef(storageKey);
    const renderKeyRef = useRef(storageKey);

    useEffect(() => {
        const prevKey = reconcileKeyRef.current;
        if (prevKey === storageKey) return;
        reconcileKeyRef.current = storageKey;

        const toSaved = storageKey?.startsWith('id:'); // an id key = a saved workflow
        const stored = loadStored(storageKey);
        const hasStored = stored && stored.length > 0;

        // Navigated to / loaded a SAVED workflow that already has its own chat → show it.
        if (toSaved && hasStored) {
            ensureSeqPast(stored);
            setMessages(stored);
            return;
        }

        // Same conversation, new key: an unsaved workflow being renamed (name→name),
        // or a new one getting an id on first save (name→id with no chat yet).
        // Carry the current conversation forward under the new key.
        const sameWorkflow = !toSaved || (prevKey && !prevKey.startsWith('id:'));
        if (sameWorkflow) {
            setMessages((cur) => {
                saveStored(storageKey, cur);
                return cur;
            });
            removeStored(prevKey);
            return;
        }

        // Otherwise we genuinely switched to a different saved workflow with no
        // stored chat → start fresh.
        setMessages([WELCOME_MESSAGE]);
    }, [storageKey]);

    useEffect(() => {
        const keyChangedThisRender = renderKeyRef.current !== storageKey;
        renderKeyRef.current = storageKey;
        // On the render where the key changed, `messages` still belongs to the old
        // workflow — the reconcile effect above will load/migrate the right ones.
        // Skip so we don't persist stale chat under the new key.
        if (keyChangedThisRender) return;
        saveStored(storageKey, messages);
    }, [messages, storageKey]);

    // Keep the latest message in view as the history (or typing indicator) grows.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, loading]);

    // Fire the canvas's real Run button. Returns true if a run actually started
    // (false if it's already running or the controls aren't present).
    const triggerRun = () => runRef.current?.() ?? false;

    const send = async () => {
        const text = draft.trim();
        if (!text || loading) return;

        // `/clear` is a local action — wipe the conversation (and its stored copy).
        if (text === '/clear' || text === '/clear ') {
            setMessages([WELCOME_MESSAGE]);
            removeStored(storageKey);
            setDraft('');
            setPaletteOpen(false);
            return;
        }

        // `/run` triggers the actual canvas run (not a simulated one). Results show
        // in the real run feed below the canvas; the chat just confirms.
        if (isRunCommand(text)) {
            const started = triggerRun();
            setMessages((prev) => [
                ...prev,
                { id: nextId(), role: 'user', text },
                {
                    id: nextId(),
                    role: 'assistant',
                    text: started
                        ? '▶ Running your workflow — watch the run feed below the canvas for results.'
                        : 'The workflow looks like it’s already running — check the run feed below the canvas.',
                },
            ]);
            setDraft('');
            setPaletteOpen(false);
            return;
        }

        // Conversation history sent to Claude = the real turns so far (skip the
        // canned welcome bubble). Built before we append the new user turn.
        const history = messages
            .filter((m) => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'))
            .map((m) => ({ role: m.role, content: m.text }));

        setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);
        setDraft('');
        setPaletteOpen(false);
        setLoading(true);

        try {
            const res = await fetch('/api/workflow/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    message: expandCommand(text),
                    workflow_name: nameRef.current ?? 'Workflow',
                    workflow: {
                        nodes: workflowRef.current?.nodes ?? [],
                        edges: workflowRef.current?.edges ?? [],
                    },
                    conversation_history: history,
                }),
            });
            if (!res.ok) throw new Error(`workflow/chat HTTP ${res.status}`);
            const data = await res.json();

            // Apply any proposed graph to the canvas before showing the reply, so
            // the change is on screen by the time the user reads "I've added…".
            let applied = false;
            if (data.workflow && Array.isArray(data.workflow.nodes)) {
                applied = applyRef.current?.(data.workflow) ?? false;
            }

            // If Claude decided the user wants to run the workflow, trigger the
            // real canvas Run. When a graph change was just applied the editor
            // remounts, so defer the click briefly to let the new graph render.
            let ran = false;
            if (data.run === true) {
                if (applied) setTimeout(triggerRun, 400);
                else ran = triggerRun();
            }

            const replyText = data.reply || 'Done.';
            setMessages((prev) => [
                ...prev,
                {
                    id: nextId(),
                    role: 'assistant',
                    text: replyText,
                    applied: applied === true,
                    ran: ran === true || (data.run === true && applied),
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: nextId(),
                    role: 'assistant',
                    text: "Sorry — something went wrong reaching Claude. Please try again.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        } else if (e.key === 'Escape') {
            setPaletteOpen(false);
        }
    };

    const selectCommand = (cmd) => {
        setDraft((d) => {
            // Replace a leading slash token if the user is mid-command, else prefix.
            const trimmed = d.trimStart();
            if (trimmed.startsWith('/')) {
                const rest = trimmed.replace(/^\/\S*/, '').trimStart();
                return rest ? `${cmd} ${rest}` : `${cmd} `;
            }
            return d ? `${cmd} ${d}` : `${cmd} `;
        });
        setPaletteOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Header */}
            <header className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm"
                >
                    <Sparkles size={15} />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Claude Assistant</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Your workflow co-pilot</p>
                </div>
            </header>

            {/* Message history */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                ))}
                <AnimatePresence>{loading && <TypingIndicator key="typing" />}</AnimatePresence>
            </div>

            {/* Composer */}
            <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                <div className="relative">
                    <CommandPalette open={paletteOpen} query={draft} onSelect={selectCommand} />
                    <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-white/70 p-1.5 shadow-sm backdrop-blur transition-colors focus-within:border-indigo-400 dark:border-gray-700 dark:bg-gray-800/60 dark:focus-within:border-indigo-500">
                        <button
                            type="button"
                            onClick={() => setPaletteOpen((o) => !o)}
                            aria-label="Slash commands"
                            aria-expanded={paletteOpen}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                paletteOpen
                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
                                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700/60 dark:hover:text-gray-200'
                            }`}
                        >
                            <SlashSquare size={17} />
                        </button>
                        <textarea
                            ref={inputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={onKeyDown}
                            rows={1}
                            placeholder={loading ? 'Claude is thinking…' : 'Message Claude or type /'}
                            className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
                        />
                        <button
                            type="button"
                            onClick={send}
                            disabled={!draft.trim() || loading}
                            aria-label="Send message"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
                        >
                            <ArrowUp size={17} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
