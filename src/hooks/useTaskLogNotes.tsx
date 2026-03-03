import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface DbTaskLogNote {
  id: string;
  breakdown_id: string;
  user_id: string;
  note: string;
  work_status: string;
  work_duration: number | null;
  created_at: string;
  user_name?: string;
}

const mockNotes: DbTaskLogNote[] = [];

export const useTaskLogNotes = (breakdownId: string) => {
  return useQuery({
    queryKey: ['task_log_notes', breakdownId],
    queryFn: async () => mockNotes,
    enabled: !!breakdownId,
  });
};

export const useAllTaskLogNotes = () => {
  return useQuery({
    queryKey: ['task_log_notes'],
    queryFn: async () => mockNotes,
  });
};

export const useCreateTaskLogNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: Omit<DbTaskLogNote, 'id' | 'created_at'>) => {
      return { id: Math.random().toString(), ...note } as any;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task_log_notes', variables.breakdown_id] });
      queryClient.invalidateQueries({ queryKey: ['task_log_notes'] });
      toast.success('Log note added successfully');
    },
  });
};

export const useDeleteTaskLogNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_log_notes'] });
      toast.success('Log note deleted successfully');
    },
  });
};
