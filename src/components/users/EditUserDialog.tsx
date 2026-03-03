import { useState } from 'react';
import { Loader2, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProfile, useUpdateUserRole, DbProfileWithRole } from '@/hooks/useProfiles';
import type { UserRole } from '@/types';

interface EditUserDialogProps {
  user: DbProfileWithRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  isOwnProfile: boolean;
}

const EditUserDialog = ({ user, open, onOpenChange, isAdmin, isOwnProfile }: EditUserDialogProps) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(user.department || '');
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role || 'operator');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const updateRole = useUpdateUserRole();
  const updateProfile = useUpdateProfile();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Update profile details
      if (name !== user.name || department !== user.department || (isAdmin && email !== user.email) || (isAdmin && password)) {
        const updatePayload: any = {
          id: user.user_id, // the API expects the user ID
          name,
          department
        };
        if (isAdmin && email !== user.email) updatePayload.email = email;
        if (isAdmin && password) updatePayload.password = password;

        await updateProfile.mutateAsync(updatePayload);
      }

      // Then update role if needed
      if (isAdmin && selectedRole !== user.role) {
        await updateRole.mutateAsync({ user_id: user.user_id, role: selectedRole });
      }

      toast.success('User updated successfully');
      onOpenChange(false);
      setPassword(''); // clear password field
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={isAdmin ? email : user.email}
              onChange={(e) => isAdmin && setEmail(e.target.value)}
              disabled={!isAdmin}
              className={!isAdmin ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Manufacturing" />
          </div>

          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>New Password <span className="text-muted-foreground font-normal">(Leave blank to keep current)</span></Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
