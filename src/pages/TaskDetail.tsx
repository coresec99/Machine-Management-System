import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MessageSquarePlus,
  UserPlus,
  Play,
  Loader2,
  Wrench,
  MapPin,
  FileText,
  Settings2,
  Send,
  Pause,
  AlertTriangle,
  History,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { useBreakdown, useUpdateBreakdown, useAssignBreakdown, useAcceptBreakdown, useBreakdownAuditLogs } from '@/hooks/useBreakdowns';
import { useMachine, useCreatePartReplacement } from '@/hooks/useMachines';
import { useTechnicians, DbProfileWithRole } from '@/hooks/useProfiles';
import { useCreateTaskLogNote, useTaskLogNotes } from '@/hooks/useTaskLogNotes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: task, isLoading } = useBreakdown(id || '');
  const { data: machine } = useMachine(task?.machine_id || '');
  const { data: technicians = [] } = useTechnicians();
  const { data: logNotes = [], isLoading: notesLoading } = useTaskLogNotes(id || '');
  const { data: auditLogs = [], isLoading: auditLogsLoading } = useBreakdownAuditLogs(id || '');
  const updateBreakdown = useUpdateBreakdown();
  const assignBreakdown = useAssignBreakdown();
  const acceptBreakdown = useAcceptBreakdown();
  const createLogNote = useCreateTaskLogNote();
  const createPartReplacement = useCreatePartReplacement();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState('');
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [etaDate, setEtaDate] = useState('');
  const [etaTime, setEtaTime] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [workDuration, setWorkDuration] = useState('');
  const [workStatus, setWorkStatus] = useState<'working' | 'completed' | 'blocked'>('working');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [observations, setObservations] = useState('');
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [partsUsed, setPartsUsed] = useState<{ partName: string, quantity: number }[]>([]);

  if (isLoading) {
    return (
      <MainLayout title="Task Details" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!task) {
    return (
      <MainLayout title="Task Not Found" subtitle="The requested task could not be found">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
          <p className="text-muted-foreground mb-4">The task you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </MainLayout>
    );
  }

  const assignedTech = technicians.find(t => t.user_id === task.assigned_to);
  const downtimeHours = task.category === 'maintenance'
    ? `${task.estimated_duration || 0}h (Est.)`
    : task.end_time
      ? `${Math.round((new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60))}h`
      : `${Math.round((new Date().getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60))}h`;

  const totalWorkDuration = logNotes.reduce((sum, note) => sum + (note.work_duration || 0), 0);

  const handleAssign = () => {
    if (!selectedTech) {
      toast.error('Please select a technician');
      return;
    }
    assignBreakdown.mutate({ id: task.id, assigned_to: selectedTech }, {
      onSuccess: () => {
        setAssignOpen(false);
        setSelectedTech('');
      }
    });
  };

  const handleAcceptTask = () => {
    if (!etaDate || !etaTime) {
      toast.error('Please specify an estimated resolution date and time');
      return;
    }
    const eta = new Date(`${etaDate}T${etaTime}`).toISOString();
    acceptBreakdown.mutate({ id: task.id, estimated_resolution_time: eta }, {
      onSuccess: () => {
        setAcceptOpen(false);
      }
    });
  };

  const handleUpdateStatus = (newStatus: 'in-progress' | 'closed' | 'pending_review') => {
    const updates: any = { id: task.id, status: newStatus };
    if (newStatus === 'in-progress' && ['scheduled', 'overdue', 'delayed'].includes(task.status)) {
      updates.actual_start_time = new Date().toISOString();
    }
    if (newStatus === 'closed' || newStatus === 'pending_review') {
      if (task.status !== 'pending_review') {
        updates.end_time = new Date().toISOString();
      }
      if (['scheduled', 'in-progress', 'overdue', 'delayed'].includes(task.status) && task.maintenance_type) {
        updates.actual_end_time = new Date().toISOString();
      }
      if (resolutionNotes) updates.resolution_notes = resolutionNotes;
      if (actionTaken) updates.action_taken = actionTaken;
      if (observations) updates.observations = observations;
      updates.checklist_completed = checklistCompleted;

      if (newStatus === 'closed' && task.status === 'pending_review') {
        updates.manager_approval_time = new Date().toISOString();
      }
    }

    updateBreakdown.mutate(updates, {
      onSuccess: async () => {
        if ((newStatus === 'closed' || newStatus === 'pending_review') && partsUsed.length > 0) {
          for (const part of partsUsed) {
            if (part.partName.trim()) {
              await createPartReplacement.mutateAsync({
                machineId: task.machine_id,
                breakdown_id: task.id,
                part_name: part.partName,
                quantity_used: part.quantity,
                replaced_by: user?.id
              }).catch(e => console.error("Failed to add part", e));
            }
          }
        }
      }
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    createLogNote.mutate({
      breakdown_id: task.id,
      user_id: user.id,
      note: noteText,
      work_status: workStatus,
      work_duration: workDuration ? parseInt(workDuration) : null,
    }, {
      onSuccess: () => {
        setNoteText('');
        setWorkDuration('');
        setNoteOpen(false);
      }
    });
  };

  return (
    <MainLayout
      title={`Task: ${task.breakdown_id}`}
      subtitle={task.title}
    >
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/tasks')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Overview */}
          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {task.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {task.breakdown_id} • Reported {new Date(task.start_time).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <StatusBadge priority={task.priority as 'low' | 'medium' | 'high' | 'critical'} />
                  <StatusBadge status={task.status as any} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm bg-muted/50 p-4 rounded-lg">{task.description}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="outline" className="mt-1 capitalize">{task.category}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Downtime</p>
                  <p className="text-lg font-semibold">{downtimeHours}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work Duration</p>
                  <p className="text-lg font-semibold">{totalWorkDuration}m</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Log Entries</p>
                  <p className="text-lg font-semibold">{logNotes.length}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Start Time</p>
                  <p className="text-sm font-medium">{new Date(task.start_time).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End Time</p>
                  <p className="text-sm font-medium">
                    {task.end_time ? new Date(task.end_time).toLocaleString() : 'Ongoing'}
                  </p>
                </div>
                {task.sla_deadline && (
                  <div>
                    <p className="text-xs text-muted-foreground">SLA Deadline</p>
                    <p className={`text-sm font-medium ${task.sla_breached ? 'text-status-critical' : ''}`}>
                      {new Date(task.sla_deadline).toLocaleString()}
                      {task.sla_breached && <AlertTriangle className="inline h-4 w-4 ml-1" />}
                    </p>
                  </div>
                )}
              </div>

              {(task.action_taken || task.resolution_notes) && (
                <>
                  <Separator />
                  {task.action_taken && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Action Taken</h4>
                      <p className="text-sm bg-status-success/10 p-4 rounded-lg border border-status-success/20">{task.action_taken}</p>
                    </div>
                  )}
                  {task.resolution_notes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Resolution Notes</h4>
                      <p className="text-sm bg-muted/50 p-4 rounded-lg">{task.resolution_notes}</p>
                    </div>
                  )}
                </>
              )}

              {/* Task Actions */}
              {task.status !== 'closed' && (
                <div className="pt-4 border-t flex flex-wrap gap-3">
                  {task.status === 'assigned' && task.assigned_to === user?.id && (
                    <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Accept Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <p className="text-sm text-muted-foreground">Please provide an estimated time of resolution.</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Date</label>
                              <Input type="date" value={etaDate} onChange={e => setEtaDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Time</label>
                              <Input type="time" value={etaTime} onChange={e => setEtaTime(e.target.value)} />
                            </div>
                          </div>
                          <Button onClick={handleAcceptTask} disabled={acceptBreakdown.isPending} className="w-full">
                            Confirm & Accept
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {task.status !== 'pending_review' && ['open', 'scheduled', 'overdue', 'delayed'].includes(task.status) && task.assigned_to && (
                    <Button onClick={() => handleUpdateStatus('in-progress')} disabled={updateBreakdown.isPending}>
                      <Play className="h-4 w-4 mr-2" />
                      {task.maintenance_type ? 'Start Maintenance' : 'Start Task'}
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{task.maintenance_type ? 'Complete Maintenance' : 'Complete Task'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Action Taken / Work Performed</label>
                            <Textarea
                              placeholder="Describe what was done..."
                              value={actionTaken}
                              onChange={(e) => setActionTaken(e.target.value)}
                            />
                          </div>
                          {task.maintenance_type && (
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="checklist"
                                  checked={checklistCompleted}
                                  onChange={(e) => setChecklistCompleted(e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                                <label htmlFor="checklist" className="text-sm font-medium">All checklist items completed</label>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Observations / Next Actions</label>
                                <Textarea
                                  placeholder="Any observations or parts needed..."
                                  value={observations}
                                  onChange={(e) => setObservations(e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                          {!task.maintenance_type && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Root Cause & Resolution Notes</label>
                              <Textarea
                                placeholder="Any additional notes..."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Parts Replaced (Optional)</label>
                            {partsUsed.map((part, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  placeholder="Part Name"
                                  value={part.partName}
                                  onChange={e => {
                                    const newParts = [...partsUsed];
                                    newParts[index].partName = e.target.value;
                                    setPartsUsed(newParts);
                                  }}
                                />
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  value={part.quantity}
                                  min={1}
                                  className="w-24"
                                  onChange={e => {
                                    const newParts = [...partsUsed];
                                    newParts[index].quantity = parseInt(e.target.value) || 1;
                                    setPartsUsed(newParts);
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPartsUsed(partsUsed.filter((_, i) => i !== index))}
                                >
                                  &times;
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPartsUsed([...partsUsed, { partName: '', quantity: 1 }])}
                              className="w-full"
                            >
                              + Add Part Replacement
                            </Button>
                          </div>

                          <Button onClick={() => handleUpdateStatus('pending_review')} className="w-full" disabled={updateBreakdown.isPending || createPartReplacement.isPending}>
                            {updateBreakdown.isPending || createPartReplacement.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Mark as Complete
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {task.status === 'pending_review' && (user?.role === 'manager' || user?.role === 'admin') && (
                    <Button
                      onClick={() => handleUpdateStatus('closed')}
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                      disabled={updateBreakdown.isPending}
                    >
                      {updateBreakdown.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Approve & Close
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Activity Log ({logNotes.length})
                </CardTitle>
                {task.status !== 'closed' && task.assigned_to && (
                  <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <MessageSquarePlus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Log Note</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Work Status</label>
                          <Select value={workStatus} onValueChange={(v) => setWorkStatus(v as typeof workStatus)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="working">
                                <div className="flex items-center gap-2">
                                  <Play className="h-4 w-4 text-status-warning" />
                                  Still Working
                                </div>
                              </SelectItem>
                              <SelectItem value="completed">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                                  Completed
                                </div>
                              </SelectItem>
                              <SelectItem value="blocked">
                                <div className="flex items-center gap-2">
                                  <Pause className="h-4 w-4 text-status-critical" />
                                  Blocked
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Duration (minutes)</label>
                          <Input
                            type="number"
                            placeholder="e.g., 30"
                            value={workDuration}
                            onChange={(e) => setWorkDuration(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Note</label>
                          <Textarea
                            placeholder="Describe your work..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="min-h-[100px]"
                          />
                        </div>
                        <Button onClick={handleAddNote} className="w-full" disabled={createLogNote.isPending}>
                          {createLogNote.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Submit
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity logs yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {logNotes.map((note, index) => (
                      <div key={note.id} className="p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{note.user_name || 'Unknown User'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(note.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {note.work_duration && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {note.work_duration}m
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                note.work_status === 'completed'
                                  ? 'border-status-success text-status-success'
                                  : note.work_status === 'blocked'
                                    ? 'border-status-critical text-status-critical'
                                    : 'border-status-warning text-status-warning'
                              }
                            >
                              {note.work_status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm">{note.note}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Audit Log Timeline */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Audit Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No timeline events found</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-6 pb-2">
                    {auditLogs.map((log: any, index: number) => (
                      <div key={log.id} className="relative pl-6">
                        {/* Timeline line */}
                        {index !== auditLogs.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-[-24px] w-px bg-border" />
                        )}

                        {/* Timeline dot */}
                        <div className="absolute left-1 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium capitalize">
                              {log.action_type.replace(/_/g, ' ')}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">{log.edited_by_name}</span> recorded this event.
                          </p>
                          <div className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            <pre className="text-muted-foreground whitespace-pre-wrap">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Machine Info */}
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Machine Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{task.machines?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">#{task.machines?.machine_id}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {task.machines?.location || 'Unknown Location'}
              </div>
              {machine && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{machine.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant="outline" className="capitalize">{machine.status}</Badge>
                    </div>
                  </div>
                </>
              )}
              <Link to={`/machines/${task.machine_id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Machine Details
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedTech ? (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{assignedTech.name}</p>
                    <p className="text-sm text-muted-foreground">{assignedTech.email}</p>
                    {assignedTech.department && (
                      <p className="text-xs text-muted-foreground">{assignedTech.department}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-3">Not yet assigned</p>
                  {['open', 'scheduled'].includes(task.status) && (user?.role === 'manager' || user?.role === 'admin') && (
                    <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign Technician
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Technician</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Select Technician</label>
                            <Select value={selectedTech} onValueChange={setSelectedTech}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a technician" />
                              </SelectTrigger>
                              <SelectContent>
                                {technicians.map((tech) => (
                                  <SelectItem key={tech.user_id} value={tech.user_id}>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      {tech.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleAssign} className="w-full" disabled={!selectedTech || assignBreakdown.isPending}>
                            {assignBreakdown.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                            Assign
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={`/reports/${task.id}`}>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  View as Report
                </Button>
              </Link>
              <Link to={`/breakdowns`}>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  All Breakdowns
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TaskDetail;
