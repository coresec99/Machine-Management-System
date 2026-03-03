import { useState } from 'react';
import {
  Search,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Mail,
  Loader2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProfiles, DbProfileWithRole } from '@/hooks/useProfiles';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import AddUserDialog from '@/components/users/AddUserDialog';
import EditUserDialog from '@/components/users/EditUserDialog';
import DeleteUserDialog from '@/components/users/DeleteUserDialog';

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
  technician: 'bg-green-100 text-green-700 border-green-200',
  operator: 'bg-gray-100 text-gray-700 border-gray-200',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  supervisor: 'Supervisor',
  technician: 'Technician',
  operator: 'Operator',
};

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<DbProfileWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<DbProfileWithRole | null>(null);

  const { data: users = [], isLoading } = useProfiles();
  const { userRole, user: currentUser } = useAuthContext();
  const isAdmin = userRole === 'admin';

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = users.reduce((acc, u) => {
    if (u.role) acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <MainLayout title="Users" subtitle="Manage system users and roles">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Users" subtitle="Manage system users and roles">
      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(['admin', 'manager', 'supervisor', 'technician', 'operator'] as UserRole[]).map((role) => (
          <Card key={role} className="glass-panel">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${role === 'admin' ? 'bg-purple-100' : role === 'manager' ? 'bg-indigo-100' : role === 'supervisor' ? 'bg-blue-100' : role === 'technician' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                  <Shield className={`h-5 w-5 ${role === 'admin' ? 'text-purple-600' : role === 'manager' ? 'text-indigo-600' : role === 'supervisor' ? 'text-blue-600' : role === 'technician' ? 'text-green-600' : 'text-gray-600'
                    }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleCounts[role] || 0}</p>
                  <p className="text-sm text-muted-foreground">{roleLabels[role]}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="technician">Technician</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
            </SelectContent>
          </Select>
          <AddUserDialog isAdmin={isAdmin} />
        </div>
      </div>

      {/* Users Table */}
      <Card className="glass-panel">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isOwnProfile = currentUser?.id === u.user_id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {u.email}
                        </div>
                      </td>
                      <td>
                        {u.role && (
                          <Badge variant="outline" className={roleColors[u.role]}>
                            {roleLabels[u.role]}
                          </Badge>
                        )}
                      </td>
                      <td>{u.department || 'N/A'}</td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingUser(u)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            {isAdmin && !isOwnProfile && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeletingUser(u)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No users found</h3>
          <p className="text-muted-foreground">
            {users.length === 0 ? 'Users will appear here once they sign up' : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          isAdmin={isAdmin}
          isOwnProfile={currentUser?.id === editingUser.user_id}
        />
      )}

      {/* Delete Dialog */}
      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
        />
      )}
    </MainLayout>
  );
};

export default Users;
