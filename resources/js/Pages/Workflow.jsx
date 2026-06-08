import { Head, Link } from '@inertiajs/react';
import { FlowEditor } from '@particle-academy/fancy-flow';
import { useFlowRunnerUx } from '@particle-academy/fancy-flow/ux';
import { Heading, Pillbox, Text, Toast, useToast } from '@particle-academy/react-fancy';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow as WorkflowIcon, ArrowLeft, Save, Download, Upload } from 'lucide-react';
import confetti from 'canvas-confetti';
import GradientDivider from '../Components/GradientDivider';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import ThemeToggle from '../Components/ThemeToggle';
import Tooltip from '../Components/Tooltip';
import '../../css/flow-animations.css';

const templates = {
    onboarding: {
        name: 'Employee Onboarding',
        description: 'Automates the full onboarding flow for new hires',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'New Hire Submitted' } },
            { id: 'welcome-email', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Send Welcome Email' } },
            { id: 'create-accounts', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'Create Accounts (GitHub, Slack, Email)' } },
            { id: 'department-check', type: 'decision', position: { x: 780, y: 160 }, data: { kind: 'decision', label: 'Which Department?' } },
            { id: 'setup-dev', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Setup Dev Environment' } },
            { id: 'setup-design', type: 'action', position: { x: 1040, y: 260 }, data: { kind: 'action', label: 'Setup Design Tools' } },
            { id: 'assign-training', type: 'action', position: { x: 1300, y: 160 }, data: { kind: 'action', label: 'Assign Training' } },
            { id: 'complete', type: 'output', position: { x: 1560, y: 160 }, data: { kind: 'output', label: 'Onboarding Complete!' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'welcome-email' },
            { id: 'e2', source: 'welcome-email', target: 'create-accounts' },
            { id: 'e3', source: 'create-accounts', target: 'department-check' },
            { id: 'e4', source: 'department-check', sourceHandle: 'true', target: 'setup-dev' },
            { id: 'e5', source: 'department-check', sourceHandle: 'false', target: 'setup-design' },
            { id: 'e6', source: 'setup-dev', target: 'assign-training' },
            { id: 'e7', source: 'setup-design', target: 'assign-training' },
            { id: 'e8', source: 'assign-training', target: 'complete' },
        ],
    },
    order: {
        name: 'Order Processing',
        description: 'Automates the full order fulfillment pipeline',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Order Placed' } },
            { id: 'payment', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Process Payment' } },
            { id: 'payment-check', type: 'decision', position: { x: 520, y: 160 }, data: { kind: 'decision', label: 'Payment Approved?' } },
            { id: 'inventory', type: 'action', position: { x: 780, y: 60 }, data: { kind: 'action', label: 'Check Inventory' } },
            { id: 'declined', type: 'output', position: { x: 780, y: 260 }, data: { kind: 'output', label: 'Order Declined' } },
            { id: 'ship', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Ship Order' } },
            { id: 'complete', type: 'output', position: { x: 1300, y: 60 }, data: { kind: 'output', label: 'Order Complete!' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'payment' },
            { id: 'e2', source: 'payment', target: 'payment-check' },
            { id: 'e3', source: 'payment-check', sourceHandle: 'true', target: 'inventory' },
            { id: 'e4', source: 'payment-check', sourceHandle: 'false', target: 'declined' },
            { id: 'e5', source: 'inventory', target: 'ship' },
            { id: 'e6', source: 'ship', target: 'complete' },
        ],
    },
    bugreport: {
        name: 'Bug Report',
        description: 'Triage and resolve incoming bug reports',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Bug Reported' } },
            { id: 'triage', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Triage Bug' } },
            { id: 'severity', type: 'decision', position: { x: 520, y: 160 }, data: { kind: 'decision', label: 'Critical?' } },
            { id: 'hotfix', type: 'action', position: { x: 780, y: 60 }, data: { kind: 'action', label: 'Assign Hotfix' } },
            { id: 'backlog', type: 'action', position: { x: 780, y: 260 }, data: { kind: 'action', label: 'Add to Backlog' } },
            { id: 'fix', type: 'action', position: { x: 1040, y: 160 }, data: { kind: 'action', label: 'Fix & Test' } },
            { id: 'close', type: 'output', position: { x: 1300, y: 160 }, data: { kind: 'output', label: 'Bug Closed' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'triage' },
            { id: 'e2', source: 'triage', target: 'severity' },
            { id: 'e3', source: 'severity', sourceHandle: 'true', target: 'hotfix' },
            { id: 'e4', source: 'severity', sourceHandle: 'false', target: 'backlog' },
            { id: 'e5', source: 'hotfix', target: 'fix' },
            { id: 'e6', source: 'backlog', target: 'fix' },
            { id: 'e7', source: 'fix', target: 'close' },
        ],
    },
};

const blankGraph = { nodes: [], edges: [] };

// ──────────────────────────────────────────────────────────────────────────
// Executors
//
// fancy-flow resolves an executor by node id first, then by node kind, then by
// "*" (see runFlow's pickExecutor). That lets each template register smart,
// per-node executors keyed by node id while still falling back to the generic
// kind-based handlers for any node the user adds by hand.
//
// Each executor accumulates a shared context object (`{ ...inputs.in, ... }`)
// so data produced upstream stays available to decision nodes and the final
// summary. `emit({ type: 'log', ... })` lines drive the run feed at the bottom,
// telling a clear, human-readable story when Run is clicked.
// ──────────────────────────────────────────────────────────────────────────

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Short pseudo-id helper for realistic-looking references (auth codes, tracking
// numbers, ticket ids, etc.).
const rid = (prefix = '', len = 6) =>
    `${prefix}${Math.random().toString(36).slice(2, 2 + len).toUpperCase()}`;

const say = (emit, node, level, message) =>
    emit({ type: 'log', nodeId: node.id, level, message });

// Generic fallbacks — used for blank workflows and any hand-added node whose id
// isn't recognized by a template-specific executor.
const genericExecutors = {
    trigger: ({ node, emit }) => {
        say(emit, node, 'info', `Triggered "${node.data.label}"`);
        return { startedAt: Date.now() };
    },
    action: async ({ node, inputs, emit }) => {
        await wait(500);
        say(emit, node, 'info', `Ran "${node.data.label}"`);
        return inputs.in ?? {};
    },
    decision: ({ node, inputs, emit }) => {
        say(emit, node, 'info', `Evaluated "${node.data.label}" → true`);
        return { branch: 'true', value: inputs.in };
    },
    output: ({ node, inputs, emit }) => {
        say(emit, node, 'info', `Finished "${node.data.label}"`);
        return inputs.in;
    },
};

// ── Employee Onboarding ───────────────────────────────────────────────────
const onboardingExecutors = {
    trigger: async ({ node, emit }) => {
        const employee = {
            name: 'Ada Lovelace',
            email: 'ada.lovelace@acme.com',
            department: 'Engineering',
            role: 'Senior Software Engineer',
            startDate: '2026-06-15',
            manager: 'Grace Hopper',
        };
        say(
            emit,
            node,
            'info',
            `New hire submitted: ${employee.name} — ${employee.role} (${employee.department}), starts ${employee.startDate}`,
        );
        return { employee };
    },
    'welcome-email': async ({ node, inputs, emit }) => {
        await wait(500);
        const { employee } = inputs.in;
        const welcomeEmail = {
            to: employee.email,
            template: 'welcome-v3',
            messageId: rid('msg_', 8),
            sentAt: new Date().toISOString(),
        };
        say(emit, node, 'info', `Welcome email sent to ${employee.email} (template ${welcomeEmail.template})`);
        return { ...inputs.in, welcomeEmail };
    },
    'create-accounts': async ({ node, inputs, emit }) => {
        await wait(650);
        const { employee } = inputs.in;
        const first = employee.name.split(' ')[0].toLowerCase();
        const accounts = {
            github: `@${employee.name.toLowerCase().replace(/\s+/g, '-')}`,
            slack: `@${first}`,
            email: employee.email,
        };
        say(
            emit,
            node,
            'info',
            `Provisioned accounts → GitHub ${accounts.github}, Slack ${accounts.slack}, Email ${accounts.email}`,
        );
        return { ...inputs.in, accounts };
    },
    'department-check': ({ node, inputs, emit }) => {
        const dept = inputs.in.employee.department;
        const isEng = dept === 'Engineering';
        say(
            emit,
            node,
            'info',
            `Routing by department: ${dept} → ${isEng ? 'Engineering track (dev environment)' : 'Design track (design tools)'}`,
        );
        return { branch: isEng ? 'true' : 'false', value: { ...inputs.in, track: isEng ? 'engineering' : 'design' } };
    },
    'setup-dev': async ({ node, inputs, emit }) => {
        await wait(650);
        const devEnv = {
            laptop: 'MacBook Pro 16" M4',
            repos: ['acme/web', 'acme/api'],
            tools: ['VS Code', 'Docker', 'GitHub CLI'],
            vpn: 'configured',
        };
        say(emit, node, 'info', `Dev environment ready — ${devEnv.laptop}, cloned ${devEnv.repos.length} repos, VPN configured`);
        return { ...inputs.in, devEnv };
    },
    'setup-design': async ({ node, inputs, emit }) => {
        await wait(650);
        const designTools = {
            figma: 'seat assigned',
            adobeCC: 'license activated',
            tools: ['Figma', 'Adobe CC', 'Zeplin'],
        };
        say(emit, node, 'info', `Design tools ready — Figma seat + Adobe CC license activated`);
        return { ...inputs.in, designTools };
    },
    'assign-training': async ({ node, inputs, emit }) => {
        await wait(500);
        const courses =
            inputs.in.track === 'engineering'
                ? ['Security 101', 'Codebase Tour', 'On-call Basics']
                : ['Security 101', 'Brand Guidelines', 'Design System 101'];
        const training = { courses, dueBy: '2026-06-29', lms: 'workday-learning' };
        say(emit, node, 'info', `Assigned ${courses.length} training courses (due ${training.dueBy}): ${courses.join(', ')}`);
        return { ...inputs.in, training };
    },
    complete: ({ node, inputs, emit }) => {
        const { employee, accounts, training } = inputs.in;
        say(
            emit,
            node,
            'info',
            `✅ Onboarding complete for ${employee.name} — accounts live, ${training.courses.length} courses assigned. Welcome aboard!`,
        );
        return {
            status: 'complete',
            summary: { employee: employee.name, department: employee.department, accounts, trainingAssigned: training.courses.length },
        };
    },
};

// ── Order Processing ──────────────────────────────────────────────────────
const orderExecutors = {
    trigger: async ({ node, emit }) => {
        const items = [
            { sku: 'WID-101', name: 'Wireless Keyboard', qty: 1, price: 79.99 },
            { sku: 'WID-204', name: 'USB-C Hub', qty: 1, price: 49.99 },
        ];
        const order = {
            id: rid('ORD-', 5),
            customer: 'Jordan Reyes',
            email: 'jordan.reyes@gmail.com',
            items,
            total: +items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2),
        };
        say(emit, node, 'info', `Order ${order.id} placed by ${order.customer} — ${order.items.length} items, $${order.total}`);
        return { order };
    },
    payment: async ({ node, inputs, emit }) => {
        await wait(700);
        const { order } = inputs.in;
        const payment = {
            method: 'Visa ****4242',
            amount: order.total,
            authCode: rid('AUTH', 6),
            processor: 'Stripe',
            status: 'approved',
        };
        say(emit, node, 'info', `Charged $${payment.amount} to ${payment.method} via ${payment.processor} — auth ${payment.authCode}`);
        return { ...inputs.in, payment };
    },
    'payment-check': ({ node, inputs, emit }) => {
        const approved = inputs.in.payment.status === 'approved';
        say(
            emit,
            node,
            approved ? 'info' : 'warn',
            approved ? `Payment approved — proceeding to fulfillment` : `Payment ${inputs.in.payment.status} — order will be declined`,
        );
        return { branch: approved ? 'true' : 'false', value: inputs.in };
    },
    inventory: async ({ node, inputs, emit }) => {
        await wait(600);
        const { order } = inputs.in;
        const inventory = {
            warehouse: 'WH-WEST',
            allInStock: true,
            lines: order.items.map((i) => ({ sku: i.sku, qty: i.qty, onHand: 240 })),
        };
        say(emit, node, 'info', `Inventory check — all ${order.items.length} items in stock at ${inventory.warehouse}, reserved`);
        return { ...inputs.in, inventory };
    },
    declined: ({ node, inputs, emit }) => {
        say(emit, node, 'error', `✗ Order ${inputs.in.order.id} declined — payment not approved. Customer notified.`);
        return { status: 'declined', orderId: inputs.in.order.id };
    },
    ship: async ({ node, inputs, emit }) => {
        await wait(600);
        const shipment = { carrier: 'UPS Ground', tracking: rid('1Z', 10), eta: '2026-06-11' };
        say(emit, node, 'info', `Shipped via ${shipment.carrier} — tracking ${shipment.tracking}, ETA ${shipment.eta}`);
        return { ...inputs.in, shipment };
    },
    complete: ({ node, inputs, emit }) => {
        const { order, shipment } = inputs.in;
        say(
            emit,
            node,
            'info',
            `✅ Order ${order.id} complete — $${order.total} shipped to ${order.customer}, tracking ${shipment.tracking}`,
        );
        return { status: 'complete', summary: { orderId: order.id, total: order.total, tracking: shipment.tracking } };
    },
};

// ── Bug Report ────────────────────────────────────────────────────────────
const bugReportExecutors = {
    trigger: async ({ node, emit }) => {
        const bug = {
            id: rid('BUG-', 4),
            title: 'Checkout button unresponsive on mobile Safari',
            reporter: 'support@acme.com',
            component: 'web/checkout',
            environment: 'iOS 18 / Safari',
        };
        say(emit, node, 'info', `Bug reported ${bug.id}: "${bug.title}" in ${bug.component}`);
        return { bug };
    },
    triage: async ({ node, inputs, emit }) => {
        await wait(600);
        const triage = { severity: 'critical', priority: 'P1', affectedUsers: 1280, assignee: 'on-call', sla: '4h' };
        say(
            emit,
            node,
            'warn',
            `Triaged ${inputs.in.bug.id} → ${triage.priority} ${triage.severity}, ~${triage.affectedUsers.toLocaleString()} users affected (SLA ${triage.sla})`,
        );
        return { ...inputs.in, triage };
    },
    severity: ({ node, inputs, emit }) => {
        const isCritical = inputs.in.triage.severity === 'critical';
        say(
            emit,
            node,
            isCritical ? 'warn' : 'info',
            isCritical ? `Severity critical → fast-tracking a hotfix` : `Non-critical → scheduling into the backlog`,
        );
        return { branch: isCritical ? 'true' : 'false', value: inputs.in };
    },
    hotfix: async ({ node, inputs, emit }) => {
        await wait(500);
        const plan = {
            engineer: 'Linus T.',
            branch: `hotfix/${inputs.in.bug.id.toLowerCase()}`,
            targetRelease: 'v4.2.1',
        };
        say(emit, node, 'info', `Hotfix assigned to ${plan.engineer} on ${plan.branch} → ${plan.targetRelease}`);
        return { ...inputs.in, plan, route: 'hotfix' };
    },
    backlog: async ({ node, inputs, emit }) => {
        await wait(500);
        const plan = { ticket: rid('JIRA-', 4), sprint: 'Sprint 42', estimate: '3 pts' };
        say(emit, node, 'info', `Added ${inputs.in.bug.id} to backlog as ${plan.ticket} (${plan.sprint}, ${plan.estimate})`);
        return { ...inputs.in, plan, route: 'backlog' };
    },
    fix: async ({ node, inputs, emit }) => {
        await wait(700);
        const fix = {
            commit: Math.random().toString(16).slice(2, 9),
            testsPassed: '142/142',
            pr: `acme/web#${4800 + Math.floor(Math.random() * 200)}`,
        };
        say(emit, node, 'info', `Fix verified for ${inputs.in.bug.id} — commit ${fix.commit}, tests ${fix.testsPassed}, ${fix.pr} merged`);
        return { ...inputs.in, fix };
    },
    close: ({ node, inputs, emit }) => {
        const { bug, route, fix } = inputs.in;
        say(
            emit,
            node,
            'info',
            `✅ ${bug.id} closed via ${route === 'hotfix' ? 'hotfix' : 'backlog fix'} — ${fix.pr} shipped, tests ${fix.testsPassed}`,
        );
        return { status: 'closed', summary: { bug: bug.id, route, pr: fix.pr } };
    },
};

// Each template's per-node executors layered over the generic kind-based
// fallbacks, selected by the `type` URL parameter at render time.
const executorsByType = {
    onboarding: { ...genericExecutors, ...onboardingExecutors },
    order: { ...genericExecutors, ...orderExecutors },
    bugreport: { ...genericExecutors, ...bugReportExecutors },
};

// ──────────────────────────────────────────────────────────────────────────
// Toast notifications
//
// Per-node toast metadata, keyed by node id and selected by the `type` URL
// param. Each entry maps a node's result to a toast that fires as the node
// finishes, so a run surfaces friendly notifications ("Welcome Email Sent",
// "Accounts Created", "Hotfix Assigned", …). Decision/trigger nodes are left
// out so toasts only mark meaningful side effects.
// ──────────────────────────────────────────────────────────────────────────
const toastMetaByType = {
    onboarding: {
        'welcome-email': (r) => ({ title: 'Welcome Email Sent', description: `Sent to ${r.welcomeEmail.to}`, variant: 'success' }),
        'create-accounts': (r) => ({ title: 'Accounts Created', description: `GitHub ${r.accounts.github} · Slack ${r.accounts.slack}`, variant: 'success' }),
        'setup-dev': (r) => ({ title: 'Dev Environment Ready', description: r.devEnv.laptop, variant: 'success' }),
        'setup-design': () => ({ title: 'Design Tools Ready', description: 'Figma seat + Adobe CC activated', variant: 'success' }),
        'assign-training': (r) => ({ title: 'Training Assigned', description: `${r.training.courses.length} courses due ${r.training.dueBy}`, variant: 'info' }),
        complete: (r) => ({ title: 'Onboarding Complete', description: `${r.summary.employee} is all set 🎉`, variant: 'success' }),
    },
    order: {
        payment: (r) => ({ title: 'Payment Processed', description: `Charged $${r.payment.amount} to ${r.payment.method}`, variant: 'success' }),
        inventory: (r) => ({ title: 'Inventory Reserved', description: `All items reserved at ${r.inventory.warehouse}`, variant: 'info' }),
        ship: (r) => ({ title: 'Order Shipped', description: `${r.shipment.carrier} · ${r.shipment.tracking}`, variant: 'success' }),
        declined: (r) => ({ title: 'Order Declined', description: `Order ${r.orderId} — payment not approved`, variant: 'error' }),
        complete: (r) => ({ title: 'Order Complete', description: `Order ${r.summary.orderId} on its way`, variant: 'success' }),
    },
    bugreport: {
        triage: (r) => ({ title: 'Bug Triaged', description: `${r.triage.priority} · ${r.triage.severity}`, variant: 'info' }),
        hotfix: (r) => ({ title: 'Hotfix Assigned', description: `${r.plan.engineer} → ${r.plan.branch}`, variant: 'warning' }),
        backlog: (r) => ({ title: 'Added to Backlog', description: `${r.plan.ticket} · ${r.plan.sprint}`, variant: 'info' }),
        fix: (r) => ({ title: 'Fix Verified', description: `${r.fix.testsPassed} tests · ${r.fix.pr}`, variant: 'success' }),
        close: (r) => ({ title: 'Bug Closed', description: `${r.summary.bug} resolved`, variant: 'success' }),
    },
};

// Celebratory confetti burst — fired when a run reaches a "Complete"/"Closed"
// node (see the executor wrapper below).
const fireConfetti = () => {
    confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 }, zIndex: 9999 });
    confetti({ particleCount: 60, spread: 110, startVelocity: 45, origin: { y: 0.7 }, zIndex: 9999 });
};

// Wrap an executor registry so each node fires its toast (via the `fire`
// dispatcher) as it finishes — without touching the underlying executor logic.
// `hooks.onNodeStart` / `hooks.onNodeDone` let the host observe the run (used
// here to drive the edge-flow animation and confetti).
const withToasts = (registry, meta, fire, hooks = {}) => {
    const wrapped = {};
    for (const [id, exec] of Object.entries(registry)) {
        wrapped[id] = async (ctx) => {
            hooks.onNodeStart?.(ctx.node);
            const result = await exec(ctx);
            const build = meta[id];
            if (build) fire(build(result));
            hooks.onNodeDone?.(ctx.node, result);
            return result;
        };
    }
    return wrapped;
};

// Per-template accent theme. Full Tailwind class strings (not interpolated) so
// the scanner picks them up. `button` is a react-fancy color name. Blank/new
// workflows fall back to a neutral gray.
const accentThemes = {
    onboarding: {
        label: 'Onboarding',
        bar: 'bg-blue-500',
        badge: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30',
        button: 'blue',
        text: 'text-blue-600 dark:text-blue-400',
    },
    order: {
        label: 'Order',
        bar: 'bg-green-500',
        badge: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/30',
        button: 'green',
        text: 'text-green-600 dark:text-green-400',
    },
    bugreport: {
        label: 'Bug Report',
        bar: 'bg-red-500',
        badge: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
        button: 'red',
        text: 'text-red-600 dark:text-red-400',
    },
};

const neutralAccent = {
    label: 'New Workflow',
    bar: 'bg-gray-300 dark:bg-gray-700',
    badge: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:ring-gray-600/40',
    button: 'gray',
    text: 'text-gray-700 dark:text-gray-200',
};

// Quick-pick tags surfaced next to the tags input.
const SUGGESTED_TAGS = ['HR', 'Engineering', 'Finance', 'Operations', 'Design'];

function WorkflowEditor() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const savedId = params.get('id');

    const template = type && templates[type] ? templates[type] : null;
    const accent = (type && accentThemes[type]) || neutralAccent;

    const { toast } = useToast();

    // Host UX effects the flow can invoke. `toast` renders a notification via
    // react-fancy's Toast provider; FlowRunnerUx turns it into both a runnable
    // executor (kind `ux_toast`) and an imperative `dispatch('toast', …)`.
    const ux = useFlowRunnerUx({
        effects: {
            toast: ({ title = 'Notification', description, variant = 'default', duration } = {}) =>
                toast({ title, description, variant, duration }),
        },
        meta: {
            toast: { label: 'Toast', description: 'Show a toast notification.', icon: '🔔', category: 'output' },
        },
    });

    // Register the `ux_toast` palette node once so it can be dragged onto the
    // canvas. `registerKinds` is idempotent.
    useEffect(() => {
        ux.registerKinds();
    }, [ux]);

    // `running` drives the edge-flow animation (the canvas wrapper gets the
    // `flow-running` class while nodes are firing). FlowEditor owns its run loop
    // and exposes no run-state, so we infer it from the executor wrapper: each
    // node start refreshes a watchdog that switches the flow off shortly after
    // the last node (or immediately once a terminal output node finishes).
    const [running, setRunning] = useState(false);
    const stopTimer = useRef(null);

    const markRunning = useCallback(() => {
        setRunning(true);
        if (stopTimer.current) clearTimeout(stopTimer.current);
        stopTimer.current = setTimeout(() => setRunning(false), 3500);
    }, []);

    const handleNodeStart = useCallback(() => markRunning(), [markRunning]);

    const handleNodeDone = useCallback((node) => {
        const label = node?.data?.label ?? '';
        if (/complete|closed/i.test(label)) {
            fireConfetti();
        }
        // Terminal output reached — stop the edge flow promptly.
        if (node?.data?.kind === 'output') {
            if (stopTimer.current) clearTimeout(stopTimer.current);
            setRunning(false);
        }
    }, []);

    useEffect(() => () => stopTimer.current && clearTimeout(stopTimer.current), []);

    // Template executors, each wrapped to fire its toast as it finishes, merged
    // with the UX effect executors (`ux_toast`) so hand-placed effect nodes run
    // too. Memoized so the registry keeps a stable identity across renders.
    const executors = useMemo(() => {
        const base = (type && executorsByType[type]) || genericExecutors;
        const meta = (type && toastMetaByType[type]) || {};
        const fire = (notification) => ux.dispatch('toast', notification);
        return {
            ...withToasts(base, meta, fire, { onNodeStart: handleNodeStart, onNodeDone: handleNodeDone }),
            ...ux.executors,
        };
    }, [type, ux, handleNodeStart, handleNodeDone]);

    const [graph, setGraph] = useState(template ?? blankGraph);
    const [name, setName] = useState(template?.name ?? '');
    const [description, setDescription] = useState(template?.description ?? '');
    const [tags, setTags] = useState(template?.tags ?? []);
    const [dbId, setDbId] = useState(null);
    const [status, setStatus] = useState(null);

    // Add a tag if not already present (used by the quick-pick buttons).
    const addTag = (tag) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));

    // FlowEditor is uncontrolled — it seeds its canvas from `initial` only at
    // mount. Bumping this key remounts it so a wholesale graph replacement
    // (load-from-db / import) actually shows on the canvas. We do NOT bump it on
    // ordinary `onChange` edits, so editing keeps the editor's internal state.
    const [editorKey, setEditorKey] = useState(0);

    useEffect(() => {
        if (savedId) {
            fetch(`/workflows/${savedId}`)
                .then((r) => r.json())
                .then((data) => {
                    setGraph({ nodes: data.nodes, edges: data.edges });
                    setName(data.name);
                    setDescription(data.description ?? '');
                    setTags(data.tags ?? []);
                    setDbId(data.id);
                    setStatus('Loaded from database');
                    setEditorKey((k) => k + 1);
                });
        }
    }, []);

    // Download the current workflow as a JSON file named after it.
    const exportJson = () => {
        const payload = { name, description, nodes: graph.nodes, edges: graph.edges, tags };
        const slug =
            (name.trim() || 'workflow')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'workflow';
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // Open a file picker, parse the chosen JSON, and load it onto the canvas.
    const importJson = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const data = JSON.parse(await file.text());
                if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
                    throw new Error('Missing nodes or edges');
                }
                setGraph({ nodes: data.nodes, edges: data.edges });
                setName(data.name ?? '');
                setDescription(data.description ?? '');
                setTags(Array.isArray(data.tags) ? data.tags : []);
                setEditorKey((k) => k + 1);
                toast({
                    title: 'Workflow imported',
                    description: data.name ? `Loaded “${data.name}”` : 'Loaded from file',
                    variant: 'success',
                });
            } catch {
                toast({
                    title: 'Import failed',
                    description: 'That file isn’t a valid workflow JSON.',
                    variant: 'error',
                });
            }
        };
        input.click();
    };

    const saveWorkflow = async () => {
        if (!name.trim()) {
            setStatus('Please enter a workflow name');
            return;
        }
        setStatus('Saving...');
        try {
            const payload = {
                name,
                description,
                nodes: graph.nodes,
                edges: graph.edges,
                tags,
            };

            const url = dbId ? `/workflows/${dbId}` : '/workflows';
            const method = dbId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            setDbId(data.id);
            setStatus('Saved successfully!');
        } catch {
            setStatus('Save failed');
        }
    };

    return (
        <>
            <Head title={name || 'New Workflow'} />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                {/* Accent banner showing which template is active. transition-colors
                    so the bar eases between accents when switching templates. */}
                <div className={`h-1.5 w-full transition-colors duration-200 ${accent.bar}`} />
                <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-gray-200/60 bg-white/70 px-6 py-4 backdrop-blur-md transition-colors duration-300 dark:border-gray-800/60 dark:bg-gray-900/70">
                    <div className="flex items-center gap-3">
                        <Logo className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <div className="flex flex-col gap-1">
                        <motion.span
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${accent.badge}`}
                        >
                            {accent.label}
                        </motion.span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Workflow name..."
                            className="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 w-full min-w-96"                        />
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                            className="text-sm bg-transparent border-none outline-none text-gray-500 placeholder-gray-400"
                        />

                        {/* Tags: type + Enter to add (removable via the pill X),
                            with quick picks for common tags. */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Pillbox
                                value={tags}
                                onChange={setTags}
                                placeholder="Add tags…"
                                className="min-w-56 py-1 text-sm"
                            />
                            <div className="flex flex-wrap items-center gap-1.5">
                                {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => addTag(t)}
                                        className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                                    >
                                        + {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Tooltip label="Toggle light / dark mode" placement="bottom">
                            <ThemeToggle />
                        </Tooltip>
                        {status && (
                            <Text className="text-sm text-gray-500">{status}</Text>
                        )}
                        {/* Floating glass toolbar: Save · Export · Import */}
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/60 p-1 shadow-lg shadow-gray-900/5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/50 dark:shadow-black/20"
                        >
                            <Tooltip label="Save Workflow" placement="bottom">
                                <button
                                    type="button"
                                    onClick={saveWorkflow}
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${accent.text}`}
                                >
                                    <Save size={16} aria-hidden="true" />
                                    <span className="hidden sm:inline">Save</span>
                                </button>
                            </Tooltip>

                            <span className="h-5 w-px bg-gray-300/70 dark:bg-gray-600/50" aria-hidden="true" />

                            <Tooltip label="Export JSON" placement="bottom">
                                <button
                                    type="button"
                                    onClick={exportJson}
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                >
                                    <Download size={16} aria-hidden="true" />
                                    <span className="hidden sm:inline">Export</span>
                                </button>
                            </Tooltip>

                            <span className="h-5 w-px bg-gray-300/70 dark:bg-gray-600/50" aria-hidden="true" />

                            <Tooltip label="Import JSON" placement="bottom">
                                <button
                                    type="button"
                                    onClick={importJson}
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                >
                                    <Upload size={16} aria-hidden="true" />
                                    <span className="hidden sm:inline">Import</span>
                                </button>
                            </Tooltip>
                        </motion.div>
                        <Tooltip label="Browse your saved workflows" placement="bottom">
                            <Link href="/workflows-list">
                                <NavButton>Saved Workflows</NavButton>
                            </Link>
                        </Tooltip>
                        <Tooltip label="Back to home" placement="bottom">
                            <Link href="/">
                                <NavButton>Back home</NavButton>
                            </Link>
                        </Tooltip>
                    </div>
                </header>

                {/* Soft separator between the header and the editor content */}
                <GradientDivider />

                <main className="flex-1 p-6">
                    <div className={`workflow-editor relative ${running ? 'flow-running' : ''}`}>
                        <FlowEditor
                            key={editorKey}
                            initial={graph}
                            executors={executors}
                            height={720}
                            onChange={(g) => setGraph(g)}
                            metadata={{
                                name,
                                description,
                            }}
                        />

                        {/* Friendly empty state — shown on a blank canvas, fades out
                            once the first node is added. `pointer-events-none` keeps
                            drag-and-drop onto the canvas fully working. */}
                        <AnimatePresence>
                            {!savedId && graph.nodes.length === 0 && (
                                <motion.div
                                    key="empty-state"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                    className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center"
                                >
                                    <div className="relative flex flex-col items-center">
                                        <WorkflowIcon
                                            size={96}
                                            strokeWidth={1.25}
                                            className="text-gray-300 dark:text-gray-700"
                                            aria-hidden="true"
                                        />
                                        <h2 className="mt-6 text-2xl font-semibold text-gray-700 dark:text-gray-200">
                                            Start building your workflow
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Drag a node from the left panel to get started
                                        </p>

                                        {/* Visual hint pointing toward the left node palette.
                                            Anchored to the centered content (which sits over the
                                            canvas) so it stays inside the workflow box. The outer
                                            div owns positioning; the inner motion div owns the bob
                                            so their transforms don't clash. */}
                                        <div className="absolute right-full top-1/2 mr-8 -translate-y-1/2">
                                            <motion.div
                                                className="flex items-center gap-2 whitespace-nowrap text-gray-400 dark:text-gray-500"
                                                animate={{ x: [0, -8, 0] }}
                                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                <ArrowLeft size={28} strokeWidth={2} aria-hidden="true" />
                                                <span className="text-sm font-medium">Node palette</span>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </>
    );
}

// Wrap the editor in the Toast provider so `useToast` (and therefore the flow's
// `toast` UX effect) can render notifications.
export default function Workflow() {
    return (
        <Toast.Provider position="bottom-right">
            <WorkflowEditor />
        </Toast.Provider>
    );
}