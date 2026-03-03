import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Wrench,
  Loader2,
  Timer,
  BarChart3,
  Calendar,
  Users,
  CheckCircle2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { BreakdownTrendChart, CategoryPieChart } from '@/components/dashboard/BreakdownChart';
import RecentBreakdowns from '@/components/dashboard/RecentBreakdowns';
import MachineHealthTable from '@/components/dashboard/MachineHealthTable';
import TechnicianWorkload from '@/components/dashboard/TechnicianWorkload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMachines } from '@/hooks/useMachines';
import { useBreakdowns } from '@/hooks/useBreakdowns';

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  accentColor: string;
}

const KPICard = ({ title, value, subtitle, icon, trend, accentColor }: KPICardProps) => (
  <Card className="bg-card border-border/50 hover:border-border transition-colors">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-1">{subtitle}</p>
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Quick Stat Card Component
interface QuickStatProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  accentColor: string;
}

const QuickStatCard = ({ title, value, subtitle, icon, trend, accentColor }: QuickStatProps) => (
  <Card className="bg-card border-border/50 hover:border-border transition-colors">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-1">{subtitle}</p>
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: machines = [], isLoading: machinesLoading, refetch: refetchMachines } = useMachines();
  const { data: breakdowns = [], isLoading: breakdownsLoading, refetch: refetchBreakdowns } = useBreakdowns();

  const isLoading = machinesLoading || breakdownsLoading;

  // Calculate stats
  const totalMachines = machines.length;
  const machinesDown = machines.filter((m) => m.status === 'down').length;
  const machinesRunning = machines.filter((m) => m.status === 'running').length;
  const machinesMaintenance = machines.filter((m) => m.status === 'maintenance').length;

  const actualBreakdowns = breakdowns.filter((b) => b.category !== 'maintenance');

  const activeBreakdowns = actualBreakdowns.filter(
    (b) => b.status === 'open' || b.status === 'in-progress'
  ).length;
  const closedBreakdowns = actualBreakdowns.filter((b) => b.status === 'closed').length;
  const inProgressTasks = breakdowns.filter((b) => b.status === 'in-progress').length; // Keep 'tasks' as combined workload

  // Calculate upcoming maintenance (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingMaintenance = machines.filter((m) => {
    if (!m.next_maintenance) return false;
    const maintDate = new Date(m.next_maintenance);
    return maintDate >= today && maintDate <= nextWeek;
  }).length;

  // Average downtime calculation
  const avgDowntime = actualBreakdowns.length > 0 ? Math.round((actualBreakdowns.length * 168) / actualBreakdowns.length) : 0;

  // Machine health percentage
  const machineHealth = totalMachines > 0
    ? Math.round((machinesRunning / totalMachines) * 100)
    : 0;

  // Active users (placeholder)
  const activeUsers = 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchMachines(), refetchBreakdowns()]);
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <MainLayout title="Dashboard Overview" subtitle="Monitor your machines and maintenance activities">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Dashboard Overview"
      subtitle="Monitor your machines and maintenance activities"
    >
      {/* Header Actions */}
      <div className="flex items-center justify-end mb-6">
        <Button
          variant="default"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Primary KPI Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <KPICard
          title="Total Machines"
          value={totalMachines}
          subtitle="Active in production"
          icon={<Settings2 className="h-5 w-5 text-primary" />}
          trend={{ value: 0, isPositive: true }}
          accentColor="bg-primary/10"
        />
        <KPICard
          title="Active Breakdowns"
          value={activeBreakdowns}
          subtitle="Requiring attention"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          trend={activeBreakdowns > 0 ? { value: 100, isPositive: false } : undefined}
          accentColor="bg-amber-500/10"
        />
        <KPICard
          title="In Progress Tasks"
          value={inProgressTasks}
          subtitle="Being worked on"
          icon={<Wrench className="h-5 w-5 text-rose-500" />}
          trend={{ value: 0, isPositive: true }}
          accentColor="bg-rose-500/10"
        />
        <KPICard
          title="Upcoming Maintenance"
          value={upcomingMaintenance}
          subtitle="Next 7 days"
          icon={<Calendar className="h-5 w-5 text-cyan-500" />}
          trend={{ value: 0, isPositive: true }}
          accentColor="bg-cyan-500/10"
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <QuickStatCard
          title="Avg Downtime"
          value={`${avgDowntime}m`}
          subtitle="Per breakdown"
          icon={<Timer className="h-5 w-5 text-amber-500" />}
          trend={avgDowntime > 0 ? { value: 15, isPositive: false } : undefined}
          accentColor="bg-amber-500/10"
        />
        <QuickStatCard
          title="Machine Health"
          value={`${machineHealth}%`}
          subtitle="Overall score"
          icon={<Activity className="h-5 w-5 text-emerald-500" />}
          trend={machineHealth >= 80 ? { value: 100, isPositive: true } : undefined}
          accentColor="bg-emerald-500/10"
        />
        <QuickStatCard
          title="Resolved Issues"
          value={closedBreakdowns}
          subtitle="Total completed"
          icon={<CheckCircle2 className="h-5 w-5 text-cyan-500" />}
          accentColor="bg-cyan-500/10"
        />
        <QuickStatCard
          title="Active Users"
          value={activeUsers}
          subtitle="Currently active"
          icon={<Users className="h-5 w-5 text-violet-500" />}
          trend={{ value: 0, isPositive: true }}
          accentColor="bg-violet-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Machine Health Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <BreakdownTrendChart />
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Downtime Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CategoryPieChart />
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <RecentBreakdowns />
        <TechnicianWorkload />
      </div>

      {/* Machine Health Table */}
      <MachineHealthTable />
    </MainLayout>
  );
};

export default Dashboard;
