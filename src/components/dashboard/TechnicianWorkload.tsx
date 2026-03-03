import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBreakdowns } from '@/hooks/useBreakdowns';
import { useTechnicians } from '@/hooks/useProfiles';
import { User, Loader2 } from 'lucide-react';

const TechnicianWorkload = () => {
  const { data: technicians = [], isLoading: techLoading } = useTechnicians();
  const { data: breakdowns = [], isLoading: breakdownsLoading } = useBreakdowns();

  const isLoading = techLoading || breakdownsLoading;

  const workloadData = technicians.map((tech) => {
    const assigned = breakdowns.filter(
      (b) => b.assigned_to === tech.user_id && b.category !== 'maintenance'
    );
    const open = assigned.filter((b) => b.status === 'open').length;
    const inProgress = assigned.filter((b) => b.status === 'in-progress').length;
    const closed = assigned.filter((b) => b.status === 'closed').length;
    const total = assigned.length;

    return {
      ...tech,
      open,
      inProgress,
      closed,
      total,
      completionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
    };
  });

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Technician Workload
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Technician Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workloadData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No technicians found
          </div>
        ) : (
          <div className="space-y-5">
            {workloadData.map((tech) => (
              <div key={tech.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tech.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tech.total} tasks assigned
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-status-critical" />
                      {tech.open} Open
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-status-warning" />
                      {tech.inProgress} Active
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-status-success" />
                      {tech.closed} Done
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={tech.completionRate}
                    className="h-2 flex-1"
                  />
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                    {tech.completionRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TechnicianWorkload;
