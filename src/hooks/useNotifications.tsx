import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  email_sent: boolean;
  related_breakdown_id: string | null;
  created_at: string;
}

const mockNotifications: DbNotification[] = [];

export const useNotifications = () => {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      return mockNotifications;
    },
    enabled: !!user,
  });
};

export const useUnreadNotificationCount = () => {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['notifications_unread_count', user?.id],
    queryFn: async () => {
      return 0;
    },
    enabled: !!user,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Mocked
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      toast.success('All notifications marked as read');
    },
  });
};
