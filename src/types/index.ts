// Machine Types
export interface Machine {
  id: string;
  machineNo: string;
  name: string;
  type: string;
  supplier: string;
  location: string;
  factory: string;
  category: string;
  installationDate: string;
  status: 'running' | 'down' | 'maintenance';
  healthStatus: 'good' | 'warning' | 'critical';
  lastMaintenanceDate: string;
  maintenanceFrequency: number; // days
  description: string;
  isActive: boolean;
}

// Breakdown Types
export interface Breakdown {
  id: string;
  machineId: string;
  machineName: string;
  machineNo: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  issue: string;
  actionTaken: string;
  rootCause: string;
  category: BreakdownCategory;
  priority: Priority;
  status: BreakdownStatus;
  assignedTechnician: string;
  assignedTechnicianId?: string;
  resolutionNotes: string;
  resourceUsed: string;
  cost: number;
  downtimeHours: number;
  downtimeMinutes: number;
  logNotes?: TaskLogNote[];
}

export type BreakdownCategory =
  | 'mechanical'
  | 'electrical'
  | 'hydraulic'
  | 'pneumatic'
  | 'software'
  | 'other';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type BreakdownStatus = 'open' | 'in_progress' | 'closed';

// Task Log Note
export interface TaskLogNote {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  note: string;
  timestamp: string;
  workDuration?: number; // minutes
  status?: 'working' | 'completed' | 'blocked';
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

export type UserRole = 'admin' | 'manager' | 'supervisor' | 'technician' | 'operator';

// Dashboard Stats
export interface DashboardStats {
  totalMachines: number;
  machinesDown: number;
  activeBreakdowns: number;
  totalDowntimeToday: number;
  totalDowntimeMonth: number;
  averageResolutionTime: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'breakdown' | 'assignment' | 'reminder' | 'maintenance';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

// Report Types
export interface ReportFilter {
  startDate: string;
  endDate: string;
  machineId?: string;
  technicianId?: string;
  status?: BreakdownStatus;
  priority?: Priority;
}

// Report Period Type
export type ReportPeriod = 'custom' | 'weekly' | 'monthly';
