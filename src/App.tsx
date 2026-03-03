import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedRoute from "@/components/RoleBasedRoute";
import Index from "./pages/Index";
import Machines from "./pages/Machines";
import MachineDetail from "./pages/MachineDetail";
import MachineEdit from "./pages/MachineEdit";
import Breakdowns from "./pages/Breakdowns";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Users from "./pages/Users";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/machines" element={<ProtectedRoute><Machines /></ProtectedRoute>} />
            <Route path="/machines/:id" element={<ProtectedRoute><MachineDetail /></ProtectedRoute>} />
            <Route path="/machines/:id/edit" element={<ProtectedRoute><MachineEdit /></ProtectedRoute>} />
            <Route path="/breakdowns" element={<ProtectedRoute><Breakdowns /></ProtectedRoute>} />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin', 'manager', 'supervisor', 'technician']}>
                  <Tasks />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            <Route path="/tasks/:id" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin', 'manager', 'supervisor', 'technician']}>
                  <TaskDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            <Route path="/maintenance" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin', 'manager', 'supervisor', 'technician']}>
                  <Maintenance />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
                  <Reports />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            <Route path="/reports/:id" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
                  <ReportDetail />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin']}>
                  <Users />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
