'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  name: string;
  description?: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={cn(
              'relative flex-1',
              stepIdx !== steps.length - 1 && 'pr-8 sm:pr-20'
            )}
          >
            {/* Connector Line */}
            {stepIdx !== steps.length - 1 && (
              <div
                className="absolute top-4 left-4 right-0 h-0.5 -mr-8 sm:-mr-20"
                aria-hidden="true"
              >
                <div
                  className={cn(
                    'h-full transition-colors',
                    stepIdx < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              </div>
            )}

            <div className="group flex flex-col items-center relative">
              {/* Step Circle */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  'border-2',
                  stepIdx < currentStep &&
                    'bg-primary border-primary text-primary-foreground',
                  stepIdx === currentStep &&
                    'border-primary bg-background text-primary',
                  stepIdx > currentStep &&
                    'border-muted-foreground/30 bg-background text-muted-foreground'
                )}
              >
                {stepIdx < currentStep ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span className="text-sm font-semibold">{stepIdx + 1}</span>
                )}
              </div>

              {/* Step Text */}
              <div className="mt-2 text-center">
                <span
                  className={cn(
                    'text-xs sm:text-sm font-medium block',
                    stepIdx === currentStep && 'text-primary',
                    stepIdx !== currentStep && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </span>
                {step.description && (
                  <span className="hidden sm:block text-xs text-muted-foreground/70 mt-0.5">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
