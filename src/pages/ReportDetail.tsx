import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Wrench,
  MapPin,
  FileText,
  Settings2,
  Download,
  Printer,
  TrendingDown,
  FileSpreadsheet,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { useBreakdown } from '@/hooks/useBreakdowns';
import { useMachine } from '@/hooks/useMachines';
import { useTaskLogNotes } from '@/hooks/useTaskLogNotes';
import { useTechnicians } from '@/hooks/useProfiles';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: breakdown, isLoading } = useBreakdown(id || '');
  const { data: machine } = useMachine(breakdown?.machine_id || '');
  const { data: logNotes = [] } = useTaskLogNotes(id || '');
  const { data: technicians = [] } = useTechnicians();

  if (isLoading) {
    return (
      <MainLayout title="Report Details" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!breakdown) {
    return (
      <MainLayout title="Report Not Found" subtitle="The requested report could not be found">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground mb-4">The breakdown report you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </div>
      </MainLayout>
    );
  }

  const assignedTech = technicians.find(t => t.user_id === breakdown.assigned_to);
  const downtimeHours = breakdown.end_time
    ? Math.round((new Date(breakdown.end_time).getTime() - new Date(breakdown.start_time).getTime()) / (1000 * 60 * 60))
    : Math.round((new Date().getTime() - new Date(breakdown.start_time).getTime()) / (1000 * 60 * 60));

  const totalWorkDuration = logNotes.reduce((sum, note) => sum + (note.work_duration || 0), 0);

  const handlePrint = () => {
    toast.success('Preparing report for printing...');
    window.print();
  };

  const handleExportCSV = () => {
    const data = {
      'Report ID': breakdown.breakdown_id,
      'Title': breakdown.title,
      'Description': breakdown.description,
      'Machine': breakdown.machines?.name || 'Unknown',
      'Machine ID': breakdown.machines?.machine_id || '',
      'Location': breakdown.machines?.location || '',
      'Category': breakdown.category,
      'Priority': breakdown.priority,
      'Status': breakdown.status,
      'Start Time': new Date(breakdown.start_time).toLocaleString(),
      'End Time': breakdown.end_time ? new Date(breakdown.end_time).toLocaleString() : 'Ongoing',
      'Downtime Hours': downtimeHours,
      'Assigned To': assignedTech?.name || 'Unassigned',
      'Action Taken': breakdown.action_taken || '',
      'Resolution Notes': breakdown.resolution_notes || '',
      'Total Work Duration (mins)': totalWorkDuration,
    };

    const csvContent = Object.entries(data)
      .map(([key, value]) => `"${key}","${value}"`)
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakdown_report_${breakdown.breakdown_id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Excel (CSV) exported successfully');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(`Breakdown Report: ${breakdown.breakdown_id}`, 14, 22);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Main Info Table
    const mainInfo = [
      ['Title', breakdown.title],
      ['Machine', `${breakdown.machines?.name || 'Unknown'} (#${breakdown.machines?.machine_id || ''})`],
      ['Location', breakdown.machines?.location || 'Unknown'],
      ['Category', breakdown.category],
      ['Priority', breakdown.priority],
      ['Status', breakdown.status],
      ['Start Time', new Date(breakdown.start_time).toLocaleString()],
      ['End Time', breakdown.end_time ? new Date(breakdown.end_time).toLocaleString() : 'Ongoing'],
      ['Downtime', `${downtimeHours} hours`],
      ['Assigned To', assignedTech?.name || 'Unassigned'],
    ];

    autoTable(doc, {
      head: [['Field', 'Value']],
      body: mainInfo,
      startY: 36,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Description
    let yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Description:', 14, yPos);
    doc.setFontSize(9);
    doc.setTextColor(60);
    const descLines = doc.splitTextToSize(breakdown.description, 180);
    doc.text(descLines, 14, yPos + 6);

    // Action Taken & Resolution Notes
    if (breakdown.action_taken || breakdown.resolution_notes) {
      yPos = yPos + 6 + descLines.length * 4 + 10;
      
      if (breakdown.action_taken) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Action Taken:', 14, yPos);
        doc.setFontSize(9);
        doc.setTextColor(60);
        const actionLines = doc.splitTextToSize(breakdown.action_taken, 180);
        doc.text(actionLines, 14, yPos + 6);
        yPos = yPos + 6 + actionLines.length * 4 + 8;
      }
      
      if (breakdown.resolution_notes) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Resolution Notes:', 14, yPos);
        doc.setFontSize(9);
        doc.setTextColor(60);
        const resLines = doc.splitTextToSize(breakdown.resolution_notes, 180);
        doc.text(resLines, 14, yPos + 6);
      }
    }

    // Activity Log (if any)
    if (logNotes.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Activity Log', 14, 22);

      const logData = logNotes.map((note, idx) => [
        (idx + 1).toString(),
        new Date(note.created_at).toLocaleString(),
        note.work_status,
        note.work_duration ? `${note.work_duration}m` : '-',
        note.note.substring(0, 100) + (note.note.length > 100 ? '...' : ''),
      ]);

      autoTable(doc, {
        head: [['#', 'Date', 'Status', 'Duration', 'Note']],
        body: logData,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: { 4: { cellWidth: 80 } },
      });
    }

    doc.save(`breakdown_report_${breakdown.breakdown_id}.pdf`);
    toast.success('PDF exported successfully');
  };

  return (
    <MainLayout
      title={`Report: ${breakdown.breakdown_id}`}
      subtitle="Breakdown Report Details"
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/reports')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Report */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Header */}
          <Card className="glass-panel print:shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Breakdown Report</p>
                  <CardTitle className="text-xl">{breakdown.title}</CardTitle>
                  <CardDescription className="mt-1">
                    ID: {breakdown.breakdown_id} • Created: {new Date(breakdown.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <StatusBadge priority={breakdown.priority as 'low' | 'medium' | 'high' | 'critical'} />
                  <StatusBadge status={breakdown.status === 'in-progress' ? 'in_progress' : breakdown.status as 'open' | 'closed'} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Problem Description
                </h4>
                <p className="text-sm bg-muted/50 p-4 rounded-lg">{breakdown.description}</p>
              </div>

              <Separator />

              {/* Key Metrics */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-4">Key Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <TrendingDown className="h-6 w-6 mx-auto mb-2 text-status-warning" />
                    <p className="text-2xl font-bold">{downtimeHours}h</p>
                    <p className="text-xs text-muted-foreground">Total Downtime</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{totalWorkDuration}m</p>
                    <p className="text-xs text-muted-foreground">Work Duration</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{logNotes.length}</p>
                    <p className="text-xs text-muted-foreground">Log Entries</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <Badge variant="outline" className="capitalize text-lg px-4 py-1">
                      {breakdown.category}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">Category</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-4">Timeline</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-status-warning/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-status-warning" />
                    </div>
                    <div>
                      <p className="font-medium">Breakdown Reported</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(breakdown.start_time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {breakdown.assigned_to && (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Assigned to {assignedTech?.name || 'Technician'}</p>
                        <p className="text-sm text-muted-foreground">Task assignment</p>
                      </div>
                    </div>
                  )}
                  {breakdown.end_time && (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-status-success/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-status-success" />
                      </div>
                      <div>
                        <p className="font-medium">Resolved</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(breakdown.end_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Details */}
              {(breakdown.action_taken || breakdown.resolution_notes) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-4">Resolution Details</h4>
                    {breakdown.action_taken && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Action Taken</p>
                        <p className="text-sm bg-status-success/10 p-4 rounded-lg border border-status-success/20">
                          {breakdown.action_taken}
                        </p>
                      </div>
                    )}
                    {breakdown.resolution_notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Resolution Notes</p>
                        <p className="text-sm bg-muted/50 p-4 rounded-lg">
                          {breakdown.resolution_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="glass-panel print:break-before-page">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Work Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity logs recorded</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] print:h-auto">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6 print:hidden">
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
                <p className="text-lg font-semibold">{breakdown.machines?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">#{breakdown.machines?.machine_id}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {breakdown.machines?.location || 'Unknown Location'}
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
                    <div>
                      <p className="text-muted-foreground">Health</p>
                      <Badge variant="outline" className="capitalize">{machine.health}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fuel Type</p>
                      <p className="font-medium capitalize">{machine.fuel_type || 'Electric'}</p>
                    </div>
                  </div>
                </>
              )}
              <Link to={`/machines/${breakdown.machine_id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Machine Details
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Assigned Technician */}
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned Technician
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
                <div className="text-center py-4 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Not assigned</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={`/tasks/${breakdown.id}`}>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Wrench className="h-4 w-4 mr-2" />
                  View as Task
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

export default ReportDetail;
