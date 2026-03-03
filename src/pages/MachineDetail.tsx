import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Settings2, MapPin, Calendar, Clock, Wrench,
  AlertTriangle, CheckCircle2, User, Activity, FileText,
  Loader2, Fuel, Gauge, Plus, Droplets, Download, ImageIcon,
  History, Settings, ShieldCheck, UserCog
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMachines, useUpdateMachine, DbMachine, useScheduleMaintenance, useCreateMaintenanceRecord, useCreatePartReplacement, useMachine } from '@/hooks/useMachines';
import { useBreakdowns } from '@/hooks/useBreakdowns';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Add Maintenance Dialog Component
const AddMaintenanceDialog = ({ machineId, onSuccess }: { machineId: string; onSuccess: () => void; }) => {
  const [type, setType] = useState('preventive');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('');
  const [parts, setParts] = useState('');
  const [notes, setNotes] = useState('');
  const createRecord = useCreateMaintenanceRecord();

  const handleSubmit = () => {
    createRecord.mutate({
      machineId,
      type,
      maintenance_date: date || undefined,
      duration_hours: duration || undefined,
      parts_replaced: parts || undefined,
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        setType('preventive');
        setDate('');
        setDuration('');
        setParts('');
        setNotes('');
        onSuccess();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="predictive">Predictive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Duration (hours)</label>
          <Input type="number" step="0.5" placeholder="e.g. 2.5" value={duration} onChange={e => setDuration(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Parts Replaced</label>
          <Input placeholder="e.g. Filter, Belt" value={parts} onChange={e => setParts(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea placeholder="Maintenance details..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <Button onClick={handleSubmit} className="w-full" disabled={createRecord.isPending}>
        {createRecord.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
        Log Maintenance
      </Button>
    </div>
  );
};

// Add Part Replacement Dialog Component
const AddPartDialog = ({ machineId, breakdowns, onSuccess }: { machineId: string; breakdowns: any[]; onSuccess: () => void; }) => {
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [breakdownId, setBreakdownId] = useState<string | undefined>();
  const createPart = useCreatePartReplacement();

  const handleSubmit = () => {
    if (!partName.trim()) return toast.error('Part name is required');
    createPart.mutate({
      machineId,
      part_name: partName,
      quantity_used: quantity,
      replaced_date: date,
      notes: notes || undefined,
      breakdown_id: breakdownId === 'none' ? undefined : breakdownId,
    }, {
      onSuccess: () => {
        setPartName('');
        setQuantity('1');
        setNotes('');
        setBreakdownId('none');
        onSuccess();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Part Name</label>
        <Input placeholder="e.g. Hydraulic Pump" value={partName} onChange={e => setPartName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Quantity</label>
          <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date Replaced</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Linked Breakdown (Optional)</label>
        <Select value={breakdownId || 'none'} onValueChange={setBreakdownId}>
          <SelectTrigger><SelectValue placeholder="Select breakdown" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {breakdowns.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.breakdown_id} - {b.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea placeholder="Additional details..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <Button onClick={handleSubmit} className="w-full" disabled={createPart.isPending}>
        {createPart.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
        Log Part
      </Button>
    </div>
  );
};

const MachineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [addMaintenanceOpen, setAddMaintenanceOpen] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleType, setScheduleType] = useState('Preventive');
  const [schedulePriority, setSchedulePriority] = useState('medium');
  const [scheduleDuration, setScheduleDuration] = useState('2');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleTech, setScheduleTech] = useState('none');
  const updateMachine = useUpdateMachine();
  const scheduleMaintenance = useScheduleMaintenance();
  const { user } = useAuthContext();

  const { data: machine, isLoading: machineLoading } = useMachine(id || '');
  const { data: allBreakdowns = [], isLoading: breakdownsLoading } = useBreakdowns();
  const { data: allProfiles = [] } = useProfiles();

  // Filter only technicians
  const technicians = allProfiles.filter(p => p.role === 'technician');

  const isLoading = machineLoading || breakdownsLoading;

  // Filter breakdowns for this machine
  const allMachineBreakdowns = allBreakdowns.filter((b) => b.machine_id === id);
  const machineBreakdowns = allMachineBreakdowns.filter(b => b.category !== 'maintenance');

  const combinedMaintenance = [
    ...(machine?.maintenance_records || []).map(r => ({
      id: r.id,
      date: new Date(r.maintenanceDate),
      type: r.type,
      technicianName: r.technician?.name || 'Unknown',
      duration: r.durationHours ? `${r.durationHours}h` : '-',
      partsReplaced: r.partsReplaced || '-',
      status: r.approvalStatus,
      isScheduled: false,
    })),
    ...allMachineBreakdowns.filter(b => b.category === 'maintenance').map(b => ({
      id: b.id,
      date: new Date(b.planned_date || b.start_time),
      type: b.maintenance_type || 'Preventive',
      technicianName: allProfiles.find(p => p.user_id === b.assigned_to)?.name || 'Unassigned',
      duration: b.estimated_duration ? `${b.estimated_duration}h (est)` : '-',
      partsReplaced: machine?.part_replacements
        ?.filter(p => p.breakdownId === b.id)
        .map(p => `${p.quantityUsed}x ${p.partName}`)
        .join(', ') || '-',
      status: ['open', 'scheduled', 'overdue', 'delayed'].includes(b.status)
        ? 'Scheduled'
        : ['in-progress', 'in_progress'].includes(b.status)
          ? 'In Progress'
          : b.status === 'pending_review'
            ? 'Pending Review'
            : 'Completed',
      isScheduled: true,
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (isLoading) {
    return (
      <MainLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!machine) {
    return (
      <MainLayout title="Machine Not Found" subtitle="">
        <div className="text-center py-12">
          <Settings2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Machine not found</h2>
          <p className="text-muted-foreground mb-4">
            The machine you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/machines')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Machines
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Calculate stats
  const totalBreakdowns = machineBreakdowns.length;
  const totalDowntime = machineBreakdowns.reduce((sum, b) => {
    if (b.end_time) {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    }
    return sum;
  }, 0);

  const closedBreakdowns = machineBreakdowns.filter(b => b.status === 'closed');
  const avgResolutionTime = closedBreakdowns.length > 0
    ? (totalDowntime / closedBreakdowns.length).toFixed(1)
    : '0';
  const openBreakdowns = machineBreakdowns.filter((b) => b.status !== 'closed').length;

  // Calculate next maintenance date
  const getMaintenanceDays = (frequency: string | null) => {
    switch (frequency) {
      case 'weekly': return 7;
      case 'biweekly': return 14;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'yearly': return 365;
      default: return 30;
    }
  };

  const lastMaintenance = machine.last_maintenance ? new Date(machine.last_maintenance) : new Date();
  const nextMaintenance = machine.next_maintenance
    ? new Date(machine.next_maintenance)
    : new Date(lastMaintenance.getTime() + getMaintenanceDays(machine.maintenance_frequency) * 24 * 60 * 60 * 1000);
  const daysUntilMaintenance = Math.ceil(
    (nextMaintenance.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  // Health score based on health status
  const healthScore = machine.health === 'good' ? 85 :
    machine.health === 'warning' ? 60 : 30;

  // Get fuel type display
  const fuelTypeDisplay = (machine as any).fuel_type || 'electric';
  const monthlyConsumption = (machine as any).fuel_consumption_monthly || 0;

  return (
    <MainLayout
      title={machine.name}
      subtitle={`Machine #${machine.machine_id} • ${machine.location}`}
    >
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/machines')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Machines
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(`${machine.name} - History Report`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Machine #${machine.machine_id} | Location: ${machine.location}`, 14, 28);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

            // Breakdown history table
            if (machineBreakdowns.length > 0) {
              doc.setFontSize(12);
              doc.text('Breakdown History', 14, 44);
              autoTable(doc, {
                startY: 48,
                head: [['ID', 'Date', 'Title', 'Priority', 'Status', 'Resolution']],
                body: machineBreakdowns.map(b => [
                  b.breakdown_id,
                  new Date(b.start_time).toLocaleDateString(),
                  b.title,
                  b.priority,
                  b.status,
                  b.end_time ? `${Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000)}h` : 'Ongoing',
                ]),
              });
            }


            doc.save(`${machine.name}_history.pdf`);
            toast.success('History exported as PDF');
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
          {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'supervisor') && (
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Wrench className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Maintenance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maintenance Date</label>
                    <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                  </div>
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
                    <Textarea
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
                  <Button className="w-full" disabled={!scheduleDate || scheduleMaintenance.isPending} onClick={async () => {
                    await scheduleMaintenance.mutateAsync({
                      id: machine.id,
                      date: scheduleDate,
                      type: scheduleType,
                      priority: schedulePriority,
                      estimated_duration: scheduleDuration,
                      description: scheduleDescription,
                      technician_id: scheduleTech === 'none' ? undefined : scheduleTech
                    });
                    setScheduleOpen(false);
                    setScheduleDate('');
                    setScheduleType('Preventive');
                    setSchedulePriority('medium');
                    setScheduleDuration('2');
                    setScheduleDescription('');
                    setScheduleTech('none');
                  }}>
                    {scheduleMaintenance.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
                    Schedule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Machine Overview */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Main Info Card */}
        <Card className="glass-panel lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {machine.image_url ? (
                  <div className="h-16 w-16 rounded-xl overflow-hidden">
                    <img src={machine.image_url} alt={machine.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                    <Settings2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-xl">{machine.name}</CardTitle>
                  <p className="text-muted-foreground">#{machine.machine_id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={machine.status as 'running' | 'down' | 'maintenance'} />
                <StatusBadge health={machine.health as 'good' | 'warning' | 'critical'} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Type
                </p>
                <p className="font-medium">{machine.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </p>
                <p className="font-medium">{machine.location}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Serial Number
                </p>
                <p className="font-medium text-sm">{machine.serial_number || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Fuel Type
                </p>
                <p className="font-medium capitalize">{fuelTypeDisplay}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Monthly Consumption
                </p>
                <p className="font-medium">{monthlyConsumption}L</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Maintenance Frequency
                </p>
                <p className="font-medium capitalize">{machine.maintenance_frequency || 'Monthly'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Installation Date
                </p>
                <p className="font-medium">
                  {machine.installation_date
                    ? new Date(machine.installation_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Maintenance
                </p>
                <p className="font-medium">
                  {machine.last_maintenance
                    ? new Date(machine.last_maintenance).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>

            </div>
            {machine.description && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{machine.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health & Stats Card */}
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Machine Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Health Score */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted/30"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${healthScore * 3.52} 352`}
                    className={
                      healthScore >= 80
                        ? 'text-status-success'
                        : healthScore >= 50
                          ? 'text-status-warning'
                          : 'text-status-critical'
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute">
                  <p className="text-3xl font-bold">{healthScore}%</p>
                  <p className="text-xs text-muted-foreground">Health</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Breakdowns</span>
                <Badge variant="secondary">{totalBreakdowns}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Downtime</span>
                <Badge variant="secondary" className="bg-status-warning/20 text-status-warning">
                  {totalDowntime}h
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Resolution</span>
                <Badge variant="secondary">{avgResolutionTime}h</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Issues</span>
                <Badge
                  variant="secondary"
                  className={
                    openBreakdowns > 0
                      ? 'bg-status-critical/20 text-status-critical'
                      : 'bg-status-success/20 text-status-success'
                  }
                >
                  {openBreakdowns}
                </Badge>
              </div>
            </div>

            {/* Next Maintenance */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Next Maintenance</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{nextMaintenance.toLocaleDateString()}</p>
                <Badge
                  variant="outline"
                  className={
                    daysUntilMaintenance < 0
                      ? 'border-status-critical text-status-critical'
                      : daysUntilMaintenance < 7
                        ? 'border-status-warning text-status-warning'
                        : 'border-status-success text-status-success'
                  }
                >
                  {daysUntilMaintenance < 0
                    ? `${Math.abs(daysUntilMaintenance)} days overdue`
                    : `${daysUntilMaintenance} days`}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="info" className="gap-2">
            <Activity className="h-4 w-4" />
            Asset Info
          </TabsTrigger>
          <TabsTrigger value="breakdowns" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Breakdowns
            <Badge variant="secondary" className="ml-1">{totalBreakdowns}</Badge>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
            <Badge variant="secondary" className="ml-1">{combinedMaintenance.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="parts" className="gap-2">
            <Settings className="h-4 w-4" />
            Parts Uses
            <Badge variant="secondary" className="ml-1">{machine.part_replacements?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>


        {/* Breakdown History */}
        <TabsContent value="breakdowns">
          <Card className="glass-panel">
            <CardContent className="p-0">
              {machineBreakdowns.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-status-success/50 mb-4" />
                  <h3 className="text-lg font-medium mb-1">No breakdown history</h3>
                  <p className="text-muted-foreground">
                    This machine has no recorded breakdowns
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-industrial">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Issue</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>SLA Status</th>
                        <th>Downtime</th>
                        <th className="max-w-[200px]">Resolution Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machineBreakdowns
                        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                        .map((breakdown) => {
                          const downtimeHours = breakdown.end_time
                            ? Math.round((new Date(breakdown.end_time).getTime() - new Date(breakdown.start_time).getTime()) / (1000 * 60 * 60))
                            : Math.round((new Date().getTime() - new Date(breakdown.start_time).getTime()) / (1000 * 60 * 60));

                          let slaStatus = 'On Track';
                          if (breakdown.sla_breached) {
                            slaStatus = 'Breached';
                          } else if (['completed', 'closed'].includes(breakdown.status)) {
                            slaStatus = 'Met';
                          } else {
                            // Check if at risk based on machine SLA (default 24 if missing)
                            const slaLimit = (machine as any).sla_hours || 24;
                            if (downtimeHours >= slaLimit * 0.75) {
                              slaStatus = 'At Risk';
                            }
                          }

                          return (
                            <tr key={breakdown.id}>
                              <td className="font-mono text-xs">{breakdown.breakdown_id}</td>
                              <td>{new Date(breakdown.start_time).toLocaleDateString()}</td>
                              <td className="max-w-[200px]">
                                <p className="font-medium">{breakdown.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{breakdown.description}</p>
                              </td>
                              <td><StatusBadge status={breakdown.status as any} /></td>
                              <td><StatusBadge priority={breakdown.priority as 'low' | 'medium' | 'high' | 'critical'} /></td>
                              <td>
                                <Badge variant={slaStatus === 'Breached' ? 'destructive' : slaStatus === 'At Risk' ? 'secondary' : 'default'}
                                  className={slaStatus === 'At Risk' ? 'bg-status-warning text-white' : slaStatus === 'Met' ? 'bg-status-success text-white' : ''}
                                >
                                  {slaStatus}
                                </Badge>
                              </td>
                              <td>
                                <span className={downtimeHours > 5 && !breakdown.end_time ? 'text-status-critical font-medium' : downtimeHours > 2 && !breakdown.end_time ? 'text-status-warning font-medium' : 'font-medium'}>
                                  {breakdown.end_time ? `${downtimeHours}h` : `${downtimeHours}h (Ongoing)`}
                                </span>
                              </td>
                              <td className="max-w-[200px] text-sm text-muted-foreground">
                                {breakdown.resolution_notes || breakdown.action_taken || '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance History Tabs */}
        <TabsContent value="maintenance">
          <Card className="glass-panel">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Maintenance History</CardTitle>
              {['admin', 'manager', 'supervisor', 'technician'].includes(user?.role || '') && (
                <Dialog open={addMaintenanceOpen} onOpenChange={setAddMaintenanceOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Record Maintenance
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Log Maintenance Activity</DialogTitle>
                    </DialogHeader>
                    <AddMaintenanceDialog machineId={id!} onSuccess={() => setAddMaintenanceOpen(false)} />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {combinedMaintenance.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">No maintenance records</h3>
                  <p className="text-muted-foreground">Maintenance history will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-industrial">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Technician</th>
                        <th>Duration</th>
                        <th>Parts Replaced</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedMaintenance.map(record => (
                        <tr key={record.id}>
                          <td>{record.date.toLocaleDateString()}</td>
                          <td className="capitalize">{record.type}</td>
                          <td>{record.technicianName}</td>
                          <td>{record.duration}</td>
                          <td className="max-w-[200px] truncate">{record.partsReplaced}</td>
                          <td>
                            <Badge variant={
                              record.status === 'approved' || record.status === 'Completed' ? 'default' :
                                record.status === 'rejected' ? 'destructive' :
                                  record.status === 'In Progress' ? 'secondary' :
                                    record.status === 'Pending Review' ? 'secondary' :
                                      'secondary'
                            }>
                              {record.isScheduled && record.status === 'Scheduled' ? 'Scheduled' : record.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parts Replacement Tabs */}
        <TabsContent value="parts">
          <Card className="glass-panel">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Parts Replacement History</CardTitle>
              {['admin', 'manager', 'supervisor', 'technician'].includes(user?.role || '') && (
                <Dialog open={addPartOpen} onOpenChange={setAddPartOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Log Part Used
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Register Replaced Part</DialogTitle>
                    </DialogHeader>
                    <AddPartDialog machineId={id!} breakdowns={machineBreakdowns} onSuccess={() => setAddPartOpen(false)} />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {!machine.part_replacements?.length ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">No parts replaced</h3>
                  <p className="text-muted-foreground">Parts replacement history will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-industrial">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Part Name</th>
                        <th>Quantity</th>
                        <th>Replaced By</th>
                        <th>Linked Breakdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machine.part_replacements.map(part => (
                        <tr key={part.id}>
                          <td>{new Date(part.replacedDate).toLocaleDateString()}</td>
                          <td className="font-medium">{part.partName}</td>
                          <td>{part.quantityUsed}</td>
                          <td>{allProfiles.find(p => p.user_id === part.replacedById)?.name || 'Unknown'}</td>
                          <td>
                            {part.breakdownId
                              ? <span className="font-mono text-xs">{machineBreakdowns.find(b => b.id === part.breakdownId)?.breakdown_id || part.breakdownId.substring(0, 8)}</span>
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card className="glass-panel">
            <CardContent className="p-6">
              {allMachineBreakdowns.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-1">No events yet</h3>
                  <p className="text-muted-foreground">
                    Timeline will show breakdowns and maintenance events
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Combine and sort all events */}
                  {[
                    ...allMachineBreakdowns.map(b => ({
                      type: b.category === 'maintenance' ? 'maintenance' : 'breakdown',
                      date: new Date(b.category === 'maintenance' && b.planned_date ? b.planned_date : b.start_time),
                      data: b,
                    }))
                  ]
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 20)
                    .map((event, index) => (
                      <div key={`${event.type}-${(event.data as any).id}`} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${event.type === 'maintenance' ? 'bg-primary/10' : 'bg-status-critical/10'}`}>
                            {event.type === 'maintenance' ? <Wrench className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-status-critical" />}
                          </div>
                          {index < 19 && (
                            <div className="w-0.5 flex-1 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {(event.data as any).title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {event.type === 'maintenance' ? 'Maintenance' : 'Breakdown'}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {event.date.toLocaleDateString()}
                            </p>
                          </div>
                          {(event.data as any).status && (
                            <StatusBadge
                              status={(event.data as any).status === 'in-progress' ? 'in_progress' : (event.data as any).status}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Info & Docs */}
        <TabsContent value="info">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Ownership & Responsibilities */}
            <Card className="glass-panel">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Ownership & Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Assigned Manager (Owner)</span>
                  <span className="font-medium text-sm">
                    {allProfiles.find(u => u.user_id === (machine as any).assigned_manager_id)?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Default Technician</span>
                  <span className="font-medium text-sm">
                    {allProfiles.find(u => u.user_id === (machine as any).default_technician_id)?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Backup Supervisor</span>
                  <span className="font-medium text-sm">
                    {allProfiles.find(u => u.user_id === (machine as any).backup_supervisor_id)?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">PM Cycle Days</span>
                  <span className="font-medium text-sm">
                    {(machine as any).pm_cycle_days ? `${(machine as any).pm_cycle_days} Days` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">SLA (Critical Downtime)</span>
                  <Badge variant="outline" className="font-medium bg-muted/50">
                    {(machine as any).sla_hours ? `${(machine as any).sla_hours} Hours` : 'N/A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Vendor & Warranty */}
            <Card className="glass-panel">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Vendor & Procurement Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Vendor Name</span>
                  <span className="font-medium text-sm">{(machine as any).vendor_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Vendor Email</span>
                  <span className="font-medium text-sm">{(machine as any).vendor_email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Vendor Contact</span>
                  <span className="font-medium text-sm">{(machine as any).vendor_contact || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Warranty Period</span>
                  <span className="font-medium text-sm flex items-center gap-2">
                    <span>
                      {(machine as any).warranty_start ? new Date((machine as any).warranty_start).toLocaleDateString() : 'N/A'} -
                      {(machine as any).warranty_end ? ` ${new Date((machine as any).warranty_end).toLocaleDateString()}` : ' N/A'}
                    </span>
                    {(machine as any).warranty_end && (
                      <Badge variant="outline" className={new Date((machine as any).warranty_end) < new Date() ? 'text-status-critical border-status-critical' : 'text-status-success border-status-success'}>
                        {new Date((machine as any).warranty_end) < new Date() ? 'Ended' : 'Active'}
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">AMC Status</span>
                  <Badge variant={(machine as any).amc_status ? 'default' : 'secondary'}>
                    {(machine as any).amc_status ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Documentation Links */}
            <Card className="glass-panel md:col-span-2">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Asset Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'User Manual', url: (machine as any).user_manual_url },
                  { label: 'Service Manual', url: (machine as any).service_manual_url },
                  { label: 'SOP Document', url: (machine as any).sop_url },
                  { label: 'Compliance Cert', url: (machine as any).compliance_cert_url }
                ].map((doc, idx) => (
                  <div key={idx} className="border rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 bg-muted/20 hover:bg-muted/50 transition-colors">
                    <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                    <span className="text-sm font-medium">{doc.label}</span>
                    {doc.url ? (
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View Document</a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not uploaded</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


      </Tabs>
    </MainLayout >
  );
};

export default MachineDetail;
