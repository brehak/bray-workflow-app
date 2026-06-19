import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, SlashSquare, ArrowUp, Check, Play, Trash2, Brain } from 'lucide-react';
import { CHAT_STORAGE_PREFIX, getSettings } from '../lib/settings';

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
 *   onRunFromChat    — async () => summary, runs the workflow straight from chat
 *                      (injecting a synthetic trigger when there's no trigger node)
 *   storageKey       — stable per-workflow key for persisting chat history
 *
 * Styling intentionally mirrors the rest of the app: glassmorphism cards, full
 * dark/light support, and framer-motion for the message + palette transitions.
 */

// Maps a slash command to a fuller, explicit instruction for Claude. The user
// still sees what they typed in their bubble; this is only what we send to the
// model so terse commands like "/explain" become clear, actionable prompts.
// `/clear` (clears the conversation) and `/run` (runs the workflow directly from
// chat, acting as its own trigger) are handled locally and aren't here.
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
// The prefix is shared with the Settings page (which clears all histories).
const storageKeyFor = (key) => `${CHAT_STORAGE_PREFIX}${key}`;

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

// ── Thinking-indicator status stages ────────────────────────────────────────
// While we wait, the TypingIndicator cycles through a short, fading sequence of
// status lines so the wait feels like real work happening. We pick the sequence
// up-front from what the user asked for: a richer build-a-workflow narrative,
// a couple of generic "thinking" lines for plain questions, or a run narrative
// for the local `/run` execution.
const THINKING_STAGES = {
    building: [
        'Analyzing your request…',
        'Reading the workflow…',
        'Generating nodes…',
        'Validating connections…',
        'Applying to canvas…',
    ],
    thinking: ['Thinking…', 'Analyzing…'],
    running: ['Starting workflow…', 'Executing steps…', 'Finishing up…'],
};

// Slash commands that change the graph (so the build narrative fits) vs. ones
// that only answer/explain (so the simpler "thinking" narrative fits).
const BUILDING_COMMANDS = new Set(['/build', '/add', '/modify', '/remove', '/connect', '/branch', '/expand', '/example', '/suggest']);
const QUESTION_COMMANDS = new Set(['/explain', '/summarize', '/review', '/optimize', '/save', '/reset']);

// Decide which thinking narrative to show for a message. Explicit build/question
// commands map cleanly; plain free-text (the common "build me a…" case) defaults
// to the richer build sequence.
function thinkingModeFor(text) {
    const trimmed = text.trim();
    const cmd = trimmed.match(/^(\/\S+)/)?.[1];
    if (cmd) return QUESTION_COMMANDS.has(cmd) ? 'thinking' : 'building';
    // Plain free-text that reads like a question (incl. the "Explain this step" /
    // "Improve this step" prompts) gets the simpler narrative; everything else
    // (the common "build me a…" case) gets the richer build sequence.
    if (/^(explain|describe|summari[sz]e|what|why|how|which|when|who|is|are|does|can|could|should)\b/i.test(trimmed)) {
        return 'thinking';
    }
    return 'building';
}

// Turn the result of a chat-initiated run into a friendly summary bubble. The
// summary reports how many steps ran, success vs failure, and notes when /run
// had to act as its own trigger (no trigger node on the canvas).
function formatRunSummary(summary) {
    if (!summary || summary.empty || summary.totalNodes === 0) {
        return "There's nothing to run yet — add some steps to the canvas first.";
    }
    const { ok, error, totalNodes, nodesRun, injectedTrigger } = summary;
    const head = ok ? '✓ Workflow ran successfully' : '✗ Workflow run failed';
    const ranLine = `${nodesRun} of ${totalNodes} step${totalNodes === 1 ? '' : 's'} ran`;
    const triggerNote = injectedTrigger
        ? '\nNo trigger node on the canvas, so /run started it with a synthetic trigger event.'
        : '';
    const errLine = !ok && error ? `\n${error}` : '';
    return `${head} — ${ranLine}.${triggerNote}${errLine}`;
}

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

// ── Generated-workflow validation ───────────────────────────────────────────
// Before applying a Claude-proposed graph to the canvas, check it forms a
// well-structured, executable workflow: it starts at a trigger, every step
// leads somewhere and is reachable, decisions branch cleanly in two, and
// branches never merge back together. fancy-flow runs each branch independently
// to its own output node — a shared "merge" node makes a run stop early — so a
// cleanly-branched graph is a tree where every node has exactly one parent.
//
// Returns { valid, errors }. On failure the caller doesn't touch the canvas; it
// shows the problems and asks Claude to regenerate a corrected graph.
function validateGraph(graph) {
    const errors = [];
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];

    if (nodes.length === 0) return { valid: false, errors: ['The workflow has no nodes.'] };

    const typeOf = (n) => n?.type ?? n?.data?.kind;
    const nameOf = (n) => `"${n?.data?.label || n?.id}"`;

    const triggers = nodes.filter((n) => typeOf(n) === 'trigger');
    const outputs = nodes.filter((n) => typeOf(n) === 'output');

    // At least one trigger and one output.
    if (triggers.length === 0) errors.push('There is no trigger node — every workflow needs a starting trigger.');
    if (outputs.length === 0) errors.push('There is no output node — every workflow needs at least one end/output step.');

    // Index edges by source and target.
    const outgoing = new Map();
    const incoming = new Map();
    for (const n of nodes) {
        outgoing.set(n.id, []);
        incoming.set(n.id, []);
    }
    for (const e of edges) {
        if (outgoing.has(e.source)) outgoing.get(e.source).push(e);
        if (incoming.has(e.target)) incoming.get(e.target).push(e);
    }

    for (const n of nodes) {
        const kind = typeOf(n);
        const outs = outgoing.get(n.id) ?? [];

        // Every non-output node must lead somewhere.
        if (kind !== 'output' && outs.length === 0) {
            errors.push(`${nameOf(n)} (${kind}) has no outgoing connection — every non-output step must lead to another node.`);
        }

        // Every decision must branch in exactly two: one "true", one "false".
        if (kind === 'decision') {
            const trues = outs.filter((e) => e.sourceHandle === 'true').length;
            const falses = outs.filter((e) => e.sourceHandle === 'false').length;
            if (outs.length !== 2 || trues !== 1 || falses !== 1) {
                errors.push(
                    `Decision ${nameOf(n)} must have exactly two outgoing edges — one with sourceHandle "true" and one with "false" (found ${outs.length} edge(s): ${trues} true, ${falses} false).`,
                );
            }
        }

        // No merge points: in a cleanly-branched workflow every node has exactly
        // one parent. Two-or-more incoming edges means separate branch paths
        // merged back into a shared node, which fancy-flow can't run.
        const ins = incoming.get(n.id) ?? [];
        if (ins.length > 1) {
            errors.push(
                `${nameOf(n)} is a merge point — ${ins.length} edges point to it. Branches after a decision must stay independent and each end at its own output node, never rejoining a shared node.`,
            );
        }
    }

    // Every node must be reachable from a trigger.
    if (triggers.length > 0) {
        const seen = new Set();
        const stack = triggers.map((t) => t.id);
        while (stack.length) {
            const id = stack.pop();
            if (seen.has(id)) continue;
            seen.add(id);
            for (const e of outgoing.get(id) ?? []) stack.push(e.target);
        }
        const unreachable = nodes.filter((n) => !seen.has(n.id));
        if (unreachable.length) {
            errors.push(`These steps aren't reachable from the trigger: ${unreachable.map(nameOf).join(', ')}.`);
        }
    }

    return { valid: errors.length === 0, errors };
}

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
 * TypingIndicator — the "Claude is working" bubble shown while we wait. Instead
 * of static dots, it steps through a short, fading sequence of status lines
 * (chosen by `mode` — see THINKING_STAGES) so the wait reads like real progress:
 * each line holds ~1.5s, then cross-fades up to the next, settling on the last.
 * A pulsing brain icon and a sparkle avatar add a bit of life, and three
 * shimmering dots trail the text. Purely cosmetic — the actual request/run
 * drives `loading`, which mounts/unmounts this whole component.
 */
function TypingIndicator({ mode = 'thinking' }) {
    const stages = THINKING_STAGES[mode] ?? THINKING_STAGES.thinking;
    const [step, setStep] = useState(0);

    // Restart the sequence whenever the mode changes (a new request begins).
    useEffect(() => {
        setStep(0);
    }, [mode]);

    // Advance one stage at a time until we reach the last, then hold there for
    // however long the request still takes.
    useEffect(() => {
        if (step >= stages.length - 1) return;
        const t = setTimeout(() => setStep((s) => Math.min(s + 1, stages.length - 1)), 1500);
        return () => clearTimeout(t);
    }, [step, stages.length]);

    const label = stages[Math.min(step, stages.length - 1)];

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="flex justify-start"
            aria-label="Claude is working"
            aria-live="polite"
        >
            <div className="flex max-w-[85%] flex-row gap-2">
                {/* Sparkle avatar — gently breathes while Claude works. */}
                <motion.span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-sm"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Sparkles size={13} />
                </motion.span>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-gray-200/70 bg-white/70 px-3 py-2 shadow-sm backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/60">
                    {/* Pulsing brain, next to the status text. */}
                    <motion.span
                        aria-hidden="true"
                        className="shrink-0 text-indigo-500 dark:text-indigo-400"
                        animate={{ scale: [1, 1.18, 1], opacity: [0.65, 1, 0.65] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Brain size={14} />
                    </motion.span>

                    {/* Cross-fading status line. `mode="wait"` lets the old line
                        animate out before the new one slides in. */}
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={label}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-xs font-medium text-transparent dark:from-indigo-300 dark:to-fuchsia-300"
                        >
                            {label}
                        </motion.span>
                    </AnimatePresence>

                    {/* Trailing shimmer dots. */}
                    <span className="flex shrink-0 items-center gap-0.5">
                        {[0, 1, 2].map((i) => (
                            <motion.span
                                key={i}
                                className="h-1 w-1 rounded-full bg-indigo-400 dark:bg-indigo-500"
                                animate={{ opacity: [0.3, 1, 0.3], y: [0, -1.5, 0] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                            />
                        ))}
                    </span>
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

export default function ChatPanel({ workflow, workflowName, onApplyWorkflow, onRunWorkflow, onRunFromChat, submittedPrompt, storageKey }) {
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
    // Which status narrative the typing indicator shows while `loading`:
    // 'building' | 'thinking' (a Claude turn) or 'running' (a local /run).
    const [thinkingMode, setThinkingMode] = useState('thinking');
    const [confirmingClear, setConfirmingClear] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Latest workflow/handlers, read at send time so the in-flight request and
    // the apply/run steps always see the live canvas (props change as the user edits).
    const workflowRef = useRef(workflow);
    const nameRef = useRef(workflowName);
    const applyRef = useRef(onApplyWorkflow);
    const runRef = useRef(onRunWorkflow);
    const runFromChatRef = useRef(onRunFromChat);
    useEffect(() => {
        workflowRef.current = workflow;
        nameRef.current = workflowName;
        applyRef.current = onApplyWorkflow;
        runRef.current = onRunWorkflow;
        runFromChatRef.current = onRunFromChat;
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

    // Clear the conversation: reset to the welcome bubble and wipe the stored
    // history for this workflow. Triggered from the header trash button after the
    // user confirms.
    const clearChat = () => {
        setMessages([WELCOME_MESSAGE]);
        removeStored(storageKey);
        setConfirmingClear(false);
    };

    // `send` is used both as the composer's submit handler (called with the click
    // event) and programmatically (e.g. the config panel's "Ask Claude" buttons,
    // which pass an explicit prompt string). Anything that isn't a string falls
    // back to the current draft.
    const send = async (override) => {
        const text = (typeof override === 'string' ? override : draft).trim();
        if (!text || loading) return;

        // `/clear` is a local action — wipe the conversation (and its stored copy).
        if (text === '/clear' || text === '/clear ') {
            setMessages([WELCOME_MESSAGE]);
            removeStored(storageKey);
            setDraft('');
            setPaletteOpen(false);
            return;
        }

        // `/run` runs the workflow directly from the chat. It acts as its own
        // trigger: with a trigger node on the canvas the run starts there as
        // normal; with none (a blank/incomplete workflow) it injects a synthetic
        // trigger event and starts from the first connected node. The run uses the
        // same engine + executors as the canvas, so the run feed, toasts and
        // animations all fire as usual; here we show progress and, when it's done,
        // a summary of what happened.
        if (isRunCommand(text)) {
            setMessages((prev) => [
                ...prev,
                { id: nextId(), role: 'user', text },
                { id: nextId(), role: 'assistant', text: '▶ Running workflow…', ran: true },
            ]);
            setDraft('');
            setPaletteOpen(false);

            const runner = runFromChatRef.current;
            // Fallback: if the direct-run handler isn't wired, fall back to clicking
            // the canvas Run button (the previous behaviour) so /run never no-ops.
            if (!runner) {
                const started = triggerRun();
                setMessages((prev) => [
                    ...prev,
                    {
                        id: nextId(),
                        role: 'assistant',
                        text: started
                            ? 'Watch the run feed below the canvas for results.'
                            : 'The workflow looks like it’s already running — check the run feed below the canvas.',
                    },
                ]);
                return;
            }

            setThinkingMode('running');
            setLoading(true);
            try {
                const summary = await runner();
                setMessages((prev) => [
                    ...prev,
                    { id: nextId(), role: 'assistant', text: formatRunSummary(summary) },
                ]);
            } catch {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: nextId(),
                        role: 'assistant',
                        text: 'Sorry — the workflow run failed to start. Please try again.',
                    },
                ]);
            } finally {
                setLoading(false);
            }
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
        setThinkingMode(thinkingModeFor(text));
        setLoading(true);

        // POST one turn to Claude with the given message + prior conversation,
        // always sending the live canvas graph. Returns the parsed response.
        const postChat = async (message, conversationHistory) => {
            const res = await fetch('/api/workflow/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    message,
                    workflow_name: nameRef.current ?? 'Workflow',
                    workflow: {
                        nodes: workflowRef.current?.nodes ?? [],
                        edges: workflowRef.current?.edges ?? [],
                    },
                    conversation_history: conversationHistory,
                    // Read live so the "Chat response length" preference applies
                    // immediately, without remounting the panel.
                    response_length: getSettings().chatResponseLength,
                }),
            });
            if (!res.ok) throw new Error(`workflow/chat HTTP ${res.status}`);
            return res.json();
        };

        try {
            const firstMessage = expandCommand(text);
            let data = await postChat(firstMessage, history);
            // Running transcript so each auto-fix turn keeps full context.
            const convo = [...history, { role: 'user', content: firstMessage }];

            // Validate any proposed graph before touching the canvas. If it's
            // broken, don't apply it — explain what's wrong, ask Claude to
            // regenerate a corrected graph, then re-validate. Bounded retries so
            // a persistently-bad model can't loop forever.
            let invalidGiveUp = false;
            if (data.workflow && Array.isArray(data.workflow.nodes)) {
                const MAX_FIX_ATTEMPTS = 2;
                let validation = validateGraph(data.workflow);
                for (let attempt = 0; !validation.valid && attempt < MAX_FIX_ATTEMPTS; attempt++) {
                    const issues = validation.errors.map((e) => `• ${e}`).join('\n');
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: nextId(),
                            role: 'assistant',
                            text: `⚠️ The workflow Claude generated wasn't valid, so I didn't apply it:\n${issues}\n\nAsking Claude to fix it…`,
                        },
                    ]);
                    convo.push({ role: 'assistant', content: data.reply || '(returned an invalid workflow graph)' });
                    const fixPrompt =
                        `The workflow graph you just returned is invalid and was NOT applied to the canvas. ` +
                        `Fix these problems and return the COMPLETE corrected graph:\n${issues}\n\n` +
                        `Make sure: every non-output node has at least one outgoing edge; every decision node has exactly ` +
                        `two outgoing edges (one with sourceHandle "true" and one with "false"); no node is a merge point — ` +
                        `each branch after a decision stays completely independent and ends at its own output node, so two ` +
                        `paths never point to the same node; there is at least one trigger and at least one output; and every ` +
                        `node is reachable from the trigger.`;
                    convo.push({ role: 'user', content: fixPrompt });
                    data = await postChat(fixPrompt, convo);
                    if (!(data.workflow && Array.isArray(data.workflow.nodes))) {
                        validation = { valid: false, errors: ['Claude did not return a corrected workflow graph.'] };
                        break;
                    }
                    validation = validateGraph(data.workflow);
                }

                if (!validation.valid) {
                    // Out of retries — leave the canvas untouched and explain why.
                    invalidGiveUp = true;
                    const issues = validation.errors.map((e) => `• ${e}`).join('\n');
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: nextId(),
                            role: 'assistant',
                            text: `I couldn't produce a valid workflow, so I've left the canvas unchanged:\n${issues}\n\nTry rephrasing your request, or adjust the workflow manually.`,
                        },
                    ]);
                }
            }

            // Apply the (now-validated) graph to the canvas before showing the
            // reply, so the change is on screen by the time the user reads it.
            let applied = false;
            if (!invalidGiveUp && data.workflow && Array.isArray(data.workflow.nodes)) {
                applied = applyRef.current?.(data.workflow) ?? false;
            }

            // If Claude decided the user wants to run the workflow, trigger the
            // real canvas Run. When a graph change was just applied the editor
            // remounts, so defer the click briefly to let the new graph render.
            let ran = false;
            if (!invalidGiveUp && data.run === true) {
                if (applied) setTimeout(triggerRun, 400);
                else ran = triggerRun();
            }

            // When we gave up on an invalid graph we've already shown the reason;
            // don't tack on Claude's (now-stale) reply about a change that never landed.
            if (!invalidGiveUp) {
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
            }
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

    // Send a prompt queued from outside the panel (the config panel's "Ask Claude"
    // buttons). Each click bumps `submittedPrompt.nonce`, so we fire once per click
    // — even when the same prompt is asked twice — and never re-fire on remount.
    const lastAskNonce = useRef(null);
    useEffect(() => {
        if (!submittedPrompt || submittedPrompt.nonce === lastAskNonce.current) return;
        lastAskNonce.current = submittedPrompt.nonce;
        const text = submittedPrompt.text?.trim();
        if (text) send(text);
        // `send` is intentionally omitted — it's recreated each render but always
        // closes over current state, and we only want to react to a new nonce.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submittedPrompt]);

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
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Claude Assistant</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Your workflow co-pilot</p>
                </div>

                {/* Clear chat — asks for inline confirmation before wiping history */}
                <AnimatePresence mode="wait" initial={false}>
                    {confirmingClear ? (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.15 }}
                            className="flex shrink-0 items-center gap-1.5"
                        >
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">Clear conversation history?</span>
                            <button
                                type="button"
                                onClick={clearChat}
                                className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-red-500"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingClear(false)}
                                className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="trash"
                            type="button"
                            onClick={() => setConfirmingClear(true)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            aria-label="Clear chat"
                            title="Clear chat"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-red-400"
                        >
                            <Trash2 size={15} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </header>

            {/* Message history */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                ))}
                <AnimatePresence>{loading && <TypingIndicator key="typing" mode={thinkingMode} />}</AnimatePresence>
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
