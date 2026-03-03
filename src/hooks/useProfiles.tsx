import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface DbProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'supervisor' | 'technician' | 'operator';
}

export interface DbProfileWithRole extends DbProfile {
  role?: 'admin' | 'manager' | 'supervisor' | 'technician' | 'operator';
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('mms_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/users`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch profiles');
      return response.json() as Promise<DbProfileWithRole[]>;
    },
  });
};

export const useTechnicians = () => {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/users?role=technician`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch technicians');
      return response.json() as Promise<DbProfileWithRole[]>;
    },
  });
};

export const useProfile = (id: string | undefined) => {
  return useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch(`${API_URL}/users/${id}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json() as Promise<DbProfileWithRole>;
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...profile }: Partial<DbProfileWithRole> & { id: string, password?: string }) => {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['my-profile', variables.id] });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: 'admin' | 'manager' | 'supervisor' | 'technician' | 'operator' }) => {
      const response = await fetch(`${API_URL}/users/${user_id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update role');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('User role updated successfully');
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user_id: string) => {
      const response = await fetch(`${API_URL}/users/${user_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete user');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('User successfully deleted');
    }
  });
};
