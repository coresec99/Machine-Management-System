import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  AlertTriangle,
  Wrench,
  UserPlus,
  CalendarCheck,
  Loader2,
  Trash2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';

const typeIcons: Record<string, React.ReactNode> = {
  breakdown: <AlertTriangle className="h-5 w-5 text-status-critical" />,
  task: <Wrench className="h-5 w-5 text-primary" />,
  assignment: <UserPlus className="h-5 w-5 text-status-warning" />,
  maintenance: <CalendarCheck className="h-5 w-5 text-status-success" />,
  info: <Bell className="h-5 w-5 text-muted-foreground" />,
};

const typeColors: Record<string, string> = {
  breakdown: 'bg-status-critical/10',
  task: 'bg-primary/10',
  assignment: 'bg-status-warning/10',
  maintenance: 'bg-status-success/10',
  info: 'bg-muted',
};

const formatTimeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const Notifications = () => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [activeTab, setActiveTab] = useState('all');

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.is_read;
    return n.type === activeTab;
  });

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.related_breakdown_id) {
      navigate(`/tasks/${notification.related_breakdown_id}`);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Notifications" subtitle="Stay updated on system events">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Notifications" subtitle="Stay updated on system events">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {unreadCount} unread
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {notifications.length} total
          </Badge>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-2">
            All
            <span className="bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded text-xs">
              {notifications.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            Unread
            {unreadCount > 0 && (
              <span className="bg-status-critical/20 text-status-critical px-1.5 py-0.5 rounded text-xs">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="task">Tasks</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdowns</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No notifications</h3>
              <p className="text-muted-foreground">
                {activeTab === 'unread'
                  ? "You're all caught up!"
                  : 'No notifications to display'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`glass-panel cursor-pointer transition-all hover:shadow-card-hover ${
                    !notification.is_read ? 'border-l-4 border-l-primary' : 'opacity-75'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        typeColors[notification.type] || typeColors.info
                      }`}>
                        {typeIcons[notification.type] || typeIcons.info}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.is_read && (
                              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Notifications;
