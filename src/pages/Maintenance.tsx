import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMachines, useUpdateMachine, DbMachine, useScheduleMaintenance } from '@/hooks/useMachines';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuthContext } from '@/contexts/AuthContext';
import { differenceInDays, format, addDays, addMonths, addWeeks } from 'date-fns';
import { toast } from 'sonner';

// Convert maintenance_frequency text to days
const frequencyToDays = (freq: string | null): number => {
  switch (freq?.toLowerCase()) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
    case 'quarterly': return 90;
    case 'semi-annually': return 180;
    case 'annually': return 365;
    default: return 30; // default monthly
  }
};

interface MachineMaintenanceInfo extends DbMachine {
  nextDue: Date;
  daysUntilNext: number;
  daysSinceLast: number;
  progressPercent: number;
  maintenanceStatus: 'due' | 'upcoming' | 'ok';
  freqDays: number;
}

const Maintenance = () => {
  const navigate = useNavigate();
  const { data: machines = [], isLoading } = useMachines();
  const { user } = useAuthContext();
  const scheduleMaintenance = useScheduleMaintenance();
  const { data: allProfiles = [] } = useProfiles();
  const technicians = allProfiles.filter(p => p.role === 'technician');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineMaintenanceInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [scheduleType, setScheduleType] = useState('Preventive');
  const [schedulePriority, setSchedulePriority] = useState('medium');
  const [scheduleDuration, setScheduleDuration] = useState('2');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleTech, setScheduleTech] = useState('none');

  const today = new Date();

  // Calculate maintenance status for each active machine
  const machineMaintenanceStatus: MachineMaintenanceInfo[] = machines
    .filter(m => m.is_active)
    .map((machine) => {
      const freqDays = frequencyToDays(machine.maintenance_frequency);
      const lastMaintenance = machine.last_maintenance ? new Date(machine.last_maintenance) : null;

      // If next_maintenance is set, use it; otherwise calculate from last + frequency
      let nextDue: Date;
      if (machine.next_maintenance) {
        nextDue = new Date(machine.next_maintenance);
      } else if (lastMaintenance) {
        nextDue = addDays(lastMaintenance, freqDays);
      } else {
        // No maintenance history - assume due now
        nextDue = today;
      }

      const daysUntilNext = differenceInDays(nextDue, today);
      const daysSinceLast = lastMaintenance ? differenceInDays(today, lastMaintenance) : freqDays;
      const progressPercent = Math.min((daysSinceLast / freqDays) * 100, 100);

      let maintenanceStatus: 'due' | 'upcoming' | 'ok';
      if (daysUntilNext < 0) {
        maintenanceStatus = 'due';
      } else if (daysUntilNext <= 7) {
        maintenanceStatus = 'upcoming';
      } else {
        maintenanceStatus = 'ok';
      }

      return {
        ...machine,
        nextDue,
        daysUntilNext,
        daysSinceLast,
        progressPercent,
        maintenanceStatus,
        freqDays,
      };
    });

  const dueMachines = machineMaintenanceStatus.filter(m => m.maintenanceStatus === 'due');
  const upcomingMachines = machineMaintenanceStatus.filter(m => m.maintenanceStatus === 'upcoming');
  const okMachines = machineMaintenanceStatus.filter(m => m.maintenanceStatus === 'ok');

  const handleOpenSchedule = (machine: MachineMaintenanceInfo) => {
    setSelectedMachine(machine);
    setSelectedDate(machine.nextDue > today ? machine.nextDue : addDays(today, 1));
    setScheduleOpen(true);
  };

  const handleScheduleMaintenance = async () => {
    if (!selectedMachine || !selectedDate) {
      toast.error('Please select a date');
      return;
    }

    await scheduleMaintenance.mutateAsync({
      id: selectedMachine.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: scheduleType,
      priority: schedulePriority,
      estimated_duration: scheduleDuration,
      description: scheduleDescription,
      technician_id: scheduleTech === 'none' ? undefined : scheduleTech
    });

    setScheduleOpen(false);
    setSelectedMachine(null);
    setScheduleType('Preventive');
    setSchedulePriority('medium');
    setScheduleDuration('2');
    setScheduleDescription('');
    setScheduleTech('none');
  };

  if (isLoading) {
    return (
      <MainLayout title="Maintenance" subtitle="Schedule and track preventive maintenance">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Maintenance" subtitle="Schedule and track preventive maintenance">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="glass-panel border-l-4 border-l-status-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-status-critical">{dueMachines.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-critical/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-status-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due This Week</p>
                <p className="text-2xl font-bold text-status-warning">{upcomingMachines.length}</p>
              </div>
              <Clock className="h-8 w-8 text-status-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-l-4 border-l-status-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Up to Date</p>
                <p className="text-2xl font-bold text-status-success">{okMachines.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-status-success/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Maintenance */}
      {dueMachines.length > 0 && (
        <Card className="glass-panel mb-6 border-status-critical/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-status-critical">
              <AlertTriangle className="h-5 w-5" />
              Overdue Maintenance ({dueMachines.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dueMachines.map((machine) => (
                <div
                  key={machine.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border border-status-critical/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-status-critical/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-status-critical" />
                    </div>
                    <div>
                      <h4 className="font-medium">{machine.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        #{machine.machine_id} • {machine.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm font-medium text-status-critical">
                      {Math.abs(machine.daysUntilNext)} days overdue
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {machine.last_maintenance
                        ? `Last: ${format(new Date(machine.last_maintenance), 'MMM d, yyyy')}`
                        : 'No maintenance recorded'}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleOpenSchedule(machine)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Maintenance */}
      {upcomingMachines.length > 0 && (
        <Card className="glass-panel mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-status-warning" />
              Due This Week ({upcomingMachines.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMachines.map((machine) => (
                <div
                  key={machine.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-status-warning/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-status-warning" />
                    </div>
                    <div>
                      <h4 className="font-medium">{machine.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        #{machine.machine_id} • {machine.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm font-medium text-status-warning">
                      Due in {machine.daysUntilNext} day{machine.daysUntilNext !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(machine.nextDue, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleOpenSchedule(machine)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Machines Maintenance Schedule */}
      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            All Machines Maintenance Schedule ({machineMaintenanceStatus.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {machineMaintenanceStatus.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No machines found. Add machines to track maintenance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Machine</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Last Maintenance</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Frequency</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Next Due</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground w-40">Progress</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {machineMaintenanceStatus
                    .sort((a, b) => a.daysUntilNext - b.daysUntilNext)
                    .map((machine) => (
                      <tr key={machine.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-sm">{machine.name}</p>
                            <p className="text-xs text-muted-foreground">#{machine.machine_id}</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          {machine.last_maintenance
                            ? format(new Date(machine.last_maintenance), 'MMM d, yyyy')
                            : <span className="text-muted-foreground">Not recorded</span>}
                        </td>
                        <td className="p-3 text-sm capitalize">{machine.maintenance_frequency || 'Monthly'}</td>
                        <td className="p-3 text-sm">{format(machine.nextDue, 'MMM d, yyyy')}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={machine.progressPercent}
                              className={`h-2 ${machine.progressPercent >= 100
                                ? '[&>div]:bg-status-critical'
                                : machine.progressPercent >= 80
                                  ? '[&>div]:bg-status-warning'
                                  : '[&>div]:bg-status-success'
                                }`}
                            />
                            <span className="text-xs text-muted-foreground w-10">
                              {Math.round(machine.progressPercent)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={
                              machine.maintenanceStatus === 'due'
                                ? 'bg-status-critical/10 text-status-critical'
                                : machine.maintenanceStatus === 'upcoming'
                                  ? 'bg-status-warning/10 text-status-warning'
                                  : 'bg-status-success/10 text-status-success'
                            }
                          >
                            {machine.maintenanceStatus === 'due'
                              ? 'Overdue'
                              : machine.maintenanceStatus === 'upcoming'
                                ? 'Due Soon'
                                : 'On Track'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {(user?.role === 'admin' || user?.role === 'manager') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenSchedule(machine)}
                                title="Schedule maintenance"
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/machines/${machine.id}`)}
                              title="View machine"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Maintenance Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
          </DialogHeader>
          {selectedMachine && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedMachine.name}</p>
                <p className="text-sm text-muted-foreground">
                  #{selectedMachine.machine_id} • {selectedMachine.location}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Frequency: {selectedMachine.maintenance_frequency || 'Monthly'}
                  {selectedMachine.last_maintenance && (
                    <> • Last: {format(new Date(selectedMachine.last_maintenance), 'MMM d, yyyy')}</>
                  )}
                </p>
              </div>
              <div className="flex justify-center flex-col space-y-4">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < today}
                  className="rounded-md border self-center"
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Maintenance Type</label>
                  <Select value={scheduleType} onValueChange={setScheduleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preventive">Preventive</SelectItem>
                      <SelectItem value="Corrective">Corrective</SelectItem>
                      <SelectItem value="Predictive">Predictive</SelectItem>
                      <SelectItem value="Inspection">Inspection</SelectItem>
                      <SelectItem value="Calibration">Calibration</SelectItem>
                      <SelectItem value="Routine">Routine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={schedulePriority} onValueChange={setSchedulePriority}>
                      <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Est. Duration (hrs)</label>
                    <Input type="number" value={scheduleDuration} onChange={e => setScheduleDuration(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Maintenance Description / Checklist</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter details..."
                    value={scheduleDescription}
                    onChange={(e) => setScheduleDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign Technician (Optional)</label>
                  <Select value={scheduleTech} onValueChange={setScheduleTech}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {technicians.map(t => (
                        <SelectItem key={t.user_id} value={t.user_id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedDate && (
                <p className="text-sm text-center text-muted-foreground">
                  Scheduled for: <span className="font-medium text-foreground">{format(selectedDate, 'MMMM d, yyyy')}</span>
                </p>
              )}
              <Button
                onClick={handleScheduleMaintenance}
                className="w-full"
                disabled={!selectedDate || scheduleMaintenance.isPending}
              >
                {scheduleMaintenance.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Confirm Schedule
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Maintenance;
