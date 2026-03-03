import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'default';
}

const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: KPICardProps) => {
  const variantStyles = {
    primary: 'kpi-primary text-white',
    success: 'kpi-success text-white',
    warning: 'kpi-warning text-white',
    danger: 'kpi-danger text-white',
    default: 'bg-card border border-border',
  };

  const isGradient = variant !== 'default';

  return (
    <div
      className={cn(
        'rounded-xl p-6 transition-all duration-200 hover:shadow-lg animate-fade-in',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              'text-sm font-medium',
              isGradient ? 'text-white/80' : 'text-muted-foreground'
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'text-3xl font-bold tracking-tight',
              isGradient ? 'text-white' : 'text-foreground'
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                'text-sm',
                isGradient ? 'text-white/70' : 'text-muted-foreground'
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive
                    ? isGradient
                      ? 'text-white'
                      : 'text-status-success'
                    : isGradient
                    ? 'text-white'
                    : 'text-status-critical'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span
                className={cn(
                  'text-xs',
                  isGradient ? 'text-white/60' : 'text-muted-foreground'
                )}
              >
                vs last month
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            isGradient ? 'bg-white/20' : 'bg-primary/10'
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              isGradient ? 'text-white' : 'text-primary'
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
