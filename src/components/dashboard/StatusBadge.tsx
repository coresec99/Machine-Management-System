import { cn } from '@/lib/utils';

type StatusType = 'running' | 'down' | 'maintenance' | 'open' | 'in_progress' | 'closed' | 'scheduled' | 'assigned' | 'pending_review' | 'resolved' | 'overdue' | 'delayed';
type PriorityType = 'low' | 'medium' | 'high' | 'critical';
type HealthType = 'good' | 'warning' | 'critical';

interface StatusBadgeProps {
  status?: StatusType;
  priority?: PriorityType;
  health?: HealthType;
}

const StatusBadge = ({ status, priority, health }: StatusBadgeProps) => {
  // Status styles
  const statusStyles: Record<StatusType, string> = {
    running: 'status-running',
    down: 'status-down',
    maintenance: 'status-maintenance',
    open: 'bg-status-critical-bg text-status-critical border border-status-critical/30',
    in_progress: 'bg-status-warning-bg text-status-warning border border-status-warning/30',
    closed: 'bg-status-success-bg text-status-success border border-status-success/30',
    scheduled: 'bg-primary/10 text-primary border border-primary/30',
    assigned: 'bg-primary/10 text-primary border border-primary/30',
    pending_review: 'bg-status-warning-bg text-status-warning border border-status-warning/30',
    resolved: 'bg-status-success-bg text-status-success border border-status-success/30',
    overdue: 'bg-status-critical-bg text-status-critical border border-status-critical/30',
    delayed: 'bg-status-warning-bg text-status-warning border border-status-warning/30',
  };

  const statusLabels: Record<StatusType, string> = {
    running: 'Running',
    down: 'Down',
    maintenance: 'Maintenance',
    open: 'Open',
    in_progress: 'In Progress',
    closed: 'Closed',
    scheduled: 'Scheduled',
    assigned: 'Assigned',
    pending_review: 'Under Review',
    resolved: 'Resolved',
    overdue: 'Overdue',
    delayed: 'Delayed',
  };

  // Priority styles
  const priorityStyles: Record<PriorityType, string> = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
    critical: 'priority-critical',
  };

  const priorityLabels: Record<PriorityType, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  // Health styles
  const healthStyles: Record<HealthType, string> = {
    good: 'status-running',
    warning: 'status-maintenance',
    critical: 'status-down',
  };

  const healthLabels: Record<HealthType, string> = {
    good: 'Good',
    warning: 'Warning',
    critical: 'Critical',
  };

  if (status) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
          statusStyles[status]
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            status === 'running' && 'bg-status-success',
            status === 'down' && 'bg-status-critical animate-pulse-slow',
            status === 'maintenance' && 'bg-status-warning',
            (status === 'open' || status === 'overdue') && 'bg-status-critical animate-pulse-slow',
            (status === 'in_progress' || status === 'pending_review' || status === 'delayed') && 'bg-status-warning',
            (status === 'closed' || status === 'resolved') && 'bg-status-success',
            (status === 'scheduled' || status === 'assigned') && 'bg-primary'
          )}
        />
        {statusLabels[status]}
      </span>
    );
  }

  if (priority) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
          priorityStyles[priority]
        )}
      >
        {priorityLabels[priority]}
      </span>
    );
  }

  if (health) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
          healthStyles[health]
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            health === 'good' && 'bg-status-success',
            health === 'warning' && 'bg-status-warning',
            health === 'critical' && 'bg-status-critical animate-pulse-slow'
          )}
        />
        {healthLabels[health]}
      </span>
    );
  }

  return null;
};

export default StatusBadge;
