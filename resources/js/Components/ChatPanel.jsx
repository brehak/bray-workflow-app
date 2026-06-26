import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, SlashSquare, ArrowUp, Check, Play, Trash2, Brain } from 'lucide-react';
import { ContentRenderer } from '@particle-academy/react-fancy';
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
 * Conversation history persists in localStorage only for *saved* workflows,
 * keyed `chat_history_workflow_<id>`, so it survives navigating away and back.
 * Brand-new blank canvases and freshly launched templates always start from an
 * empty chat and aren't persisted until the workflow is first saved (at which
 * point its in-flight conversation is carried forward under the new id). History
 * is wiped when the user explicitly clears the chat (`/clear` or the trash button).
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
    '/steps':
        'List every step in this workflow as a simple numbered list in plain English. Write it so a non-technical person could understand and follow it. Use simple action verbs. Format it as a clean numbered list with a one sentence description for each step.',
    '/summarize': 'Give a short, plain-English summary of this workflow.',
    '/review': 'Review this workflow for issues, gaps, or mistakes, and list what you find.',
    '/optimize': 'Suggest specific ways to improve or optimize this workflow.',
    '/score':
        'You are a workflow analyst. Analyze this workflow and give it a health score out of 100. Score it on these criteria: Completeness (are all paths complete?), Clarity (are node labels clear?), Efficiency (any redundant steps?), Error handling (are edge cases covered?), Best practices (follows workflow design patterns?). Format your response as: A large score number, then a brief one-line verdict, then a breakdown of each criteria with its sub-score and a one sentence explanation, then 2-3 specific actionable improvements. Use markdown formatting.',
    '/suggest': 'Suggest a sensible next step to add to this workflow, and offer to add it.',
    '/example': 'Show an example workflow I could build, and offer to create it.',
    '/expand': 'Expand the current workflow with additional useful steps.',
    '/save': 'The user wants to save this workflow. Let them know they can save with the Save button (or ⌘S), and note anything worth checking first.',
    '/reset': 'The user wants to reset this workflow. Confirm what resetting would do and ask them to confirm before you propose any change.',
};

// ── Chat history persistence ────────────────────────────────────────────────
// Only *saved* workflows keep a persisted conversation, stored under
// `chat_history_workflow_<id>` (the shared prefix lets the Settings page clear
// all histories at once). The editor passes an `id:<n>` storageKey once a
// workflow has a DB id; brand-new blank canvases and freshly launched templates
// arrive as `name:<…>` keys and are deliberately NOT persisted or restored —
// they always start from an empty chat until the workflow is first saved.
const SAVED_KEY_PREFIX = 'id:';
const savedIdFrom = (key) => (key?.startsWith(SAVED_KEY_PREFIX) ? key.slice(SAVED_KEY_PREFIX.length) : null);

// The localStorage key for a workflow's chat history, or null when this
// workflow has no saved id yet (and therefore shouldn't persist anything).
const storageKeyFor = (key) => {
    const id = savedIdFrom(key);
    return id ? `${CHAT_STORAGE_PREFIX}${id}` : null;
};

const loadStored = (key) => {
    const storageKey = storageKeyFor(key);
    if (!storageKey) return null;
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const saveStored = (key, messages) => {
    const storageKey = storageKeyFor(key);
    if (!storageKey) return;
    try {
        // A pristine, welcome-only chat isn't worth storing — clear the slot so a
        // fresh visit (or a cleared chat) falls back to the default welcome.
        if (messages.length <= 1) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
        // Storage unavailable (private mode, quota) — persistence is best-effort.
    }
};

const removeStored = (key) => {
    const storageKey = storageKeyFor(key);
    if (!storageKey) return;
    try {
        localStorage.removeItem(storageKey);
    } catch {
        // ignore storage failures
    }
};

// ── Auto-introduction ───────────────────────────────────────────────────────
// When a workflow is *loaded* — a template via `?type=` or a saved workflow via
// `?id=` — the panel asks Claude for a brief, friendly intro and slots it in at
// the top of the chat. It's generated once per workflow: a localStorage flag,
// keyed by the loaded workflow's identity, means a plain page refresh (same URL)
// won't trigger it again. A blank, brand-new canvas has nothing to introduce, so
// `autoIntroIdentity` returns null and no intro is requested.
const AUTO_INTRO_PROMPT =
    'In 2-3 sentences, briefly introduce this workflow — what type of process it is, what business problem it solves, and one key thing to know about it. Be concise and friendly. Don\'t start with I.';

const INTRO_SEEN_PREFIX = 'workflow_intro_seen_';

// The stable identity of the workflow currently loaded from the URL, or null for
// a blank new canvas (no `?type=`/`?id=`). Saved workflows key by id, templates
// by type, so each is auto-introduced at most once — even across refreshes.
const autoIntroIdentity = () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) return `id:${id}`;
        const type = params.get('type');
        if (type) return `type:${type}`;
    } catch {
        // window/URL unavailable — skip the auto-intro entirely.
    }
    return null;
};

const hasSeenIntro = (identity) => {
    try {
        return localStorage.getItem(`${INTRO_SEEN_PREFIX}${identity}`) === '1';
    } catch {
        return false;
    }
};

const markIntroSeen = (identity) => {
    try {
        localStorage.setItem(`${INTRO_SEEN_PREFIX}${identity}`, '1');
    } catch {
        // best-effort; if storage is unavailable the intro may show again later.
    }
};

// Slot the auto-intro message directly beneath the welcome bubble and above any
// prior conversation, so it reads as a lead-in rather than a reply at the bottom.
const withIntroMessage = (messages, text) => {
    const intro = { id: nextId(), role: 'assistant', text, intro: true };
    return messages[0]?.id === 'welcome'
        ? [messages[0], intro, ...messages.slice(1)]
        : [intro, ...messages];
};

// Is this input the explicit "/run" command (optionally with trailing space)?
const isRunCommand = (text) => /^\/run(\s.*)?$/i.test(text.trim());

// Is this input the "/score" command? Its reply is a formatted markdown health
// report (score, verdict, per-criteria breakdown, improvements) that we render
// straight through ContentRenderer rather than splitting into option buttons.
const isScoreCommand = (text) => /^\/score(\s.*)?$/i.test(text.trim());

// Is this input the "/steps" command? Its reply is a plain-English numbered list
// of the workflow's steps that we render straight through ContentRenderer as
// markdown, rather than splitting each item into a clickable option button.
const isStepsCommand = (text) => /^\/steps(\s.*)?$/i.test(text.trim());

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
const QUESTION_COMMANDS = new Set(['/explain', '/steps', '/summarize', '/review', '/optimize', '/score', '/save', '/reset']);

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
            { cmd: '/steps', desc: 'List all steps in plain English' },
            { cmd: '/summarize', desc: 'Give a short summary' },
            { cmd: '/review', desc: 'Review the workflow for issues' },
            { cmd: '/optimize', desc: 'Suggest ways to improve it' },
            { cmd: '/score', desc: 'Get a health score for this workflow' },
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

// ── Starter prompts ─────────────────────────────────────────────────────────
// Shown under the welcome bubble while the chat is still empty, to give the user
// a quick way in. The four suggestions are context-aware: a blank canvas leans
// toward building from scratch, a loaded template toward understanding it, and a
// saved workflow toward refining it. Detected from the same signals the rest of
// the panel uses — an `id:` storageKey means a saved workflow; otherwise the
// presence of nodes distinguishes a launched template from a blank canvas.
function starterPromptsFor(storageKey, workflow) {
    const isSaved = storageKey?.startsWith(SAVED_KEY_PREFIX);
    const hasNodes = (workflow?.nodes?.length ?? 0) > 0;

    if (isSaved) {
        return ['Explain this workflow', 'Score this workflow', 'Add a step', 'Optimize this workflow'];
    }
    if (hasNodes) {
        return ['Explain this workflow', 'Score this workflow', 'How can I improve this?', 'List all steps'];
    }
    return ['Build a workflow for me', 'What can you help me with?', 'Show me an example', 'Build an approval process'];
}

/**
 * StarterPrompts — the 2×2 grid of suggested prompt pills shown beneath the
 * welcome bubble while the chat is empty. Clicking one sends it as a message;
 * the grid then disappears as soon as the conversation has any real turns.
 */
function StarterPrompts({ prompts, onSelect, disabled }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            className="grid grid-cols-2 gap-2 pl-8 pr-1"
        >
            {prompts.map((prompt, i) => (
                <motion.button
                    key={prompt}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(prompt)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut', delay: 0.18 + i * 0.05 }}
                    whileTap={disabled ? undefined : { scale: 0.98 }}
                    className="rounded-full border border-gray-200/70 bg-gray-50/70 px-3 py-2 text-center text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700/60 dark:bg-gray-800/40 dark:text-gray-300 dark:hover:border-indigo-400/60 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                >
                    {prompt}
                </motion.button>
            ))}
        </motion.div>
    );
}

// ── Numbered-option rendering ───────────────────────────────────────────────
// When Claude offers a set of choices as a numbered list — whether across lines
// ("1. one\n2. two") or inline in a paragraph ("1) one 2) two 3) three") — we
// surface each item as a clickable pill button instead of plain text. A marker
// is "<number>." or "<number>)" followed by a space, anchored to the start of
// the string or to whitespace (a newline or space) so each item begins its own
// line/segment; this also stops mid-sentence decimals like "5.99" from matching.
// Each capture grabs the marker plus the text up to the next marker (or the end
// of the string). The `s` flag lets an item span newlines, `g` collects them all.
const NUMBERED_ITEM_RE = /(?:^|\s)(\d+[.)]\s+.+?)(?=\s\d+[.)]\s|\s*$)/gs;

// Strip the leading "1." / "2)" marker so a button shows — and sends — just the
// option text, without the number prefix.
const stripMarker = (item) => item.replace(/^\d+[.)]\s*/, '').trim();

/**
 * renderMessageContent — turns an assistant reply into renderable content. If
 * the text contains a numbered list (two or more items), it renders the leading
 * intro paragraph as normal text and each numbered item as a clickable pill
 * button; clicking one calls `onSelect(itemText)` which sends it as a new user
 * message. Plain replies (no list) render as ordinary text unchanged.
 */
function renderMessageContent(text, onSelect, disabled, forceMarkdown = false) {
    // Some replies (e.g. the /score health report) are pre-formatted markdown that
    // happen to contain numbered items we DON'T want turned into clickable buttons;
    // render them straight through ContentRenderer as markdown.
    if (forceMarkdown) {
        return <ContentRenderer value={text} format="markdown" className="break-words" />;
    }

    const matches = typeof text === 'string' ? [...text.matchAll(NUMBERED_ITEM_RE)] : [];

    // Fewer than two numbered items → this isn't an options list; render the
    // assistant text as markdown so bold, lists, code blocks, headings etc. show.
    if (matches.length < 2) {
        return <ContentRenderer value={text} format="markdown" className="break-words" />;
    }

    const intro = text.slice(0, matches[0].index).trim();
    const items = matches.map((m) => stripMarker(m[1].trim())).filter(Boolean);

    return (
        <div className="flex flex-col gap-2">
            {intro && <ContentRenderer value={intro} format="markdown" className="break-words" />}
            <motion.div
                className="flex w-full flex-col gap-1.5"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
            >
                {items.map((item, i) => (
                    <motion.button
                        key={`${item}-${i}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect(item)}
                        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                        whileTap={disabled ? undefined : { scale: 0.99 }}
                        className="group flex w-full items-center gap-2.5 rounded-lg border border-gray-200/70 border-l-2 border-l-indigo-400 bg-gray-50/70 px-3 py-2 text-left text-[13px] font-medium leading-snug text-gray-700 transition-colors hover:border-l-indigo-500 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700/60 dark:border-l-indigo-400/70 dark:bg-gray-800/40 dark:text-gray-200 dark:hover:border-l-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 break-words">{item}</span>
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
}

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

function MessageBubble({ message, onOptionSelect, optionsDisabled }) {
    const isUser = message.role === 'user';
    // Auto-introductions slide in from the side (rather than the usual gentle
    // rise) and carry a small "Auto-introduction" label so it's clear they were
    // generated automatically when the workflow loaded.
    const isIntro = message.intro === true;
    return (
        <motion.div
            initial={isIntro ? { opacity: 0, x: -28 } : { opacity: 0, y: 8 }}
            animate={isIntro ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
            transition={
                isIntro
                    ? { type: 'spring', stiffness: 260, damping: 26 }
                    : { type: 'spring', stiffness: 360, damping: 30 }
            }
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
                <div className="flex min-w-0 flex-col">
                    {isIntro && (
                        <p className="mb-1 flex items-center gap-1 pl-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            <Sparkles size={9} aria-hidden="true" />
                            Auto-introduction
                        </p>
                    )}
                    <div
                        className={
                            isUser
                                ? 'rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-sm text-white shadow-sm'
                                : isIntro
                                  ? // Auto-intros get a subtle indigo tint + accent border so they
                                    // read as an automatic introduction, not a reply to the user.
                                    'rounded-2xl rounded-tl-sm border border-indigo-200/80 bg-indigo-50/70 px-3 py-2 text-sm text-gray-700 shadow-sm backdrop-blur dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-gray-100'
                                  : 'rounded-2xl rounded-tl-sm border border-gray-200/70 bg-white/70 px-3 py-2 text-sm text-gray-700 shadow-sm backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/60 dark:text-gray-200'
                        }
                    >
                        {/* User turns are always plain text; Claude's replies route through
                            renderMessageContent so numbered lists become clickable buttons. */}
                        {isUser ? (
                            <span className="whitespace-pre-wrap break-words">{message.text}</span>
                        ) : (
                            renderMessageContent(message.text, onOptionSelect, optionsDisabled, message.forceMarkdown)
                        )}
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

        // `/score` returns a pre-formatted markdown health report and `/steps`
        // returns a plain-English numbered list of steps; flag either so its reply
        // renders straight through ContentRenderer (no button conversion).
        const scoring = isScoreCommand(text) || isStepsCommand(text);

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
                        forceMarkdown: scoring,
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

    // ── Auto-introduction ───────────────────────────────────────────────────
    // `introStateRef` guards the whole flow so it runs at most once per mount:
    // 'idle' → 'scheduled' (timer armed) → 'done'. The timer is stored so it's
    // only cleared on unmount — never on a dependency change — so a graph edit in
    // the first second can't cancel a pending intro.
    const introStateRef = useRef('idle');
    const introTimerRef = useRef(null);

    // Fetch the intro and insert it at the top of the chat. Best-effort and
    // intentionally quiet: it doesn't touch the shared `loading`/typing state, so
    // it never blocks the user from typing while in flight; on any failure (no
    // key, network blip) it simply does nothing.
    const runAutoIntro = async (identity) => {
        try {
            const res = await fetch('/api/workflow/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    message: AUTO_INTRO_PROMPT,
                    workflow_name: nameRef.current ?? 'Workflow',
                    workflow: {
                        nodes: workflowRef.current?.nodes ?? [],
                        edges: workflowRef.current?.edges ?? [],
                    },
                    conversation_history: [],
                    response_length: getSettings().chatResponseLength,
                }),
            });
            if (!res.ok) return;
            const data = await res.json();
            const text = typeof data?.reply === 'string' ? data.reply.trim() : '';
            if (!text) return;
            // Mark seen only once we actually have an intro to show, so a failed
            // attempt can still introduce the workflow on a later visit.
            markIntroSeen(identity);
            setMessages((prev) => withIntroMessage(prev, text));
        } catch {
            // Auto-intro is best-effort — stay silent if Claude can't be reached.
        } finally {
            introStateRef.current = 'done';
        }
    };

    // One second after a template/saved workflow loads, kick off the intro. We
    // wait for the graph to be present (a saved workflow's nodes arrive async) so
    // the intro describes the real steps, not an empty canvas. Re-runs on prop
    // changes but only ever arms the timer once (see `introStateRef`).
    useEffect(() => {
        if (introStateRef.current !== 'idle') return;

        const identity = autoIntroIdentity();
        if (!identity || hasSeenIntro(identity)) {
            introStateRef.current = 'done';
            return;
        }
        // Nothing to introduce yet — wait for a later render once nodes are in.
        if ((workflow?.nodes?.length ?? 0) === 0) return;

        introStateRef.current = 'scheduled';
        introTimerRef.current = setTimeout(() => runAutoIntro(identity), 1000);
        // Deliberately NOT cleared here — only on unmount (below).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey, workflow]);

    useEffect(() => () => clearTimeout(introTimerRef.current), []);

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
                    <MessageBubble key={m.id} message={m} onOptionSelect={send} optionsDisabled={loading} />
                ))}
                {/* Suggested starter prompts — shown until the USER sends their first
                    message. The auto-introduction (an `intro` message) and the canned
                    welcome bubble don't count, so the prompts stay visible beneath an
                    auto-intro and only vanish once a real user/assistant turn exists. */}
                {!messages.some((m) => m.id !== 'welcome' && !m.intro) && !loading && (
                    <StarterPrompts prompts={starterPromptsFor(storageKey, workflow)} onSelect={send} disabled={loading} />
                )}
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
