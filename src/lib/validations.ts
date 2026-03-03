import { z } from 'zod';

// Machine validation schema
export const machineSchema = z.object({
  machine_id: z.string().min(1, 'Machine ID is required').max(50, 'Machine ID must be less than 50 characters'),
  name: z.string().min(1, 'Machine name is required').max(100, 'Name must be less than 100 characters'),
  type: z.string().min(1, 'Type is required').max(50, 'Type must be less than 50 characters'),
  location: z.string().min(1, 'Location is required').max(100, 'Location must be less than 100 characters'),
  serial_number: z.string().max(100, 'Serial number must be less than 100 characters').optional().nullable(),
  status: z.enum(['running', 'down', 'maintenance'], { required_error: 'Status is required' }),
  health: z.enum(['good', 'warning', 'critical'], { required_error: 'Health status is required' }),
  installation_date: z.string().optional().nullable(),
  maintenance_frequency: z.string().optional().nullable(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  fuel_type: z.enum(['electric', 'diesel', 'petrol', 'gas', 'hybrid']).optional().nullable(),

  // Ownership
  assigned_manager_id: z.string().uuid().optional().nullable().or(z.literal('')),
  default_technician_id: z.string().uuid().optional().nullable().or(z.literal('')),
  backup_supervisor_id: z.string().uuid().optional().nullable().or(z.literal('')),
  maintenance_team_id: z.string().uuid().optional().nullable().or(z.literal('')),
  technician_group_id: z.string().uuid().optional().nullable().or(z.literal('')),

  // Vendor
  vendor_name: z.string().max(100).optional().nullable(),
  vendor_contact: z.string().max(100).optional().nullable(),
  vendor_email: z.string().email().max(100).optional().nullable().or(z.literal('')),
  warranty_start: z.string().optional().nullable(),
  warranty_end: z.string().optional().nullable(),
  amc_status: z.boolean().optional().default(false),
  support_contact: z.string().max(100).optional().nullable(),

  // Config & Docs
  pm_cycle_days: z.coerce.number().min(1).max(3650).optional().nullable(),
  sla_hours: z.coerce.number().min(1).optional().nullable(),
  user_manual_url: z.string().optional().nullable().or(z.literal('')),
  service_manual_url: z.string().optional().nullable().or(z.literal('')),
  sop_url: z.string().optional().nullable().or(z.literal('')),
  compliance_cert_url: z.string().optional().nullable().or(z.literal('')),
});

export type MachineFormData = z.infer<typeof machineSchema>;

// Breakdown validation schema
export const breakdownSchema = z.object({
  breakdown_id: z.string().min(1, 'Breakdown ID is required').max(50, 'Breakdown ID must be less than 50 characters'),
  machine_id: z.string().uuid('Please select a valid machine'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  category: z.enum(['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'software', 'other'], { required_error: 'Category is required' }),
  priority: z.enum(['low', 'medium', 'high', 'critical'], { required_error: 'Priority is required' }),
  start_time: z.string().optional(),
});

export type BreakdownFormData = z.infer<typeof breakdownSchema>;

// User profile validation schema
export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  department: z.string().max(100, 'Department must be less than 100 characters').optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Task log note validation schema
export const taskLogNoteSchema = z.object({
  note: z.string().min(1, 'Note is required').max(1000, 'Note must be less than 1000 characters'),
  work_duration: z.number().min(0, 'Duration cannot be negative').max(1440, 'Duration cannot exceed 24 hours').optional().nullable(),
  work_status: z.enum(['working', 'completed', 'blocked'], { required_error: 'Status is required' }),
});

export type TaskLogNoteFormData = z.infer<typeof taskLogNoteSchema>;
