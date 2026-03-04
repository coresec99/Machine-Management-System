import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const router = Router();
const prisma = new PrismaClient();

const mapMachineToResponse = (m: any) => ({
    id: m.id,
    machine_id: m.machineId,
    name: m.name,
    type: m.type,
    location: m.location,
    serial_number: m.serialNumber,
    status: m.status,
    health: m.health,
    installation_date: m.installationDate,
    last_maintenance: m.lastMaintenance,
    next_maintenance: m.nextMaintenance,
    maintenance_frequency: m.maintenanceFrequency,
    description: m.description,
    is_active: m.isActive,
    fuel_type: m.fuelType,
    fuel_consumption_monthly: m.fuelConsumptionMonthly,
    image_url: m.imageUrl,

    // Ownership
    assigned_manager_id: m.assignedManagerId,
    default_technician_id: m.defaultTechnicianId,
    backup_supervisor_id: m.backupSupervisorId,
    maintenance_team_id: m.maintenanceTeamId,
    technician_group_id: m.technicianGroupId,

    // Vendor Data
    vendor_name: m.vendorName,
    vendor_contact: m.vendorContact,
    vendor_email: m.vendorEmail,
    warranty_start: m.warrantyStart,
    warranty_end: m.warrantyEnd,
    amc_status: m.amcStatus,
    support_contact: m.supportContact,

    // Config & Docs
    pm_cycle_days: m.pmCycleDays,
    sla_hours: m.slaHours,
    user_manual_url: m.userManualUrl,
    service_manual_url: m.serviceManualUrl,
    sop_url: m.sopUrl,
    compliance_cert_url: m.complianceCertUrl,

    breakdowns: m.breakdowns,
    maintenance_records: m.maintenanceRecords,
    part_replacements: m.partReplacements,

    created_at: m.createdAt,
    updated_at: m.updatedAt
});

// Get all machines
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const machines = await prisma.machine.findMany({
            include: {
                breakdowns: true,
                maintenanceRecords: true,
                partReplacements: true
            }
        });
        res.json(machines.map(mapMachineToResponse));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching machines' });
    }
});

// Get machine by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const machine = await prisma.machine.findUnique({
            where: { id: String(req.params.id) },
            include: {
                breakdowns: true,
                maintenanceRecords: true,
                partReplacements: true
            }
        });
        if (!machine) return res.status(404).json({ error: 'Machine not found' });
        res.json(mapMachineToResponse(machine));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching machine' });
    }
});

// Create machine
router.post('/', authenticate, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    try {
        const {
            machine_id,
            name,
            type,
            location,
            serial_number,
            status,
            health,
            installation_date,
            last_maintenance,
            next_maintenance,
            maintenance_frequency,
            description,
            is_active,
            fuel_type,
            fuel_consumption_monthly,
            image_url,
            assigned_manager_id,
            backup_supervisor_id,
            maintenance_team_id,
            technician_group_id,
            vendor_name,
            vendor_contact,
            vendor_email,
            warranty_start,
            warranty_end,
            amc_status,
            support_contact,
            pm_cycle_days,
            sla_hours,
            user_manual_url,
            service_manual_url,
            sop_url,
            compliance_cert_url,
            default_technician_id
        } = req.body;

        const machine = await prisma.machine.create({
            data: {
                machineId: machine_id,
                name,
                type,
                location,
                serialNumber: serial_number || null,
                status: status || 'running',
                health: health || 'good',
                installationDate: installation_date ? new Date(installation_date) : null,
                lastMaintenance: last_maintenance ? new Date(last_maintenance) : null,
                nextMaintenance: next_maintenance ? new Date(next_maintenance) : null,
                maintenanceFrequency: maintenance_frequency || null,
                description: description || null,
                isActive: is_active ?? true,
                fuelType: fuel_type || null,
                fuelConsumptionMonthly: fuel_consumption_monthly ? parseFloat(fuel_consumption_monthly) : null,
                imageUrl: image_url || null,

                // New onboarding fields
                assignedManagerId: assigned_manager_id || null,
                defaultTechnicianId: default_technician_id || null,
                backupSupervisorId: backup_supervisor_id || null,
                maintenanceTeamId: maintenance_team_id || null,
                technicianGroupId: technician_group_id || null,

                vendorName: vendor_name || null,
                vendorContact: vendor_contact || null,
                vendorEmail: vendor_email || null,
                warrantyStart: warranty_start ? new Date(warranty_start) : null,
                warrantyEnd: warranty_end ? new Date(warranty_end) : null,
                amcStatus: amc_status ?? false,
                supportContact: support_contact || null,

                pmCycleDays: pm_cycle_days ? parseInt(pm_cycle_days) : null,
                slaHours: sla_hours ? parseInt(sla_hours) : null,

                userManualUrl: user_manual_url || null,
                serviceManualUrl: service_manual_url || null,
                sopUrl: sop_url || null,
                complianceCertUrl: compliance_cert_url || null,
            }
        });

        // re-fetch to include relations
        const createdMachine = await prisma.machine.findUnique({
            where: { id: machine.id },
            include: {
                breakdowns: true,
                maintenanceRecords: true,
                partReplacements: true
            }
        });

        res.status(201).json(mapMachineToResponse(createdMachine));
    } catch (error: any) {
        console.error('Error creating machine:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A machine with this Machine No. already exists' });
        }
        res.status(500).json({ error: error.message || 'Error creating machine' });
    }
});

// Update machine
router.put('/:id', authenticate, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    try {
        const {
            machine_id,
            name,
            type,
            location,
            serial_number,
            status,
            health,
            installation_date,
            last_maintenance,
            next_maintenance,
            maintenance_frequency,
            description,
            is_active,
            fuel_type,
            fuel_consumption_monthly,
            image_url,
            assigned_manager_id,
            backup_supervisor_id,
            maintenance_team_id,
            technician_group_id,
            vendor_name,
            vendor_contact,
            vendor_email,
            warranty_start,
            warranty_end,
            amc_status,
            support_contact,
            pm_cycle_days,
            sla_hours,
            user_manual_url,
            service_manual_url,
            sop_url,
            compliance_cert_url,
            default_technician_id
        } = req.body;

        const updateData: any = { name, type, location, status, health, description };
        if (machine_id !== undefined) updateData.machineId = machine_id;
        if (serial_number !== undefined) updateData.serialNumber = serial_number;
        if (installation_date !== undefined) updateData.installationDate = installation_date ? new Date(installation_date) : null;
        if (last_maintenance !== undefined) updateData.lastMaintenance = last_maintenance ? new Date(last_maintenance) : null;
        if (next_maintenance !== undefined) updateData.nextMaintenance = next_maintenance ? new Date(next_maintenance) : null;
        if (maintenance_frequency !== undefined) updateData.maintenanceFrequency = maintenance_frequency;
        if (is_active !== undefined) updateData.isActive = is_active;
        if (fuel_type !== undefined) updateData.fuelType = fuel_type;
        if (fuel_consumption_monthly !== undefined) updateData.fuelConsumptionMonthly = fuel_consumption_monthly ? parseFloat(fuel_consumption_monthly) : null;
        if (image_url !== undefined) updateData.imageUrl = image_url;

        // Ownership
        if (assigned_manager_id !== undefined) updateData.assignedManagerId = assigned_manager_id;
        if (default_technician_id !== undefined) updateData.defaultTechnicianId = default_technician_id;
        if (backup_supervisor_id !== undefined) updateData.backupSupervisorId = backup_supervisor_id;
        if (maintenance_team_id !== undefined) updateData.maintenanceTeamId = maintenance_team_id;
        if (technician_group_id !== undefined) updateData.technicianGroupId = technician_group_id;

        // Vendor Data
        if (vendor_name !== undefined) updateData.vendorName = vendor_name;
        if (vendor_contact !== undefined) updateData.vendorContact = vendor_contact;
        if (vendor_email !== undefined) updateData.vendorEmail = vendor_email;
        if (warranty_start !== undefined) updateData.warrantyStart = warranty_start ? new Date(warranty_start) : null;
        if (warranty_end !== undefined) updateData.warrantyEnd = warranty_end ? new Date(warranty_end) : null;
        if (amc_status !== undefined) updateData.amcStatus = amc_status;
        if (support_contact !== undefined) updateData.supportContact = support_contact;

        // Config & Docs
        if (pm_cycle_days !== undefined) updateData.pmCycleDays = pm_cycle_days ? parseInt(pm_cycle_days) : null;
        if (sla_hours !== undefined) updateData.slaHours = sla_hours ? parseInt(sla_hours) : null;
        if (user_manual_url !== undefined) updateData.userManualUrl = user_manual_url;
        if (service_manual_url !== undefined) updateData.serviceManualUrl = service_manual_url;
        if (sop_url !== undefined) updateData.sopUrl = sop_url;
        if (compliance_cert_url !== undefined) updateData.complianceCertUrl = compliance_cert_url;

        // Remove undefined from updateData to prevent overwriting with undefined
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const oldMachine = await prisma.machine.findUnique({ where: { id: String(req.params.id) } });
        if (!oldMachine) return res.status(404).json({ error: 'Machine not found' });

        const machine = await prisma.machine.update({
            where: { id: String(req.params.id) },
            data: updateData
        });

        const updatedMachine = await prisma.machine.findUnique({
            where: { id: machine.id },
            include: {
                breakdowns: true,
                maintenanceRecords: true,
                partReplacements: true
            }
        });

        res.json(mapMachineToResponse(updatedMachine));
    } catch (error: any) {
        console.error('Error updating machine:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A machine with this Machine No. already exists' });
        }
        res.status(500).json({ error: error.message || 'Error updating machine' });
    }
});

// Delete machine
router.delete('/:id', authenticate, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    try {
        await prisma.machine.delete({ where: { id: String(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting machine' });
    }
});

// --------------------------------------------------------------------------------
// Nested Sub-Records: Logs, Maintenance, Parts
// --------------------------------------------------------------------------------


// Create maintenance record
router.post('/:id/maintenance', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { type, maintenance_date, duration_hours, parts_replaced, notes, approval_status } = req.body;

        const record = await prisma.maintenanceRecord.create({
            data: {
                machineId: String(req.params.id),
                type,
                maintenanceDate: maintenance_date ? new Date(maintenance_date) : new Date(),
                durationHours: duration_hours ? parseFloat(duration_hours) : null,
                partsReplaced: parts_replaced || null,
                notes: notes || null,
                approvalStatus: approval_status || 'pending',
                technicianId: req.user?.id || null, // Auto-assign to current user as technician
            }
        });

        // Optionally update the Machine's next_maintenance / last_maintenance inside a transaction
        await prisma.machine.update({
            where: { id: String(req.params.id) },
            data: { lastMaintenance: new Date() }
        });

        res.status(201).json(record);
    } catch (error) {
        console.error('Error creating maintenance record:', error);
        res.status(500).json({ error: 'Error creating maintenance record' });
    }
});

// Create part replacement
router.post('/:id/parts', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { part_name, quantity_used, replaced_date, notes, breakdown_id } = req.body;

        const part = await prisma.partReplacement.create({
            data: {
                machineId: String(req.params.id),
                partName: part_name,
                quantityUsed: quantity_used ? parseInt(quantity_used) : 1,
                replacedDate: replaced_date ? new Date(replaced_date) : new Date(),
                notes: notes || null,
                breakdownId: breakdown_id || null,
                replacedById: req.user?.id || null
            }
        });
        res.status(201).json(part);
    } catch (error) {
        console.error('Error creating part replacement:', error);
        res.status(500).json({ error: 'Error creating part replacement' });
    }
});

// Schedule maintenance (creates a breakdown task)
router.post('/:id/schedule', authenticate, requireRole(['admin', 'manager', 'supervisor']), async (req: AuthRequest, res: Response) => {
    try {
        const { date, technician_id, type } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        const machineId = String(req.params.id);
        const machine = await prisma.machine.findUnique({ where: { id: machineId } });

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        // 1. Create a Breakdown record to represent this scheduled task
        const breakdownIdStr = `SCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await prisma.breakdown.create({
            data: {
                breakdownId: breakdownIdStr,
                machineId: machineId,
                title: `[Scheduled] ${type} Maintenance`,
                description: `Scheduled ${type} maintenance for ${machine.name}`,
                category: type || 'Preventive',
                priority: 'low',
                status: 'open',
                startTime: new Date(date),
                assignedToId: technician_id || null,
                reportedById: req.user?.id || null,
            }
        });

        // 2. Update the machine's next_maintenance date
        const updatedMachine = await prisma.machine.update({
            where: { id: machineId },
            data: {
                nextMaintenance: new Date(date)
            },
            include: {
                breakdowns: true,
                maintenanceRecords: true,
                partReplacements: true
            }
        });

        res.status(201).json(mapMachineToResponse(updatedMachine));
    } catch (error) {
        console.error('Error scheduling maintenance:', error);
        res.status(500).json({ error: 'Error scheduling maintenance' });
    }
});

// Upload document
router.post('/:id/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const machineId = String(req.params.id);
        const docType = req.body.docType as string; // 'userManualUrl' | 'serviceManualUrl' | 'sopUrl' | 'complianceCertUrl'

        if (!docType || !['userManualUrl', 'serviceManualUrl', 'sopUrl', 'complianceCertUrl'].includes(docType)) {
            // Cleanup the uploaded file if docType is invalid
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid document type' });
        }

        const filePath = `/uploads/${req.file.filename}`;

        // Get the current machine to delete the old file if it exists
        const machine = await prisma.machine.findUnique({ where: { id: machineId } });
        if (machine) {
            const oldFilePath = machine[docType as keyof typeof machine] as string;
            if (oldFilePath && oldFilePath.startsWith('/uploads/')) {
                const oldFileFullPath = path.join(__dirname, '..', '..', oldFilePath);
                if (fs.existsSync(oldFileFullPath)) {
                    fs.unlinkSync(oldFileFullPath);
                }
            }
        }

        const updateData = { [docType]: filePath };

        const updatedMachine = await prisma.machine.update({
            where: { id: machineId },
            data: updateData,
            include: {
                breakdowns: true,
                maintenanceRecords: true,
                partReplacements: true
            }
        });

        res.json(mapMachineToResponse(updatedMachine));
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Error uploading document' });
    }
});

export default router;
