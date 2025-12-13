/**
 * Empty State Component
 *
 * Reusable component for displaying empty states with optional actions
 */

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center min-h-[400px]',
        className
      )}
    >
      {icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          {icon}
        </div>
      )}

      <h3 className="text-xl font-semibold mb-2">{title}</h3>

      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}
