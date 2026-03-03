import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import { useBreakdowns } from '@/hooks/useBreakdowns';
import { formatDistanceToNow } from 'date-fns';

const RecentBreakdowns = () => {
  const { data: breakdowns = [], isLoading } = useBreakdowns();

  const recentBreakdowns = breakdowns
    .filter(b => b.category !== 'maintenance')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            Recent Breakdowns
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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Recent Breakdowns
        </CardTitle>
        <Link to="/breakdowns">
          <Button variant="ghost" size="sm" className="text-primary">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {recentBreakdowns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No breakdowns recorded yet
          </div>
        ) : (
          <div className="space-y-4">
            {recentBreakdowns.map((breakdown) => (
              <Link
                key={breakdown.id}
                to={`/machines/${breakdown.machine_id}`}
                className="flex items-start justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {breakdown.machines?.name || 'Unknown Machine'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      #{breakdown.machines?.machine_id || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {breakdown.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(breakdown.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <StatusBadge status={breakdown.status as 'open' | 'in_progress' | 'closed'} />
                  <StatusBadge priority={breakdown.priority as 'low' | 'medium' | 'high' | 'critical'} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentBreakdowns;
