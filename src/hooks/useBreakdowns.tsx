import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface DbBreakdown {
  id: string;
  breakdown_id: string;
  machine_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  start_time: string;
  end_time: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  action_taken: string | null;
  resolution_notes: string | null;
  maintenance_type: string | null;
  planned_date: string | null;
  estimated_duration: number | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  checklist_completed: boolean | null;
  observations: string | null;
  manager_approval_time: string | null;
  escalation_time: string | null;
  sla_deadline: string | null;
  sla_breached: boolean | null;
  sla_breach_time: string | null;
  technician_acceptance_time: string | null;
  estimated_resolution_time: string | null;
  assignment_time: string | null;
  assigned_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBreakdownWithMachine extends DbBreakdown {
  machines?: {
    name: string;
    machine_id: string;
    location: string;
  };
}

export interface BreakdownAuditLog {
  id: string;
  action_type: string;
  changes: any;
  edited_by_name: string;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('mms_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const useBreakdowns = () => {
  return useQuery({
    queryKey: ['breakdowns'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/breakdowns`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch breakdowns');
      return response.json() as Promise<DbBreakdownWithMachine[]>;
    },
  });
};

export const useBreakdown = (id: string) => {
  return useQuery({
    queryKey: ['breakdowns', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/breakdowns/${id}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch breakdown');
      return response.json() as Promise<DbBreakdownWithMachine>;
    },
    enabled: !!id,
  });
};

export const useCreateBreakdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (breakdown: any) => {
      const response = await fetch(`${API_URL}/breakdowns`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(breakdown),
      });
      if (!response.ok) throw new Error('Failed to create breakdown');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakdowns'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] }); // invalidate to refresh machine status
      toast.success('Breakdown logged successfully');
    },
  });
};

export const useUpdateBreakdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...breakdown }: Partial<DbBreakdown> & { id: string }) => {
      const response = await fetch(`${API_URL}/breakdowns/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(breakdown),
      });
      if (!response.ok) throw new Error('Failed to update breakdown');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakdowns'] });
      toast.success('Breakdown updated successfully');
    },
  });
};

export const useAssignBreakdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const response = await fetch(`${API_URL}/breakdowns/${id}/assign`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assigned_to }),
      });
      if (!response.ok) throw new Error('Failed to assign technician');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakdowns'] });
      toast.success('Technician assigned successfully');
    },
  });
};

export const useAcceptBreakdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, estimated_resolution_time }: { id: string; estimated_resolution_time: string }) => {
      const response = await fetch(`${API_URL}/breakdowns/${id}/accept`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ estimated_resolution_time }),
      });
      if (!response.ok) throw new Error('Failed to accept task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakdowns'] });
      toast.success('Task accepted successfully');
    },
  });
};

export const useBreakdownAuditLogs = (id: string) => {
  return useQuery<BreakdownAuditLog[]>({
    queryKey: ['breakdowns', id, 'audit-logs'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/breakdowns/${id}/audit-logs`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch breakdown audit logs');
      return response.json() as Promise<BreakdownAuditLog[]>;
    },
    enabled: !!id,
  });
};

export const useDeleteBreakdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/breakdowns/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete breakdown');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakdowns'] });
      toast.success('Breakdown deleted successfully');
    },
  });
};
