import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NodeConfigPanel from './NodeConfigPanel';

const makeNode = (overrides = {}) => ({
    id: 'n1',
    type: 'action',
    data: { kind: 'action', label: 'Send email', ...overrides },
});

describe('NodeConfigPanel description preview integration', () => {
    it('renders the description through WorkflowContentRenderer', () => {
        render(
            <NodeConfigPanel
                node={makeNode({ description: 'Notify the **team** when done' })}
                onChange={vi.fn()}
            />,
        );

        const preview = screen.getByTestId('node-description-preview');
        expect(preview).toBeInTheDocument();
        expect(screen.getByTestId('workflow-content')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-content').querySelector('strong')).toHaveTextContent(
            'team',
        );
    });

    it('shows the preview fallback when a node has no description (legacy data)', () => {
        // Node without a `description` key — the shape older workflows were saved with.
        render(<NodeConfigPanel node={makeNode()} onChange={vi.fn()} />);

        expect(screen.getByTestId('node-description-preview')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-content-fallback')).toBeInTheDocument();
    });
});
