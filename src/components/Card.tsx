import type { ReactNode } from 'react';

type CardProps = {
    title: string;
    titleClassName?: string;
    className?: string;
    children: ReactNode;
};

export function Card({
    title,
    titleClassName,
    className,
    children,
}: CardProps) {
    return (
        <section className={['card', className].filter(Boolean).join(' ')}>
            <div className="card-header">
                <h2 className={['card-title', titleClassName].filter(Boolean).join(' ')}>
                    {title}
                </h2>
            </div>
            <div className="prose">
                {children}
            </div>
        </section>
    );
}
