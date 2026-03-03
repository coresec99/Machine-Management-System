import { useState } from 'react';
import {
  Lock, Bell, Eye, EyeOff, Loader2, Monitor, Shield,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';

const Settings = () => {
  const { userRole } = useAuthContext();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Notification prefs (local state – could be persisted to DB later)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [taskNotifs, setTaskNotifs] = useState(true);
  const [breakdownNotifs, setBreakdownNotifs] = useState(true);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      // Mock password update
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <MainLayout title="Settings" subtitle="Manage your account settings and preferences">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5" /> Change Password
            </CardTitle>
            <CardDescription>Update your account password. Minimum 6 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button onClick={handlePasswordChange} disabled={changingPw || !newPassword}>
              {changingPw ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notification Preferences
            </CardTitle>
            <CardDescription>Choose which notifications you want to receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive important updates via email</p>
              </div>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Task Assignments</p>
                <p className="text-xs text-muted-foreground">Get notified when tasks are assigned to you</p>
              </div>
              <Switch checked={taskNotifs} onCheckedChange={setTaskNotifs} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Breakdown Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified about new machine breakdowns</p>
              </div>
              <Switch checked={breakdownNotifs} onCheckedChange={setBreakdownNotifs} />
            </div>
          </CardContent>
        </Card>

        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Session & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">Current Role</p>
              <span className="font-medium text-sm capitalize">{userRole}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm">Two-Factor Authentication</p>
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
