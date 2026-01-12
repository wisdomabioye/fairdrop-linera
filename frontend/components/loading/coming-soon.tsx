/**
 * Coming Soon Component
 *
 * Reusable component for pages/features under development
 */

import { cn } from '@/lib/utils';
import { Construction } from 'lucide-react';

export interface ComingSoonProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ComingSoon({
  title = 'Coming Soon',
  description = 'This feature is currently under development and will be available soon.',
  icon,
  className
}: ComingSoonProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center min-h-[400px]',
        className
      )}
    >
      {icon !== undefined ? (
        icon && (
          <div className="rounded-full bg-muted p-4 mb-4">
            {icon}
          </div>
        )
      ) : (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      <h3 className="text-xl font-semibold mb-2">{title}</h3>

      {description && (
        <p className="text-muted-foreground max-w-md">{description}</p>
      )}
    </div>
  );
}
