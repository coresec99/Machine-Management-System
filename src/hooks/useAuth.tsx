import { useEffect, useState } from 'react';
import type { UserRole } from '@/types';
import { toast } from 'sonner';

export interface Session {
  access_token: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    userRole: null,
    loading: true,
  });

  useEffect(() => {
    // Check local storage for existing session on mount
    const token = localStorage.getItem('mms_token');
    const storedUser = localStorage.getItem('mms_user');

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        setAuthState({
          session: { access_token: token },
          user,
          userRole: user.role,
          loading: false,
        });
      } catch (e) {
        // Invalid stored user
        signOut();
      }
    } else {
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      const { token, user } = data;

      // Persist session
      localStorage.setItem('mms_token', token);
      localStorage.setItem('mms_user', JSON.stringify(user));

      setAuthState({
        session: { access_token: token },
        user,
        userRole: user.role,
        loading: false,
      });

      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('mms_token');
    localStorage.removeItem('mms_user');
    setAuthState({
      session: null,
      user: null,
      userRole: null,
      loading: false,
    });
    window.location.href = '/auth';
  };

  return {
    ...authState,
    signIn,
    signOut,
    isAuthenticated: !!authState.session,
  };
};
