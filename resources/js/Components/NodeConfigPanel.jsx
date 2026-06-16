import { Input, Textarea } from '@particle-academy/react-fancy';

/**
 * NodeConfigPanel — the right-sidebar editor for the node currently selected on
 * the FlowEditor canvas. The label is always editable; each node type adds its
 * own relevant fields. Built with react-fancy inputs.
 *
 * It's a controlled view: it never holds its own copy of the node. Every edit
 * calls `onChange(nextNode)` with a new node object, and the parent writes that
 * straight back into the (controlled) graph — so the canvas updates live.
 *
 * Node data shape:
 *   node.data.label        → header label (all types)
 *   node.data.description   → short description (all types)
 *   node.data.config.*      → per-type fields (kept under `config` so they ride
 *                             along when the workflow is saved to the database)
 */

// Per-type extra fields, rendered after the shared Label + Description. `json`
// and `textarea` use a Textarea; `text` uses an Input.
const TYPE_FIELDS = {
    trigger: [],
    output: [],
    action: [
        {
            key: 'outputData',
            label: 'Output Data (JSON)',
            kind: 'json',
            description: 'Mock data this action emits to downstream steps.',
            placeholder: '{\n  "status": "ok"\n}',
        },
    ],
    decision: [
        {
            key: 'condition',
            label: 'Condition',
            kind: 'textarea',
            description: 'Describe when this decision evaluates to true.',
            placeholder: 'e.g. amount > 100',
        },
        { key: 'trueLabel', label: 'True branch label', kind: 'text', placeholder: 'e.g. Approved' },
        { key: 'falseLabel', label: 'False branch label', kind: 'text', placeholder: 'e.g. Rejected' },
    ],
};

// Friendly header per type, with the same accent vocabulary used elsewhere.
const TYPE_META = {
    trigger: { label: 'Trigger', emoji: '⚡' },
    action: { label: 'Action', emoji: '⚙️' },
    decision: { label: 'Decision', emoji: '🔀' },
    output: { label: 'Output', emoji: '🏁' },
};

// The outer card (width, border, glass background) is now owned by the parent
// RightPanel so the chat and config views share one shell; this just lays out
// the scrollable config body inside it.
function PanelShell({ children }) {
    return <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-5">{children}</div>;
}

export default function NodeConfigPanel({ node, onChange }) {
    if (!node) {
        return (
            <PanelShell>
                <p className="text-sm text-gray-400 dark:text-gray-500">Select a step to configure it.</p>
            </PanelShell>
        );
    }

    const type = node.data?.kind ?? node.type;
    const config = node.data?.config ?? {};
    const meta = TYPE_META[type] ?? { label: type ?? 'Node', emoji: '🔧' };
    const fields = TYPE_FIELDS[type] ?? [];

    const setData = (patch) => onChange({ ...node, data: { ...node.data, ...patch } });
    const setConfig = (key, value) =>
        onChange({ ...node, data: { ...node.data, config: { ...config, [key]: value } } });

    return (
        <PanelShell>
            <header className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                <span aria-hidden="true" className="text-lg">
                    {meta.emoji}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {meta.label}
                </span>
            </header>

            {/* Label — always editable, for every node type. */}
            <Input
                label="Label"
                value={node.data?.label ?? ''}
                placeholder={meta.label}
                onValueChange={(v) => setData({ label: v })}
            />

            {/* Description — shown for every type. */}
            <Textarea
                label="Description"
                rows={2}
                value={node.data?.description ?? ''}
                onValueChange={(v) => setData({ description: v })}
            />

            {/* Type-specific fields. */}
            {fields.map((f) => {
                const raw = config[f.key];
                const value = typeof raw === 'string' ? raw : raw == null ? '' : JSON.stringify(raw, null, 2);
                if (f.kind === 'text') {
                    return (
                        <Input
                            key={f.key}
                            label={f.label}
                            description={f.description}
                            placeholder={f.placeholder}
                            value={value}
                            onValueChange={(v) => setConfig(f.key, v)}
                        />
                    );
                }
                return (
                    <Textarea
                        key={f.key}
                        label={f.label}
                        description={f.description}
                        placeholder={f.placeholder}
                        rows={f.kind === 'json' ? 6 : 2}
                        value={value}
                        onValueChange={(v) => setConfig(f.key, v)}
                        className={f.kind === 'json' ? 'font-mono text-xs' : undefined}
                    />
                );
            })}
        </PanelShell>
    );
}
