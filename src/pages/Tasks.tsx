import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Clock,
  User,
  Calendar,
  AlertCircle,
  UserPlus,
  Loader2,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { useBreakdowns, useAssignBreakdown, DbBreakdownWithMachine } from '@/hooks/useBreakdowns';
import { useTechnicians, DbProfileWithRole } from '@/hooks/useProfiles';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type TaskStatus = 'all' | 'open' | 'in-progress' | 'closed';

// Assign Dialog Component
const AssignTaskDialog = ({
  task,
  technicians,
  onSuccess,
}: {
  task: DbBreakdownWithMachine;
  technicians: DbProfileWithRole[];
  onSuccess: () => void;
}) => {
  const [selectedTech, setSelectedTech] = useState('');
  const assignBreakdown = useAssignBreakdown();

  const handleAssign = () => {
    if (!selectedTech) {
      toast.error('Please select a technician');
      return;
    }

    assignBreakdown.mutate({
      id: task.id,
      assigned_to: selectedTech,
    }, {
      onSuccess: () => {
        const tech = technicians.find((t) => t.user_id === selectedTech);
        toast.success(`Task assigned to ${tech?.name || 'technician'}`);
        onSuccess();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium mb-1">{task.machines?.name || 'Unknown Machine'}</p>
        <p className="text-xs text-muted-foreground">{task.title}</p>
        <div className="flex gap-2 mt-2">
          <StatusBadge priority={task.priority as 'low' | 'medium' | 'high' | 'critical'} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Select Technician</label>
        <Select value={selectedTech} onValueChange={setSelectedTech}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a technician" />
          </SelectTrigger>
          <SelectContent>
            {technicians.length === 0 ? (
              <SelectItem value="none" disabled>No technicians available</SelectItem>
            ) : (
              technicians.map((tech) => (
                <SelectItem key={tech.user_id} value={tech.user_id}>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <span>{tech.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleAssign} disabled={!selectedTech || assignBreakdown.isPending} className="w-full">
        {assignBreakdown.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        Assign Technician
      </Button>
    </div>
  );
};

// Task Card Component
const TaskCard = ({
  task,
  technicians,
  userRole,
  onClick,
}: {
  task: DbBreakdownWithMachine;
  technicians: DbProfileWithRole[];
  userRole?: string;
  onClick: () => void;
}) => {
  const [assignOpen, setAssignOpen] = useState(false);
  const isUnassigned = !task.assigned_to;
  const assignedTech = technicians.find(t => t.user_id === task.assigned_to);

  const downtimeHours = task.category === 'maintenance'
    ? `${task.estimated_duration || 0}h (Est.)`
    : task.end_time
      ? `${Math.round((new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60))}h`
      : `${Math.round((new Date().getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60))}h`;

  return (
    <Card
      className={`glass-panel group cursor-pointer hover:shadow-card-hover transition-all ${task.priority === 'critical' ? 'border-l-4 border-l-status-critical' : ''
        } ${isUnassigned && task.status !== 'closed' ? 'bg-status-warning/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                {task.breakdown_id}
              </span>
              <StatusBadge priority={task.priority as 'low' | 'medium' | 'high' | 'critical'} />
            </div>
            <h3 className="font-semibold">{task.machines?.name || 'Unknown Machine'}</h3>
            <p className="text-xs text-muted-foreground">
              #{task.machines?.machine_id} • {task.machines?.location}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={task.status as any} />
            {isUnassigned && task.status !== 'closed' && (
              <Badge variant="outline" className="text-status-warning border-status-warning text-xs">
                Unassigned
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm font-medium mb-1">{task.title}</p>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{task.description}</p>

        <div className="flex flex-wrap gap-3 text-sm mb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(task.start_time).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{downtimeHours}</span>
          </div>
          {assignedTech && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{assignedTech.name}</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          {isUnassigned && task.status !== 'closed' && (userRole === 'admin' || userRole === 'manager') ? (
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign User
                </Button>
              </DialogTrigger>
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Assign Technician</DialogTitle>
                </DialogHeader>
                <AssignTaskDialog
                  task={task}
                  technicians={technicians}
                  onSuccess={() => setAssignOpen(false)}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <div className="text-xs text-muted-foreground">
              {task.status === 'closed' ? 'Resolved' : 'View details'}
            </div>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
};

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { data: breakdowns = [], isLoading: breakdownsLoading } = useBreakdowns();
  const { data: technicians = [], isLoading: techniciansLoading } = useTechnicians();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TaskStatus>('all');

  const isLoading = breakdownsLoading || techniciansLoading;

  // For technicians, only show tasks assigned to them
  const isTechnician = user?.role === 'technician';
  const visibleBreakdowns = isTechnician
    ? breakdowns.filter(b => b.assigned_to === user?.id)
    : breakdowns;

  // Filter tasks
  const filterTasks = (status: TaskStatus) => {
    return visibleBreakdowns.filter((task) => {
      const matchesSearch =
        task.machines?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.breakdown_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      let matchesStatus = false;
      if (status === 'all') matchesStatus = true;
      else if (status === 'open') matchesStatus = ['open', 'scheduled', 'assigned'].includes(task.status);
      else if (status === 'in-progress') matchesStatus = ['in_progress', 'pending_review'].includes(task.status);
      else if (status === 'closed') matchesStatus = ['closed', 'resolved'].includes(task.status);
      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && task.assigned_to) ||
        (assignmentFilter === 'unassigned' && !task.assigned_to);
      return matchesSearch && matchesPriority && matchesStatus && matchesAssignment;
    });
  };

  // Stats
  const openCount = visibleBreakdowns.filter((t) => ['open', 'scheduled', 'assigned'].includes(t.status)).length;
  const inProgressCount = visibleBreakdowns.filter((t) => ['in_progress', 'pending_review'].includes(t.status)).length;
  const closedCount = visibleBreakdowns.filter((t) => ['closed', 'resolved'].includes(t.status)).length;
  const unassignedCount = breakdowns.filter((t) => !t.assigned_to && !['closed', 'resolved'].includes(t.status)).length;

  if (isLoading) {
    return (
      <MainLayout title="Tasks" subtitle="Manage and track all maintenance tasks">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isTechnician ? "My Tasks" : "Tasks"} subtitle={isTechnician ? "Manage your assigned maintenance tasks" : "Manage and track all maintenance tasks"}>
      {/* Summary Stats */}
      <div className={`grid grid-cols-2 gap-4 mb-6 ${isTechnician ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
        <Card className="glass-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-status-critical/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-status-critical" />
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
              <Wrench className="h-5 w-5 text-status-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{closedCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        {!isTechnician && (
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
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskStatus)} className="mb-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-2">
            All
            <span className="bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded text-xs">
              {visibleBreakdowns.length}
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
            {filterTasks(activeTab).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                technicians={technicians}
                userRole={user?.role}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))}
          </div>

          {filterTasks(activeTab).length === 0 && (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No tasks found</h3>
              <p className="text-muted-foreground">
                {visibleBreakdowns.length === 0
                  ? isTechnician ? 'No tasks have been assigned to you' : 'No tasks have been created yet'
                  : 'No tasks match your filters'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Tasks;
