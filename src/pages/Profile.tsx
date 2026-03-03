import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Building, Calendar, Clock, Shield, Edit, Save, X,
  Loader2, ClipboardList, LogIn,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DeleteUserDialog from '@/components/users/DeleteUserDialog';
import { useProfile, useUpdateProfile, DbProfileWithRole } from '@/hooks/useProfiles';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  supervisor: 'Supervisor',
  technician: 'Technician',
  operator: 'Operator',
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
  technician: 'bg-green-100 text-green-700 border-green-200',
  operator: 'bg-gray-100 text-gray-700 border-gray-200',
};

const Profile = () => {
  const { user, userRole } = useAuthContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  // Fetch real profile from backend
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();

  // Fetch assigned tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      return [];
    },
  });

  // Fetch task log notes count (work history)
  const { data: logCount = 0 } = useQuery({
    queryKey: ['my-log-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      return 0;
    },
  });

  const startEditing = () => {
    setEditName(profile?.name ?? '');
    setEditDepartment(profile?.department ?? '');
    setEditPassword('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!profile || !user?.id) return;
    setSaving(true);
    try {
      const payload: any = {
        id: user.id,
        name: editName,
        department: editDepartment
      };

      if (editPassword) {
        payload.password = editPassword;
      }

      await updateProfile.mutateAsync(payload);

      toast.success('Profile updated');
      setIsEditing(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <MainLayout title="My Profile" subtitle="View and manage your account">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const joinDate = profile?.created_at ? format(new Date(profile.created_at), 'MMMM d, yyyy') : 'N/A';
  const lastLogin = format(new Date(), 'MMM d, yyyy h:mm a');

  const activeTasks = tasks.filter(t => t.status !== 'resolved' && t.status !== 'closed');
  const completedTasks = tasks.filter(t => t.status === 'resolved' || t.status === 'closed');

  const statusColor = (s: string) => {
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'in_progress') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const priorityColor = (p: string) => {
    if (p === 'critical') return 'bg-red-100 text-red-700';
    if (p === 'high') return 'bg-orange-100 text-orange-700';
    if (p === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  const deleteUserObj: DbProfileWithRole | null = profile ? {
    ...profile,
    role: userRole as any,
  } : null;

  return (
    <MainLayout title="My Profile" subtitle="View and manage your account">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Name</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Department</Label>
                      <Input value={editDepartment} onChange={e => setEditDepartment(e.target.value)} placeholder="e.g. Maintenance" />
                    </div>
                    <div>
                      <Label>New Password <span className="text-muted-foreground font-normal">(Leave blank to keep current)</span></Label>
                      <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Min. 6 characters" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground">{profile?.name}</h2>
                    <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-4 w-4" /> {profile?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {userRole && (
                        <Badge variant="outline" className={roleColors[userRole] || ''}>
                          <Shield className="h-3 w-3 mr-1" />
                          {roleLabels[userRole] || userRole}
                        </Badge>
                      )}
                      {profile?.department && (
                        <Badge variant="outline">
                          <Building className="h-3 w-3 mr-1" />
                          {profile.department}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={startEditing}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="font-semibold text-sm">{joinDate}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <LogIn className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Last Login</p>
              <p className="font-semibold text-sm">{lastLogin}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Active Tasks</p>
              <p className="font-semibold text-lg">{activeTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs text-muted-foreground">Work Logs</p>
              <p className="font-semibold text-lg">{logCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Current Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active tasks assigned.</p>
            ) : (
              <div className="space-y-3">
                {activeTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/tasks/${t.id}`)}>
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.breakdown_id} · {format(new Date(t.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={priorityColor(t.priority)}>{t.priority}</Badge>
                      <Badge variant="outline" className={statusColor(t.status)}>{t.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recently Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border opacity-70">
                    <p className="text-sm">{t.title}</p>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Resolved</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone - Admin only can delete */}
        {isAdmin && (
          <>
            <Separator />
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Permanently delete your account and all associated data.</p>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete Account</Button>
              </CardContent>
            </Card>
            {deleteUserObj && (
              <DeleteUserDialog user={deleteUserObj} open={deleteOpen} onOpenChange={setDeleteOpen} />
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
