import { useEffect, useState, useRef } from 'react';
import { Bell, Search, User, LogOut, Settings, UserCircle, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/useNotifications';
import { useMachines } from '@/hooks/useMachines';
import { useBreakdowns } from '@/hooks/useBreakdowns';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  supervisor: 'Supervisor',
  technician: 'Technician',
  operator: 'Operator',
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

const Header = ({ title, subtitle }: HeaderProps) => {
  const { user, userRole, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();
  const { data: machines = [] } = useMachines();
  const { data: breakdowns = [] } = useBreakdowns();

  const recentNotifications = notifications.slice(0, 5);

  useEffect(() => {
    if (!user) return;
    setProfileName(user?.email?.split('@')[0] || 'User');
  }, [user]);

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = profileName || user?.email?.split('@')[0] || 'User';
  const displayRole = userRole ? roleLabels[userRole] || userRole : '';

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Search results
  const query = searchQuery.toLowerCase().trim();
  const searchResults = query.length >= 2 ? {
    machines: machines.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.machine_id.toLowerCase().includes(query) ||
      m.location.toLowerCase().includes(query)
    ).slice(0, 4),
    breakdowns: breakdowns.filter(b =>
      b.category !== 'maintenance' && (
        b.title.toLowerCase().includes(query) ||
        b.breakdown_id.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query) ||
        (b.machines?.name?.toLowerCase().includes(query) ?? false)
      )
    ).slice(0, 4),
  } : null;

  const hasResults = searchResults && (searchResults.machines.length > 0 || searchResults.breakdowns.length > 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search machines, breakdowns..."
            className="w-64 pl-9 pr-8 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {searchOpen && query.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {!hasResults ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.machines.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Machines
                      </div>
                      {searchResults.machines.map(m => (
                        <button
                          key={m.id}
                          className="w-full px-3 py-2.5 text-left hover:bg-muted/50 flex items-center gap-3 transition-colors"
                          onClick={() => {
                            navigate(`/machines/${m.id}`);
                            setSearchQuery('');
                            setSearchOpen(false);
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Settings className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">#{m.machine_id} • {m.location}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.breakdowns.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Breakdowns / Tasks
                      </div>
                      {searchResults.breakdowns.map(b => (
                        <button
                          key={b.id}
                          className="w-full px-3 py-2.5 text-left hover:bg-muted/50 flex items-center gap-3 transition-colors"
                          onClick={() => {
                            navigate(`/tasks/${b.id}`);
                            setSearchQuery('');
                            setSearchOpen(false);
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg bg-status-warning/10 flex items-center justify-center shrink-0">
                            <Bell className="h-4 w-4 text-status-warning" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{b.title}</p>
                            <p className="text-xs text-muted-foreground">{b.breakdown_id} • {b.machines?.name || 'Unknown'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-status-critical border-0">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      markAllRead.mutate();
                    }}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              recentNotifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  onClick={() => {
                    if (!n.is_read) markRead.mutate(n.id);
                    if (n.related_breakdown_id) {
                      navigate(`/tasks/${n.related_breakdown_id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-status-critical shrink-0" />}
                    <span className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                      {n.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">{n.message}</p>
                  <span className="text-xs text-muted-foreground/60 ml-4">{formatTimeAgo(n.created_at)}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-primary cursor-pointer"
              onClick={() => navigate('/notifications')}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{displayRole}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              <UserCircle className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
