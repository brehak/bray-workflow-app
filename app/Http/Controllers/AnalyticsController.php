<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    /**
     * Render the analytics dashboard. We hand the page a lightweight, raw record
     * per workflow and let it aggregate client-side — that's what makes the date
     * range filter re-compute every chart and stat instantly (no round-trip).
     * The one thing the client can't cheaply derive — whether a workflow was
     * started from a template — is computed here, since it's filter-independent.
     */
    public function index()
    {
        $workflows = Workflow::latest()->get()->map(fn ($w) => [
            'id'           => $w->id,
            'name'         => $w->name ?: 'Untitled',
            // Grouping key for "by template type": a template and its "Copy of …"
            // duplicates collapse into one bucket.
            'template'     => preg_replace('/^(Copy of )+/', '', $w->name ?: 'Untitled'),
            'steps'        => count($w->nodes ?? []),
            'tags'         => $w->tags ?? [],
            'created_at'   => $w->created_at->toIso8601String(),
            'updated_at'   => $w->updated_at->toIso8601String(),
            'fromTemplate' => $this->isFromTemplate($w),
        ])->values();

        return Inertia::render('Analytics', [
            'workflows' => $workflows,
        ]);
    }

    /**
     * Exact descriptions the editor saves when a workflow is launched from a
     * template (mirrors the `templates` map in resources/js/Pages/Workflow.jsx).
     * A saved workflow whose description matches one of these — or that has no
     * description at all — is treated as "started from a template".
     */
    private const TEMPLATE_DESCRIPTIONS = [
        'Automates the full onboarding flow for new hires',
        'Automates the full order fulfillment pipeline',
        'Triage and resolve incoming bug reports',
        'Screens applicants, runs interviews, and routes strong candidates to an offer',
        'Takes a draft through editorial review and SEO checks, then schedules and publishes it',
        'Validates a spend request, runs department review, then routes it to manager or executive approval',
        'Checks team coverage, gets manager approval, updates the calendar, and notifies the team',
        'Assesses a product issue, notifies regulators if needed, alerts customers, and processes returns',
        'Books a venue, sends invites, confirms arrangements once RSVPs clear, then runs the day-of checklist and follows up',
        'Verifies a purchase, inspects the return, then processes or denies the refund and closes the case',
    ];

    /**
     * A workflow counts as template-started when it has no description or its
     * description matches one of the known template descriptions.
     */
    private function isFromTemplate(Workflow $w): bool
    {
        $desc = trim((string) ($w->description ?? ''));

        return $desc === '' || in_array($desc, self::TEMPLATE_DESCRIPTIONS, true);
    }
}
