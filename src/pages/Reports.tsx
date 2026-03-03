import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileBarChart,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  CalendarDays,
  CalendarRange,
  Loader2,
  TrendingDown,
  TrendingUp,
  Clock,
  Wrench,
  ArrowRight,
  Eye,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { useBreakdowns, DbBreakdownWithMachine } from '@/hooks/useBreakdowns';
import { useMachines, DbMachine } from '@/hooks/useMachines';
import { useTechnicians, DbProfileWithRole } from '@/hooks/useProfiles';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to get week range
const getWeekRange = (weeksAgo: number = 0) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek - weeksAgo * 7);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
  };
};

// Helper to get month range
const getMonthRange = (monthsAgo: number = 0) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0],
  };
};

type ReportPeriod = 'weekly' | 'monthly' | 'custom';

const Reports = () => {
  const navigate = useNavigate();
  const { data: breakdowns = [], isLoading: breakdownsLoading } = useBreakdowns();
  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: technicians = [], isLoading: techniciansLoading } = useTechnicians();

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [startDate, setStartDate] = useState('2024-11-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineFilter, setMachineFilter] = useState('all');
  const [selectedWeek, setSelectedWeek] = useState('0');
  const [selectedMonth, setSelectedMonth] = useState('0');

  const isLoading = breakdownsLoading || machinesLoading || techniciansLoading;

  // Get available weeks (last 12 weeks)
  const availableWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < 12; i++) {
      const range = getWeekRange(i);
      weeks.push({
        value: i.toString(),
        label: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} weeks ago`,
        ...range,
      });
    }
    return weeks;
  }, []);

  // Get available months (last 12 months)
  const availableMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const range = getMonthRange(i);
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        value: i.toString(),
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        ...range,
      });
    }
    return months;
  }, []);

  // Get effective date range based on report period
  const effectiveDateRange = useMemo(() => {
    if (reportPeriod === 'weekly') {
      const week = availableWeeks.find((w) => w.value === selectedWeek);
      return { start: week?.start || startDate, end: week?.end || endDate };
    } else if (reportPeriod === 'monthly') {
      const month = availableMonths.find((m) => m.value === selectedMonth);
      return { start: month?.start || startDate, end: month?.end || endDate };
    }
    return { start: startDate, end: endDate };
  }, [reportPeriod, selectedWeek, selectedMonth, startDate, endDate, availableWeeks, availableMonths]);

  // Filter breakdowns based on criteria
  const filteredBreakdowns = useMemo(() => {
    return breakdowns.filter((b) => {
      const date = new Date(b.start_time);
      const start = new Date(effectiveDateRange.start);
      const end = new Date(effectiveDateRange.end);
      end.setHours(23, 59, 59, 999);
      const matchesDate = date >= start && date <= end;
      const matchesMachine = machineFilter === 'all' || b.machine_id === machineFilter;
      const isBreakdown = b.category !== 'maintenance';
      return matchesDate && matchesMachine && isBreakdown;
    });
  }, [breakdowns, effectiveDateRange, machineFilter]);

  // Calculate summary stats
  const totalBreakdowns = filteredBreakdowns.length;
  const totalDowntime = filteredBreakdowns.reduce((sum, b) => {
    if (b.end_time) {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    }
    return sum;
  }, 0);
  const avgDowntime = totalBreakdowns > 0 ? totalDowntime / totalBreakdowns : 0;
  const closedBreakdowns = filteredBreakdowns.filter((b) => b.status === 'closed').length;

  // Export CSV
  const generateCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${effectiveDateRange.start}_to_${effectiveDateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Excel (CSV) exported successfully`);
  };

  // Export PDF
  const generatePDF = (data: any[], filename: string, title: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const doc = new jsPDF();
    const headers = Object.keys(data[0]);

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Date Range
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${effectiveDateRange.start} to ${effectiveDateRange.end}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

    // Table
    autoTable(doc, {
      head: [headers],
      body: data.map(row => headers.map(h => row[h] || '')),
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`${filename}_${effectiveDateRange.start}_to_${effectiveDateRange.end}.pdf`);
    toast.success('PDF exported successfully');
  };

  const getReportData = () => {
    return filteredBreakdowns.map(b => ({
      ID: b.breakdown_id,
      Date: new Date(b.start_time).toLocaleDateString(),
      Machine: b.machines?.name || 'Unknown',
      MachineID: b.machines?.machine_id || '',
      Title: b.title,
      Category: b.category,
      Priority: b.priority,
      Status: b.status,
      DowntimeHours: b.end_time
        ? Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (1000 * 60 * 60))
        : 'Ongoing',
    }));
  };

  const handleExportExcel = () => {
    generateCSV(getReportData(), 'breakdown_report');
  };

  const handleExportPDF = () => {
    generatePDF(getReportData(), 'breakdown_report', 'Breakdown Report');
  };

  if (isLoading) {
    return (
      <MainLayout title="Reports" subtitle="Generate and export maintenance reports">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Reports" subtitle="Generate and export maintenance reports">
      {/* Report Period Selection */}
      <Card className="glass-panel mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Button
              variant={reportPeriod === 'weekly' ? 'default' : 'outline'}
              onClick={() => setReportPeriod('weekly')}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Weekly Report
            </Button>
            <Button
              variant={reportPeriod === 'monthly' ? 'default' : 'outline'}
              onClick={() => setReportPeriod('monthly')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Monthly Report
            </Button>
            <Button
              variant={reportPeriod === 'custom' ? 'default' : 'outline'}
              onClick={() => setReportPeriod('custom')}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Custom Range
            </Button>
          </div>

          {reportPeriod === 'weekly' && (
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Week</label>
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWeeks.map((week) => (
                      <SelectItem key={week.value} value={week.value}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6">
                <Badge variant="outline" className="text-sm">
                  {new Date(effectiveDateRange.start).toLocaleDateString()} -{' '}
                  {new Date(effectiveDateRange.end).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          )}

          {reportPeriod === 'monthly' && (
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6">
                <Badge variant="outline" className="text-sm">
                  {new Date(effectiveDateRange.start).toLocaleDateString()} -{' '}
                  {new Date(effectiveDateRange.end).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          )}

          {reportPeriod === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Machine Filter</label>
                <Select value={machineFilter} onValueChange={setMachineFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Machines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {machines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} (#{m.machine_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBreakdowns}</p>
                <p className="text-sm text-muted-foreground">Total Breakdowns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-warning/10">
                <TrendingDown className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDowntime}h</p>
                <p className="text-sm text-muted-foreground">Total Downtime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgDowntime.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Avg. Downtime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-success/10">
                <TrendingUp className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-status-success">{closedBreakdowns}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Actions */}
      <Card className="glass-panel mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Export as PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export as Excel (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileBarChart className="h-4 w-4" />
            Breakdown Reports ({filteredBreakdowns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBreakdowns.length === 0 ? (
            <div className="text-center py-12">
              <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No reports found</h3>
              <p className="text-muted-foreground">
                Try adjusting your date range or filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Downtime</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBreakdowns.map((breakdown) => {
                    const downtimeHours = breakdown.end_time
                      ? Math.round((new Date(breakdown.end_time).getTime() - new Date(breakdown.start_time).getTime()) / (1000 * 60 * 60))
                      : null;
                    return (
                      <TableRow key={breakdown.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/reports/${breakdown.id}`)}>
                        <TableCell className="font-mono text-xs">{breakdown.breakdown_id}</TableCell>
                        <TableCell>{new Date(breakdown.start_time).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{breakdown.machines?.name}</p>
                            <p className="text-xs text-muted-foreground">#{breakdown.machines?.machine_id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{breakdown.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{breakdown.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge priority={breakdown.priority as 'low' | 'medium' | 'high' | 'critical'} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={breakdown.status === 'in-progress' ? 'in_progress' : breakdown.status as 'open' | 'closed'} />
                        </TableCell>
                        <TableCell>
                          {downtimeHours !== null ? `${downtimeHours}h` : <Badge variant="outline">Ongoing</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/reports/${breakdown.id}`); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default Reports;
