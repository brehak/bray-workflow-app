import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, SlashSquare, ArrowUp } from 'lucide-react';

/**
 * ChatPanel — the "Claude Assistant" conversational sidebar that lives on the
 * right of the workflow editor. Stage 1 is UI-only: it keeps a local message
 * history, renders user/assistant bubbles, and offers a slash-command palette.
 * No AI is wired up yet — sending a message echoes it and drops a friendly
 * placeholder so the full chat surface can be exercised. Stage 2 will replace
 * the placeholder with real Claude responses.
 *
 * Styling intentionally mirrors the rest of the app: glassmorphism cards, full
 * dark/light support, and framer-motion for the message + palette transitions.
 */

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
                    {message.text}
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

export default function ChatPanel() {
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [draft, setDraft] = useState('');
    const [paletteOpen, setPaletteOpen] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Keep the latest message in view as the history grows.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const send = () => {
        const text = draft.trim();
        if (!text) return;
        setMessages((prev) => [
            ...prev,
            { id: nextId(), role: 'user', text },
            // Stage 1 placeholder — real Claude responses land in Stage 2.
            {
                id: nextId(),
                role: 'assistant',
                text: "I'm not wired up to think yet — that arrives in Stage 2. For now you're seeing the chat experience take shape!",
            },
        ]);
        setDraft('');
        setPaletteOpen(false);
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
                            placeholder="Message Claude or type /"
                            className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
                        />
                        <button
                            type="button"
                            onClick={send}
                            disabled={!draft.trim()}
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
