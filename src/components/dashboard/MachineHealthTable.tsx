import { Link } from 'react-router-dom';
import { ArrowRight, TrendingDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import { useMachines } from '@/hooks/useMachines';
import { useBreakdowns } from '@/hooks/useBreakdowns';

const MachineHealthTable = () => {
  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: breakdowns = [], isLoading: breakdownsLoading } = useBreakdowns();

  const isLoading = machinesLoading || breakdownsLoading;

  // Calculate machine stats
  const machineStats = machines.map((machine) => {
    const machineBreakdowns = breakdowns.filter(
      (b) => b.machine_id === machine.id && b.category !== 'maintenance'
    );
    const breakdownCount = machineBreakdowns.length;

    return {
      ...machine,
      breakdownCount,
      totalDowntime: breakdownCount * 2, // Estimate 2h per breakdown
    };
  });

  // Sort by breakdown count (worst performing first)
  const topMachinesByDowntime = machineStats
    .sort((a, b) => b.breakdownCount - a.breakdownCount)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-rose-500" />
            <CardTitle className="text-base font-semibold">
              Top 5 Machines by Breakdowns
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-rose-500" />
          <CardTitle className="text-base font-semibold">
            Top 5 Machines by Breakdowns
          </CardTitle>
        </div>
        <Link to="/machines">
          <Button variant="ghost" size="sm" className="text-primary">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {topMachinesByDowntime.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No machines added yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th className="text-right">Breakdowns</th>
                </tr>
              </thead>
              <tbody>
                {topMachinesByDowntime.map((machine) => (
                  <tr key={machine.id}>
                    <td>
                      <Link
                        to={`/machines/${machine.id}`}
                        title="View machine details"
                        className="hover:text-primary transition-colors"
                      >
                        <div className="font-medium">{machine.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          #{machine.machine_id}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={machine.status as 'running' | 'down' | 'maintenance'} />
                    </td>
                    <td>
                      <StatusBadge health={machine.health as 'good' | 'warning' | 'critical'} />
                    </td>
                    <td className="text-right font-medium">
                      {machine.breakdownCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineHealthTable;
