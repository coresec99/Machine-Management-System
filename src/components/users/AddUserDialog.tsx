import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCreateUser } from '@/hooks/useProfiles';

const addUserSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(20),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
  department: z.string().max(100).optional(),
  role: z.enum(['admin', 'manager', 'supervisor', 'technician', 'operator']),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

interface AddUserDialogProps {
  isAdmin: boolean;
}

const AddUserDialog = ({ isAdmin }: AddUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddUserFormData, string>>>({});
  const queryClient = useQueryClient();
  const createUser = useCreateUser();

  const [formData, setFormData] = useState<AddUserFormData>({
    employeeId: '',
    name: '',
    email: '',
    department: '',
    role: 'operator',
    password: '',
  });

  const handleChange = (field: keyof AddUserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = addUserSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AddUserFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof AddUserFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      await createUser.mutateAsync(formData);

      toast.success("User successfully added");
      setOpen(false);
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        department: '',
        role: 'operator',
        password: '',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        toast.error('This email is already registered');
      } else {
        toast.error(error.message || 'Failed to create user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with assigned role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID *</Label>
              <Input
                id="employeeId"
                placeholder="EMP001"
                value={formData.employeeId}
                onChange={(e) => handleChange('employeeId', e.target.value)}
                className={errors.employeeId ? 'border-destructive' : ''}
              />
              {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" placeholder="John Doe" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className={errors.name ? 'border-destructive' : ''} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" placeholder="john.doe@company.com" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className={errors.email ? 'border-destructive' : ''} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" placeholder="Manufacturing" value={formData.department} onChange={(e) => handleChange('department', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Initial Password *</Label>
            <Input id="password" type="password" placeholder="Min. 6 characters" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className={errors.password ? 'border-destructive' : ''} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            <p className="text-xs text-muted-foreground">User can change this after first login</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
