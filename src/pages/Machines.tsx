import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Settings2, MoreVertical,
  Eye, Edit, Trash2, ArrowRight, Loader2, ImageIcon,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/dashboard/StatusBadge';
import MachineOnboardingWizard from '@/components/machines/MachineOnboardingWizard';
import { useMachines, useDeleteMachine } from '@/hooks/useMachines';
import { useBreakdowns } from '@/hooks/useBreakdowns';

const machineTypes = [
  'Drilling', 'Drilling & Tapping', 'Blasting', 'Coating', 'Testing',
  'Milling', 'CNC Lathe', 'Compressor', 'Crane', 'Lathe',
];

import { useAuthContext } from '@/contexts/AuthContext';

const Machines = () => {
  const navigate = useNavigate();
  const { userRole } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: machines = [], isLoading } = useMachines();
  const { data: breakdowns = [] } = useBreakdowns();
  const deleteMachine = useDeleteMachine();

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch =
      machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.machine_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
    const matchesType = typeFilter === 'all' || machine.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getMachineBreakdownCount = (machineId: string) => {
    return breakdowns.filter((b) => b.machine_id === machineId).length;
  };

  const handleDeleteMachine = async (e: React.MouseEvent, machineId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this machine?')) {
      await deleteMachine.mutateAsync(machineId);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Machines" subtitle="Manage and monitor all machines">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Machines" subtitle="Manage and monitor all machines">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search machines..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="down">Down</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {machineTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(userRole === 'admin' || userRole === 'manager') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Machine</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="mb-4">
                  <DialogTitle>Machine Onboarding</DialogTitle>
                </DialogHeader>
                <MachineOnboardingWizard onClose={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Machine Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMachines.map((machine) => (
          <Card
            key={machine.id}
            className="glass-panel group cursor-pointer hover:shadow-card-hover transition-all"
            onClick={() => navigate(`/machines/${machine.id}`)}
          >
            {machine.image_url && (
              <div className="h-36 w-full overflow-hidden rounded-t-lg">
                <img src={machine.image_url} alt={machine.name} className="w-full h-full object-cover" />
              </div>
            )}
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {machine.image_url ? (
                      <ImageIcon className="h-5 w-5 text-primary" />
                    ) : (
                      <Settings2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{machine.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">#{machine.machine_id}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/machines/${machine.id}`); }}>
                      <Eye className="h-4 w-4 mr-2" />View Details
                    </DropdownMenuItem>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/machines/${machine.id}/edit`); }}>
                          <Edit className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteMachine(e, machine.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <StatusBadge status={machine.status as 'running' | 'down' | 'maintenance'} />
                <StatusBadge health={machine.health as 'good' | 'warning' | 'critical'} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{machine.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{machine.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fuel Type</span>
                  <span className="font-medium capitalize">{machine.fuel_type || 'Electric'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Breakdowns</span>
                  <span className="font-medium">{getMachineBreakdownCount(machine.id)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <span>Last maintenance: </span>
                  <span>{machine.last_maintenance ? new Date(machine.last_maintenance).toLocaleDateString() : 'N/A'}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMachines.length === 0 && (
        <div className="text-center py-12">
          <Settings2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No machines found</h3>
          <p className="text-muted-foreground">
            {machines.length === 0 ? 'Add your first machine to get started' : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}
    </MainLayout>
  );
};

export default Machines;
