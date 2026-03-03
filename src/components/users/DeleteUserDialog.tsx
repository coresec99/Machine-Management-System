import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteUser, DbProfileWithRole } from '@/hooks/useProfiles';

interface DeleteUserDialogProps {
  user: DbProfileWithRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeleteUserDialog = ({ user, open, onOpenChange }: DeleteUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteUser.mutateAsync(user.user_id);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete User
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{user.name}</strong> ({user.email})?
            This action cannot be undone and will remove all their data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete User'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;
