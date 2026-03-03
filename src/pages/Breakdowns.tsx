import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  UserPlus,
  Eye,
  Settings2,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { BreakdownForm } from '@/components/breakdowns/BreakdownForm';
import { useBreakdowns, useAssignBreakdown, DbBreakdownWithMachine } from '@/hooks/useBreakdowns';
import { useTechnicians } from '@/hooks/useProfiles';
import { toast } from 'sonner';

type BreakdownStatus = 'open' | 'in-progress' | 'closed' | 'all';

// Assign Dialog Component
const AssignDialog = ({
  breakdown,
  onClose,
}: {
  breakdown: DbBreakdownWithMachine;
  onClose: () => void;
}) => {
  const [selectedTech, setSelectedTech] = useState('');
  const { data: technicians = [], isLoading } = useTechnicians();
  const assignBreakdown = useAssignBreakdown();

  const handleAssign = async () => {
    if (!selectedTech) return;

    try {
      await assignBreakdown.mutateAsync({
        id: breakdown.id,
        assigned_to: selectedTech,
      });
      onClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="form-label">Select Technician</label>
        <Select value={selectedTech} onValueChange={setSelectedTech}>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Loading...' : 'Choose a technician'} />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((tech) => (
              <SelectItem key={tech.user_id} value={tech.user_id}>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span>{tech.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium mb-1">Task Details</p>
        <p className="text-sm text-muted-foreground">{breakdown.description}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Machine: {breakdown.machines?.name} (#{breakdown.machines?.machine_id})
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleAssign}
          disabled={!selectedTech || assignBreakdown.isPending}
          className="w-full"
        >
          {assignBreakdown.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Technician
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// Breakdown Card Component
const BreakdownCard = ({
  breakdown,
  onViewDetails,
}: {
  breakdown: DbBreakdownWithMachine;
  onViewDetails: () => void;
}) => {
  const [assignOpen, setAssignOpen] = useState(false);
  const isUnassigned = !breakdown.assigned_to;

  // Calculate downtime
  const startTime = new Date(breakdown.start_time);
  const endTime = breakdown.end_time ? new Date(breakdown.end_time) : new Date();
  const downtimeHours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));

  return (
    <Card className={`glass-panel hover:shadow-card-hover transition-shadow ${isUnassigned && breakdown.status !== 'closed' ? 'border-l-4 border-l-status-warning' : ''
      }`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                {breakdown.breakdown_id}
              </span>
              <StatusBadge priority={breakdown.priority as 'low' | 'medium' | 'high' | 'critical'} />
            </div>
            <h3 className="font-semibold">{breakdown.machines?.name || 'Unknown Machine'}</h3>
            <p className="text-xs text-muted-foreground">
              #{breakdown.machines?.machine_id} • {breakdown.machines?.location}
            </p>
          </div>
          <StatusBadge status={breakdown.status === 'in-progress' ? 'in_progress' : breakdown.status as 'open' | 'closed'} />
        </div>

        <p className="text-sm font-medium mb-1">{breakdown.title}</p>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {breakdown.description}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(breakdown.start_time).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {breakdown.status !== 'closed'
                ? 'Ongoing'
                : `${downtimeHours}h downtime`}
            </span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {isUnassigned ? (
              <Badge variant="outline" className="text-status-warning border-status-warning">
                Unassigned
              </Badge>
            ) : (
              <span className="text-muted-foreground">Assigned</span>
            )}
          </div>
        </div>

        {breakdown.status === 'closed' && breakdown.action_taken && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Action Taken:</p>
            <p className="text-sm">{breakdown.action_taken}</p>
          </div>
        )}

        {breakdown.status !== 'closed' && (
          <div className="pt-3 border-t border-border flex gap-2">
            {isUnassigned ? (
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Technician</DialogTitle>
                  </DialogHeader>
                  <AssignDialog
                    breakdown={breakdown}
                    onClose={() => setAssignOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <Button size="sm" variant="outline" className="flex-1" onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Breakdowns = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BreakdownStatus>('all');

  const { data: breakdowns = [], isLoading } = useBreakdowns();
  const actualBreakdowns = breakdowns.filter(b => b.category !== 'maintenance');

  const filterBreakdowns = (status: BreakdownStatus) => {
    return actualBreakdowns.filter((b) => {
      const matchesSearch =
        (b.machines?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.breakdown_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority =
        priorityFilter === 'all' || b.priority === priorityFilter;
      const matchesStatus = status === 'all' || b.status === status;
      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && b.assigned_to) ||
        (assignmentFilter === 'unassigned' && !b.assigned_to);
      return matchesSearch && matchesPriority && matchesStatus && matchesAssignment;
    });
  };

  const openCount = actualBreakdowns.filter((b) => b.status === 'open').length;
  const inProgressCount = actualBreakdowns.filter((b) => b.status === 'in-progress').length;
  const closedCount = actualBreakdowns.filter((b) => b.status === 'closed').length;
  const unassignedCount = actualBreakdowns.filter(
    (b) => !b.assigned_to && b.status !== 'closed'
  ).length;

  // Calculate total downtime
  const totalDowntime = actualBreakdowns.reduce((sum, b) => {
    if (b.end_time) {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    }
    return sum;
  }, 0);

  if (isLoading) {
    return (
      <MainLayout title="Breakdowns" subtitle="Track and manage all machine breakdowns">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Breakdowns"
      subtitle="Track and manage all machine breakdowns"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-status-critical/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-status-critical" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-status-warning/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-status-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-status-success/20 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-status-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{closedCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-status-warning/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-status-warning">{unassignedCount}</p>
              <p className="text-xs text-muted-foreground">Unassigned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDowntime}h</p>
              <p className="text-xs text-muted-foreground">Total Downtime</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search breakdowns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            maxLength={100}
          />
        </div>
        <div className="flex gap-3">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger className="w-[140px]">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Breakdown
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log New Breakdown</DialogTitle>
              </DialogHeader>
              <BreakdownForm onClose={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BreakdownStatus)}
        className="mb-6"
      >
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-2">
            All
            <span className="bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded text-xs">
              {actualBreakdowns.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="open" className="gap-2">
            Open
            <span className="bg-status-critical/20 text-status-critical px-1.5 py-0.5 rounded text-xs">
              {openCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="gap-2">
            In Progress
            <span className="bg-status-warning/20 text-status-warning px-1.5 py-0.5 rounded text-xs">
              {inProgressCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="closed" className="gap-2">
            Closed
            <span className="bg-status-success/20 text-status-success px-1.5 py-0.5 rounded text-xs">
              {closedCount}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterBreakdowns(activeTab).map((breakdown) => (
              <BreakdownCard
                key={breakdown.id}
                breakdown={breakdown}
                onViewDetails={() => navigate(`/tasks`)}
              />
            ))}
          </div>

          {filterBreakdowns(activeTab).length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                No breakdowns found
              </h3>
              <p className="text-muted-foreground">
                {actualBreakdowns.length === 0
                  ? 'No breakdowns have been logged yet'
                  : activeTab === 'all'
                    ? 'No breakdowns match your search criteria'
                    : `No ${activeTab.replace('-', ' ')} breakdowns`}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Breakdowns;
