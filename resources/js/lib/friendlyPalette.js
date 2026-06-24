// ──────────────────────────────────────────────────────────────────────────
// Friendly palette labels
//
// fancy-flow's built-in node palette shows engineer-facing names ("Branch",
// "Switch", "For Each", "LLM Call", …) and section headers ("Triggers",
// "Logic", "AI", …) that non-technical users don't recognize. This module makes
// the palette speak plain language WITHOUT changing any underlying node types:
//
//   • Node labels  — we re-register each built-in `kind` with a friendlier
//     `label`, preserving its stable `name` (the id used for drag payloads,
//     executors, and saved graphs) and every other field. fancy-flow calls
//     `registerBuiltinKinds()` exactly once at import, and re-registering by the
//     same `name` simply replaces the definition, so this is safe and sticky
//     across editor remounts. Dropped nodes get `data.label = kind.label`, so
//     this also gives canvas nodes the friendly title for free.
//
//   • Section headers — the palette derives section titles from a hard-coded
//     category→label map with no override hook, so those are renamed in the DOM
//     by <PaletteRelabel> (see Components/PaletteRelabel.jsx), which maps the
//     original header text to the friendly text.
//
// Nothing here touches a node's `name`/`category`/`executor`/ports, so flows
// keep running exactly as before.
// ──────────────────────────────────────────────────────────────────────────
import { registerBuiltinKinds, registerNodeKind, getNodeKind } from '@particle-academy/fancy-flow';

// Built-in kind `name` (stable id) → friendly display label.
export const FRIENDLY_NODE_LABELS = {
    // Triggers → "Start"
    manual_trigger: 'Start Manually',
    webhook_trigger: 'Start from Web Request',
    schedule_trigger: 'Start on Schedule',
    // Logic → "Decision & Flow"
    branch: 'Decision (Yes/No)',
    switch_case: 'Multiple Choice',
    for_each: 'Repeat for Each',
    merge: 'Combine Paths',
    wait: 'Wait / Pause',
    transform: 'Change Data',
    // Data → "Data"
    memory_store: 'Remember Something',
    data_store: 'Save & Retrieve Data',
    variable: 'Store a Value',
    // AI → "Smart Actions"
    llm_call: 'Ask AI',
    tool_use: 'Use a Tool',
    embed_search: 'Search & Match',
    // Connectors → "Connect & Notify"
    api_request: 'Call an API',
    webhook_out: 'Send a Notification',
    // Human → "Human in the Loop"
    user_input: 'Ask a Person',
    human_approval: 'Get Approval',
};

// Original palette section header text → friendly text. (Keys are fancy-flow's
// hard-coded CATEGORY_LABELS values; "Data" is intentionally left unchanged, and
// "Output" / any others are left as-is.)
export const FRIENDLY_SECTION_LABELS = {
    Triggers: 'Start',
    Logic: 'Decision & Flow',
    AI: 'Smart Actions',
    Connectors: 'Connect & Notify',
    Human: 'Human in the Loop',
    // The `note` kind's category has no built-in label, so the palette renders
    // the raw category name ("note"); give it a friendly section title.
    note: 'Notes',
};

let applied = false;

// Re-register the built-in kinds with friendly labels. Idempotent and safe to
// call more than once; runs the built-in registration first so the kinds exist
// to be looked up, then overrides only the label on each.
export function applyFriendlyNodeLabels() {
    if (applied) return;
    registerBuiltinKinds(); // ensure the built-ins are present before we override
    for (const [name, label] of Object.entries(FRIENDLY_NODE_LABELS)) {
        const kind = getNodeKind(name);
        if (kind && kind.label !== label) {
            registerNodeKind({ ...kind, label });
        }
    }
    applied = true;
}
