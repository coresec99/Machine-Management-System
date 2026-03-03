import { ReactNode, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const MainLayout = ({ children, title, subtitle }: MainLayoutProps) => {
  const { userRole, loading } = useAuthContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  };

  if (loading || !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userRole={userRole}
        collapsed={sidebarCollapsed}
        onCollapsedChange={handleSidebarCollapse}
      />
      <div className={cn(
        'transition-all duration-300',
        sidebarCollapsed ? 'ml-[72px]' : 'ml-64'
      )}>
        <Header title={title} subtitle={subtitle} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
