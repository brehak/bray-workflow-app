// ──────────────────────────────────────────────────────────────────────────
// Note (sticky-note) node
//
// fancy-flow ships a `note` node kind concept (it skips any node whose top-level
// `type` is "note" during a run — notes are pure annotations), but the
// FlowEditor resolves every node through the kind *registry* (RegistryNode →
// getNodeKind), so a note only renders properly once a `note` kind is
// registered. This module registers that kind and renders its body through
// WorkflowContentRenderer, so Markdown the author types shows up formatted right
// on the canvas (bold, lists, links, …) via the same safe, sanitising path the
// app already uses for node descriptions.
//
// Nothing here changes how other node kinds behave.
// ──────────────────────────────────────────────────────────────────────────
import { registerNodeKind, getNodeKind } from '@particle-academy/fancy-flow';
import WorkflowContentRenderer from '../Components/WorkflowContentRenderer';

/** The node `type` / kind name fancy-flow's runner recognises as an annotation. */
export const NOTE_KIND = 'note';

// Where a note's Markdown body lives on the node. Kept under `data.config` so it
// (a) rides along with the rest of the workflow when saved — the backend
// persists each node's `data` verbatim — and (b) is handed to our `renderBody`
// via RegistryNode's `config` argument.
export const NOTE_CONTENT_KEY = 'content';

let registered = false;

/**
 * Register the `note` node kind. Idempotent and safe to call on every editor
 * mount (registering by the same `name` just replaces the definition). fancy-flow
 * skips execution of any node whose `type` is "note", so notes never need an
 * executor and never affect a run.
 */
export function registerNoteKind() {
    if (registered && getNodeKind(NOTE_KIND)) return;
    registerNodeKind({
        name: NOTE_KIND,
        category: 'note',
        label: 'Note',
        description: 'A sticky note for documenting your workflow.',
        icon: '📝',
        // Amber accent so the title bar reads as a sticky note; paired with the
        // card styling in flow-animations.css (.ff-node--cat-note).
        accent: '#f59e0b',
        // Annotations have no flow — no input or output ports.
        inputs: [],
        outputs: [],
        configSchema: [{ type: 'textarea', key: NOTE_CONTENT_KEY, label: 'Note' }],
        // Render the note's Markdown right on the canvas.
        renderBody: ({ config }) => (
            <WorkflowContentRenderer
                content={config?.[NOTE_CONTENT_KEY]}
                fallback="Empty note — add text in the config panel."
                className="ff-note-md"
            />
        ),
    });
    registered = true;
}

/**
 * Build a fresh note node ready to drop into the graph at `position`. It comes
 * pre-selected so the config panel opens straight to it. Mirrors the id scheme
 * fancy-flow uses for palette drops.
 */
export function makeNoteNode(position) {
    const id = `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    return {
        id,
        type: NOTE_KIND,
        position,
        data: { kind: NOTE_KIND, label: 'Note', config: { [NOTE_CONTENT_KEY]: '' } },
        selected: true,
    };
}
