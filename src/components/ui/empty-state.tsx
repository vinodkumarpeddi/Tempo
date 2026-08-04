import * as React from 'react';

import { cn } from '@/lib/cn';

export interface EmptyStateProps extends React.ComponentProps<'div'> {
  /** Optional leading visual (an icon, an illustration). */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action rendered under the text (e.g. a Button). */
  action?: React.ReactNode;
}

/**
 * A centered placeholder for surfaces that have nothing to show yet — list
 * pages before first data, filtered views with no matches, unconfigured
 * sections. Strings come from the caller (the ui package is i18n-free).
 */
export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'border-border flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-6 py-10 text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="text-muted-foreground mb-1 [&>svg]:size-8">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-sm text-balance">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
