import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="h-14 flex items-center border-b border-border px-3 sm:px-4 bg-card sticky top-0 z-20">
            <SidebarTrigger />
          </header>
          {/*
            NOTE: Sticky headers inside pages rely on having a real scroll container.
            If we only hide horizontal overflow without vertical scrolling here, `position: sticky`
            can break because this element becomes the sticky containing block but doesn't scroll.
          */}
          <div className="flex-1 min-h-0 p-4 sm:p-6 bg-background overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
