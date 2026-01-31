import { Fragment, memo } from 'react';

export type FlowStep = {
    icon: string;
    label: string;
    /** Mark as final step (e.g. last step with accent styling) */
    isFinal?: boolean;
};

type FlowProps = {
    steps: FlowStep[];
    /** Wrapper class, default: method-flow */
    className?: string;
    /** Arrow character between steps */
    arrow?: string;
};

// Memoized step item to prevent re-renders of unchanged steps
const FlowStepItem = memo(function FlowStepItem({
    step,
    showArrow,
    arrow,
}: {
    step: FlowStep;
    showArrow: boolean;
    arrow: string;
}) {
    return (
        <Fragment>
            <div className={`flow-step${step.isFinal ? ' step-final' : ''}`}>
                <div className="flow-icon">{step.icon}</div>
                <div className="flow-label">{step.label}</div>
            </div>
            {showArrow && <div className="flow-arrow">{arrow}</div>}
        </Fragment>
    );
});

export function Flow({
    steps,
    className = 'method-flow',
    arrow = '→',
}: FlowProps) {
    return (
        <div className={className}>
            {steps.map((step, index) => (
                <FlowStepItem
                    key={index}
                    step={step}
                    showArrow={index < steps.length - 1}
                    arrow={arrow}
                />
            ))}
        </div>
    );
}
