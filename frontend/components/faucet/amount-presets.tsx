'use client';

import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AmountPreset {
  value: number;
  label?: string;
  icon?: React.ReactNode;
  recommended?: boolean;
  popular?: boolean;
}

export interface AmountPresetsProps {
  presets?: AmountPreset[];
  selectedAmount: string;
  onSelectAmount: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_PRESETS: AmountPreset[] = [
  {
    value: 100,
    label: 'Starter',
    icon: <Zap className="w-4 h-4" />,
  },
  {
    value: 500,
    label: 'Popular',
    icon: <TrendingUp className="w-4 h-4" />,
    popular: true,
  },
  {
    value: 1000,
    label: 'Recommended',
    icon: <Sparkles className="w-4 h-4" />,
    recommended: true,
  },
  {
    value: 5000,
    label: 'Power User',
  },
];

export function AmountPresets({
  presets = DEFAULT_PRESETS,
  selectedAmount,
  onSelectAmount,
  disabled = false,
  className,
}: AmountPresetsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">Quick Amount</label>
        <span className="text-xs text-muted-foreground">Select or enter custom amount</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {presets.map((preset) => {
          const isSelected = selectedAmount === preset.value.toString();

          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onSelectAmount(preset.value)}
              disabled={disabled}
              className={cn(
                'relative group rounded-xl p-4 border-2 transition-all duration-200',
                'hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                isSelected
                  ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary shadow-lg shadow-primary/20'
                  : 'bg-card border-border hover:border-primary/50 hover:bg-card/80',
                preset.recommended && !isSelected && 'border-primary/30',
                preset.popular && !isSelected && 'border-secondary/30'
              )}
            >
              {/* Badge */}
              {(preset.recommended || preset.popular) && (
                <div
                  className={cn(
                    'absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm',
                    preset.recommended &&
                      'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
                    preset.popular &&
                      'bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground'
                  )}
                >
                  {preset.recommended && '⭐'}
                  {preset.popular && '🔥'}
                </div>
              )}

              {/* Icon */}
              {preset.icon && (
                <div
                  className={cn(
                    'mb-2 transition-colors',
                    isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                  )}
                >
                  {preset.icon}
                </div>
              )}

              {/* Amount */}
              <div
                className={cn(
                  'text-2xl font-bold tabular-nums transition-colors',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {preset.value.toLocaleString()}
              </div>

              {/* Label */}
              {preset.label && (
                <div className="text-xs font-medium text-muted-foreground mt-1">{preset.label}</div>
              )}

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
