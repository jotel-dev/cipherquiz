import type { ReactNode } from 'react';
import { Reveal } from './ui/reveal';
export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Reveal>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {children && <p className="page-intro">{children}</p>}
        </div>
        {action}
      </div>
    </Reveal>
  );
}
