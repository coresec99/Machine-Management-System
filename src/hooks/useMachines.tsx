import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('mms_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface UserSnippet {
  id: string;
  name?: string;
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  maintenanceDate: string;
  type: string;
  technicianId?: string | null;
  technician?: UserSnippet | null;
  durationHours?: number | null;
  partsReplaced?: string | null;
  approvalStatus: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartReplacement {
  id: string;
  machineId: string;
  breakdownId?: string | null;
  partName: string;
  quantityUsed: number;
  replacedDate: string;
  replacedById?: string | null;
  replacedBy?: UserSnippet | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MachineAuditLog {
  id: string;
  machineId: string;
  actionType: string;
  editedById?: string | null;
  editedBy?: UserSnippet | null;
  changes?: string | null;
  createdAt: string;
}

export interface DbMachine {
  id: string;
  machine_id: string;
  name: string;
  type: string;
  location: string;
  serial_number: string | null;
  status: string;
  health: string;
  installation_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  maintenance_frequency: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  fuel_type: string | null;
  fuel_consumption_monthly: number | null;
  image_url: string | null;

  // Ownership
  assigned_manager_id: string | null;
  default_technician_id: string | null;
  backup_supervisor_id: string | null;
  maintenance_team_id: string | null;
  technician_group_id: string | null;

  // Vendor Data
  vendor_name: string | null;
  vendor_contact: string | null;
  vendor_email: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  amc_status: boolean;
  support_contact: string | null;

  // Config & Docs
  pm_cycle_days: number | null;
  sla_hours: number | null;
  user_manual_url: string | null;
  service_manual_url: string | null;
  sop_url: string | null;
  compliance_cert_url: string | null;

  // Relations
  breakdowns?: any[];
  maintenance_records?: MaintenanceRecord[];
  part_replacements?: PartReplacement[];
  audit_logs?: MachineAuditLog[];
}

export const useMachines = () => {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/machines`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch machines');
      return response.json() as Promise<DbMachine[]>;
    },
  });
};

export const useMachine = (id: string) => {
  return useQuery({
    queryKey: ['machines', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/machines/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch machine');
      return response.json() as Promise<DbMachine>;
    },
    enabled: !!id,
  });
};

export const useCreateMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (machine: Omit<DbMachine, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch(`${API_URL}/machines`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(machine),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create machine');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine added successfully');
    },
  });
};

export const useUpdateMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...machine }: Partial<DbMachine> & { id: string }) => {
      const response = await fetch(`${API_URL}/machines/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(machine),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update machine');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine updated successfully');
    },
  });
};

export const useDeleteMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/machines/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete machine');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine deleted successfully');
    },
  });
};

export const useCreateMaintenanceRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ machineId, ...record }: any) => {
      const response = await fetch(`${API_URL}/machines/${machineId}/maintenance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(record),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create maintenance record');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machines', variables.machineId] });
      toast.success('Maintenance record added successfully');
    },
  });
};

export const useCreatePartReplacement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ machineId, ...part }: any) => {
      const response = await fetch(`${API_URL}/machines/${machineId}/parts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(part),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to log part replacement');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machines', variables.machineId] });
      toast.success('Part usage logged successfully');
    },
  });
};

export const useScheduleMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, date, technician_id, type, priority, estimated_duration, description }: { id: string, date: string, technician_id?: string, type: string, priority?: string, estimated_duration?: string, description?: string }) => {
      const response = await fetch(`${API_URL}/breakdowns/schedule`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          machine_id: id,
          planned_date: date,
          assigned_to: technician_id,
          maintenance_type: type,
          priority,
          estimated_duration,
          description
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule maintenance');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machines', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['breakdowns'] });
      toast.success('Maintenance scheduled successfully');
    },
  });
};
