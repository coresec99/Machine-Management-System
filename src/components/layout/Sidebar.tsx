import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings2,
  Wrench,
  AlertTriangle,
  ClipboardList,
  FileBarChart,
  Users,
  Bell,
  ChevronLeft,
  ChevronRight,
  Factory,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SidebarProps {
  userRole?: 'admin' | 'manager' | 'supervisor' | 'technician' | 'operator';
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const Sidebar = ({ userRole = 'operator', collapsed, onCollapsedChange }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthContext();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const navigationItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/',
      roles: ['admin', 'manager', 'supervisor', 'technician', 'operator'],
    },
    {
      title: 'Machines',
      icon: Settings2,
      href: '/machines',
      roles: ['admin', 'manager', 'supervisor', 'technician', 'operator'],
    },
    {
      title: 'Breakdowns',
      icon: AlertTriangle,
      href: '/breakdowns',
      roles: ['admin', 'manager', 'supervisor', 'technician', 'operator'],
    },
    {
      title: 'Tasks',
      icon: ClipboardList,
      href: '/tasks',
      roles: ['admin', 'manager', 'supervisor', 'technician'],
    },
    {
      title: 'Maintenance',
      icon: Wrench,
      href: '/maintenance',
      roles: ['admin', 'manager', 'supervisor', 'technician'],
    },
    {
      title: 'Reports',
      icon: FileBarChart,
      href: '/reports',
      roles: ['admin', 'manager', 'supervisor'],
    },
    {
      title: 'Users',
      icon: Users,
      href: '/users',
      roles: ['admin'],
    },
  ];

  const filteredNavItems = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Factory className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">
                MMS
              </span>
              <span className="text-[10px] text-sidebar-foreground/60">
                Machine Management System
              </span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 mt-2">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'nav-item',
                isActive && 'nav-item-active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
        <Link
          to="/notifications"
          className={cn(
            'nav-item mb-2',
            location.pathname === '/notifications' && 'nav-item-active',
            collapsed && 'justify-center px-2'
          )}
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-status-critical text-[10px] text-white flex items-center justify-center">
              2
            </span>
          </div>
          {!collapsed && <span>Notifications</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={cn(
            'nav-item w-full text-status-critical/80 hover:text-status-critical hover:bg-status-critical/10',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
