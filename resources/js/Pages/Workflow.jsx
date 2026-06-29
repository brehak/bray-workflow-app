import { router } from '@inertiajs/react';
import { Seo } from '@particle-academy/fancy-inertia/seo';
import { FlowEditor } from '@particle-academy/fancy-flow';
import { runFlow } from '@particle-academy/fancy-flow/engine';
import { useFlowRunnerUx } from '@particle-academy/fancy-flow/ux';
import { Button, Heading, Pillbox, Text, Toast, useToast } from '@particle-academy/react-fancy';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Workflow as WorkflowIcon,
    ArrowLeft,
    Save,
    Download,
    Upload,
    Undo2,
    Redo2,
    Check,
    History,
    Home,
    FolderOpen,
    Folder,
    ChevronDown,
    ChevronUp,
    Plus,
    Tags as TagsIcon,
    BookOpen,
    Settings as SettingsIcon,
    Trash2,
    FileCode2,
    Code2,
    StickyNote,
    Eraser,
    Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import GradientDivider from '../Components/GradientDivider';
import ConnectHint from '../Components/ConnectHint';
import NodeSuggestionPill from '../Components/NodeSuggestionPill';
import DescriptionField from '../Components/DescriptionField';
import Logo from '../Components/Logo';
import NavButton from '../Components/NavButton';
import BeginnerGuide from '../Components/BeginnerGuide';
import RightPanel from '../Components/RightPanel';
import PaletteRelabel from '../Components/PaletteRelabel';
import RunFeedPanel from '../Components/RunFeedPanel';
import RunHistoryPanel from '../Components/RunHistoryPanel';
import SaveStatusIndicator from '../Components/SaveStatusIndicator';
import ShortcutsModal from '../Components/ShortcutsModal';
import CodePanel from '../Components/CodePanel';
import UnsavedChangesModal from '../Components/UnsavedChangesModal';
import ThemeToggle from '../Components/ThemeToggle';
import Tooltip from '../Components/Tooltip';
import { applyFriendlyNodeLabels } from '../lib/friendlyPalette';
import { registerNoteKind, makeNoteNode } from '../lib/noteNode';
import { getSettings, saveSettings, autoSaveIntervalMs, animationSpeedFactor, toastDurationMs, defaultZoomLevel, SETTINGS_EVENT } from '../lib/settings';
import { incrementRunsCompleted } from '../lib/runs';
import { getCustomFolders, addCustomFolder } from '../lib/folders';
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
            { id: 'assign-training', type: 'action', position: { x: 1300, y: 60 }, data: { kind: 'action', label: 'Assign Training' } },
            { id: 'complete', type: 'output', position: { x: 1560, y: 60 }, data: { kind: 'output', label: 'Onboarding Complete!' } },
            { id: 'setup-design', type: 'action', position: { x: 1040, y: 260 }, data: { kind: 'action', label: 'Setup Design Tools' } },
            { id: 'assign-training-design', type: 'action', position: { x: 1300, y: 260 }, data: { kind: 'action', label: 'Assign Training' } },
            { id: 'complete-design', type: 'output', position: { x: 1560, y: 260 }, data: { kind: 'output', label: 'Onboarding Complete!' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'welcome-email' },
            { id: 'e2', source: 'welcome-email', target: 'create-accounts' },
            { id: 'e3', source: 'create-accounts', target: 'department-check' },
            // Each department branch is fully independent and ends at its own
            // output node — fancy-flow does not merge branches, so the engineering
            // and design tracks never reconverge on a shared node.
            { id: 'e4', source: 'department-check', sourceHandle: 'true', target: 'setup-dev' },
            { id: 'e5', source: 'setup-dev', target: 'assign-training' },
            { id: 'e6', source: 'assign-training', target: 'complete' },
            { id: 'e7', source: 'department-check', sourceHandle: 'false', target: 'setup-design' },
            { id: 'e8', source: 'setup-design', target: 'assign-training-design' },
            { id: 'e9', source: 'assign-training-design', target: 'complete-design' },
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
            { id: 'fix', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Fix & Test' } },
            { id: 'close', type: 'output', position: { x: 1300, y: 60 }, data: { kind: 'output', label: 'Bug Closed' } },
            { id: 'backlog', type: 'action', position: { x: 780, y: 260 }, data: { kind: 'action', label: 'Add to Backlog' } },
            { id: 'fix-backlog', type: 'action', position: { x: 1040, y: 260 }, data: { kind: 'action', label: 'Fix & Test' } },
            { id: 'close-backlog', type: 'output', position: { x: 1300, y: 260 }, data: { kind: 'output', label: 'Bug Closed' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'triage' },
            { id: 'e2', source: 'triage', target: 'severity' },
            // Each severity branch is fully independent and ends at its own output
            // node — the critical (hotfix) and non-critical (backlog) paths never
            // reconverge on a shared node.
            { id: 'e3', source: 'severity', sourceHandle: 'true', target: 'hotfix' },
            { id: 'e4', source: 'hotfix', target: 'fix' },
            { id: 'e5', source: 'fix', target: 'close' },
            { id: 'e6', source: 'severity', sourceHandle: 'false', target: 'backlog' },
            { id: 'e7', source: 'backlog', target: 'fix-backlog' },
            { id: 'e8', source: 'fix-backlog', target: 'close-backlog' },
        ],
    },
    jobapplication: {
        name: 'Job Application Pipeline',
        description: 'Screens applicants, runs interviews, and routes strong candidates to an offer',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Application Received' } },
            { id: 'screen-resume', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Screen Resume' } },
            { id: 'phone-interview', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'Phone Interview' } },
            { id: 'tech-interview', type: 'action', position: { x: 780, y: 160 }, data: { kind: 'action', label: 'Technical Interview' } },
            { id: 'candidate-check', type: 'decision', position: { x: 1040, y: 160 }, data: { kind: 'decision', label: 'Strong Candidate?' } },
            { id: 'send-offer', type: 'action', position: { x: 1300, y: 60 }, data: { kind: 'action', label: 'Send Offer' } },
            { id: 'send-rejection', type: 'output', position: { x: 1300, y: 260 }, data: { kind: 'output', label: 'Send Rejection' } },
            { id: 'onboarding-started', type: 'output', position: { x: 1560, y: 60 }, data: { kind: 'output', label: 'Onboarding Started' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'screen-resume' },
            { id: 'e2', source: 'screen-resume', target: 'phone-interview' },
            { id: 'e3', source: 'phone-interview', target: 'tech-interview' },
            { id: 'e4', source: 'tech-interview', target: 'candidate-check' },
            { id: 'e5', source: 'candidate-check', sourceHandle: 'true', target: 'send-offer' },
            { id: 'e6', source: 'candidate-check', sourceHandle: 'false', target: 'send-rejection' },
            { id: 'e7', source: 'send-offer', target: 'onboarding-started' },
        ],
    },
    contentpublishing: {
        name: 'Content Publishing',
        description: 'Takes a draft through editorial review and SEO checks, then schedules and publishes it',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Draft Created' } },
            { id: 'editorial-review', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Editorial Review' } },
            { id: 'seo-check', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'SEO Check' } },
            { id: 'approval-check', type: 'decision', position: { x: 780, y: 160 }, data: { kind: 'decision', label: 'Approved?' } },
            { id: 'schedule-post', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Schedule Post' } },
            { id: 'request-changes', type: 'output', position: { x: 1040, y: 260 }, data: { kind: 'output', label: 'Request Changes' } },
            { id: 'published', type: 'output', position: { x: 1300, y: 60 }, data: { kind: 'output', label: 'Published' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'editorial-review' },
            { id: 'e2', source: 'editorial-review', target: 'seo-check' },
            { id: 'e3', source: 'seo-check', target: 'approval-check' },
            { id: 'e4', source: 'approval-check', sourceHandle: 'true', target: 'schedule-post' },
            { id: 'e5', source: 'approval-check', sourceHandle: 'false', target: 'request-changes' },
            { id: 'e6', source: 'schedule-post', target: 'published' },
        ],
    },
    budgetapproval: {
        name: 'Budget Approval',
        description: 'Validates a spend request, runs department review, then routes it to manager or executive approval',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Request Submitted' } },
            { id: 'validate-budget', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Validate Budget' } },
            { id: 'department-review', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'Department Review' } },
            { id: 'amount-check', type: 'decision', position: { x: 780, y: 160 }, data: { kind: 'decision', label: 'Over $10k?' } },
            { id: 'executive-approval', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Executive Approval' } },
            { id: 'manager-approval', type: 'action', position: { x: 1040, y: 260 }, data: { kind: 'action', label: 'Manager Approval' } },
            { id: 'approved', type: 'output', position: { x: 1300, y: 60 }, data: { kind: 'output', label: 'Approved' } },
            { id: 'denied', type: 'output', position: { x: 1300, y: 260 }, data: { kind: 'output', label: 'Denied' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'validate-budget' },
            { id: 'e2', source: 'validate-budget', target: 'department-review' },
            { id: 'e3', source: 'department-review', target: 'amount-check' },
            { id: 'e4', source: 'amount-check', sourceHandle: 'true', target: 'executive-approval' },
            { id: 'e5', source: 'amount-check', sourceHandle: 'false', target: 'manager-approval' },
            { id: 'e6', source: 'executive-approval', target: 'approved' },
            { id: 'e7', source: 'manager-approval', target: 'denied' },
        ],
    },
    ptorequest: {
        name: 'PTO Request',
        description: 'Checks team coverage, gets manager approval, updates the calendar, and notifies the team',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Submit Request' } },
            { id: 'check-coverage', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Check Coverage' } },
            { id: 'manager-review', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'Manager Review' } },
            { id: 'approval-check', type: 'decision', position: { x: 780, y: 160 }, data: { kind: 'decision', label: 'Approved?' } },
            { id: 'update-calendar', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Update Calendar' } },
            { id: 'deny-request', type: 'output', position: { x: 1040, y: 260 }, data: { kind: 'output', label: 'Deny Request' } },
            { id: 'notify-team', type: 'action', position: { x: 1300, y: 60 }, data: { kind: 'action', label: 'Notify Team' } },
            { id: 'confirmed', type: 'output', position: { x: 1560, y: 60 }, data: { kind: 'output', label: 'Confirmed' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'check-coverage' },
            { id: 'e2', source: 'check-coverage', target: 'manager-review' },
            { id: 'e3', source: 'manager-review', target: 'approval-check' },
            { id: 'e4', source: 'approval-check', sourceHandle: 'true', target: 'update-calendar' },
            { id: 'e5', source: 'approval-check', sourceHandle: 'false', target: 'deny-request' },
            { id: 'e6', source: 'update-calendar', target: 'notify-team' },
            { id: 'e7', source: 'notify-team', target: 'confirmed' },
        ],
    },
    productrecall: {
        name: 'Product Recall',
        description: 'Assesses a product issue, notifies regulators if needed, alerts customers, and processes returns',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Issue Detected' } },
            { id: 'assess-scope', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Assess Scope' } },
            { id: 'safety-check', type: 'decision', position: { x: 520, y: 160 }, data: { kind: 'decision', label: 'Safety Risk?' } },
            { id: 'notify-regulators', type: 'action', position: { x: 780, y: 60 }, data: { kind: 'action', label: 'Notify Regulators' } },
            { id: 'customer-alert', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Customer Alert' } },
            { id: 'return-process', type: 'action', position: { x: 1300, y: 60 }, data: { kind: 'action', label: 'Return Process' } },
            { id: 'resolved', type: 'output', position: { x: 1560, y: 60 }, data: { kind: 'output', label: 'Resolved' } },
            { id: 'monitor-situation', type: 'action', position: { x: 780, y: 260 }, data: { kind: 'action', label: 'Monitor Situation' } },
            { id: 'customer-alert-monitor', type: 'action', position: { x: 1040, y: 260 }, data: { kind: 'action', label: 'Customer Alert' } },
            { id: 'return-process-monitor', type: 'action', position: { x: 1300, y: 260 }, data: { kind: 'action', label: 'Return Process' } },
            { id: 'resolved-monitor', type: 'output', position: { x: 1560, y: 260 }, data: { kind: 'output', label: 'Resolved' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'assess-scope' },
            { id: 'e2', source: 'assess-scope', target: 'safety-check' },
            // Each safety branch is fully independent and ends at its own output
            // node — the regulator-notification and monitor-only paths never
            // reconverge on a shared node.
            { id: 'e3', source: 'safety-check', sourceHandle: 'true', target: 'notify-regulators' },
            { id: 'e4', source: 'notify-regulators', target: 'customer-alert' },
            { id: 'e5', source: 'customer-alert', target: 'return-process' },
            { id: 'e6', source: 'return-process', target: 'resolved' },
            { id: 'e7', source: 'safety-check', sourceHandle: 'false', target: 'monitor-situation' },
            { id: 'e8', source: 'monitor-situation', target: 'customer-alert-monitor' },
            { id: 'e9', source: 'customer-alert-monitor', target: 'return-process-monitor' },
            { id: 'e10', source: 'return-process-monitor', target: 'resolved-monitor' },
        ],
    },
    eventplanning: {
        name: 'Event Planning',
        description: 'Books a venue, sends invites, confirms arrangements once RSVPs clear, then runs the day-of checklist and follows up',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Event Created' } },
            { id: 'book-venue', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Book Venue' } },
            { id: 'send-invites', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'Send Invites' } },
            { id: 'rsvp-check', type: 'decision', position: { x: 780, y: 160 }, data: { kind: 'decision', label: 'Enough RSVPs?' } },
            { id: 'confirm-arrangements', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Confirm Arrangements' } },
            { id: 'cancel-event', type: 'output', position: { x: 1040, y: 260 }, data: { kind: 'output', label: 'Cancel Event' } },
            { id: 'day-of-checklist', type: 'action', position: { x: 1300, y: 60 }, data: { kind: 'action', label: 'Day Of Checklist' } },
            { id: 'follow-up', type: 'action', position: { x: 1560, y: 60 }, data: { kind: 'action', label: 'Follow Up' } },
            { id: 'event-complete', type: 'output', position: { x: 1820, y: 60 }, data: { kind: 'output', label: 'Event Complete' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'book-venue' },
            { id: 'e2', source: 'book-venue', target: 'send-invites' },
            { id: 'e3', source: 'send-invites', target: 'rsvp-check' },
            { id: 'e4', source: 'rsvp-check', sourceHandle: 'true', target: 'confirm-arrangements' },
            { id: 'e5', source: 'rsvp-check', sourceHandle: 'false', target: 'cancel-event' },
            { id: 'e6', source: 'confirm-arrangements', target: 'day-of-checklist' },
            { id: 'e7', source: 'day-of-checklist', target: 'follow-up' },
            { id: 'e8', source: 'follow-up', target: 'event-complete' },
        ],
    },
    returnrefund: {
        name: 'Return & Refund',
        description: 'Verifies a purchase, inspects the return, then processes or denies the refund and closes the case',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 0, y: 160 }, data: { kind: 'trigger', label: 'Request Received' } },
            { id: 'verify-purchase', type: 'action', position: { x: 260, y: 160 }, data: { kind: 'action', label: 'Verify Purchase' } },
            { id: 'inspect-return', type: 'action', position: { x: 520, y: 160 }, data: { kind: 'action', label: 'Inspect Return' } },
            { id: 'approval-check', type: 'decision', position: { x: 780, y: 160 }, data: { kind: 'decision', label: 'Approve?' } },
            { id: 'process-refund', type: 'action', position: { x: 1040, y: 60 }, data: { kind: 'action', label: 'Process Refund' } },
            { id: 'deny-refund', type: 'output', position: { x: 1040, y: 260 }, data: { kind: 'output', label: 'Deny Refund' } },
            { id: 'notify-customer', type: 'action', position: { x: 1300, y: 60 }, data: { kind: 'action', label: 'Notify Customer' } },
            { id: 'case-closed', type: 'output', position: { x: 1560, y: 60 }, data: { kind: 'output', label: 'Case Closed' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'verify-purchase' },
            { id: 'e2', source: 'verify-purchase', target: 'inspect-return' },
            { id: 'e3', source: 'inspect-return', target: 'approval-check' },
            { id: 'e4', source: 'approval-check', sourceHandle: 'true', target: 'process-refund' },
            { id: 'e5', source: 'approval-check', sourceHandle: 'false', target: 'deny-refund' },
            { id: 'e6', source: 'process-refund', target: 'notify-customer' },
            { id: 'e7', source: 'notify-customer', target: 'case-closed' },
        ],
    },
};

const blankGraph = { nodes: [], edges: [] };

// A stable fingerprint of a workflow's *meaningful* content, used to tell whether
// there are unsaved changes. We include only the fields we persist (name,
// description, tags, and each node's id/type/position/data + each edge's
// endpoints) and deliberately drop React Flow's runtime fields — `selected`,
// `dragging`, `measured`, etc. — so merely clicking or hovering a node, or React
// Flow re-measuring after load, never counts as an edit.
// Just the graph's meaningful shape (ignores React Flow runtime fields). Used by
// both the unsaved-changes check and the undo/redo history to coalesce noise
// (selection, hover, re-measuring) into "no real change".
const graphSignature = (nodes, edges) =>
    JSON.stringify({
        nodes: (nodes ?? []).map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: (edges ?? []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? null,
            targetHandle: e.targetHandle ?? null,
        })),
    });

const workflowFingerprint = (name, description, tags, folder, nodes, edges) =>
    JSON.stringify({
        name: (name ?? '').trim(),
        description: description ?? '',
        tags: tags ?? [],
        folder: folder ?? null,
        graph: graphSignature(nodes, edges),
    });

// Cap how many undo steps we retain.
const MAX_HISTORY = 50;

// ── Run-path highlighting ───────────────────────────────────────────────────
// After a run, we animate a flowing pulse along the edges that were actually
// traversed, then settle them into a static green path. These build the CSS
// selectors (React Flow owns the SVG, so we target it by its data-id) and tune
// the one-shot pulse timing.
const edgePathSel = (id) => `.workflow-editor .react-flow__edge[data-id="${id}"] .react-flow__edge-path`;
const nodeSel = (id) => `.workflow-editor .react-flow__node[data-id="${id}"]`;
// Seconds between each edge's pulse start (so it travels node-to-node) and how
// long a single edge's pulse lasts.
const PATH_PULSE_STEP_S = 0.4;
const PATH_PULSE_DUR_S = 0.85;

// Order the executed edges into a traversal sequence so the post-run pulse flows
// node-to-node instead of lighting every edge at once. BFS from entry points
// (executed sources that nothing in the path leads into), following only edges
// whose endpoints were both executed. Cycle-safe via a visited-edge set; any
// path edges the walk doesn't reach (disconnected fragments) are appended so
// nothing is dropped.
const orderPathEdges = (pathEdges) => {
    const out = [];
    const seen = new Set();
    const bySource = new Map();
    const targets = new Set();
    for (const e of pathEdges) {
        if (!bySource.has(e.source)) bySource.set(e.source, []);
        bySource.get(e.source).push(e);
        targets.add(e.target);
    }
    const allSources = [...new Set(pathEdges.map((e) => e.source))];
    const starts = allSources.filter((s) => !targets.has(s));
    const queue = starts.length ? [...starts] : allSources;
    while (queue.length) {
        const node = queue.shift();
        for (const e of bySource.get(node) ?? []) {
            if (seen.has(e.id)) continue;
            seen.add(e.id);
            out.push(e.id);
            queue.push(e.target);
        }
    }
    for (const e of pathEdges) if (!seen.has(e.id)) out.push(e.id);
    return out;
};

// localStorage flag controlling the first-run beginner's guide auto-popup.
const GUIDE_SEEN_KEY = 'workflow-guide-seen';

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

// Run-animation speed factor, set from the user's "Animation speed" setting when
// the editor mounts. Scales every executor's `wait(…)` so a run actually plays
// faster/slower. 1 = normal, >1 = slower, <1 = faster.
let animSpeedFactor = 1;
const setAnimSpeedFactor = (f) => {
    animSpeedFactor = f;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms * animSpeedFactor));

// Short pseudo-id helper for realistic-looking references (auth codes, tracking
// numbers, ticket ids, etc.).
const rid = (prefix = '', len = 6) =>
    `${prefix}${Math.random().toString(36).slice(2, 2 + len).toUpperCase()}`;

const say = (emit, node, level, message) =>
    emit({ type: 'log', nodeId: node.id, level, message });

// ── Agentic node execution (AI Mode) ──────────────────────────────────────
// When AI Mode is on (server reports ANTHROPIC_API_KEY is configured), ACTION
// nodes route through the Laravel /api/agent/node endpoint so Claude reasons
// through the step. Everything else — triggers, decisions, outputs, Demo Mode,
// and any failed request — runs the existing hardcoded mock executors, so the
// workflow behaves identically when AI is off. These module-level flags are set
// from the component (same pattern as `animSpeedFactor`) so the wrapped
// executors stay stable across renders while reading live values at run time.
let aiModeEnabled = false;
let currentWorkflowName = 'Workflow';
const setAiModeEnabled = (v) => {
    aiModeEnabled = !!v;
};
const setCurrentWorkflowName = (n) => {
    currentWorkflowName = n || 'Workflow';
};

const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

// POST a single node to the agent endpoint. Throws on any non-OK response (or
// network error) so the caller can fall back to mock data.
async function postAgentNode({ nodeType, nodeLabel, workflowName, inputData }) {
    const res = await fetch('/api/agent/node', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({
            node_type: nodeType,
            node_label: nodeLabel,
            workflow_name: workflowName,
            input_data: inputData,
        }),
    });
    if (!res.ok) throw new Error(`agent/node HTTP ${res.status}`);
    return res.json();
}

// Wrap one executor so that — for ACTION nodes only, and only in AI Mode — it
// asks Claude what should happen at the step, then narrates that in the run feed
// and attaches the AI's structured output. Any failure (no key, network, 4xx/5xx,
// bad JSON) transparently falls back to `fallback` — the node's original mock
// executor — so the run continues exactly as in Demo Mode.
async function runAgentNode(ctx, fallback) {
    const { node, inputs, emit } = ctx;

    // Non-action nodes and Demo Mode run the original executor unchanged.
    if (node?.data?.kind !== 'action' || !aiModeEnabled) {
        return fallback(ctx);
    }

    try {
        const ai = await postAgentNode({
            nodeType: node.data.kind,
            nodeLabel: node.data.label,
            workflowName: currentWorkflowName,
            inputData: inputs?.in ?? {},
        });

        // Keep the canonical data chain intact — decision/output nodes and the
        // success toasts depend on the mock's exact shape — so compute it
        // silently, then let the AI narrate the step and attach its output.
        const base = await fallback({ ...ctx, emit: () => {} });
        say(emit, node, 'info', `🤖 ${ai?.decision || `Processed "${node.data.label}"`}`);
        return { ...base, ai: ai?.output_data ?? null };
    } catch {
        // AI call failed (no key, rate limit, network, bad response). The run must
        // never break, so fall back to the deterministic mock executor — but note
        // it in the run feed so the user knows this step used a simulated result.
        say(emit, node, 'warn', `⚠️ AI unavailable for "${node.data.label}" — using a simulated result.`);
        return fallback(ctx);
    }
}

// Route every executor in a registry through runAgentNode. It self-selects:
// only action-kind nodes in AI Mode actually call the API; all others delegate
// straight to the original executor, so trigger/decision/output behaviour and
// Demo Mode are byte-for-byte unchanged.
const withAgent = (registry) =>
    Object.fromEntries(Object.entries(registry).map(([id, exec]) => [id, (ctx) => runAgentNode(ctx, exec)]));

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

// ── Job Application Pipeline ──────────────────────────────────────────────
const jobApplicationExecutors = {
    trigger: async ({ node, emit }) => {
        const candidate = {
            name: 'Maya Chen',
            email: 'maya.chen@gmail.com',
            role: 'Senior Backend Engineer',
            source: 'LinkedIn',
            appliedAt: '2026-06-09',
        };
        say(emit, node, 'info', `Application received: ${candidate.name} — ${candidate.role} (via ${candidate.source})`);
        return { candidate };
    },
    'screen-resume': async ({ node, inputs, emit }) => {
        await wait(600);
        const { candidate } = inputs.in;
        const screening = {
            score: 88,
            yearsExperience: 7,
            skills: ['Go', 'PostgreSQL', 'Kubernetes', 'gRPC'],
            passed: true,
        };
        say(
            emit,
            node,
            'info',
            `Resume screened for ${candidate.name} — ${screening.score}/100, ${screening.yearsExperience} yrs, skills: ${screening.skills.join(', ')}`,
        );
        return { ...inputs.in, screening };
    },
    'phone-interview': async ({ node, inputs, emit }) => {
        await wait(650);
        const phoneInterview = {
            interviewer: 'Priya N. (Recruiter)',
            score: 8.5,
            recommendation: 'advance',
            notes: 'Clear communicator, strong systems-design fundamentals.',
        };
        say(
            emit,
            node,
            'info',
            `Phone interview with ${phoneInterview.interviewer} — ${phoneInterview.score}/10, recommendation: ${phoneInterview.recommendation}`,
        );
        return { ...inputs.in, phoneInterview };
    },
    'tech-interview': async ({ node, inputs, emit }) => {
        await wait(700);
        const techInterview = {
            panel: ['Lead Engineer', 'Staff Engineer'],
            score: 9.0,
            problem: 'Design a distributed rate limiter',
            result: 'strong hire',
        };
        say(
            emit,
            node,
            'info',
            `Technical interview (${techInterview.panel.join(' + ')}) — "${techInterview.problem}": ${techInterview.score}/10 (${techInterview.result})`,
        );
        return { ...inputs.in, techInterview };
    },
    'candidate-check': ({ node, inputs, emit }) => {
        const { phoneInterview, techInterview } = inputs.in;
        const isStrong = techInterview.score >= 8 && phoneInterview.score >= 7;
        say(
            emit,
            node,
            isStrong ? 'info' : 'warn',
            isStrong
                ? `Strong candidate — advancing to an offer (tech ${techInterview.score}/10, phone ${phoneInterview.score}/10)`
                : `Below the bar — sending a polite rejection`,
        );
        return { branch: isStrong ? 'true' : 'false', value: inputs.in };
    },
    'send-offer': async ({ node, inputs, emit }) => {
        await wait(600);
        const { candidate } = inputs.in;
        const offer = {
            title: candidate.role,
            baseSalary: 185000,
            equity: '0.05%',
            startDate: '2026-07-07',
            expiresOn: '2026-06-23',
        };
        say(
            emit,
            node,
            'info',
            `Offer sent to ${candidate.name} — ${offer.title}, $${offer.baseSalary.toLocaleString()} base, ${offer.equity} equity (expires ${offer.expiresOn})`,
        );
        return { ...inputs.in, offer };
    },
    'send-rejection': ({ node, inputs, emit }) => {
        const { candidate } = inputs.in;
        say(emit, node, 'info', `✗ Rejection sent to ${candidate.name} — thanked for their time, encouraged to reapply`);
        return { status: 'rejected', candidateName: candidate.name };
    },
    'onboarding-started': ({ node, inputs, emit }) => {
        const { candidate, offer } = inputs.in;
        say(emit, node, 'info', `✅ ${candidate.name} accepted — onboarding kicked off, start date ${offer.startDate}`);
        return { status: 'complete', summary: { candidate: candidate.name, title: offer.title, startDate: offer.startDate } };
    },
};

// ── Content Publishing ────────────────────────────────────────────────────
const contentPublishingExecutors = {
    trigger: async ({ node, emit }) => {
        const draft = {
            title: '10 Patterns for Scaling PostgreSQL',
            author: 'Sam Rivera',
            wordCount: 1840,
            category: 'Engineering',
            createdAt: '2026-06-09',
        };
        say(emit, node, 'info', `Draft created: "${draft.title}" by ${draft.author} — ${draft.wordCount} words (${draft.category})`);
        return { draft };
    },
    'editorial-review': async ({ node, inputs, emit }) => {
        await wait(650);
        const { draft } = inputs.in;
        const review = {
            editor: 'Dana K.',
            grammarIssues: 3,
            readabilityScore: 72,
            suggestions: ['Tighten the intro', 'Add a summary box'],
            verdict: 'minor edits',
        };
        say(
            emit,
            node,
            'info',
            `Editorial review by ${review.editor} — ${review.grammarIssues} grammar issues, readability ${review.readabilityScore}/100 (${review.verdict})`,
        );
        return { ...inputs.in, review };
    },
    'seo-check': async ({ node, inputs, emit }) => {
        await wait(600);
        const seo = {
            score: 91,
            focusKeyword: 'postgres scaling',
            metaLength: 156,
            readingTime: '7 min',
            passed: true,
        };
        say(
            emit,
            node,
            'info',
            `SEO check — ${seo.score}/100, focus keyword "${seo.focusKeyword}", meta ${seo.metaLength} chars, ${seo.readingTime} read`,
        );
        return { ...inputs.in, seo };
    },
    'approval-check': ({ node, inputs, emit }) => {
        const { review, seo } = inputs.in;
        const isApproved = seo.score >= 80 && review.grammarIssues <= 5;
        say(
            emit,
            node,
            isApproved ? 'info' : 'warn',
            isApproved
                ? `Approved — SEO ${seo.score}/100 and editorial clean, scheduling the post`
                : `Not ready — sending back to the author for changes`,
        );
        return { branch: isApproved ? 'true' : 'false', value: inputs.in };
    },
    'schedule-post': async ({ node, inputs, emit }) => {
        await wait(550);
        const schedule = {
            publishDate: '2026-06-12 09:00',
            channels: ['Blog', 'Newsletter', 'LinkedIn'],
            slug: 'scaling-postgres-patterns',
        };
        say(
            emit,
            node,
            'info',
            `Post scheduled for ${schedule.publishDate} → ${schedule.channels.join(', ')} (/${schedule.slug})`,
        );
        return { ...inputs.in, schedule };
    },
    'request-changes': ({ node, inputs, emit }) => {
        const { draft, review } = inputs.in;
        say(emit, node, 'info', `✗ Changes requested on "${draft.title}" — ${review.suggestions.join('; ')}`);
        return { status: 'changes-requested', title: draft.title };
    },
    published: ({ node, inputs, emit }) => {
        const { draft, schedule } = inputs.in;
        say(emit, node, 'info', `✅ "${draft.title}" published to ${schedule.channels.join(', ')} — live at ${schedule.publishDate}`);
        return { status: 'complete', summary: { title: draft.title, publishDate: schedule.publishDate, channels: schedule.channels } };
    },
};

// ── Budget Approval ───────────────────────────────────────────────────────
const budgetApprovalExecutors = {
    trigger: async ({ node, emit }) => {
        const request = {
            id: rid('REQ-', 5),
            requester: 'Jordan Blake',
            department: 'Marketing',
            amount: 24500,
            purpose: 'Q3 paid media campaign',
            submittedAt: '2026-06-09',
        };
        say(
            emit,
            node,
            'info',
            `Budget request ${request.id} submitted by ${request.requester} (${request.department}) — $${request.amount.toLocaleString()} for ${request.purpose}`,
        );
        return { request };
    },
    'validate-budget': async ({ node, inputs, emit }) => {
        await wait(550);
        const validation = { withinPolicy: true, glCode: 'GL-6200', fiscalYear: 'FY26', remainingBudget: 180000 };
        say(
            emit,
            node,
            'info',
            `Budget validated — within policy, GL ${validation.glCode}, $${validation.remainingBudget.toLocaleString()} remaining in ${validation.fiscalYear}`,
        );
        return { ...inputs.in, validation };
    },
    'department-review': async ({ node, inputs, emit }) => {
        await wait(650);
        const deptReview = {
            reviewer: 'Casey Morgan (Dept Head)',
            priority: 'high',
            recommendation: 'approve',
            notes: 'Aligned with Q3 growth goals.',
        };
        say(
            emit,
            node,
            'info',
            `Department review by ${deptReview.reviewer} — ${deptReview.recommendation} (${deptReview.priority} priority)`,
        );
        return { ...inputs.in, deptReview };
    },
    'amount-check': ({ node, inputs, emit }) => {
        const { request } = inputs.in;
        const overThreshold = request.amount > 10000;
        say(
            emit,
            node,
            overThreshold ? 'warn' : 'info',
            overThreshold
                ? `Amount $${request.amount.toLocaleString()} exceeds $10k — routing to executive approval`
                : `Amount $${request.amount.toLocaleString()} is under $10k — manager approval is sufficient`,
        );
        return { branch: overThreshold ? 'true' : 'false', value: inputs.in };
    },
    'executive-approval': async ({ node, inputs, emit }) => {
        await wait(700);
        const approval = {
            approver: 'Morgan Lee (CFO)',
            level: 'executive',
            decision: 'approved',
            conditions: 'Reassess spend at 60% utilization',
            approvedAt: '2026-06-10',
        };
        say(emit, node, 'info', `Executive sign-off by ${approval.approver} — approved with condition: ${approval.conditions}`);
        return { ...inputs.in, approval };
    },
    'manager-approval': async ({ node, inputs, emit }) => {
        await wait(600);
        const approval = {
            approver: 'Riley Adams (Manager)',
            level: 'manager',
            decision: 'denied',
            reason: 'Exceeds the remaining team budget this quarter',
        };
        say(emit, node, 'info', `Manager review by ${approval.approver} — denied: ${approval.reason}`);
        return { ...inputs.in, approval };
    },
    approved: ({ node, inputs, emit }) => {
        const { request, approval } = inputs.in;
        say(emit, node, 'info', `✅ Budget request ${request.id} approved — $${request.amount.toLocaleString()} signed off by ${approval.approver}`);
        return { status: 'approved', summary: { id: request.id, amount: request.amount, approver: approval.approver } };
    },
    denied: ({ node, inputs, emit }) => {
        const { request, approval } = inputs.in;
        say(emit, node, 'info', `✗ Budget request ${request.id} denied — ${approval.reason ?? 'did not meet approval criteria'}`);
        return { status: 'denied', summary: { id: request.id, amount: request.amount, reason: approval.reason ?? 'criteria not met' } };
    },
};

// ── PTO Request ───────────────────────────────────────────────────────────
const ptoRequestExecutors = {
    trigger: async ({ node, emit }) => {
        const ptoRequest = {
            id: rid('PTO-', 5),
            employee: 'Alex Rivera',
            type: 'Vacation',
            startDate: '2026-07-20',
            endDate: '2026-07-24',
            days: 5,
            submittedAt: '2026-06-09',
        };
        say(
            emit,
            node,
            'info',
            `PTO request ${ptoRequest.id} submitted by ${ptoRequest.employee} — ${ptoRequest.days} days ${ptoRequest.type.toLowerCase()} (${ptoRequest.startDate} → ${ptoRequest.endDate})`,
        );
        return { ptoRequest };
    },
    'check-coverage': async ({ node, inputs, emit }) => {
        await wait(600);
        const coverage = { teamSize: 6, outDuringPeriod: 1, backupAssigned: 'Sam Patel', status: 'covered' };
        say(
            emit,
            node,
            'info',
            `Coverage checked — ${coverage.outDuringPeriod}/${coverage.teamSize} out during the window, backup ${coverage.backupAssigned} (${coverage.status})`,
        );
        return { ...inputs.in, coverage };
    },
    'manager-review': async ({ node, inputs, emit }) => {
        await wait(650);
        const review = { manager: 'Dana Brooks', decision: 'approve', remainingBalance: 12, notes: 'Coverage looks good — enjoy!' };
        say(
            emit,
            node,
            'info',
            `Manager review by ${review.manager} — ${review.decision}, ${review.remainingBalance} days remaining after this`,
        );
        return { ...inputs.in, review };
    },
    'approval-check': ({ node, inputs, emit }) => {
        const { coverage, review } = inputs.in;
        const isApproved = coverage.status === 'covered' && review.decision === 'approve';
        say(
            emit,
            node,
            isApproved ? 'info' : 'warn',
            isApproved
                ? `Approved — coverage is in place and the manager signed off`
                : `Denied — coverage gap or manager declined the request`,
        );
        return { branch: isApproved ? 'true' : 'false', value: inputs.in };
    },
    'update-calendar': async ({ node, inputs, emit }) => {
        await wait(550);
        const calendar = {
            system: 'Google Calendar',
            eventId: rid('EVT-', 6),
            status: 'out-of-office',
            syncedTo: ['Team Calendar', 'HRIS'],
        };
        say(
            emit,
            node,
            'info',
            `Calendar updated in ${calendar.system} — OOO event ${calendar.eventId}, synced to ${calendar.syncedTo.join(', ')}`,
        );
        return { ...inputs.in, calendar };
    },
    'deny-request': ({ node, inputs, emit }) => {
        const { ptoRequest } = inputs.in;
        say(emit, node, 'info', `✗ PTO request ${ptoRequest.id} denied — ${ptoRequest.employee} notified`);
        return { status: 'denied', summary: { id: ptoRequest.id, employee: ptoRequest.employee } };
    },
    'notify-team': async ({ node, inputs, emit }) => {
        await wait(500);
        const { ptoRequest, coverage } = inputs.in;
        const notification = { channel: '#team-eng', recipients: coverage.teamSize, backup: coverage.backupAssigned };
        say(
            emit,
            node,
            'info',
            `Team notified in ${notification.channel} — ${ptoRequest.employee} out ${ptoRequest.startDate} → ${ptoRequest.endDate}, backup ${notification.backup}`,
        );
        return { ...inputs.in, notification };
    },
    confirmed: ({ node, inputs, emit }) => {
        const { ptoRequest, calendar } = inputs.in;
        say(emit, node, 'info', `✅ PTO confirmed for ${ptoRequest.employee} — ${ptoRequest.days} days off, calendar event ${calendar.eventId}`);
        return { status: 'confirmed', summary: { id: ptoRequest.id, employee: ptoRequest.employee, days: ptoRequest.days } };
    },
};

// ── Product Recall ────────────────────────────────────────────────────────
const productRecallExecutors = {
    trigger: async ({ node, emit }) => {
        const incident = {
            id: rid('REC-', 5),
            product: 'AeroHeat Travel Kettle',
            batch: 'BATCH-2026-0417',
            affectedUnits: 12400,
            issue: 'Overheating risk in the heating element',
            detectedAt: '2026-06-09',
        };
        say(
            emit,
            node,
            'warn',
            `Issue detected ${incident.id}: "${incident.issue}" in ${incident.product} (${incident.batch}) — ${incident.affectedUnits.toLocaleString()} units`,
        );
        return { incident };
    },
    'assess-scope': async ({ node, inputs, emit }) => {
        await wait(650);
        const { incident } = inputs.in;
        const scope = { regions: ['US', 'EU', 'CA'], severity: 'high', affectedUnits: incident.affectedUnits, riskLevel: 8.2 };
        say(
            emit,
            node,
            'info',
            `Scope assessed — ${scope.severity} severity, risk ${scope.riskLevel}/10 across ${scope.regions.join(', ')} (${scope.affectedUnits.toLocaleString()} units)`,
        );
        return { ...inputs.in, scope };
    },
    'safety-check': ({ node, inputs, emit }) => {
        const { scope } = inputs.in;
        const isSafetyRisk = scope.riskLevel >= 7 || scope.severity === 'high';
        say(
            emit,
            node,
            isSafetyRisk ? 'warn' : 'info',
            isSafetyRisk
                ? `Safety risk confirmed (risk ${scope.riskLevel}/10) — notifying regulators`
                : `No critical safety risk — monitoring the situation`,
        );
        return { branch: isSafetyRisk ? 'true' : 'false', value: inputs.in };
    },
    'notify-regulators': async ({ node, inputs, emit }) => {
        await wait(600);
        const regulatory = { agency: 'CPSC', contact: 'recalls@cpsc.gov', caseNumber: rid('CPSC-', 6), filedAt: '2026-06-10' };
        say(emit, node, 'info', `Regulators notified — ${regulatory.agency} case ${regulatory.caseNumber} filed (${regulatory.contact})`);
        return { ...inputs.in, regulatory };
    },
    'monitor-situation': async ({ node, inputs, emit }) => {
        await wait(550);
        const monitoring = { cadence: 'daily', owner: 'Quality Team', threshold: '0.5% incident rate' };
        say(emit, node, 'info', `Monitoring situation — ${monitoring.cadence} review by ${monitoring.owner}, escalate above ${monitoring.threshold}`);
        return { ...inputs.in, monitoring };
    },
    'customer-alert': async ({ node, inputs, emit }) => {
        await wait(600);
        const { incident } = inputs.in;
        const alert = {
            channels: ['Email', 'SMS', 'Press Release'],
            reach: incident.affectedUnits,
            advisory: 'Stop use and request a refund or replacement',
        };
        say(
            emit,
            node,
            'warn',
            `Customers alerted via ${alert.channels.join(', ')} — ${alert.reach.toLocaleString()} owners reached: "${alert.advisory}"`,
        );
        return { ...inputs.in, alert };
    },
    'return-process': async ({ node, inputs, emit }) => {
        await wait(650);
        const { incident } = inputs.in;
        const unitsReturned = Math.round(incident.affectedUnits * 0.62);
        const returns = { method: 'Prepaid shipping label', returnRate: 0.62, unitsReturned, refundIssued: true };
        say(
            emit,
            node,
            'info',
            `Returns processed — ${(returns.returnRate * 100).toFixed(0)}% return rate, ${returns.unitsReturned.toLocaleString()} units back, refunds issued`,
        );
        return { ...inputs.in, returns };
    },
    resolved: ({ node, inputs, emit }) => {
        const { incident, returns } = inputs.in;
        say(emit, node, 'info', `✅ Recall ${incident.id} resolved — ${returns.unitsReturned.toLocaleString()} units returned, case closed`);
        return { status: 'resolved', summary: { id: incident.id, product: incident.product, unitsReturned: returns.unitsReturned } };
    },
};

// ── Event Planning ────────────────────────────────────────────────────────
const eventPlanningExecutors = {
    trigger: async ({ node, emit }) => {
        const event = {
            id: rid('EVT-', 5),
            name: 'Annual Customer Summit',
            type: 'Conference',
            date: '2026-09-18',
            expectedAttendees: 250,
            organizer: 'Taylor Quinn',
        };
        say(
            emit,
            node,
            'info',
            `Event created ${event.id}: "${event.name}" (${event.type}) on ${event.date} — ${event.expectedAttendees} expected`,
        );
        return { event };
    },
    'book-venue': async ({ node, inputs, emit }) => {
        await wait(650);
        const venue = { name: 'Riverside Conference Center', capacity: 300, cost: 18500, bookingRef: rid('BK-', 6) };
        say(
            emit,
            node,
            'info',
            `Venue booked — ${venue.name} (capacity ${venue.capacity}), $${venue.cost.toLocaleString()}, ref ${venue.bookingRef}`,
        );
        return { ...inputs.in, venue };
    },
    'send-invites': async ({ node, inputs, emit }) => {
        await wait(600);
        const invites = { sent: 400, channels: ['Email', 'Calendar'], rsvpDeadline: '2026-08-20' };
        say(emit, node, 'info', `Invites sent — ${invites.sent} via ${invites.channels.join(', ')}, RSVP by ${invites.rsvpDeadline}`);
        return { ...inputs.in, invites };
    },
    'rsvp-check': ({ node, inputs, emit }) => {
        const { invites } = inputs.in;
        const count = 268;
        const rate = count / invites.sent;
        const enough = count >= 150;
        say(
            emit,
            node,
            enough ? 'info' : 'warn',
            enough
                ? `${count} RSVPs (${(rate * 100).toFixed(0)}%) — enough to proceed`
                : `Only ${count} RSVPs (${(rate * 100).toFixed(0)}%) — below threshold, cancelling`,
        );
        return { branch: enough ? 'true' : 'false', value: { ...inputs.in, rsvps: { count, rate } } };
    },
    'confirm-arrangements': async ({ node, inputs, emit }) => {
        await wait(650);
        const headcount = inputs.in.rsvps.count;
        const arrangements = { catering: `Confirmed — ${headcount} meals`, av: 'Confirmed', seating: `Theater, ${headcount}`, finalHeadcount: headcount };
        say(emit, node, 'info', `Arrangements confirmed — catering for ${headcount}, AV ${arrangements.av}, ${arrangements.seating}`);
        return { ...inputs.in, arrangements };
    },
    'cancel-event': ({ node, inputs, emit }) => {
        const { event } = inputs.in;
        say(emit, node, 'info', `✗ Event "${event.name}" cancelled — not enough RSVPs, refunds and notices issued`);
        return { status: 'cancelled', summary: { id: event.id, name: event.name } };
    },
    'day-of-checklist': async ({ node, inputs, emit }) => {
        await wait(600);
        const checklist = {
            items: ['Registration desk', 'Badges printed', 'AV check', 'Catering setup', 'Signage'],
            completed: 5,
            total: 5,
        };
        say(emit, node, 'info', `Day-of checklist complete — ${checklist.completed}/${checklist.total}: ${checklist.items.join(', ')}`);
        return { ...inputs.in, checklist };
    },
    'follow-up': async ({ node, inputs, emit }) => {
        await wait(550);
        const followUp = { surveysSent: inputs.in.rsvps.count, npsScore: 64, thankYouSent: true };
        say(emit, node, 'info', `Follow-up sent — ${followUp.surveysSent} surveys, thank-you notes, NPS ${followUp.npsScore}`);
        return { ...inputs.in, followUp };
    },
    'event-complete': ({ node, inputs, emit }) => {
        const { event, rsvps } = inputs.in;
        say(emit, node, 'info', `✅ "${event.name}" complete — ${rsvps.count} attended, surveys out, wrap-up done`);
        return { status: 'complete', summary: { id: event.id, name: event.name, attendees: rsvps.count } };
    },
};

// ── Return & Refund ───────────────────────────────────────────────────────
const returnRefundExecutors = {
    trigger: async ({ node, emit }) => {
        const request = {
            id: rid('RMA-', 5),
            customer: 'Priya Sharma',
            orderNumber: rid('ORD-', 6),
            item: 'Noise-Cancelling Headphones',
            reason: 'Defective — left earcup crackling',
            submittedAt: '2026-06-09',
        };
        say(
            emit,
            node,
            'info',
            `Return request ${request.id} from ${request.customer} — order ${request.orderNumber}, "${request.item}" (${request.reason})`,
        );
        return { request };
    },
    'verify-purchase': async ({ node, inputs, emit }) => {
        await wait(600);
        const { request } = inputs.in;
        const purchase = { verified: true, purchaseDate: '2026-05-02', price: 279.99, withinWindow: true, daysSincePurchase: 38 };
        say(
            emit,
            node,
            'info',
            `Purchase verified — ${request.orderNumber} on ${purchase.purchaseDate}, $${purchase.price}, ${purchase.daysSincePurchase} days ago (within window)`,
        );
        return { ...inputs.in, purchase };
    },
    'inspect-return': async ({ node, inputs, emit }) => {
        await wait(650);
        const inspection = { condition: 'Like new — original packaging', restockable: true, inspector: 'Returns Team', defectConfirmed: true };
        say(emit, node, 'info', `Return inspected — ${inspection.condition}, restockable: ${inspection.restockable}, defect confirmed`);
        return { ...inputs.in, inspection };
    },
    'approval-check': ({ node, inputs, emit }) => {
        const { purchase, inspection } = inputs.in;
        const isApproved = purchase.withinWindow && inspection.defectConfirmed;
        say(
            emit,
            node,
            isApproved ? 'info' : 'warn',
            isApproved
                ? `Approved — within the return window and defect confirmed, processing refund`
                : `Denied — outside the return window or condition issues`,
        );
        return { branch: isApproved ? 'true' : 'false', value: inputs.in };
    },
    'process-refund': async ({ node, inputs, emit }) => {
        await wait(650);
        const { purchase } = inputs.in;
        const refund = {
            amount: purchase.price,
            method: 'Original payment (Visa ****4242)',
            transactionId: rid('RFND-', 8),
            eta: '3-5 business days',
        };
        say(emit, node, 'info', `Refund processed — $${refund.amount} to ${refund.method}, txn ${refund.transactionId} (ETA ${refund.eta})`);
        return { ...inputs.in, refund };
    },
    'deny-refund': ({ node, inputs, emit }) => {
        const { request } = inputs.in;
        say(emit, node, 'info', `✗ Refund denied for ${request.id} — ${request.customer} notified of the decision`);
        return { status: 'denied', summary: { id: request.id, customer: request.customer } };
    },
    'notify-customer': async ({ node, inputs, emit }) => {
        await wait(500);
        const { request, refund } = inputs.in;
        const notification = { channel: 'Email', to: 'priya.sharma@gmail.com', message: `Refund of $${refund.amount} is on its way` };
        say(emit, node, 'info', `Customer notified — ${notification.channel} to ${request.customer}: refund $${refund.amount} confirmed`);
        return { ...inputs.in, notification };
    },
    'case-closed': ({ node, inputs, emit }) => {
        const { request, refund } = inputs.in;
        say(emit, node, 'info', `✅ Case ${request.id} closed — $${refund.amount} refunded to ${request.customer}`);
        return { status: 'closed', summary: { id: request.id, customer: request.customer, amount: refund.amount } };
    },
};

// ── The Return Journey ────────────────────────────────────────────────────
// A long, branching story about Sarah Mitchell's smartwatch return. The runner
// follows a single path per run (each decision returns a `branch`); the values
// below trace the headline story — in window → manufacturing defect → full
// refund + apology voucher → replacement shipped — while every other branch is
// still given rich, realistic data so any path a user runs reads convincingly.
const returnJourneyExecutors = {
    'submit-return': async ({ node, emit }) => {
        const returnRequest = {
            id: rid('RMA-', 5),
            customer: 'Sarah Mitchell',
            email: 'sarah.mitchell@gmail.com',
            orderNumber: '#4821',
            item: 'Aurora Smartwatch Series 5',
            price: 329.99,
            purchaseDate: '2026-05-28',
            submittedAt: '2026-06-08',
            reason: 'Screen flickering intermittently',
        };
        say(
            emit,
            node,
            'info',
            `Return request received from Sarah — ${returnRequest.id}, order ${returnRequest.orderNumber}, "${returnRequest.item}" ($${returnRequest.price})`,
        );
        return { returnRequest };
    },
    'within-30-days': ({ node, inputs, emit }) => {
        const { returnRequest } = inputs.in;
        const daysSince = 11; // 2026-05-28 → 2026-06-08
        const inWindow = daysSince <= 30;
        const windowCheck = { daysSince, limit: 30, inWindow };
        say(
            emit,
            node,
            inWindow ? 'info' : 'warn',
            inWindow
                ? `Submitted ${daysSince} days after purchase — within the 30-day return window`
                : `Submitted ${daysSince} days after purchase — outside the 30-day window`,
        );
        return { branch: inWindow ? 'true' : 'false', value: { ...inputs.in, windowCheck } };
    },
    'verify-purchase': async ({ node, inputs, emit }) => {
        await wait(600);
        const { returnRequest } = inputs.in;
        const purchase = {
            verified: true,
            orderNumber: returnRequest.orderNumber,
            purchaseDate: returnRequest.purchaseDate,
            channel: 'Online Store',
            paymentMethod: 'Visa ****7732',
            price: returnRequest.price,
            warrantyActive: true,
        };
        say(
            emit,
            node,
            'info',
            `Purchase verified — order ${purchase.orderNumber}, $${purchase.price} on ${purchase.paymentMethod} (warranty active)`,
        );
        return { ...inputs.in, purchase };
    },
    'item-damaged': ({ node, inputs, emit }) => {
        // Inspection concludes a manufacturing defect — NOT customer-caused — so
        // the story flows down the "full refund + apology voucher" branch.
        const damageAssessment = {
            inspector: 'Returns Lab',
            findings: 'Display ribbon cable fault — factory defect',
            faultParty: 'manufacturer',
            customerFault: false,
            photosReviewed: 3,
        };
        say(
            emit,
            node,
            'info',
            `Damage assessed: manufacturing defect found — ${damageAssessment.findings.toLowerCase()} (not customer-caused)`,
        );
        // `true` = damaged by customer · `false` = manufacturing defect.
        return { branch: damageAssessment.customerFault ? 'true' : 'false', value: { ...inputs.in, damageAssessment } };
    },
    'full-refund-voucher': async ({ node, inputs, emit }) => {
        await wait(650);
        const { returnRequest } = inputs.in;
        const refund = { amount: returnRequest.price, method: 'Visa ****7732', transactionId: rid('RFND-', 8) };
        const voucher = { code: rid('SORRY-', 6), value: 25, currency: 'USD', expires: '2026-12-31' };
        say(
            emit,
            node,
            'info',
            `Full refund of $${refund.amount} approved + apology voucher generated — ${voucher.code} ($${voucher.value})`,
        );
        return { ...inputs.in, refund, voucher };
    },
    'send-replacement': ({ node, inputs, emit }) => {
        // The defective unit is in stock, so we ship a replacement.
        const replacementCheck = { inStock: true, warehouse: 'WH-EAST', model: 'Aurora Smartwatch Series 5' };
        say(
            emit,
            node,
            'info',
            `Replacement in stock at ${replacementCheck.warehouse} — shipping a new unit to Sarah`,
        );
        return { branch: replacementCheck.inStock ? 'true' : 'false', value: { ...inputs.in, replacementCheck } };
    },
    'ship-replacement': async ({ node, inputs, emit }) => {
        await wait(600);
        const shipment = { carrier: 'FedEx 2Day', tracking: rid('FX', 12), eta: '2026-06-12', warehouse: 'WH-EAST' };
        say(emit, node, 'info', `Replacement shipped via ${shipment.carrier} — tracking ${shipment.tracking}, ETA ${shipment.eta}`);
        return { ...inputs.in, shipment };
    },
    'replacement-sent': ({ node, inputs, emit }) => {
        const { returnRequest, shipment, voucher } = inputs.in;
        say(
            emit,
            node,
            'info',
            `✅ Replacement sent to ${returnRequest.customer} — order ${returnRequest.orderNumber} resolved, tracking ${shipment.tracking}, voucher ${voucher.code} included`,
        );
        return {
            status: 'replacement-sent',
            summary: { customer: returnRequest.customer, order: returnRequest.orderNumber, tracking: shipment.tracking, voucher: voucher.code },
        };
    },
    'process-full-refund': async ({ node, inputs, emit }) => {
        await wait(650);
        const { returnRequest } = inputs.in;
        const fullRefund = { amount: returnRequest.price, method: 'Visa ****7732', transactionId: rid('RFND-', 8), eta: '3-5 business days' };
        say(emit, node, 'info', `Full refund of $${fullRefund.amount} processed — txn ${fullRefund.transactionId} (${fullRefund.eta})`);
        return { ...inputs.in, fullRefund };
    },
    'refund-complete': ({ node, inputs, emit }) => {
        const { returnRequest, fullRefund } = inputs.in;
        say(emit, node, 'info', `✅ Refund complete — $${fullRefund.amount} returned to ${returnRequest.customer}`);
        return { status: 'refunded', summary: { customer: returnRequest.customer, amount: fullRefund.amount, txn: fullRefund.transactionId } };
    },
    'partial-refund-offer': async ({ node, inputs, emit }) => {
        await wait(600);
        const { returnRequest } = inputs.in;
        const partialOffer = { percent: 50, amount: +(returnRequest.price * 0.5).toFixed(2), reason: 'Customer-caused damage — partial restocking offer' };
        say(emit, node, 'warn', `Partial refund offer extended — ${partialOffer.percent}% ($${partialOffer.amount}) due to customer-caused damage`);
        return { ...inputs.in, partialOffer };
    },
    'customer-accepts': ({ node, inputs, emit }) => {
        // Sarah accepts the partial offer in this branch.
        const accepted = true;
        say(
            emit,
            node,
            accepted ? 'info' : 'warn',
            accepted ? `Customer accepted the partial refund offer` : `Customer declined — escalating to a manager`,
        );
        return { branch: accepted ? 'true' : 'false', value: { ...inputs.in, offerAccepted: accepted } };
    },
    'process-partial-refund': async ({ node, inputs, emit }) => {
        await wait(600);
        const { partialOffer } = inputs.in;
        const partialRefund = { amount: partialOffer.amount, method: 'Visa ****7732', transactionId: rid('RFND-', 8) };
        say(emit, node, 'info', `Partial refund of $${partialRefund.amount} processed — txn ${partialRefund.transactionId}`);
        return { ...inputs.in, partialRefund };
    },
    'case-closed-partial': ({ node, inputs, emit }) => {
        const { returnRequest, partialRefund } = inputs.in;
        say(emit, node, 'info', `✅ Case closed — $${partialRefund.amount} partial refund issued to ${returnRequest.customer}`);
        return { status: 'closed', summary: { customer: returnRequest.customer, amount: partialRefund.amount, outcome: 'partial-refund' } };
    },
    'escalate-manager': async ({ node, inputs, emit }) => {
        await wait(550);
        const escalation = { manager: 'Diane Okafor', queue: 'Tier-2 Returns', ticket: rid('ESC-', 6) };
        say(emit, node, 'info', `Escalated to manager ${escalation.manager} — ${escalation.queue}, ticket ${escalation.ticket}`);
        return { ...inputs.in, escalation };
    },
    'manager-decision': ({ node, inputs, emit }) => {
        const { escalation } = inputs.in;
        // The manager approves a full refund as a goodwill gesture.
        const approved = true;
        say(
            emit,
            node,
            approved ? 'info' : 'warn',
            approved
                ? `Manager ${escalation.manager} approved a full refund as a goodwill gesture`
                : `Manager ${escalation.manager} upheld the customer-damage assessment`,
        );
        return { branch: approved ? 'true' : 'false', value: { ...inputs.in, managerApproved: approved } };
    },
    'full-refund-issued': ({ node, inputs, emit }) => {
        const { returnRequest, escalation } = inputs.in;
        say(emit, node, 'info', `✅ Full refund issued — $${returnRequest.price} approved via manager override by ${escalation.manager}`);
        return { status: 'refunded', summary: { customer: returnRequest.customer, amount: returnRequest.price, approver: escalation.manager } };
    },
    'final-denial': ({ node, inputs, emit }) => {
        const { returnRequest, escalation } = inputs.in;
        say(emit, node, 'warn', `✗ Refund denied — ${escalation.manager} upheld the customer-damage assessment, ${returnRequest.customer} notified`);
        return { status: 'denied', summary: { customer: returnRequest.customer, reason: 'customer-caused damage', reviewedBy: escalation.manager } };
    },
    'is-vip': ({ node, inputs, emit }) => {
        // Outside the return window — but Sarah is a Platinum VIP, so she's
        // eligible for a policy exception.
        const vipStatus = { isVip: true, tier: 'Platinum', memberSince: '2021', lifetimeValue: 8450 };
        say(
            emit,
            node,
            vipStatus.isVip ? 'info' : 'info',
            vipStatus.isVip
                ? `Customer is a VIP (${vipStatus.tier} tier, since ${vipStatus.memberSince}) — eligible for a policy exception`
                : `Standard customer — applying normal return policy`,
        );
        return { branch: vipStatus.isVip ? 'true' : 'false', value: { ...inputs.in, vipStatus } };
    },
    'exception-approval': async ({ node, inputs, emit }) => {
        await wait(550);
        const exception = { approvedBy: 'Retention Team', policy: 'VIP goodwill exception', reference: rid('EXC-', 6) };
        say(emit, node, 'info', `Exception approval granted by ${exception.approvedBy} — ${exception.policy} (${exception.reference})`);
        return { ...inputs.in, exception };
    },
    'manager-override': async ({ node, inputs, emit }) => {
        await wait(600);
        const { vipStatus } = inputs.in;
        const override = { manager: 'Marcus Webb', note: `Approved outside the 30-day window for ${vipStatus.tier} member` };
        say(emit, node, 'info', `Manager ${override.manager} overrode the 30-day limit for Sarah (${vipStatus.tier})`);
        return { ...inputs.in, override };
    },
    'vip-refund-approved': ({ node, inputs, emit }) => {
        const { returnRequest, override } = inputs.in;
        say(emit, node, 'info', `✅ VIP refund approved — $${returnRequest.price} refunded to ${returnRequest.customer}, override by ${override.manager}`);
        return { status: 'refunded', summary: { customer: returnRequest.customer, amount: returnRequest.price, approver: override.manager, tier: 'Platinum' } };
    },
    'send-policy-email': async ({ node, inputs, emit }) => {
        await wait(500);
        const { returnRequest } = inputs.in;
        const policyEmail = { template: 'return-policy-v2', to: returnRequest.email, sentAt: new Date().toISOString() };
        say(emit, node, 'info', `Policy email sent to ${policyEmail.to} — return falls outside the 30-day window`);
        return { ...inputs.in, policyEmail };
    },
    'customer-disputes': ({ node, inputs, emit }) => {
        // The customer pushes back on the policy decision.
        const disputed = true;
        say(
            emit,
            node,
            disputed ? 'warn' : 'info',
            disputed ? `Customer disputed the policy decision — escalating to support` : `Customer accepted the policy decision`,
        );
        return { branch: disputed ? 'true' : 'false', value: { ...inputs.in, disputed } };
    },
    'escalate-support': async ({ node, inputs, emit }) => {
        await wait(600);
        const supportCase = { agent: 'Nina Alvarez', channel: 'Live Chat', caseId: rid('SUP-', 6) };
        say(emit, node, 'info', `Escalated to support — agent ${supportCase.agent} handling case ${supportCase.caseId} via ${supportCase.channel}`);
        return { ...inputs.in, supportCase };
    },
    'resolved': ({ node, inputs, emit }) => {
        const { returnRequest, supportCase } = inputs.in;
        say(emit, node, 'info', `✅ Resolved — ${supportCase.agent} reached a goodwill resolution with ${returnRequest.customer}`);
        return { status: 'resolved', summary: { customer: returnRequest.customer, caseId: supportCase.caseId, agent: supportCase.agent } };
    },
    'case-closed-policy': ({ node, inputs, emit }) => {
        const { returnRequest } = inputs.in;
        say(emit, node, 'info', `✅ Case closed — ${returnRequest.customer} accepted the policy decision`);
        return { status: 'closed', summary: { customer: returnRequest.customer, outcome: 'policy-upheld' } };
    },
};

// Each template's per-node executors layered over the generic kind-based
// fallbacks, selected by the `type` URL parameter at render time.
const executorsByType = {
    onboarding: { ...genericExecutors, ...onboardingExecutors },
    order: { ...genericExecutors, ...orderExecutors },
    bugreport: { ...genericExecutors, ...bugReportExecutors },
    jobapplication: { ...genericExecutors, ...jobApplicationExecutors },
    contentpublishing: { ...genericExecutors, ...contentPublishingExecutors },
    budgetapproval: { ...genericExecutors, ...budgetApprovalExecutors },
    ptorequest: { ...genericExecutors, ...ptoRequestExecutors },
    productrecall: { ...genericExecutors, ...productRecallExecutors },
    eventplanning: { ...genericExecutors, ...eventPlanningExecutors },
    returnrefund: { ...genericExecutors, ...returnRefundExecutors },
    returnjourney: { ...genericExecutors, ...returnJourneyExecutors },
};

// The kind-based fallbacks shared by every registry — excluded when figuring out
// which template-specific nodes a saved graph contains.
const GENERIC_EXECUTOR_KEYS = new Set(Object.keys(genericExecutors));

// Recognize which template a saved graph originally came from by matching the
// template-specific executor node ids against the graph's node ids. Returns the
// best-matching type key (the one whose specific nodes are *all* present), or
// null. This is what lets a workflow saved from a template — including
// "The Return Journey" — still run its rich, story-driven executors, toasts and
// accent when later opened by id (where there's no `?type=` in the URL).
const detectTemplateType = (nodes) => {
    const ids = new Set((nodes ?? []).map((n) => n.id));
    let best = null;
    let bestSize = 0;
    for (const [type, registry] of Object.entries(executorsByType)) {
        const specific = Object.keys(registry).filter((k) => !GENERIC_EXECUTOR_KEYS.has(k));
        if (specific.length === 0) continue;
        // Require a full match so an edited/unrelated graph falls back to generic.
        if (specific.every((k) => ids.has(k)) && specific.length > bestSize) {
            best = type;
            bestSize = specific.length;
        }
    }
    return best;
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
    jobapplication: {
        'screen-resume': (r) => ({ title: 'Resume Screened', description: `Score ${r.screening.score}/100 · ${r.screening.yearsExperience} yrs exp`, variant: 'info' }),
        'phone-interview': (r) => ({ title: 'Phone Screen Passed', description: `${r.phoneInterview.interviewer} · ${r.phoneInterview.score}/10`, variant: 'success' }),
        'tech-interview': (r) => ({ title: 'Technical Interview Done', description: `${r.techInterview.result} · ${r.techInterview.score}/10`, variant: 'success' }),
        'send-offer': (r) => ({ title: 'Offer Sent', description: `$${r.offer.baseSalary.toLocaleString()} base · starts ${r.offer.startDate}`, variant: 'success' }),
        'send-rejection': (r) => ({ title: 'Rejection Sent', description: `${r.candidateName} — not moving forward`, variant: 'error' }),
        'onboarding-started': (r) => ({ title: 'Onboarding Started', description: `${r.summary.candidate} starts ${r.summary.startDate}`, variant: 'success' }),
    },
    contentpublishing: {
        'editorial-review': (r) => ({ title: 'Review Complete', description: `${r.review.editor} · ${r.review.grammarIssues} issues · readability ${r.review.readabilityScore}`, variant: 'info' }),
        'seo-check': (r) => ({ title: 'SEO Passed', description: `Score ${r.seo.score}/100 · “${r.seo.focusKeyword}”`, variant: 'success' }),
        'schedule-post': (r) => ({ title: 'Post Scheduled', description: `${r.schedule.publishDate} · ${r.schedule.channels.join(', ')}`, variant: 'success' }),
        'request-changes': (r) => ({ title: 'Changes Requested', description: `“${r.title}” sent back to the author`, variant: 'warning' }),
        published: (r) => ({ title: 'Post Published', description: `“${r.summary.title}” is live`, variant: 'success' }),
    },
    budgetapproval: {
        'validate-budget': (r) => ({ title: 'Budget Validated', description: `${r.validation.glCode} · $${r.validation.remainingBudget.toLocaleString()} left`, variant: 'info' }),
        'department-review': (r) => ({ title: 'Department Approved', description: `${r.deptReview.reviewer} · ${r.deptReview.recommendation}`, variant: 'success' }),
        'executive-approval': (r) => ({ title: 'Executive Sign-off', description: `${r.approval.approver} approved`, variant: 'success' }),
        'manager-approval': (r) => ({ title: 'Manager Reviewed', description: `${r.approval.approver} · ${r.approval.decision}`, variant: 'warning' }),
        approved: (r) => ({ title: 'Budget Approved', description: `${r.summary.id} · $${r.summary.amount.toLocaleString()}`, variant: 'success' }),
        denied: (r) => ({ title: 'Budget Denied', description: `${r.summary.id} — ${r.summary.reason}`, variant: 'error' }),
    },
    ptorequest: {
        'check-coverage': (r) => ({ title: 'Coverage Checked', description: `${r.coverage.status} · backup ${r.coverage.backupAssigned}`, variant: 'info' }),
        'manager-review': (r) => ({ title: 'Request Reviewed', description: `${r.review.manager} · ${r.review.decision}`, variant: 'success' }),
        'update-calendar': (r) => ({ title: 'Calendar Updated', description: `${r.calendar.system} · ${r.calendar.eventId}`, variant: 'success' }),
        'deny-request': (r) => ({ title: 'Request Denied', description: `${r.summary.employee} — request not approved`, variant: 'error' }),
        'notify-team': (r) => ({ title: 'Team Notified', description: `${r.notification.channel} · ${r.notification.recipients} people`, variant: 'info' }),
        confirmed: (r) => ({ title: 'PTO Confirmed', description: `${r.summary.employee} · ${r.summary.days} days`, variant: 'success' }),
    },
    productrecall: {
        'assess-scope': (r) => ({ title: 'Scope Assessed', description: `${r.scope.severity} severity · ${r.scope.affectedUnits.toLocaleString()} units`, variant: 'warning' }),
        'notify-regulators': (r) => ({ title: 'Regulators Notified', description: `${r.regulatory.agency} · case ${r.regulatory.caseNumber}`, variant: 'info' }),
        'monitor-situation': (r) => ({ title: 'Monitoring Started', description: `${r.monitoring.cadence} · ${r.monitoring.owner}`, variant: 'info' }),
        'customer-alert': (r) => ({ title: 'Customers Alerted', description: `${r.alert.reach.toLocaleString()} via ${r.alert.channels.join(', ')}`, variant: 'warning' }),
        'return-process': (r) => ({ title: 'Returns Processed', description: `${(r.returns.returnRate * 100).toFixed(0)}% returned · ${r.returns.unitsReturned.toLocaleString()} units`, variant: 'success' }),
        resolved: (r) => ({ title: 'Recall Resolved', description: `${r.summary.id} · ${r.summary.unitsReturned.toLocaleString()} units returned`, variant: 'success' }),
    },
    eventplanning: {
        'book-venue': (r) => ({ title: 'Venue Booked', description: `${r.venue.name} · $${r.venue.cost.toLocaleString()}`, variant: 'success' }),
        'send-invites': (r) => ({ title: 'Invites Sent', description: `${r.invites.sent} sent · RSVP by ${r.invites.rsvpDeadline}`, variant: 'info' }),
        'confirm-arrangements': (r) => ({ title: 'Arrangements Confirmed', description: `Catering for ${r.arrangements.finalHeadcount} · AV ${r.arrangements.av}`, variant: 'success' }),
        'cancel-event': (r) => ({ title: 'Event Cancelled', description: `“${r.summary.name}” called off`, variant: 'error' }),
        'day-of-checklist': (r) => ({ title: 'Checklist Complete', description: `${r.checklist.completed}/${r.checklist.total} items done`, variant: 'success' }),
        'follow-up': (r) => ({ title: 'Follow-up Sent', description: `${r.followUp.surveysSent} surveys · NPS ${r.followUp.npsScore}`, variant: 'info' }),
        'event-complete': (r) => ({ title: 'Event Complete', description: `${r.summary.name} · ${r.summary.attendees} attended`, variant: 'success' }),
    },
    returnrefund: {
        'verify-purchase': (r) => ({ title: 'Purchase Verified', description: `${r.purchase.purchaseDate} · $${r.purchase.price}`, variant: 'info' }),
        'inspect-return': (r) => ({ title: 'Return Inspected', description: `${r.inspection.condition}`, variant: 'success' }),
        'process-refund': (r) => ({ title: 'Refund Processed', description: `$${r.refund.amount} · ${r.refund.transactionId}`, variant: 'success' }),
        'deny-refund': (r) => ({ title: 'Refund Denied', description: `${r.summary.customer} — request not approved`, variant: 'error' }),
        'notify-customer': (r) => ({ title: 'Customer Notified', description: `${r.notification.channel} · refund confirmed`, variant: 'info' }),
        'case-closed': (r) => ({ title: 'Case Closed', description: `${r.summary.id} · $${r.summary.amount} refunded`, variant: 'success' }),
    },
    returnjourney: {
        'verify-purchase': (r) => ({ title: 'Purchase Verified', description: `Order ${r.purchase.orderNumber} · $${r.purchase.price}`, variant: 'info' }),
        'full-refund-voucher': (r) => ({ title: 'Apology Voucher Generated', description: `${r.voucher.code} · $${r.voucher.value} off`, variant: 'success' }),
        'ship-replacement': (r) => ({ title: 'Replacement Shipped', description: `${r.shipment.carrier} · ${r.shipment.tracking}`, variant: 'success' }),
        'replacement-sent': (r) => ({ title: 'Replacement Sent', description: `${r.summary.customer} · order ${r.summary.order} resolved 🎉`, variant: 'success' }),
        'process-full-refund': (r) => ({ title: 'Refund Processed', description: `$${r.fullRefund.amount} · ${r.fullRefund.transactionId}`, variant: 'success' }),
        'refund-complete': (r) => ({ title: 'Refund Complete', description: `$${r.summary.amount} returned to ${r.summary.customer}`, variant: 'success' }),
        'partial-refund-offer': (r) => ({ title: 'Partial Refund Offered', description: `${r.partialOffer.percent}% · $${r.partialOffer.amount}`, variant: 'warning' }),
        'process-partial-refund': (r) => ({ title: 'Partial Refund Processed', description: `$${r.partialRefund.amount} · ${r.partialRefund.transactionId}`, variant: 'success' }),
        'case-closed-partial': (r) => ({ title: 'Case Closed', description: `$${r.summary.amount} partial refund issued`, variant: 'success' }),
        'escalate-manager': (r) => ({ title: 'Escalated to Manager', description: `${r.escalation.manager} · ${r.escalation.ticket}`, variant: 'warning' }),
        'full-refund-issued': (r) => ({ title: 'Full Refund Issued', description: `$${r.summary.amount} · approved by ${r.summary.approver}`, variant: 'success' }),
        'final-denial': (r) => ({ title: 'Refund Denied', description: `${r.summary.customer} — ${r.summary.reason}`, variant: 'error' }),
        'exception-approval': (r) => ({ title: 'Exception Approved', description: `${r.exception.approvedBy} · ${r.exception.reference}`, variant: 'info' }),
        'manager-override': (r) => ({ title: 'Manager Override', description: `${r.override.manager} cleared the window`, variant: 'warning' }),
        'vip-refund-approved': (r) => ({ title: 'VIP Refund Approved', description: `$${r.summary.amount} · ${r.summary.tier} member`, variant: 'success' }),
        'send-policy-email': (r) => ({ title: 'Policy Email Sent', description: `To ${r.policyEmail.to}`, variant: 'info' }),
        'escalate-support': (r) => ({ title: 'Escalated to Support', description: `${r.supportCase.agent} · ${r.supportCase.caseId}`, variant: 'warning' }),
        resolved: (r) => ({ title: 'Resolved', description: `${r.summary.agent} closed case ${r.summary.caseId}`, variant: 'success' }),
        'case-closed-policy': (r) => ({ title: 'Case Closed', description: `${r.summary.customer} accepted the decision`, variant: 'info' }),
    },
};

// Celebratory confetti burst — fired when a run reaches a successful terminal
// output node (see the executor wrapper below). Tinted with the app's
// purple/blue accent palette (Tailwind indigo/blue/violet/purple 400–500) so it
// reads as a branded "celebration moment" rather than a generic burst.
const CONFETTI_COLORS = ['#6366f1', '#818cf8', '#3b82f6', '#60a5fa', '#8b5cf6', '#a78bfa', '#a855f7'];
const fireConfetti = () => {
    const base = { colors: CONFETTI_COLORS, zIndex: 9999, disableForReducedMotion: true };
    // Center pop — a dense, wide arc from just below mid-screen.
    confetti({ ...base, particleCount: 140, spread: 80, startVelocity: 45, origin: { y: 0.7 } });
    confetti({ ...base, particleCount: 70, spread: 120, startVelocity: 55, scalar: 1.2, origin: { y: 0.7 } });
    // Two side cannons firing inward for a fuller, more impressive spread.
    confetti({ ...base, particleCount: 60, angle: 60, spread: 70, startVelocity: 50, origin: { x: 0, y: 0.8 } });
    confetti({ ...base, particleCount: 60, angle: 120, spread: 70, startVelocity: 50, origin: { x: 1, y: 0.8 } });
};

// Apply a target zoom to FlowEditor's canvas. FlowEditor bundles its own copy of
// React Flow and exposes no viewport prop or hook, so we drive its real d3-zoom
// the same way a trackpad pinch does: dispatch a wheel event on the pane. Going
// through d3 keeps React Flow's store and node positions in sync (setting the CSS
// transform directly would desync and snap back on the next interaction).
//
// d3-zoom maps a wheel event to `newZoom = zoom * 2^(-deltaY * 0.002)` (no Ctrl,
// pixel delta) and stores the live transform on the `.react-flow__renderer`
// element's `__zoom` (that's the node d3-zoom is bound to), which we read to
// converge precisely. `target` is a scale (1 = 100%). Returns true once applied.
const applyCanvasZoom = (container, target) => {
    const surface = container?.querySelector('.react-flow__renderer');
    if (!surface || !surface.__zoom) return false; // canvas not mounted / panZoom not initialized yet
    const rect = surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Converge toward the target; one event usually nails it, the loop is a guard
    // against clamping/rounding. `__zoom.k` updates synchronously per event.
    for (let i = 0; i < 8; i++) {
        const current = surface.__zoom.k || 1;
        if (Math.abs(current - target) / target < 0.005) break;
        const deltaY = -Math.log2(target / current) / 0.002;
        surface.dispatchEvent(
            new WheelEvent('wheel', { deltaY, deltaMode: 0, clientX: cx, clientY: cy, bubbles: true, cancelable: true }),
        );
    }
    return true;
};

// Wrap an executor registry so each node fires its toast (via the `fire`
// dispatcher) as it finishes — without touching the underlying executor logic.
// `hooks.onNodeStart` / `hooks.onNodeDone` / `hooks.onNodeError` let the host
// observe the run (edge-flow animation, confetti, and the run-history panel).
const withToasts = (registry, meta, fire, hooks = {}) => {
    const wrapped = {};
    for (const [id, exec] of Object.entries(registry)) {
        wrapped[id] = async (ctx) => {
            // Tee the executor's log events to the host (run-feed panel) while
            // still forwarding everything to the runner's own event handler.
            const emit = (event) => {
                if (event?.type === 'log') hooks.onLog?.(event, ctx.node);
                ctx.emit?.(event);
            };
            const runCtx = { ...ctx, emit };
            hooks.onNodeStart?.(runCtx.node);
            try {
                const result = await exec(runCtx);
                const build = meta[id];
                if (build) {
                    // The terminal (output) node's toast is the "run finished"
                    // notification — suppress it when "Show run completion toast"
                    // is off (read live so the change applies on the next run).
                    const isCompletion = runCtx.node?.data?.kind === 'output';
                    if (!isCompletion || getSettings().showRunCompletionToast) fire(build(result));
                }
                hooks.onNodeDone?.(runCtx.node, result);
                return result;
            } catch (err) {
                hooks.onNodeError?.(runCtx.node, err);
                throw err; // preserve existing behaviour — the runner still sees the error
            }
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
    jobapplication: {
        label: 'Job Application',
        bar: 'bg-fuchsia-500',
        badge: 'bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/30',
        button: 'fuchsia',
        text: 'text-fuchsia-600 dark:text-fuchsia-400',
    },
    contentpublishing: {
        label: 'Content Publishing',
        bar: 'bg-teal-500',
        badge: 'bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/30',
        button: 'teal',
        text: 'text-teal-600 dark:text-teal-400',
    },
    budgetapproval: {
        label: 'Budget Approval',
        bar: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
        button: 'amber',
        text: 'text-amber-600 dark:text-amber-400',
    },
    ptorequest: {
        label: 'PTO Request',
        bar: 'bg-sky-500',
        badge: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
        button: 'sky',
        text: 'text-sky-600 dark:text-sky-400',
    },
    productrecall: {
        label: 'Product Recall',
        bar: 'bg-orange-500',
        badge: 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30',
        button: 'orange',
        text: 'text-orange-600 dark:text-orange-400',
    },
    eventplanning: {
        label: 'Event Planning',
        bar: 'bg-pink-500',
        badge: 'bg-pink-100 text-pink-700 ring-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-500/30',
        button: 'pink',
        text: 'text-pink-600 dark:text-pink-400',
    },
    returnrefund: {
        label: 'Return & Refund',
        bar: 'bg-violet-500',
        badge: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30',
        button: 'violet',
        text: 'text-violet-600 dark:text-violet-400',
    },
    returnjourney: {
        label: 'The Return Journey',
        bar: 'bg-orange-500',
        badge: 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30',
        button: 'orange',
        text: 'text-orange-600 dark:text-orange-400',
    },
};

const neutralAccent = {
    label: 'New Workflow',
    bar: 'bg-gray-300 dark:bg-gray-700',
    badge: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:ring-gray-600/40',
    button: 'gray',
    text: 'text-gray-700 dark:text-gray-200',
};

// Accent themes for the user's default-accent preference (Settings → Appearance),
// applied to a brand-new/blank workflow. Same shape as the template accents above;
// full literal class strings so Tailwind's scanner keeps them. Keeps the neutral
// "New Workflow" label, just tinted in the chosen color.
const SETTINGS_ACCENT_THEMES = {
    indigo: { label: 'New Workflow', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30', button: 'indigo', text: 'text-indigo-600 dark:text-indigo-400' },
    blue: { label: 'New Workflow', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30', button: 'blue', text: 'text-blue-600 dark:text-blue-400' },
    green: { label: 'New Workflow', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/30', button: 'green', text: 'text-green-600 dark:text-green-400' },
    violet: { label: 'New Workflow', bar: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30', button: 'violet', text: 'text-violet-600 dark:text-violet-400' },
    orange: { label: 'New Workflow', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30', button: 'orange', text: 'text-orange-600 dark:text-orange-400' },
    pink: { label: 'New Workflow', bar: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700 ring-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-500/30', button: 'pink', text: 'text-pink-600 dark:text-pink-400' },
    teal: { label: 'New Workflow', bar: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/30', button: 'teal', text: 'text-teal-600 dark:text-teal-400' },
};

// Compact folder picker for the editor header: file the current workflow into an
// existing folder, clear it, or create a brand-new folder inline. The dropdown
// animates in/out with framer-motion to match the rest of the app.
function FolderSelect({ value, options, onSelect, onCreate }) {
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState('');
    const ref = useRef(null);

    // Close on outside click so the dropdown behaves like a native menu.
    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setCreating(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const commitNew = () => {
        const name = draft.trim();
        if (!name) return;
        onCreate(name);
        setDraft('');
        setCreating(false);
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                title="File this workflow into a folder"
                className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100/80 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
            >
                <Folder size={13} aria-hidden="true" className="shrink-0 text-indigo-500 dark:text-indigo-400" />
                <span className="truncate">{value || 'No folder'}</span>
                <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        role="listbox"
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="absolute left-0 z-50 mt-1.5 w-56 origin-top overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                onSelect(null);
                                setOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <span>No folder</span>
                            {!value && (
                                <Check size={14} className="text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
                            )}
                        </button>
                        {options.length > 0 && <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />}
                        <div className="max-h-52 overflow-y-auto">
                            {options.map((name) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => {
                                        onSelect(name);
                                        setOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <Folder size={13} className="shrink-0 text-gray-400" aria-hidden="true" />
                                        <span className="truncate">{name}</span>
                                    </span>
                                    {value === name && (
                                        <Check
                                            size={14}
                                            className="shrink-0 text-indigo-500 dark:text-indigo-400"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
                        {creating ? (
                            <div className="flex items-center gap-1 p-1">
                                <input
                                    autoFocus
                                    type="text"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            commitNew();
                                        }
                                        if (e.key === 'Escape') {
                                            setCreating(false);
                                            setDraft('');
                                        }
                                    }}
                                    placeholder="Folder name…"
                                    className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                />
                                <button
                                    type="button"
                                    onClick={commitNew}
                                    className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                                >
                                    Add
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                            >
                                <Plus size={14} aria-hidden="true" />
                                New folder
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function WorkflowEditor() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const savedId = params.get('id');

    const template = type && templates[type] ? templates[type] : null;

    const { toast } = useToast();

    // Host UX effects the flow can invoke. `toast` renders a notification via
    // react-fancy's Toast provider; FlowRunnerUx turns it into both a runnable
    // executor (kind `ux_toast`) and an imperative `dispatch('toast', …)`.
    const ux = useFlowRunnerUx({
        effects: {
            toast: ({ title = 'Notification', description, variant = 'default', duration } = {}) =>
                // Default to the user's "Toast duration" setting (read fresh so it's
                // always current) unless a specific duration was provided.
                toast({ title, description, variant, duration: duration ?? toastDurationMs() }),
        },
        meta: {
            toast: { label: 'Toast', description: 'Show a toast notification.', icon: '🔔', category: 'output' },
        },
    });

    // Register the `ux_toast` palette node once so it can be dragged onto the
    // canvas. `registerKinds` is idempotent. We also swap the built-in palette
    // nodes' technical names for friendly ones (preserving their underlying
    // types) — see lib/friendlyPalette.
    useEffect(() => {
        ux.registerKinds();
        applyFriendlyNodeLabels();
        // Register the sticky-note kind so notes render (with Markdown) on the
        // canvas and appear in the palette. Idempotent.
        registerNoteKind();
    }, [ux]);

    // `running` drives the edge-flow animation (the canvas wrapper gets the
    // `flow-running` class while nodes are firing). FlowEditor owns its run loop
    // and exposes no run-state, so we infer it from the executor wrapper: each
    // node start refreshes a watchdog that switches the flow off shortly after
    // the last node (or immediately once a terminal output node finishes).
    const [running, setRunning] = useState(false);
    const stopTimer = useRef(null);

    // Ids of the outgoing edges a decision node chose during the current run.
    // We light these green so the branch the run actually took is unmistakable;
    // it's injected as a <style> rule keyed on each edge's data-id (the edges are
    // rendered by React Flow, same approach as the just-dropped port pulse). The
    // green persists after the run so the taken path stays visible; a fresh run
    // clears it (see handleNodeStart). `edgesRef` mirrors the live edges so the
    // run hooks can resolve a decision's branch → edge id without re-creating the
    // (otherwise stable) executor callbacks on every graph edit.
    const [doneEdgeIds, setDoneEdgeIds] = useState([]);
    const edgesRef = useRef([]);

    // Post-run path highlight. Once a run finishes we work out which nodes ran
    // (status 'done') and the edges between them, then:
    //   • `pathHighlight` holds the success edges, the edges/nodes that failed,
    //     and the success edges in traversal order (so the pulse can travel
    //     node-to-node). null when there's nothing highlighted.
    //   • `pathAnimating` is true only while the one-shot flowing pulse plays;
    //     when it flips false the edges settle into a static green path.
    // Both are cleared by the "Clear highlights" button and at the start of the
    // next run. Rendered as injected <style> (React Flow owns the SVG).
    const [pathHighlight, setPathHighlight] = useState(null);
    const [pathAnimating, setPathAnimating] = useState(false);

    // Run-history capture. `currentRunRef` accumulates the in-flight run (start
    // time, last activity, and each node's status) as the executor hooks fire;
    // it's finalized into `runHistory` (kept in state only, last 5) when the run
    // ends. `showHistory` toggles the slide-in panel.
    const currentRunRef = useRef(null);
    const [runHistory, setRunHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    // Beginner's guide modal (opened from the header, or auto-shown the very
    // first time someone opens a blank new workflow — see the effect below).
    const [showGuide, setShowGuide] = useState(false);
    // On small screens the tags input collapses behind an icon button.
    const [tagsOpen, setTagsOpen] = useState(false);

    // Auto-show the beginner's guide on a blank, brand-new workflow (no template,
    // no saved id) until it's been seen/dismissed. The "seen" flag is written
    // when the guide is closed (see closeGuide) rather than here, so a transient
    // remount on first load can't set the flag and then suppress the very popup
    // it was meant to trigger. Dismissing it once (the checkbox defaults to
    // checked) stops it from auto-showing again.
    useEffect(() => {
        if (savedId || type) return; // only blank, new workflows
        try {
            if (localStorage.getItem(GUIDE_SEEN_KEY) !== '1') setShowGuide(true);
        } catch {
            // localStorage unavailable (private mode, etc.) — just skip auto-show.
        }
        // Mount-only: the URL params are fixed for this editor instance.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist the guide's "Don't show this again" preference and close it.
    const closeGuide = (dontShowAgain) => {
        try {
            if (dontShowAgain) localStorage.setItem(GUIDE_SEEN_KEY, '1');
            else localStorage.removeItem(GUIDE_SEEN_KEY);
        } catch {
            // ignore storage failures
        }
        setShowGuide(false);
    };

    // Our own run feed. The editor's built-in feed is hidden (showFeed={false})
    // so we can give it collapse/clear controls. We capture the executors' log
    // events (via a wrapped `emit`, see withToasts) plus reconstruct the
    // "run started / complete" lines from the run lifecycle. Accumulates across
    // runs (like the built-in) until cleared. `feedCollapsed` persists on-page.
    const [feed, setFeed] = useState([]);
    // Start expanded only when "Run feed auto-expand" is on; otherwise it stays
    // collapsed until the user opens it (or, with auto-expand on, a run starts).
    const [feedCollapsed, setFeedCollapsed] = useState(() => !getSettings().runFeedAutoExpand);
    // Stable handlers so the memoized RunFeedPanel doesn't re-render every time
    // the editor does (setState setters are stable, so these never change).
    const toggleFeed = useCallback(() => setFeedCollapsed((c) => !c), []);
    const clearFeed = useCallback(() => setFeed([]), []);
    const feedIdRef = useRef(0);
    const appendFeed = useCallback((partial) => {
        setFeed((f) => {
            const entry = { id: `feed-${feedIdRef.current++}`, at: Date.now(), level: 'info', ...partial };
            const next = [...f, entry];
            return next.length > 300 ? next.slice(-300) : next;
        });
    }, []);
    const handleLog = useCallback(
        (event, node) => {
            const text = event.message ?? '';
            // Respect the "Show AI reasoning in run feed" preference (read live so a
            // change applies on the next run): when off, drop Claude's 🤖 narration
            // lines so only the standard node-execution messages remain.
            if (text.startsWith('🤖') && !getSettings().showAiReasoning) return;
            appendFeed({ level: event.level ?? 'info', text, nodeId: event.nodeId ?? node?.id });
        },
        [appendFeed],
    );

    // Count of nodes currently executing. The runner drives one node at a time,
    // but we track a count so the run-off logic is robust regardless: the run is
    // only considered finished once NOTHING is in flight. This is what stops a
    // slow node — e.g. an AI-Mode action awaiting Claude, which can easily take
    // longer than the watchdog window — from prematurely ending the run and
    // making the next node look like a brand-new run ("▶ run started" repeating).
    const inflightRef = useRef(0);

    // Arm the run-off watchdog: a short while after the last node finishes, drop
    // the edge-flow animation. Only armed when nothing is in flight (see
    // handleNodeDone/Error); any node starting cancels it (see handleNodeStart).
    // A terminal output node stops the flow immediately instead (handleNodeDone).
    const armRunOff = useCallback(() => {
        if (stopTimer.current) clearTimeout(stopTimer.current);
        // Scale with the animation-speed factor so a slow run doesn't stop the
        // edge-flow animation prematurely (and a fast one stops promptly).
        stopTimer.current = setTimeout(() => setRunning(false), 3500 * animSpeedFactor);
    }, []);

    const handleNodeStart = useCallback(
        (node) => {
            if (!currentRunRef.current) {
                currentRunRef.current = { startedAt: Date.now(), lastAt: Date.now(), nodes: {}, timings: {}, error: false };
                appendFeed({ level: 'info', text: '▶ run started' });
                // Clear the previous run's highlighted branch and the settled
                // path animation so this run paints its own path from scratch.
                setDoneEdgeIds([]);
                setPathHighlight(null);
                setPathAnimating(false);
                // Auto-open the run feed on Run when the preference is on (read
                // live so a settings change applies to the next run).
                if (getSettings().runFeedAutoExpand) setFeedCollapsed(false);
            }
            if (node?.id) {
                currentRunRef.current.nodes[node.id] = 'running';
                // Stamp the node's start time so we can measure its execution time.
                currentRunRef.current.timings[node.id] = { start: Date.now() };
            }
            currentRunRef.current.lastAt = Date.now();
            inflightRef.current += 1;
            // A node is actively running, so the run is definitely not over: keep
            // the animation on and cancel any pending run-off. Without this a node
            // slower than the watchdog (e.g. an AI-Mode Claude call) would let the
            // run finalize mid-flight and the next node re-emit "run started".
            if (stopTimer.current) {
                clearTimeout(stopTimer.current);
                stopTimer.current = null;
            }
            setRunning(true);
        },
        [appendFeed],
    );

    const handleNodeDone = useCallback(
        (node, result) => {
            if (currentRunRef.current && node?.id) {
                currentRunRef.current.nodes[node.id] = 'done';
                currentRunRef.current.lastAt = Date.now();
                // Measure how long the node took and surface it in the run feed
                // with a clock icon (see RunFeedPanel's timing rows).
                const t = currentRunRef.current.timings[node.id];
                if (t && t.durationMs == null) {
                    t.durationMs = Math.max(0, Date.now() - t.start);
                    appendFeed({ nodeId: node.id, durationMs: t.durationMs, level: 'info' });
                }
            }
            // For a decision node, light the outgoing edge(s) on the branch it
            // chose. Decision executors return `{ branch: 'true' | 'false' }`,
            // which matches the edges' `sourceHandle`, so the taken branch maps
            // straight to its edge ids.
            if (node?.data?.kind === 'decision' && result?.branch != null) {
                const chosen = edgesRef.current
                    .filter((e) => e.source === node.id && (e.sourceHandle ?? null) === result.branch)
                    .map((e) => e.id);
                if (chosen.length) setDoneEdgeIds((prev) => [...new Set([...prev, ...chosen])]);
            }
            // Celebrate only a *successful* terminal output: this is the run's
            // success path (errors route to handleNodeError, never here), the node
            // is a terminal output, and its label reads as a positive outcome
            // ("Order Complete!", "Bug Closed", "Approved", "Resolved", "…Done").
            // Negative output nodes ("Order Declined", "Deny Refund", "Request
            // Changes") fall through and stay quiet. A short delay lets the final
            // node's edge/animation land first so the burst feels like a payoff.
            const label = node?.data?.label ?? '';
            const isSuccessfulCompletion =
                node?.data?.kind === 'output' && /\b(complete|closed|approved|resolved|done)\b/i.test(label);
            if (isSuccessfulCompletion) {
                setTimeout(fireConfetti, 300);
            }
            if (inflightRef.current > 0) inflightRef.current -= 1;
            // Terminal output reached — stop the edge flow promptly.
            if (node?.data?.kind === 'output') {
                if (stopTimer.current) {
                    clearTimeout(stopTimer.current);
                    stopTimer.current = null;
                }
                // A run reached its end — tally it for the analytics dashboard.
                incrementRunsCompleted();
                setRunning(false);
                return;
            }
            // Otherwise the run is only over once nothing is still in flight. If
            // the next node starts first it cancels this (see handleNodeStart), so
            // the run stays a single continuous run across slow/AI nodes.
            if (inflightRef.current === 0) armRunOff();
        },
        [armRunOff, appendFeed],
    );

    const handleNodeError = useCallback(
        (node) => {
            if (currentRunRef.current && node?.id) {
                currentRunRef.current.nodes[node.id] = 'error';
                currentRunRef.current.lastAt = Date.now();
                currentRunRef.current.error = true;
                const t = currentRunRef.current.timings[node.id];
                if (t && t.durationMs == null) t.durationMs = Math.max(0, Date.now() - t.start);
            }
            if (inflightRef.current > 0) inflightRef.current -= 1;
            if (inflightRef.current === 0) armRunOff();
        },
        [armRunOff],
    );

    useEffect(() => () => stopTimer.current && clearTimeout(stopTimer.current), []);

    // For a workflow opened by id (a saved workflow, no `?type=`), `detectedType`
    // is the template it was recognized as during the DB load below — so its
    // rich executors/toasts/accent still apply. null for new/blank workflows and
    // unrecognized graphs. `effectiveType` is whichever applies: the explicit URL
    // type (templates) or the detected one (saved workflows).
    const [detectedType, setDetectedType] = useState(null);
    const effectiveType = type ?? detectedType;
    // User preferences (read once at mount). A brand-new/blank workflow uses the
    // chosen default accent; templates/saved workflows keep their own accent.
    const userSettings = useMemo(() => getSettings(), []);
    const blankAccent = SETTINGS_ACCENT_THEMES[userSettings.accent] || neutralAccent;
    const accent = (effectiveType && accentThemes[effectiveType]) || blankAccent;

    // Canvas color theme — kept in its own reactive state (rather than the
    // read-once `userSettings`) so changing it on the Settings page applies to an
    // open editor immediately, without a reload. We sync on the same-tab settings
    // event and the cross-tab `storage` event.
    const [canvasTheme, setCanvasTheme] = useState(() => getSettings().canvasTheme);
    useEffect(() => {
        const sync = () => setCanvasTheme(getSettings().canvasTheme);
        window.addEventListener(SETTINGS_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(SETTINGS_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    // ── Collapsible / pinnable header ──────────────────────────────────────
    // `headerCollapsed` pins the header shut to a slim bar with a few essential
    // actions (persisted to settings.headerCollapsed). It stays collapsed until the
    // user clicks the expand button — no hover preview.
    const [headerCollapsed, setHeaderCollapsed] = useState(() => getSettings().headerCollapsed);
    const toggleHeaderCollapsed = useCallback(() => {
        setHeaderCollapsed((prev) => {
            const next = !prev;
            saveSettings({ headerCollapsed: next });
            return next;
        });
    }, []);

    // Apply the "Animation speed" preference to the module-level run pacing.
    useEffect(() => {
        setAnimSpeedFactor(animationSpeedFactor(userSettings));
    }, [userSettings]);

    // Ask the server (once) whether an Anthropic key is configured, to pick AI
    // Mode vs Demo Mode. Any failure defaults to Demo Mode so runs never break.
    // The "Force Demo Mode" preference short-circuits this: when on, we stay in
    // Demo Mode (mock data, "Demo Mode" badge) even if a key exists.
    useEffect(() => {
        if (userSettings.forceDemo) {
            setAiEnabled(false);
            setAiModeEnabled(false);
            return;
        }
        let active = true;
        fetch('/api/agent/status', { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((data) => {
                if (!active) return;
                const enabled = !!data?.ai_enabled;
                setAiEnabled(enabled);
                setAiModeEnabled(enabled);
            })
            .catch(() => {
                if (!active) return;
                setAiEnabled(false);
                setAiModeEnabled(false);
            });
        return () => {
            active = false;
        };
    }, [userSettings.forceDemo]);

    // A node-deletion awaiting confirmation when "Confirm before deleting nodes"
    // is on: { next: <graph with the node removed>, removed: [<node>, …] }.
    const [pendingNodeDelete, setPendingNodeDelete] = useState(null);

    // Template executors, each wrapped to fire its toast as it finishes, merged
    // with the UX effect executors (`ux_toast`) so hand-placed effect nodes run
    // too. Memoized so the registry keeps a stable identity across renders.
    const executors = useMemo(() => {
        const base = withAgent((effectiveType && executorsByType[effectiveType]) || genericExecutors);
        const meta = (effectiveType && toastMetaByType[effectiveType]) || {};
        const fire = (notification) => ux.dispatch('toast', notification);
        return {
            ...withToasts(base, meta, fire, {
                onNodeStart: handleNodeStart,
                onNodeDone: handleNodeDone,
                onNodeError: handleNodeError,
                onLog: handleLog,
            }),
            ...ux.executors,
        };
    }, [effectiveType, ux, handleNodeStart, handleNodeDone, handleNodeError, handleLog]);

    // A brand-new, blank workflow (no template, no saved id) seeds its name and
    // tags from the user's Workflow Defaults; templates and saved workflows keep
    // their own values.
    const isBlankNew = !type && !savedId;
    const [graph, setGraph] = useState(template ?? blankGraph);
    const [name, setName] = useState(template?.name ?? (isBlankNew ? userSettings.defaultNamePrefix : ''));
    const [description, setDescription] = useState(template?.description ?? '');
    const [tags, setTags] = useState(template?.tags ?? (isBlankNew ? userSettings.defaultTags : []));
    // Which folder this workflow is filed under (null = unfiled). Persisted via
    // the `folder` column. `customFolders` are user-created folder names kept in
    // localStorage so they can be picked even before any workflow lives in them.
    const [folder, setFolder] = useState(template?.folder ?? null);
    const [customFolders, setCustomFolders] = useState(() => getCustomFolders());
    const [dbId, setDbId] = useState(null);
    const [status, setStatus] = useState(null);

    // Keep edgesRef pointing at the live edges so the run hooks (handleNodeDone)
    // can map a decision's chosen branch to its outgoing edge id without taking
    // a dependency on `graph` — which would otherwise rebuild the executors on
    // every edit.
    useEffect(() => {
        edgesRef.current = graph.edges;
    }, [graph.edges]);

    // True until the user makes their first manual edit. It starts true on mount
    // and is reset to true whenever a template or saved workflow is loaded. While
    // it's true the auto-save and the "unsaved changes" indicator stay dormant, so
    // merely *loading* content — a template already has a name + nodes, which
    // would otherwise look like unsaved work — never schedules a save behind the
    // user's back. The first user-initiated edit (canvas, config panel, name,
    // description, tags, or import) flips it to false. The manual Save button is
    // independent of this flag and always works.
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    // Mark the workflow as touched by the user. Idempotent — after the first call
    // it's a no-op (the setter bails on an unchanged value).
    const markEdited = useCallback(() => setIsInitialLoad(false), []);

    // AI Mode vs Demo Mode: null = still checking, true = server has an
    // ANTHROPIC_API_KEY (action nodes call Claude), false = mock-only.
    const [aiEnabled, setAiEnabled] = useState(null);

    // Keep the module-level name (sent to the agent endpoint as workflow_name)
    // in sync with the editable workflow name.
    useEffect(() => {
        setCurrentWorkflowName(name);
    }, [name]);

    // Auto-save bookkeeping. `lastSavedSig` is the fingerprint of the content as
    // of the last successful save (null until the first save / DB load); the
    // current content differing from it means there are unsaved changes.
    // `isSaving` drives the "Saving…" indicator; `savingRef` guards against a
    // manual and an auto save overlapping. `autoSaveTick` is bumped on a manual
    // save to restart the 30s countdown.
    const [lastSavedSig, setLastSavedSig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const savingRef = useRef(false);
    const [autoSaveTick, setAutoSaveTick] = useState(0);
    // Drives the BPMN export button's loading state. The export can save the
    // workflow first (and auto-name it via Claude), then fetch + download — slow
    // enough that the button must show progress and lock to avoid double-clicks.
    const [exportingBpmn, setExportingBpmn] = useState(false);

    // Toggles the slide-in "View Code" panel (JSON / BPMN source view).
    const [showCodePanel, setShowCodePanel] = useState(false);

    // Brief "Saved!" confirmation shown on the Save button after a successful
    // manual save; clears itself after 2s. framer-motion animates the swap.
    const [justSaved, setJustSaved] = useState(false);
    const justSavedTimerRef = useRef(null);
    useEffect(() => () => clearTimeout(justSavedTimerRef.current), []);

    // FlowEditor runs in CONTROLLED mode (`value={graph}` + `onChange`), so the
    // canvas always reflects `graph` — that's what lets the config panel edit a
    // node and have the change show up live. A wholesale replacement (import)
    // still bumps this key to force a remount, purely so React Flow re-runs its
    // initial `fitView` and frames the new graph. Ordinary edits never bump it.
    const [editorKey, setEditorKey] = useState(0);

    // The crux of correct load-by-id: because the editor only reads `initial`
    // once at mount, we must NOT mount it with the blank graph and then try to
    // swap the fetched data in — the uncontrolled editor ignores the later prop
    // change and the canvas stays empty. Instead we gate the editor behind
    // `ready`: false while a saved workflow is still loading, flipping to true
    // only once `graph` already holds the fetched nodes. The editor then mounts
    // for the first time already seeded with the real data. Templates / new
    // workflows have their data synchronously, so they start ready.
    const [ready, setReady] = useState(!savedId);

    // Load (or re-load) the saved workflow whenever the `?id=` changes. Keyed on
    // `savedId` rather than `[]` so that navigating from one saved workflow to
    // another — when Inertia preserves this component instead of remounting it —
    // actually fetches the new graph. `ignore` guards against an out-of-order
    // response if the id changes again before the fetch resolves.
    useEffect(() => {
        if (!savedId) {
            setReady(true);
            return;
        }
        setReady(false);
        let ignore = false;
        fetch(`/workflows/${savedId}`)
            // Reject non-2xx (deleted record → 404, server error) so it lands in
            // the catch below instead of parsing an error body and feeding the
            // canvas an undefined graph.
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((data) => {
                if (ignore) return;
                const loaded = { nodes: data.nodes, edges: data.edges };
                setGraph(loaded);
                // Recognize a saved-from-template graph so its rich run still works.
                setDetectedType(detectTemplateType(data.nodes));
                resetHistory(loaded); // start a fresh undo history at the loaded state
                setName(data.name);
                setDescription(data.description ?? '');
                setTags(data.tags ?? []);
                setFolder(data.folder ?? null);
                setDbId(data.id);
                // Freshly loaded content is, by definition, already saved.
                setLastSavedSig(
                    workflowFingerprint(
                        data.name,
                        data.description ?? '',
                        data.tags ?? [],
                        data.folder ?? null,
                        data.nodes,
                        data.edges,
                    ),
                );
                // A fresh load is not a user edit — keep auto-save / the unsaved
                // indicator dormant until the user actually changes something.
                setIsInitialLoad(true);
                setStatus('Workflow loaded');
                setReady(true);
            })
            .catch(() => {
                // Deleted record, network error, or bad JSON — don't leave the
                // editor stuck on the loading placeholder. Surface it and fall
                // back to an empty, usable canvas.
                if (ignore) return;
                setStatus('Could not load this workflow — starting a blank canvas.');
                setReady(true);
            });
        return () => {
            ignore = true;
        };
    }, [savedId]);

    // The node the user has selected on the canvas. In controlled mode React Flow
    // marks the clicked node with `selected: true` and routes that through
    // `onChange`, so we can read the selection straight off `graph`.
    const selectedNode = useMemo(() => graph.nodes.find((n) => n.selected) ?? null, [graph.nodes]);

    // ── Undo / redo history ─────────────────────────────────────────────────
    // fancy-flow has no undo API, so we keep our own. The editor is controlled,
    // so every change flows through `graph`; we snapshot it into past/future
    // stacks. `committedRef` is the current baseline; `latestGraphRef` is the
    // most recent (possibly mid-burst) graph. Commits are debounced so a drag or
    // a burst of typing collapses into a single undo step, and de-duplicated by
    // `graphSignature` so selection/hover/re-measure never create a step.
    const pastRef = useRef([]);
    const futureRef = useRef([]);
    const committedRef = useRef(template ?? blankGraph);
    const latestGraphRef = useRef(template ?? blankGraph);
    const commitTimerRef = useRef(null);
    const [histVersion, setHistVersion] = useState(0);

    const commitHistory = () => {
        commitTimerRef.current = null;
        const g = latestGraphRef.current;
        const base = committedRef.current;
        if (graphSignature(g.nodes, g.edges) === graphSignature(base.nodes, base.edges)) return;
        pastRef.current = [...pastRef.current, base].slice(-MAX_HISTORY);
        futureRef.current = [];
        committedRef.current = g;
        setHistVersion((v) => v + 1);
    };

    // Record a graph change (from the canvas or the config panel) for history.
    const scheduleCommit = (g) => {
        latestGraphRef.current = g;
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
        commitTimerRef.current = setTimeout(commitHistory, 500);
    };

    // The editor's onChange — keep the canvas controlled and feed history. When
    // "Confirm before deleting nodes" is on and this change removes one or more
    // nodes, we hold the change and pop a confirmation instead of applying it.
    // Because the editor is controlled, not calling setGraph leaves the node(s)
    // on the canvas until the user confirms.
    const onGraphChange = (g) => {
        if (userSettings.confirmNodeDelete) {
            const removed = graph.nodes.filter((n) => !g.nodes.some((gn) => gn.id === n.id));
            if (removed.length > 0) {
                setPendingNodeDelete({ next: g, removed });
                return;
            }
        }
        // Treat this as the user's first edit only when the graph's meaningful
        // content actually changed. React Flow emits onChange on the initial
        // render (measuring nodes, syncing selection) with no content change — that
        // must NOT count, or loading a template/saved workflow would immediately
        // look "unsaved" and auto-save. graphSignature ignores runtime-only fields.
        if (isInitialLoad && graphSignature(g.nodes, g.edges) !== graphSignature(graph.nodes, graph.edges)) {
            markEdited();
        }
        setGraph(g);
        scheduleCommit(g);
    };

    // Apply or cancel a held node deletion.
    const confirmNodeDelete = () => {
        if (!pendingNodeDelete) return;
        const { next } = pendingNodeDelete;
        setPendingNodeDelete(null);
        markEdited(); // confirming a node deletion is a user edit
        setGraph(next);
        scheduleCommit(next);
    };
    const cancelNodeDelete = () => setPendingNodeDelete(null);

    // Discard history (used on a wholesale graph swap: db load / import).
    const resetHistory = (g) => {
        if (commitTimerRef.current) {
            clearTimeout(commitTimerRef.current);
            commitTimerRef.current = null;
        }
        pastRef.current = [];
        futureRef.current = [];
        committedRef.current = g;
        latestGraphRef.current = g;
        setHistVersion((v) => v + 1);
    };

    const undo = () => {
        // Flush any pending edit so it becomes its own undo step first.
        if (commitTimerRef.current) {
            clearTimeout(commitTimerRef.current);
            commitHistory();
        }
        if (pastRef.current.length === 0) return;
        const prev = pastRef.current[pastRef.current.length - 1];
        pastRef.current = pastRef.current.slice(0, -1);
        futureRef.current = [committedRef.current, ...futureRef.current];
        committedRef.current = prev;
        latestGraphRef.current = prev;
        setGraph(prev);
        setHistVersion((v) => v + 1);
        toast({ title: 'Undo', variant: 'info' });
    };

    const redo = () => {
        if (commitTimerRef.current) {
            clearTimeout(commitTimerRef.current);
            commitHistory();
        }
        if (futureRef.current.length === 0) return;
        const next = futureRef.current[0];
        futureRef.current = futureRef.current.slice(1);
        pastRef.current = [...pastRef.current, committedRef.current];
        committedRef.current = next;
        latestGraphRef.current = next;
        setGraph(next);
        setHistVersion((v) => v + 1);
        toast({ title: 'Redo', variant: 'info' });
    };

    // histVersion is read so the button-enabled states recompute on each change.
    void histVersion;
    const canUndo = pastRef.current.length > 0;
    const canRedo = futureRef.current.length > 0;

    // Global keyboard shortcuts. The handlers live on a ref (assigned further
    // down, once save/export exist) so the listener mounts once but always calls
    // the latest closures. ⌘S / ⌘E work anywhere (and pre-empt the browser's own
    // save/search); ⌘Z / ⌘⇧Z are skipped while typing so native text undo still
    // works; Escape closes any open panel.
    const shortcutsRef = useRef({});
    useEffect(() => {
        const onKey = (e) => {
            const s = shortcutsRef.current;
            if (e.key === 'Escape') {
                s.closePanels?.();
                return;
            }
            if (!(e.metaKey || e.ctrlKey)) return;
            const k = e.key.toLowerCase();
            if (k === 's') {
                e.preventDefault();
                s.save?.();
                return;
            }
            if (k === 'e') {
                e.preventDefault();
                s.doExport?.();
                return;
            }
            if (k === 'z') {
                const el = e.target;
                const tag = (el?.tagName || '').toLowerCase();
                if (tag === 'input' || tag === 'textarea' || el?.isContentEditable) return;
                e.preventDefault();
                if (e.shiftKey) s.redo?.();
                else s.undo?.();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => () => commitTimerRef.current && clearTimeout(commitTimerRef.current), []);

    // Apply a config-panel edit: replace just the edited node in `graph`. Because
    // the editor is controlled, this immediately re-renders the node on the
    // canvas, and the new data is part of `graph` when the workflow is saved. The
    // change is also recorded for undo/redo.
    const updateNode = (nextNode) => {
        const next = { ...graph, nodes: graph.nodes.map((n) => (n.id === nextNode.id ? nextNode : n)) };
        markEdited(); // editing a node in the config panel is a user edit
        setGraph(next);
        scheduleCommit(next);
    };

    // Drop a fresh sticky note onto the canvas (the "Add Note" toolbar button).
    // We don't have the React Flow viewport here (FlowEditor owns it), so we
    // place the note near the centroid of the existing nodes — which fitView has
    // framed — with a small offset, and a per-add jitter so repeated notes don't
    // stack exactly. The note comes pre-selected, so the config panel opens
    // straight to it; the new-node pulse and undo/redo history work as usual.
    const addNote = () => {
        const nodes = graph.nodes;
        let position = { x: 80, y: 80 };
        if (nodes.length > 0) {
            const cx = nodes.reduce((s, n) => s + (n.position?.x ?? 0), 0) / nodes.length;
            const cy = nodes.reduce((s, n) => s + (n.position?.y ?? 0), 0) / nodes.length;
            const jitter = (nodes.length % 5) * 28;
            position = { x: Math.round(cx + 60 + jitter), y: Math.round(cy - 40 + jitter) };
        }
        const note = makeNoteNode(position);
        const next = {
            ...graph,
            // Clear any existing selection so the new note is the only selected node.
            nodes: [...graph.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), note],
        };
        markEdited(); // adding a note is unsaved work
        setGraph(next);
        scheduleCommit(next);
    };

    // Apply a graph proposed by the Claude chat assistant. The backend has
    // already validated the shape ({ nodes, edges }), so we trust it here, strip
    // any stray runtime selection, record it for undo/redo (so the user can undo
    // an AI change), and remount the editor (editorKey bump) so React Flow
    // re-frames the new graph — just like an import. Returns true so the chat
    // panel can show an "applied" badge.
    const applyAiWorkflow = (aiGraph) => {
        if (!aiGraph || !Array.isArray(aiGraph.nodes) || aiGraph.nodes.length === 0) return false;
        const next = {
            nodes: aiGraph.nodes.map((n) => ({ ...n, selected: false })),
            edges: Array.isArray(aiGraph.edges) ? aiGraph.edges : [],
        };
        markEdited(); // an AI-applied change is unsaved work
        setGraph(next);
        scheduleCommit(next); // record as an undoable step
        setEditorKey((k) => k + 1); // remount so fitView frames the new graph
        return true;
    };

    // Trigger the real FlowEditor Run button from outside (e.g. the chat panel),
    // so a chat-initiated run is the exact same run as clicking Run — animations,
    // run feed, run history and toasts all behave identically. We click the
    // editor's own run control (it owns the run loop) rather than re-implementing
    // it. Returns true if a run started, false if it's already running (the run
    // button is swapped for Cancel mid-run) or the control isn't mounted yet.
    const triggerCanvasRun = () => {
        const btn = editorBoxRef.current?.querySelector('.ff-run-controls__btn--run');
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    };

    // Run the workflow straight from the chat's `/run` command, returning a
    // summary the chat can show. Unlike the canvas Run button — which needs a
    // trigger node to start — this is `/run`-as-trigger: when the graph has no
    // trigger node (a blank or incomplete workflow), it injects a synthetic
    // trigger event ({ startedAt, source: 'chat' }) into every entry-point node
    // (one with no incoming edge), so execution starts from the first connected
    // node. When a trigger node IS present it's an entry point too, so the run
    // starts there as normal and no synthetic event is needed.
    //
    // We execute against the SAME `executors` registry as the canvas (the one
    // wrapped with run hooks), so the run feed, toasts, edge-flow animation,
    // run history and confetti all behave exactly like clicking Run. Returns
    // { ok, error, totalNodes, nodesRun, injectedTrigger, empty } for the chat
    // to summarize. The existing Run button and AI auto-run are untouched.
    const runFromChat = async () => {
        const g = latestGraphRef.current ?? { nodes: [], edges: [] };
        const allNodes = Array.isArray(g.nodes) ? g.nodes : [];
        const edges = Array.isArray(g.edges) ? g.edges : [];
        const kindOf = (n) => n?.type ?? n?.data?.kind;
        // Note nodes are annotations — they never execute, so they don't count
        // toward the "X of Y steps ran" tally.
        const runnableCount = allNodes.filter((n) => kindOf(n) !== 'note').length;

        if (runnableCount === 0) {
            return { ok: false, empty: true, totalNodes: 0, nodesRun: 0, injectedTrigger: false };
        }

        const hasTrigger = allNodes.some((n) => kindOf(n) === 'trigger');
        let initialInputs;
        if (!hasTrigger) {
            const targets = new Set(edges.map((e) => e.target));
            const event = { startedAt: Date.now(), source: 'chat' };
            initialInputs = {};
            for (const n of allNodes) {
                if (!targets.has(n.id)) initialInputs[n.id] = { in: event };
            }
            appendFeed({ level: 'info', text: '▶ /run injected a chat trigger event (no trigger node)' });
        }

        const result = await runFlow(g, executors, () => {}, initialInputs ? { initialInputs } : {});
        return {
            ok: result.ok,
            error: result.error,
            totalNodes: runnableCount,
            nodesRun: Object.keys(result.outputs ?? {}).length,
            injectedTrigger: !hasTrigger,
        };
    };

    // Stable per-workflow key for persisting the chat history. Prefer the saved
    // id (URL or db) so it survives navigating away and back; fall back to the
    // name for brand-new, unsaved workflows.
    const chatStorageKey = savedId
        ? `id:${savedId}`
        : dbId
          ? `id:${dbId}`
          : `name:${name.trim() || 'untitled'}`;

    // Finalize a run into history when `running` falls back to false. We build a
    // per-node result from the live graph: nodes the hooks reported (done/error,
    // or a started-but-unreported node treated as done) and everything else
    // skipped. Duration uses the last activity time so the run-off watchdog delay
    // doesn't inflate it. Kept to the 5 most recent.
    useEffect(() => {
        if (running || !currentRunRef.current) return;
        const run = currentRunRef.current;
        currentRunRef.current = null;
        inflightRef.current = 0; // run is over — clear any lingering in-flight count
        const nodes = latestGraphRef.current.nodes.map((n) => {
            let status = run.nodes[n.id] ?? 'skipped';
            if (status === 'running') status = 'done';
            // Per-node execution time (ms). null for nodes that never ran.
            const timing = run.timings[n.id];
            const durationMs = timing?.durationMs != null ? Math.round(timing.durationMs) : null;
            return { id: n.id, label: n.data?.label ?? n.id, status, durationMs };
        });
        const success = !run.error && !nodes.some((n) => n.status === 'error');
        const entry = {
            id: `run-${run.startedAt}`,
            startedAt: run.startedAt,
            durationSec: Math.max(0, (run.lastAt - run.startedAt) / 1000),
            totalMs: Math.max(0, Math.round(run.lastAt - run.startedAt)),
            success,
            nodes,
        };
        setRunHistory((h) => [entry, ...h].slice(0, 5));
        appendFeed({ level: success ? 'info' : 'error', text: success ? '✓ run complete' : '✗ run failed' });

        // Highlight the path the run actually took. Success edges connect two
        // executed nodes; an error edge is one whose target failed. Then animate
        // a one-shot flowing pulse along the success path (ordered so it travels
        // node-to-node) before it settles into the static green highlight.
        const doneSet = new Set(nodes.filter((n) => n.status === 'done').map((n) => n.id));
        const errorSet = new Set(nodes.filter((n) => n.status === 'error').map((n) => n.id));
        const edges = latestGraphRef.current.edges ?? [];
        const successEdges = edges.filter((e) => doneSet.has(e.source) && doneSet.has(e.target));
        const errorEdges = edges.filter(
            (e) => errorSet.has(e.target) && (doneSet.has(e.source) || errorSet.has(e.source)),
        );
        if (successEdges.length || errorEdges.length || errorSet.size) {
            const orderedEdgeIds = orderPathEdges(successEdges);
            setPathHighlight({
                nonce: run.startedAt,
                successEdgeIds: successEdges.map((e) => e.id),
                errorEdgeIds: errorEdges.map((e) => e.id),
                errorNodeIds: [...errorSet],
                orderedEdgeIds,
            });
            setPathAnimating(orderedEdgeIds.length > 0);
        }
    }, [running, appendFeed]);

    // End the one-shot pulse once it has played the full sequence, leaving the
    // static green path behind. Keyed on the highlight's nonce so each new run
    // restarts the timer; the flowing-style block is removed when this flips off.
    useEffect(() => {
        if (!pathHighlight || !pathAnimating) return;
        const n = pathHighlight.orderedEdgeIds.length;
        const totalMs = (Math.max(0, n - 1) * PATH_PULSE_STEP_S + PATH_PULSE_DUR_S) * 1000 + 200;
        const t = setTimeout(() => setPathAnimating(false), totalMs);
        return () => clearTimeout(t);
    }, [pathHighlight, pathAnimating]);

    // Wipe the run-path highlighting (success path + failure markers). Bound to
    // the "Clear highlights" toolbar button.
    const clearHighlights = useCallback(() => {
        setPathHighlight(null);
        setPathAnimating(false);
        setDoneEdgeIds([]);
    }, []);

    // The editor box, so the "Drag to connect" hint can position itself against
    // the node's output port.
    const editorBoxRef = useRef(null);

    // Apply the saved "Default zoom level" once the canvas has mounted. The
    // built-in fitView frames the graph on load (and on editorKey remounts, e.g.
    // after an import); we then nudge the zoom to the user's preference. We poll
    // for a short window so a slightly-late fitView can't leave the wrong zoom —
    // applyCanvasZoom is a no-op once already at target, so settled frames are
    // cheap, and we stop early once it's held steady.
    useEffect(() => {
        if (!ready) return;
        const target = defaultZoomLevel(userSettings);
        let raf = 0;
        let settled = 0;
        const start = Date.now();
        const tick = () => {
            const container = editorBoxRef.current;
            const applied = applyCanvasZoom(container, target);
            const surface = container?.querySelector('.react-flow__renderer');
            const atTarget = applied && surface?.__zoom && Math.abs((surface.__zoom.k || 1) - target) / target < 0.01;
            settled = atTarget ? settled + 1 : 0;
            if (settled < 8 && Date.now() - start < 1200) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [ready, editorKey, userSettings]);

    // Briefly pulse the ports of a node the moment it's dropped onto the canvas.
    // We detect a drop as "exactly one new node id appeared" — a wholesale load
    // or import adds many at once, so those don't trigger it.
    const [pulseNodeId, setPulseNodeId] = useState(null);
    const prevNodeIdsRef = useRef(null);
    useEffect(() => {
        const ids = new Set(graph.nodes.map((n) => n.id));
        const prev = prevNodeIdsRef.current;
        if (prev) {
            const added = [...ids].filter((id) => !prev.has(id));
            if (added.length === 1) setPulseNodeId(added[0]);
        }
        prevNodeIdsRef.current = ids;
    }, [graph.nodes]);

    // Clear the pulse after it has played (two ~0.85s iterations).
    useEffect(() => {
        if (!pulseNodeId) return;
        const t = setTimeout(() => setPulseNodeId(null), 1800);
        return () => clearTimeout(t);
    }, [pulseNodeId]);

    // ── Smart node suggestions ──────────────────────────────────────────────
    // A second after the user drops a node, ask Claude what the most logical next
    // step would be and float a "+ Suggested: …" chip beside the new node. Clicking
    // it adds that node, wired to the one just dropped. Only ever one suggestion at
    // a time; it auto-dismisses after 5s, and dropping another node replaces it.
    const [nodeSuggestion, setNodeSuggestion] = useState(null); // { anchorId, type, label }
    const suggestTimerRef = useRef(null); // the 1s "wait before asking" timer
    const suggestDismissRef = useRef(null); // the 5s auto-dismiss timer
    const suggestSeqRef = useRef(0); // bumped to invalidate any in-flight request

    // Cancel any pending/active suggestion work and invalidate in-flight requests.
    const cancelNodeSuggestion = () => {
        if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
        if (suggestDismissRef.current) clearTimeout(suggestDismissRef.current);
        suggestTimerRef.current = null;
        suggestDismissRef.current = null;
        suggestSeqRef.current += 1;
    };
    const dismissNodeSuggestion = () => {
        cancelNodeSuggestion();
        setNodeSuggestion(null);
    };

    // Parse Claude's reply into a { type, label } suggestion. Tolerant of prose
    // around the JSON and of unquoted keys (`{type: "action", label: "X"}`).
    // Returns null when nothing usable is found (e.g. the mock no-API-key reply),
    // so no chip is shown.
    const parseNodeSuggestion = (reply) => {
        if (typeof reply !== 'string') return null;
        const match = reply.match(/\{[\s\S]*\}/);
        if (!match) return null;
        let obj = null;
        try {
            obj = JSON.parse(match[0]);
        } catch {
            try {
                obj = JSON.parse(match[0].replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":'));
            } catch {
                return null;
            }
        }
        const validTypes = ['trigger', 'action', 'decision', 'output'];
        const type = typeof obj?.type === 'string' && validTypes.includes(obj.type) ? obj.type : 'action';
        const label = typeof obj?.label === 'string' ? obj.label.trim() : '';
        if (!label || label.length > 60) return null;
        return { type, label };
    };

    // Ask Claude for the next-step suggestion based on the live graph.
    const fetchNodeSuggestion = async () => {
        try {
            const res = await fetch('/api/workflow/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    message:
                        'Given this workflow so far, what single node type and label would make the most logical next step? Respond with ONLY a JSON object like: {type: "action", label: "Your suggested label"}. Nothing else.',
                    workflow_name: name || 'Workflow',
                    workflow: {
                        nodes: latestGraphRef.current?.nodes ?? [],
                        edges: latestGraphRef.current?.edges ?? [],
                    },
                }),
            });
            if (!res.ok) return null;
            const data = await res.json();
            return parseNodeSuggestion(data?.reply);
        } catch {
            return null;
        }
    };

    // Schedule a suggestion for the just-dropped node: wait 1s, ask Claude, then
    // (if still relevant) show the chip and arm the 5s auto-dismiss.
    const scheduleNodeSuggestion = (anchorId) => {
        cancelNodeSuggestion();
        setNodeSuggestion(null);
        const seq = suggestSeqRef.current;
        suggestTimerRef.current = setTimeout(async () => {
            const result = await fetchNodeSuggestion();
            // Superseded by a newer drop / dismissal while we were waiting?
            if (suggestSeqRef.current !== seq) return;
            // The anchor node must still be on the canvas to pin the chip to.
            if (!result || !latestGraphRef.current?.nodes?.some((n) => n.id === anchorId)) return;
            setNodeSuggestion({ anchorId, ...result });
            suggestDismissRef.current = setTimeout(() => {
                if (suggestSeqRef.current === seq) setNodeSuggestion(null);
            }, 5000);
        }, 1000);
    };

    // Add the suggested node to the canvas, wired to its anchor. Lays it one step
    // (~260px) to the right at the anchor's height, mirroring the AI layout
    // convention; a decision anchor needs a "true" sourceHandle on the new edge.
    const acceptNodeSuggestion = () => {
        const s = nodeSuggestion;
        if (!s) return;
        dismissNodeSuggestion();
        const anchor = graph.nodes.find((n) => n.id === s.anchorId);
        if (!anchor) return;
        const pos = anchor.position ?? { x: 0, y: 0 };
        const newId = `${s.type}-${graph.nodes.length}-${suggestSeqRef.current}`;
        const newNode = {
            id: newId,
            type: s.type,
            position: { x: (pos.x ?? 0) + 260, y: pos.y ?? 0 },
            data: { kind: s.type, label: s.label },
            selected: true,
        };
        const newEdge = { id: `e-${s.anchorId}-${newId}`, source: s.anchorId, target: newId };
        if ((anchor.type ?? anchor.data?.kind) === 'decision') newEdge.sourceHandle = 'true';
        const next = {
            nodes: [...graph.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), newNode],
            edges: [...graph.edges, newEdge],
        };
        markEdited(); // adding a node is unsaved work
        setGraph(next);
        scheduleCommit(next);
    };

    // Detect a drop (exactly one brand-new node — bulk load/import/AI-apply add
    // many at once) and schedule a suggestion for it. Dropping another node here
    // re-runs scheduleNodeSuggestion, which cancels the previous one. Note nodes
    // are annotations, so they never get a suggestion.
    const prevSuggestNodeIdsRef = useRef(null);
    useEffect(() => {
        const ids = new Set(graph.nodes.map((n) => n.id));
        const prev = prevSuggestNodeIdsRef.current;
        prevSuggestNodeIdsRef.current = ids;
        if (!prev) return; // first render / initial load — not a user drop
        const added = [...ids].filter((id) => !prev.has(id));
        if (added.length !== 1) return;
        // Confirmed demo mode (no API key) — skip the call; it'd only mock-reply.
        if (aiEnabled === false) return;
        const node = graph.nodes.find((n) => n.id === added[0]);
        const kind = node?.type ?? node?.data?.kind;
        if (!node || kind === 'note') {
            dismissNodeSuggestion();
            return;
        }
        scheduleNodeSuggestion(added[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graph.nodes, aiEnabled]);

    // Tidy up the suggestion timers when the editor unmounts.
    useEffect(() => () => cancelNodeSuggestion(), []);

    // Show the connect hint while the canvas is a single, unconnected node.
    const showConnectHint = ready && graph.nodes.length === 1 && graph.edges.length === 0;

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

    // Export the workflow as a BPMN 2.0 file. The server-side exporter needs a
    // persisted workflow, so save first if this graph hasn't been stored yet.
    const exportBpmn = async () => {
        if (exportingBpmn) return; // ignore repeat clicks while one is in flight
        setExportingBpmn(true);
        try {
            let id = dbId;
            if (!id) {
                id = await persist(true);
                if (!id) throw new Error('save failed');
            }

            const res = await fetch(`/workflows/${id}/export/bpmn`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken(),
                },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow-${id}.bpmn`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            toast({ title: 'BPMN exported', description: 'Downloaded as .bpmn', variant: 'success' });
        } catch {
            toast({
                title: 'Export failed',
                description: 'Could not export BPMN. Try saving the workflow first.',
                variant: 'error',
            });
        } finally {
            setExportingBpmn(false);
        }
    };

    // Pretty-printed JSON snapshot of the workflow in the fancy-flow format —
    // feeds the "View Code" panel's JSON tab. Mirrors the exportJson payload but
    // also carries `folder` so editing + Apply is a clean round-trip.
    const buildWorkflowJson = () =>
        JSON.stringify({ name, description, tags, folder, nodes: graph.nodes, edges: graph.edges }, null, 2);

    // Fetch the BPMN XML as a string (for the code panel's read-only BPMN tab).
    // Like exportBpmn, the server exporter needs a persisted workflow, so save
    // first if this graph hasn't been stored yet.
    const fetchBpmnXml = async () => {
        let id = dbId;
        if (!id) {
            id = await persist(true);
            if (!id) throw new Error('save failed');
        }
        const res = await fetch(`/workflows/${id}/export/bpmn`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrfToken() },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    };

    // Apply edited JSON (already parsed + validated by the code panel) onto the
    // canvas. Shares the load path with importJson: swap the graph, reset undo
    // history, and restore the surrounding metadata. Returns true on success.
    const applyJsonToCanvas = (data) => {
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
            toast({
                title: 'Apply failed',
                description: 'JSON must include "nodes" and "edges" arrays.',
                variant: 'error',
            });
            return false;
        }
        const imported = { nodes: data.nodes, edges: data.edges };
        markEdited(); // edited JSON is unsaved work
        setGraph(imported);
        resetHistory(imported); // a full replace is a fresh start for undo/redo
        setName(typeof data.name === 'string' ? data.name : '');
        setDescription(typeof data.description === 'string' ? data.description : '');
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setFolder(typeof data.folder === 'string' ? data.folder : null);
        setEditorKey((k) => k + 1); // remount so fitView frames the new graph
        toast({ title: 'Canvas updated', description: 'Applied JSON to the workflow.', variant: 'success' });
        return true;
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
                const imported = { nodes: data.nodes, edges: data.edges };
                markEdited(); // imported content is unsaved work the user brought in
                setGraph(imported);
                resetHistory(imported); // an import is a fresh start for undo/redo
                setName(data.name ?? '');
                setDescription(data.description ?? '');
                setTags(Array.isArray(data.tags) ? data.tags : []);
                setFolder(typeof data.folder === 'string' ? data.folder : null);
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

    // Fingerprint of the current content + whether it differs from the last save.
    // Memoized because it serializes the whole graph (JSON.stringify of every node
    // + edge), and this component re-renders on every keystroke, drag tick, and run
    // state change — recomputing only when the persisted fields actually change.
    const currentSig = useMemo(
        () => workflowFingerprint(name, description, tags, folder, graph.nodes, graph.edges),
        [name, description, tags, folder, graph.nodes, graph.edges],
    );
    // Until the user's first manual edit (isInitialLoad), a freshly loaded
    // template or saved workflow is never considered "unsaved" — this is what
    // keeps the auto-save, the header indicator, and the navigation guard dormant
    // on initial load. The manual Save button bypasses this entirely (see persist).
    const hasUnsavedChanges = !isInitialLoad && currentSig !== lastSavedSig;

    // Indicator state for the header badge.
    const saveState = isSaving ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved';

    // Clean Claude's name suggestion down to a usable workflow name: first line
    // only, stripped of wrapping quotes and trailing punctuation. Rejects anything
    // that doesn't look like a short 2–5 word name (e.g. the mock/error reply that
    // comes back when there's no API key), so we never name a workflow after a
    // fallback sentence — returning '' lets the caller fall back to asking the user.
    const cleanSuggestedName = (raw) => {
        if (typeof raw !== 'string') return '';
        let suggestion = raw.trim().split('\n')[0].trim();
        suggestion = suggestion.replace(/^["'`]+|["'`]+$/g, '').replace(/[.\s]+$/, '').trim();
        if (!suggestion) return '';
        const words = suggestion.split(/\s+/);
        if (words.length > 6 || suggestion.length > 60) return '';
        return suggestion;
    };

    // Ask Claude for a short name based on the nodes currently on the canvas.
    // Returns a cleaned name, or '' on any failure (network, no key, odd reply) so
    // the save path can degrade gracefully.
    const suggestWorkflowName = async () => {
        try {
            const res = await fetch('/api/workflow/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    message:
                        'Based on these workflow nodes, suggest a short 2-5 word name for this workflow. Respond with ONLY the name, nothing else.',
                    workflow_name: 'Workflow',
                    workflow: { nodes: graph.nodes, edges: graph.edges },
                }),
            });
            if (!res.ok) return '';
            const data = await res.json();
            return cleanSuggestedName(data?.reply);
        } catch {
            return '';
        }
    };

    // Shared save core for both the manual button and auto-save. `isAuto` only
    // affects the chatty status text / name prompt (auto-save stays quiet); the
    // network call and bookkeeping are identical. Returns true on success.
    const persist = async (isAuto = false) => {
        // The name we'll actually save under. When the user manually saves a blank
        // workflow that already has nodes, auto-name it via Claude first (auto-save
        // never reaches here — it requires a name — so it's unaffected).
        let workingName = name;
        if (!workingName.trim()) {
            if (!isAuto && graph.nodes.length > 0) {
                setStatus('Naming your workflow…');
                const suggested = await suggestWorkflowName();
                if (suggested) {
                    workingName = suggested;
                    setName(suggested);
                }
            }
            if (!workingName.trim()) {
                if (!isAuto) setStatus('Please enter a workflow name');
                return false;
            }
        }
        if (savingRef.current) return false; // a save is already in flight
        savingRef.current = true;
        setIsSaving(true);
        const sig = workflowFingerprint(workingName, description, tags, folder, graph.nodes, graph.edges);
        if (!isAuto) setStatus('Saving…');
        try {
            const payload = {
                name: workingName,
                description,
                nodes: graph.nodes,
                edges: graph.edges,
                tags,
                folder,
            };

            const url = dbId ? `/workflows/${dbId}` : '/workflows';
            const method = dbId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify(payload),
            });

            // A non-2xx response (validation 422 — e.g. too many nodes/tags or an
            // over-long name — CSRF 419, server 500…) is NOT a successful save.
            // Bail out WITHOUT marking the snapshot saved, so we never flash
            // "Saved" on a failed write (silent data loss) and auto-save keeps
            // retrying the still-unsaved changes on its next tick.
            if (!res.ok) {
                if (!isAuto) {
                    let msg = 'Save failed — please try again';
                    if (res.status === 422) {
                        const body = await res.json().catch(() => null);
                        msg = body?.message
                            ? `Save failed — ${body.message}`
                            : 'Save failed — workflow is too large or the name is invalid';
                    }
                    setStatus(msg);
                }
                return false;
            }

            const data = await res.json();
            setDbId(data.id);
            setLastSavedSig(sig); // mark this exact snapshot as saved
            if (!isAuto) setStatus('Saved successfully');
            // Return the saved id (truthy) so callers that need it immediately —
            // e.g. BPMN export — don't have to wait for the dbId state to settle.
            return data.id ?? true;
        } catch {
            // Network failure, aborted request, or unparseable success body.
            if (!isAuto) setStatus('Save failed — check your connection');
            return false;
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    };

    // Manual Save — same behaviour as before, plus it restarts the auto-save
    // countdown so the next auto-save is a full 30s away.
    const saveWorkflow = async () => {
        const ok = await persist(false);
        setAutoSaveTick((t) => t + 1);
        if (ok) {
            // Flash the green "Saved!" confirmation on the button for 2s.
            clearTimeout(justSavedTimerRef.current);
            setJustSaved(true);
            justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 2000);
        }
    };

    // Wire the keyboard shortcuts to the latest handlers (see the listener above).
    shortcutsRef.current = {
        undo,
        redo,
        save: saveWorkflow,
        doExport: exportJson,
        closePanels: () => {
            setShowShortcuts(false);
            setShowHistory(false);
        },
    };

    // Auto-save: on the user's chosen interval (Settings → Editor Preferences;
    // default 30s, or off), save if there are unsaved changes and the workflow is
    // named with at least one node. Kept in a ref so the interval always runs the
    // latest closure without being torn down on every keystroke. The interval is
    // keyed on `autoSaveTick` so a manual save resets the clock.
    const autoSaveRef = useRef(null);
    autoSaveRef.current = () => {
        if (name.trim() && graph.nodes.length > 0 && hasUnsavedChanges && !savingRef.current) {
            persist(true);
        }
    };
    useEffect(() => {
        const ms = autoSaveIntervalMs(userSettings);
        if (ms == null) return; // auto-save turned off
        const id = setInterval(() => autoSaveRef.current?.(), ms);
        return () => clearInterval(id);
    }, [autoSaveTick, userSettings]);

    // ── Unsaved-changes navigation guard ───────────────────────────────────
    // Only guard when there's actual work to lose (≥1 node and unsaved).
    const hasUnsavedWork = graph.nodes.length > 0 && hasUnsavedChanges;

    // In-app nav (the header's "Back home" / "Saved Workflows" buttons): if there
    // are unsaved changes, intercept and show the modal instead of navigating;
    // `pendingNav` holds the destination until the user decides.
    const [pendingNav, setPendingNav] = useState(null);
    const guardedNavigate = (href) => {
        if (hasUnsavedWork) setPendingNav(href);
        else router.visit(href);
    };
    const handleSaveLeave = async () => {
        const ok = await persist(false);
        if (!ok) return; // couldn't save (e.g. no name) — keep the modal open
        const dest = pendingNav;
        setPendingNav(null);
        router.visit(dest);
    };
    const handleLeaveWithout = () => {
        const dest = pendingNav;
        setPendingNav(null);
        router.visit(dest);
    };

    // Native back button / tab close / refresh: trigger the browser's own
    // "Leave site?" prompt while there are unsaved changes.
    useEffect(() => {
        if (!hasUnsavedWork) return;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsavedWork]);

    // react-fancy's Pillbox commits a tag on Enter (and removes the last on
    // Backspace, or a specific one via its X). It doesn't treat comma as a
    // separator, so we add that: intercept a comma keypress in the input and
    // re-fire it as Enter, which makes the Pillbox commit the typed text.
    const handleTagsKeyDown = (e) => {
        if (e.key === ',' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            e.target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
    };

    // Tags editor — a Pillbox where users type their own tags (Enter or comma to
    // add, click the X to remove). Defined once and placed in both the lg brand
    // column and the md/sm bottom row.
    const tagsEditor = (
        <div className="min-w-0" onKeyDown={handleTagsKeyDown}>
            <Pillbox
                value={tags}
                onChange={(next) => {
                    markEdited();
                    setTags(next);
                }}
                placeholder="Add tags… e.g. HR, Design"
                className="min-w-44 py-1 text-sm sm:min-w-56"
            />
        </div>
    );

    // Folder picker — offers the union of custom folders, this workflow's own
    // tags (so a "HR"-tagged workflow can be filed into an "HR" folder in one
    // click) and whatever it's currently filed under. Defined once, placed in
    // both the lg brand column and the md/sm action row like the tags editor.
    const folderOptions = [...new Set([...customFolders, ...tags, folder].filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
    );
    const folderSelect = (
        <FolderSelect
            value={folder}
            options={folderOptions}
            onSelect={(name) => {
                markEdited();
                setFolder(name);
            }}
            onCreate={(name) => {
                setCustomFolders(addCustomFolder(name));
                markEdited();
                setFolder(name);
            }}
        />
    );

    return (
        <>
            {/* Per-page client-side SEO override on top of the fancy-seo server
                baseline: the title + description track the live workflow name, so a
                named workflow shared on social shows its own title/description.
                clientOnly is inherited from <SeoProvider> (see app.jsx) — this only
                takes over on the client / SPA nav and never duplicates the SSR head.
                The "— Fancy Workflows" suffix comes from the provider titleTemplate. */}
            <Seo
                title={name || 'New Workflow'}
                description={
                    description?.trim() ||
                    'Compose agentic workflows node by node on an interactive canvas and watch each step reason in real time.'
                }
            />

            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
                {/* Accent banner showing which template is active. transition-colors
                    so the bar eases between accents when switching templates. */}
                <div className={`h-1 w-full transition-colors duration-200 ${accent.bar}`} />
                {/* Collapsible / pinnable header. The full header (brand, tags, action
                    toolbar, nav — one row on lg, two stacked rows below) can collapse to
                    a slim bar with a few essential actions (expand, name, Save, Guide,
                    Saved Workflows, Back home), so the canvas and chat reclaim the
                    vertical space. The collapsed/expanded choice persists to
                    settings.headerCollapsed and stays put until the expand button is
                    clicked. framer-motion animates the height collapse/expand. */}
                <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 backdrop-blur-md transition-colors duration-300 supports-[backdrop-filter]:bg-white/60 dark:border-gray-800/60 dark:bg-gray-900/70 dark:supports-[backdrop-filter]:bg-gray-900/60">
                    {/* Slim collapsed bar — expand · name · Save · Guide · Saved Workflows · Back home.
                        Each action mirrors its full-header counterpart exactly. */}
                    <AnimatePresence initial={false}>
                        {headerCollapsed && (
                            <motion.div
                                key="header-collapsed-bar"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="flex items-center gap-1.5 px-4 py-1.5 lg:px-6"
                            >
                                <Tooltip label="Expand header" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={toggleHeaderCollapsed}
                                        aria-label="Expand header"
                                        aria-expanded={false}
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-600 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700/80"
                                    >
                                        <ChevronDown size={15} aria-hidden="true" />
                                    </button>
                                </Tooltip>
                                <WorkflowIcon size={15} className={`shrink-0 ${accent.text}`} aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                                    {name || 'Untitled workflow'}
                                </span>

                                {/* Save — same handler as the full toolbar's Save button. */}
                                <Tooltip label={justSaved ? 'Saved!' : 'Save Workflow'} placement="bottom">
                                    <button
                                        type="button"
                                        onClick={saveWorkflow}
                                        aria-label={justSaved ? 'Workflow saved' : 'Save workflow'}
                                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${justSaved ? 'text-green-600 dark:text-green-400' : accent.text}`}
                                    >
                                        {justSaved ? <Check size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                                    </button>
                                </Tooltip>

                                {/* Guide — opens the beginner's guide modal. */}
                                <Tooltip label="Beginner's guide" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setShowGuide(true)}
                                        aria-label="Open beginner's guide"
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                    >
                                        <BookOpen size={15} aria-hidden="true" />
                                    </button>
                                </Tooltip>

                                {/* Saved Workflows — same guarded navigation as the full header. */}
                                <Tooltip label="Browse your saved workflows" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => guardedNavigate('/workflows-list')}
                                        aria-label="Saved Workflows"
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                    >
                                        <FolderOpen size={15} aria-hidden="true" />
                                    </button>
                                </Tooltip>

                                {/* Back home — same guarded navigation as the full header. */}
                                <Tooltip label="Back home" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => guardedNavigate('/')}
                                        aria-label="Back home"
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                                    >
                                        <Home size={15} aria-hidden="true" />
                                    </button>
                                </Tooltip>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Full header content. Collapses to height 0 when pinned shut.
                        `inert` while collapsed keeps the hidden buttons out of the tab
                        order; expanded, every button is fully interactive again. */}
                    <motion.div
                        initial={false}
                        animate={{
                            height: headerCollapsed ? 0 : 'auto',
                            opacity: headerCollapsed ? 0 : 1,
                        }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        aria-hidden={headerCollapsed ? 'true' : undefined}
                        {...(headerCollapsed ? { inert: '' } : {})}
                        className={`relative flex flex-col gap-1.5 px-4 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:px-6 lg:py-2.5 ${
                            headerCollapsed ? 'overflow-hidden' : 'overflow-visible'
                        }`}
                    >
                        {/* Collapse (pin) button on the far-left edge of the header. */}
                        {!headerCollapsed && (
                            <Tooltip label="Collapse header" placement="bottom">
                                <button
                                    type="button"
                                    onClick={toggleHeaderCollapsed}
                                    aria-label="Collapse header"
                                    aria-expanded={true}
                                    className="order-first inline-flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full border border-gray-200 bg-gray-100/80 text-gray-600 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700/80 lg:self-center"
                                >
                                    <ChevronUp size={15} aria-hidden="true" />
                                </button>
                            </Tooltip>
                        )}
                    {/* ── Row 1 (on lg: the left side) ─────────────────────────── */}
                    <div className="flex min-w-0 items-center justify-between gap-2 lg:flex-1 lg:justify-start lg:gap-3">
                        {/* Brand: logo + name + description (md+) + tags (lg). Grows to
                            fill row 1 on lg so the name/description can use the full
                            width between the logo and the right-hand action buttons. */}
                        <div className="flex min-w-0 items-center gap-2 lg:flex-1 lg:items-start lg:gap-3">
                            <Logo className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <div className="flex min-w-0 flex-col gap-0.5 lg:flex-1">
                                <div className="flex items-center gap-1.5">
                                    <motion.span
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset lg:px-2.5 lg:text-xs ${accent.badge}`}
                                    >
                                        {accent.label}
                                    </motion.span>

                                    {/* AI Mode / Demo Mode — driven by whether the server has an
                                        ANTHROPIC_API_KEY (GET /api/agent/status). Hidden until known. */}
                                    {aiEnabled !== null && (
                                        <Tooltip
                                            label={
                                                aiEnabled
                                                    ? 'AI Mode — Claude reasons through action steps (ANTHROPIC_API_KEY is configured).'
                                                    : 'Demo Mode — using built-in mock data. Set ANTHROPIC_API_KEY to enable AI.'
                                            }
                                            placement="bottom"
                                        >
                                            <span
                                                className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset lg:text-xs ${
                                                    aiEnabled
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20'
                                                        : 'bg-gray-100 text-gray-500 ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-500/20'
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${aiEnabled ? 'animate-pulse bg-emerald-500' : 'bg-gray-400'}`}
                                                    aria-hidden="true"
                                                />
                                                {aiEnabled ? 'AI Mode' : 'Demo Mode'}
                                            </span>
                                        </Tooltip>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        markEdited();
                                        setName(e.target.value);
                                    }}
                                    // Matches the DB column / server validation (max 255) so
                                    // an over-long name can't fail the save server-side.
                                    maxLength={255}
                                    placeholder="Workflow name..."
                                    className="w-full min-w-0 border-none bg-transparent text-base font-semibold leading-tight text-gray-900 outline-none placeholder-gray-400 dark:text-white lg:min-w-96 lg:text-lg"
                                />
                                {/* Inline-editable description — hidden until lg so the header
                                    stays compact on small screens and when zoomed in. */}
                                <div className="hidden lg:block">
                                    <DescriptionField
                                        value={description}
                                        onChange={(next) => {
                                            markEdited();
                                            setDescription(next);
                                        }}
                                    />
                                </div>
                                {/* Tags + folder under the brand — lg only (md/sm show them in row 2). */}
                                <div className="mt-0.5 hidden items-center gap-2 lg:flex">
                                    {tagsEditor}
                                    {folderSelect}
                                </div>
                            </div>
                        </div>

                        {/* Nav cluster for md/sm (top-right, icon-only). lg uses row 2. */}
                        <div className="flex shrink-0 items-center gap-1 lg:hidden">
                            <Tooltip label="Toggle dark mode" placement="bottom">
                                <ThemeToggle />
                            </Tooltip>
                            <Tooltip label="Browse your saved workflows" placement="bottom">
                                <button
                                    type="button"
                                    onClick={() => guardedNavigate('/workflows-list')}
                                    aria-label="Saved Workflows"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
                                >
                                    <FolderOpen size={16} aria-hidden="true" />
                                </button>
                            </Tooltip>
                            <Tooltip label="Settings" placement="bottom">
                                <button
                                    type="button"
                                    onClick={() => guardedNavigate('/settings')}
                                    aria-label="Settings"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
                                >
                                    <SettingsIcon size={16} aria-hidden="true" />
                                </button>
                            </Tooltip>
                            <Tooltip label="Back home" placement="bottom">
                                <button
                                    type="button"
                                    onClick={() => guardedNavigate('/')}
                                    aria-label="Back home"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
                                >
                                    <Home size={16} aria-hidden="true" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* ── Row 2 (on lg: the right side) ────────────────────────── */}
                    <div className="flex min-w-0 items-center justify-between gap-2 lg:flex-none lg:justify-end lg:gap-3">
                        {/* Tags for md/sm — collapse behind an icon below md. lg uses row 1. */}
                        <div className="flex min-w-0 items-center gap-2 lg:hidden">
                            <Tooltip label="Tags" placement="bottom">
                                <button
                                    type="button"
                                    onClick={() => setTagsOpen((o) => !o)}
                                    aria-label="Tags"
                                    aria-expanded={tagsOpen}
                                    className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80 md:hidden"
                                >
                                    <TagsIcon size={16} aria-hidden="true" />
                                    {tags.length > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-none text-white">
                                            {tags.length}
                                        </span>
                                    )}
                                </button>
                            </Tooltip>
                            <div className={`min-w-0 md:block ${tagsOpen ? 'block' : 'hidden'}`}>{tagsEditor}</div>
                            {folderSelect}
                        </div>

                        {/* Action toolbar + nav on the top line; the save-status indicator
                            wraps onto its own line beneath them (lg) so it sits in the
                            header's lower-right corner instead of beside undo/redo. */}
                        <div className="flex shrink-0 items-center gap-2 lg:flex-wrap lg:justify-end">
                            {/* Floating glass toolbar: Undo · Redo · Save · Export · Import · History.
                                Labels show only on lg; below lg they're icon-only (with tooltips). */}
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="inline-flex items-center gap-0.5 rounded-full border border-white/40 bg-white/60 p-1 shadow-lg shadow-gray-900/5 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/50 dark:shadow-black/20 lg:gap-1"
                            >
                                <Tooltip label="Undo (⌘Z)" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={undo}
                                        disabled={!canUndo}
                                        aria-label="Undo"
                                        className="inline-flex items-center rounded-full p-2 text-gray-700 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-white/10 dark:disabled:hover:bg-transparent"
                                    >
                                        <Undo2 size={16} aria-hidden="true" />
                                    </button>
                                </Tooltip>

                                <Tooltip label="Redo (⌘⇧Z)" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={redo}
                                        disabled={!canRedo}
                                        aria-label="Redo"
                                        className="inline-flex items-center rounded-full p-2 text-gray-700 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-white/10 dark:disabled:hover:bg-transparent"
                                    >
                                        <Redo2 size={16} aria-hidden="true" />
                                    </button>
                                </Tooltip>

                                <span className="mx-0.5 h-5 w-px bg-gray-300/70 dark:bg-gray-600/50" aria-hidden="true" />

                                <Tooltip label={justSaved ? 'Saved!' : 'Save Workflow'} placement="bottom">
                                    <button
                                        type="button"
                                        onClick={saveWorkflow}
                                        aria-label={justSaved ? 'Workflow saved' : 'Save workflow'}
                                        className={`inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10 lg:px-3 ${justSaved ? 'text-green-600 dark:text-green-400' : accent.text}`}
                                    >
                                        {/* Swap Save ⇄ Saved! with a smooth fade/scale on success. */}
                                        <AnimatePresence mode="wait" initial={false}>
                                            {justSaved ? (
                                                <motion.span
                                                    key="saved"
                                                    initial={{ opacity: 0, scale: 0.6 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.6 }}
                                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                                    className="inline-flex items-center gap-2"
                                                >
                                                    <Check size={16} aria-hidden="true" />
                                                    <span className="hidden lg:inline">Saved!</span>
                                                </motion.span>
                                            ) : (
                                                <motion.span
                                                    key="save"
                                                    initial={{ opacity: 0, scale: 0.6 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.6 }}
                                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                                    className="inline-flex items-center gap-2"
                                                >
                                                    <Save size={16} aria-hidden="true" />
                                                    <span className="hidden lg:inline">Save</span>
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </Tooltip>

                                <Tooltip label="Export JSON" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={exportJson}
                                        aria-label="Export workflow as JSON"
                                        className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10 lg:px-3"
                                    >
                                        <Download size={16} aria-hidden="true" />
                                        <span className="hidden lg:inline">Export</span>
                                    </button>
                                </Tooltip>

                                <Tooltip label="Export BPMN" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={exportBpmn}
                                        disabled={exportingBpmn}
                                        aria-label="Export workflow as BPMN"
                                        aria-busy={exportingBpmn}
                                        className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:bg-white/10 lg:px-3"
                                    >
                                        {exportingBpmn ? (
                                            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                                        ) : (
                                            <FileCode2 size={16} aria-hidden="true" />
                                        )}
                                        <span className="hidden lg:inline">{exportingBpmn ? 'Exporting…' : 'BPMN'}</span>
                                    </button>
                                </Tooltip>

                                <Tooltip label="View Code" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setShowCodePanel(true)}
                                        aria-label="View workflow code"
                                        aria-haspopup="dialog"
                                        aria-expanded={showCodePanel}
                                        className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10 lg:px-3"
                                    >
                                        <Code2 size={16} aria-hidden="true" />
                                        <span className="hidden lg:inline">Code</span>
                                    </button>
                                </Tooltip>

                                <Tooltip label="Import JSON" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={importJson}
                                        aria-label="Import workflow from JSON"
                                        className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10 lg:px-3"
                                    >
                                        <Upload size={16} aria-hidden="true" />
                                        <span className="hidden lg:inline">Import</span>
                                    </button>
                                </Tooltip>

                                <span className="mx-0.5 h-5 w-px bg-gray-300/70 dark:bg-gray-600/50" aria-hidden="true" />

                                <Tooltip label="Run History" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setShowHistory((v) => !v)}
                                        aria-pressed={showHistory}
                                        aria-label="Toggle run history"
                                        className={`inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 lg:px-3 ${showHistory ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}
                                    >
                                        <History size={16} aria-hidden="true" />
                                        <span className="hidden lg:inline">History</span>
                                    </button>
                                </Tooltip>

                                <span className="mx-0.5 h-5 w-px bg-gray-300/70 dark:bg-gray-600/50" aria-hidden="true" />

                                <Tooltip label="Beginner's guide" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setShowGuide(true)}
                                        aria-label="Open beginner's guide"
                                        className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10 lg:px-3"
                                    >
                                        <BookOpen size={16} aria-hidden="true" />
                                        <span className="hidden lg:inline">Guide</span>
                                    </button>
                                </Tooltip>
                            </motion.div>

                            {/* Nav for lg (text buttons). md/sm use the top-row icon cluster. */}
                            <div className="hidden items-center gap-2 lg:flex">
                                <Tooltip label="Browse your saved workflows" placement="bottom">
                                    <NavButton onClick={() => guardedNavigate('/workflows-list')}>Saved Workflows</NavButton>
                                </Tooltip>
                                <Tooltip label="Toggle dark mode" placement="bottom">
                                    <ThemeToggle />
                                </Tooltip>
                                <Tooltip label="Settings" placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => guardedNavigate('/settings')}
                                        aria-label="Settings"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-700 transition-colors hover:bg-gray-200/80 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700/80"
                                    >
                                        <SettingsIcon size={16} aria-hidden="true" />
                                    </button>
                                </Tooltip>
                                <Tooltip label="Back home" placement="bottom">
                                    <NavButton onClick={() => guardedNavigate('/')}>Back home</NavButton>
                                </Tooltip>
                            </div>

                            {/* Save-status — on lg, `basis-full` forces it onto its own line
                                and `justify-end` right-aligns it, so it sits neatly beneath the
                                nav buttons in the header's lower-right corner. */}
                            {(graph.nodes.length > 0 || status) && (
                                <div className="flex items-center gap-2 lg:basis-full lg:justify-end">
                                    {graph.nodes.length > 0 && <SaveStatusIndicator state={saveState} />}
                                    {status && (
                                        <Text className="hidden text-xs text-gray-400 dark:text-gray-500 md:inline">{status}</Text>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    </motion.div>
                </header>

                {/* Soft separator between the header and the editor content */}
                <GradientDivider />

                <main className="flex-1 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row">
                    {/* Left column: the editor box with the collapsible run feed below it. */}
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div
                        ref={editorBoxRef}
                        data-canvas-bg={userSettings.canvasBackground}
                        data-canvas-theme={canvasTheme}
                        data-anim-speed={userSettings.animationSpeed}
                        data-show-desc={String(userSettings.showStepDescriptions)}
                        data-highlight-path={String(userSettings.highlightActivePath)}
                        className={`workflow-editor relative ${running ? 'flow-running' : ''}`}
                    >
                        {/* Pulse the just-dropped node's ports. Injected as a rule keyed on
                            the node's data-id since React Flow owns the handle elements. */}
                        {pulseNodeId && (
                            <style>{`.workflow-editor .react-flow__node[data-id="${pulseNodeId}"] .react-flow__handle { animation: ff-port-pulse 0.85s ease-in-out 2; }`}</style>
                        )}
                        {/* Light the branch each decision took in solid green. Injected as a
                            rule keyed on each edge's data-id since React Flow owns the edge
                            paths. `!important` beats the running edge-flow animation (which
                            paints every edge indigo while a run is in flight) so the chosen
                            branch reads as green immediately and stays green after the run. */}
                        {userSettings.highlightActivePath && doneEdgeIds.length > 0 && (
                            <style>{`${doneEdgeIds
                                .map((id) => `.workflow-editor .react-flow__edge[data-id="${id}"] .react-flow__edge-path`)
                                .join(', ')} { stroke: #22c55e !important; stroke-width: 3.5 !important; stroke-dasharray: none !important; animation: none !important; filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.9)); }`}</style>
                        )}
                        {/* Post-run path highlight. The "settled" block paints the
                            executed path solid green (and any failed edges/nodes red)
                            and is present the whole time the highlight exists. The
                            "flowing" block is layered on top only while the one-shot
                            pulse plays — injected after the settled block so it wins —
                            then removed, leaving the static green path. See the
                            ff-path-pulse keyframe in flow-animations.css. */}
                        {userSettings.highlightActivePath && pathHighlight && (
                            <style>{[
                                pathHighlight.successEdgeIds.length &&
                                    `${pathHighlight.successEdgeIds.map(edgePathSel).join(', ')} { stroke: #22c55e !important; stroke-width: 3.5 !important; stroke-dasharray: none !important; animation: none; filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.9)); }`,
                                pathHighlight.errorEdgeIds.length &&
                                    `${pathHighlight.errorEdgeIds.map(edgePathSel).join(', ')} { stroke: #ef4444 !important; stroke-width: 3.5 !important; stroke-dasharray: none !important; animation: none !important; filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.9)); }`,
                                pathHighlight.errorNodeIds.length &&
                                    `${pathHighlight.errorNodeIds.map((id) => `${nodeSel(id)} .ff-node`).join(', ')} { border-color: #ef4444 !important; box-shadow: 0 0 0 2px #ef4444, 0 0 16px 2px rgba(239, 68, 68, 0.6) !important; }`,
                            ]
                                .filter(Boolean)
                                .join('\n')}</style>
                        )}
                        {userSettings.highlightActivePath && pathHighlight && pathAnimating && pathHighlight.orderedEdgeIds.length > 0 && (
                            <style>{pathHighlight.orderedEdgeIds
                                .map(
                                    (id, i) =>
                                        `${edgePathSel(id)} { animation: ff-path-pulse ${PATH_PULSE_DUR_S}s ease-out ${(i * PATH_PULSE_STEP_S).toFixed(2)}s 1 both !important; }`,
                                )
                                .join('\n')}</style>
                        )}
                        {ready ? (
                            <FlowEditor
                                // Remount only on import (editorKey bump) so React Flow
                                // re-runs fitView to frame a wholesale new graph.
                                key={editorKey}
                                // Controlled: the canvas mirrors `graph`, which is how the
                                // config panel's edits show up live on the nodes.
                                value={graph}
                                executors={executors}
                                height={720}
                                // We render our own config sidebar (NodeConfigPanel) and our
                                // own collapsible run feed (RunFeedPanel), so hide the
                                // editor's built-in panel and feed.
                                showPanel={false}
                                showFeed={false}
                                // Friendlier count in the toolbar. The editor's built-in
                                // "X nodes · Y edges" is hidden via CSS (.ff-editor__count)
                                // and replaced with this "steps · connections" version.
                                extraToolbar={
                                    <div className="ml-auto flex items-center gap-3">
                                        {/* Remove the post-run path highlighting. Shown only
                                            when highlighting is on and there's something to clear. */}
                                        {userSettings.highlightActivePath && (pathHighlight || doneEdgeIds.length > 0) && (
                                            <button
                                                type="button"
                                                onClick={clearHighlights}
                                                title="Clear the highlighted run path"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                                <Eraser size={14} aria-hidden="true" />
                                                Clear highlights
                                            </button>
                                        )}
                                        {/* Drop a sticky note onto the canvas. */}
                                        <button
                                            type="button"
                                            onClick={addNote}
                                            title="Add a sticky note"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                                        >
                                            <StickyNote size={14} aria-hidden="true" />
                                            Add Note
                                        </button>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {graph.nodes.length} steps · {graph.edges.length} connections
                                        </span>
                                    </div>
                                }
                                onChange={onGraphChange}
                                metadata={{
                                    name,
                                    description,
                                }}
                            />
                        ) : (
                            // Saved workflow still loading — hold the space so the editor
                            // mounts already seeded, instead of mounting blank then swapping.
                            <div
                                className="flex items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600"
                                style={{ height: 720 }}
                            >
                                Loading workflow…
                            </div>
                        )}

                        {/* Renames the built-in palette's section headers to friendly
                            language (the node names themselves are renamed via the
                            re-registered kind labels). */}
                        <PaletteRelabel containerRef={editorBoxRef} />

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
                                            Let's build something
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Drag a step over from the left to begin
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
                                                <span className="text-sm font-medium">Step palette</span>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* "Drag to connect" nudge while there's a lone, unconnected node. */}
                        <ConnectHint containerRef={editorBoxRef} active={showConnectHint} />

                        {/* Claude's "next step" suggestion, pinned beside the node
                            that was just dropped. Clicking it adds the suggested node. */}
                        {nodeSuggestion && (
                            <NodeSuggestionPill
                                containerRef={editorBoxRef}
                                nodeId={nodeSuggestion.anchorId}
                                label={nodeSuggestion.label}
                                onAccept={acceptNodeSuggestion}
                            />
                        )}

                        {/* Keyboard-shortcuts help — bottom-right, above the zoom controls. */}
                        <div className="absolute bottom-44 right-4 z-20">
                            <Tooltip label="Keyboard shortcuts" placement="top">
                                <button
                                    type="button"
                                    onClick={() => setShowShortcuts(true)}
                                    aria-label="Keyboard shortcuts"
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-base font-semibold text-gray-600 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                                >
                                    ?
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Collapsible terminal-style run feed, below the editor. */}
                    <RunFeedPanel
                        feed={feed}
                        collapsed={feedCollapsed}
                        onToggle={toggleFeed}
                        onClear={clearFeed}
                    />
                    </div>

                    {/* Right sidebar: the smart panel — Claude chat assistant when
                        no node is selected, the node config editor when one is (with
                        a toggle to switch between them). Config edits flow back into
                        `graph` (controlled editor), so they show on the canvas live
                        and are saved with the workflow. */}
                    <RightPanel
                        selectedNode={selectedNode}
                        onChange={updateNode}
                        workflow={graph}
                        workflowName={name}
                        onApplyWorkflow={applyAiWorkflow}
                        onRunWorkflow={triggerCanvasRun}
                        onRunFromChat={runFromChat}
                        chatStorageKey={chatStorageKey}
                        // "Chat panel default state": open on load unless set to "closed".
                        defaultOpen={userSettings.chatPanelDefault !== 'closed'}
                    />
                    </div>
                </main>
            </div>

            {/* Slide-in run history (state-only; last 5 runs). */}
            <RunHistoryPanel
                open={showHistory}
                runs={runHistory}
                onClose={() => setShowHistory(false)}
                onClear={() => setRunHistory([])}
            />

            {/* Slide-in "View Code" panel — JSON (editable) + BPMN (read-only). */}
            <CodePanel
                open={showCodePanel}
                onClose={() => setShowCodePanel(false)}
                buildJson={buildWorkflowJson}
                onApplyJson={applyJsonToCanvas}
                fetchBpmn={fetchBpmnXml}
            />

            {/* Keyboard shortcuts help modal. */}
            <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

            {/* Beginner's guide — multi-page onboarding tour. */}
            <BeginnerGuide open={showGuide} onClose={closeGuide} />

            {/* Warn before leaving with unsaved changes (in-app navigation). */}
            <UnsavedChangesModal
                open={pendingNav !== null}
                saving={isSaving}
                onSaveLeave={handleSaveLeave}
                onLeave={handleLeaveWithout}
                onCancel={() => setPendingNav(null)}
            />

            {/* Confirm before deleting a step (when the setting is enabled). */}
            <AnimatePresence>
                {pendingNodeDelete && (
                    <motion.div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelNodeDelete} aria-hidden="true" />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="delete-node-title"
                            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                                    <Trash2 size={20} aria-hidden="true" />
                                </div>
                                <div className="flex-1">
                                    <Heading as="h2" id="delete-node-title" size="lg" weight="semibold">
                                        {pendingNodeDelete.removed.length > 1
                                            ? `Delete ${pendingNodeDelete.removed.length} steps?`
                                            : 'Delete this step?'}
                                    </Heading>
                                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        {pendingNodeDelete.removed.length === 1 && pendingNodeDelete.removed[0].data?.label
                                            ? `“${pendingNodeDelete.removed[0].data.label}” and its connections will be removed.`
                                            : 'The selected steps and their connections will be removed.'}
                                    </Text>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <Button variant="outline" color="gray" onClick={cancelNodeDelete}>
                                    Cancel
                                </Button>
                                <Button variant="primary" color="red" onClick={confirmNodeDelete}>
                                    Delete
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Wrap the editor in the Toast provider so `useToast` (and therefore the flow's
// `toast` UX effect) can render notifications. The corner is the user's
// "Toast position" preference, read from localStorage at mount.
export default function Workflow() {
    const toastPosition = getSettings().toastPosition;
    return (
        <Toast.Provider position={toastPosition}>
            <WorkflowEditor />
        </Toast.Provider>
    );
}