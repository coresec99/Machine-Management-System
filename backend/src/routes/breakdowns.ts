import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all breakdowns
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const breakdowns = await prisma.breakdown.findMany({
            include: {
                machine: {
                    select: { name: true, machineId: true, location: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to frontend expected format
        const formatted = breakdowns.map(b => ({
            id: b.id,
            breakdown_id: b.breakdownId,
            machine_id: b.machineId,
            title: b.title,
            description: b.description,
            category: b.category,
            priority: b.priority,
            status: b.status,
            start_time: b.startTime,
            end_time: b.endTime,
            reported_by: b.reportedById,
            assigned_to: b.assignedToId,
            action_taken: b.actionTaken,
            resolution_notes: b.resolutionNotes,
            maintenance_type: b.maintenanceType,
            planned_date: b.plannedDate,
            estimated_duration: b.estimatedDuration,
            actual_start_time: b.actualStartTime,
            actual_end_time: b.actualEndTime,
            checklist_completed: b.checklistCompleted,
            observations: b.observations,
            manager_approval_time: b.managerApprovalTime,
            escalation_time: b.escalationTime,
            assignment_time: b.assignmentTime,
            assigned_by: b.assignedById,
            technician_acceptance_time: b.technicianAcceptanceTime,
            estimated_resolution_time: b.estimatedResolutionTime,
            sla_deadline: b.slaDeadline,
            sla_breached: b.slaBreached,
            sla_breach_time: b.slaBreachTime,
            created_at: b.createdAt,
            updated_at: b.updatedAt,
            machines: b.machine ? {
                name: b.machine.name,
                machine_id: b.machine.machineId,
                location: b.machine.location
            } : undefined
        }));
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching breakdowns:', error);
        res.status(500).json({ error: 'Error fetching breakdowns' });
    }
});

// Create new breakdown
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { machine_id, title, description, category, priority } = req.body;

        // Generate a random breakdown ID like BD00X if not provided
        const breakdownId = `BD${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        // Determine SLA based on priority (low=48, medium=24, high=8, critical=4)
        let slaHours = 24;
        const p = priority?.toLowerCase();
        if (p === 'critical') slaHours = 4;
        else if (p === 'high') slaHours = 8;
        else if (p === 'low') slaHours = 48;

        const slaDeadline = new Date();
        slaDeadline.setHours(slaDeadline.getHours() + slaHours);

        // Create breakdown and update machine status in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const machine = await tx.machine.findUnique({
                where: { id: machine_id },
                select: { assignedManagerId: true, backupSupervisorId: true }
            });

            const breakdown = await tx.breakdown.create({
                data: {
                    breakdownId,
                    machineId: machine_id,
                    title,
                    description,
                    category,
                    priority: priority || 'medium',
                    status: 'open',
                    assignedToId: null, // Keep UNASSIGNED
                    reportedById: (req as any).user?.userId,
                    slaDeadline
                },
                include: {
                    machine: {
                        select: { name: true, machineId: true, location: true }
                    }
                }
            });

            // Update associated machine health and status to critical and down
            await tx.machine.update({
                where: { id: machine_id },
                data: {
                    health: 'critical',
                    status: 'down'
                }
            });

            // Notify Manager
            if (machine?.assignedManagerId) {
                await tx.notification.create({
                    data: {
                        userId: machine.assignedManagerId,
                        title: 'New Breakdown Reported',
                        message: `Machine DOWN: ${breakdown.machine?.name} (${breakdownId}). SLA: ${slaHours}h.`,
                        type: 'breakdown_reported',
                        relatedBreakdownId: breakdown.id
                    }
                });
            }

            // Notify Supervisor
            if (machine?.backupSupervisorId && machine.backupSupervisorId !== machine.assignedManagerId) {
                await tx.notification.create({
                    data: {
                        userId: machine.backupSupervisorId,
                        title: 'New Breakdown Reported',
                        message: `Machine DOWN: ${breakdown.machine?.name} (${breakdownId}). SLA: ${slaHours}h.`,
                        type: 'breakdown_reported',
                        relatedBreakdownId: breakdown.id
                    }
                });
            }

            return breakdown;
        });

        res.status(201).json({
            id: result.id,
            breakdown_id: result.breakdownId,
            machine_id: result.machineId,
            title: result.title,
            description: result.description,
            category: result.category,
            priority: result.priority,
            status: result.status,
            start_time: result.startTime,
            end_time: result.endTime,
            machines: result.machine ? {
                name: result.machine.name,
                machine_id: result.machine.machineId,
                location: result.machine.location
            } : undefined
        });
    } catch (error) {
        console.error('Error creating breakdown:', error);
        res.status(500).json({ error: 'Error creating breakdown' });
    }
});


// Get a single breakdown
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const breakdown = await prisma.breakdown.findUnique({
            where: { id: String(req.params.id) },
            include: {
                machine: {
                    select: { name: true, machineId: true, location: true }
                }
            }
        });

        if (!breakdown) {
            return res.status(404).json({ error: 'Breakdown not found' });
        }

        const formatted = {
            id: breakdown.id,
            breakdown_id: breakdown.breakdownId,
            machine_id: breakdown.machineId,
            title: breakdown.title,
            description: breakdown.description,
            category: breakdown.category,
            priority: breakdown.priority,
            status: breakdown.status,
            start_time: breakdown.startTime,
            end_time: breakdown.endTime,
            reported_by: breakdown.reportedById,
            assigned_to: breakdown.assignedToId,
            action_taken: breakdown.actionTaken,
            resolution_notes: breakdown.resolutionNotes,
            maintenance_type: breakdown.maintenanceType,
            planned_date: breakdown.plannedDate,
            estimated_duration: breakdown.estimatedDuration,
            actual_start_time: breakdown.actualStartTime,
            actual_end_time: breakdown.actualEndTime,
            checklist_completed: breakdown.checklistCompleted,
            observations: breakdown.observations,
            manager_approval_time: breakdown.managerApprovalTime,
            escalation_time: breakdown.escalationTime,
            assignment_time: breakdown.assignmentTime,
            assigned_by: breakdown.assignedById,
            technician_acceptance_time: breakdown.technicianAcceptanceTime,
            estimated_resolution_time: breakdown.estimatedResolutionTime,
            sla_deadline: breakdown.slaDeadline,
            sla_breached: breakdown.slaBreached,
            sla_breach_time: breakdown.slaBreachTime,
            created_at: breakdown.createdAt,
            updated_at: breakdown.updatedAt,
            machines: breakdown.machine ? {
                name: breakdown.machine.name,
                machine_id: breakdown.machine.machineId,
                location: breakdown.machine.location
            } : undefined
        };

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching breakdown:', error);
        res.status(500).json({ error: 'Error fetching breakdown' });
    }
});

// Schedule Maintenance (Phase 1)
router.post('/schedule', authenticate, requireRole(['admin', 'manager', 'supervisor']), async (req: Request, res: Response) => {
    try {
        const { machine_id, title, description, maintenance_type, priority, planned_date, estimated_duration, assigned_to } = req.body;

        const breakdownId = `MT${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`; // MT for Maintenance Task

        const result = await prisma.$transaction(async (tx) => {
            const task = await tx.breakdown.create({
                data: {
                    breakdownId,
                    machineId: machine_id,
                    title: title || 'Scheduled Maintenance',
                    description: description || '',
                    category: 'maintenance',
                    priority: priority || 'medium',
                    status: 'scheduled',
                    maintenanceType: maintenance_type,
                    plannedDate: new Date(planned_date),
                    estimatedDuration: parseInt(estimated_duration || '0', 10),
                    assignedToId: assigned_to || null,
                },
                include: {
                    machine: { select: { name: true, machineId: true, location: true } }
                }
            });

            // Update machine status
            await tx.machine.update({
                where: { id: machine_id },
                data: {
                    status: 'maintenance'
                }
            });

            if (assigned_to) {
                await tx.notification.create({
                    data: {
                        userId: assigned_to,
                        title: 'Maintenance Assigned',
                        message: `You have been assigned to scheduled maintenance task: ${breakdownId}`,
                        type: 'maintenance_assigned',
                        relatedBreakdownId: task.id
                    }
                });
            }

            return task;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error scheduling maintenance:', error);
        res.status(500).json({ error: 'Error scheduling maintenance' });
    }
});

// Assign Technician (Manager/Admin/Supervisor only)
router.patch('/:id/assign', authenticate, requireRole(['admin', 'manager', 'supervisor']), async (req: Request, res: Response) => {
    try {
        const { assigned_to } = req.body;
        if (!assigned_to) return res.status(400).json({ error: 'Assigned tech required' });

        const result = await prisma.$transaction(async (tx) => {
            const task = await tx.breakdown.findUnique({ where: { id: String(req.params.id) } });
            if (!task) throw new Error('Task not found');

            const updated = await tx.breakdown.update({
                where: { id: String(req.params.id) },
                data: {
                    status: 'assigned',
                    assignedToId: assigned_to,
                    assignedById: (req as any).user?.userId,
                    assignmentTime: new Date()
                },
                include: { machine: true }
            });

            await tx.notification.create({
                data: {
                    userId: assigned_to,
                    title: 'New Breakdown Assigned',
                    message: `You have been assigned to breakdown: ${updated.breakdownId} at ${updated.machine?.name}.`,
                    type: 'breakdown_assigned',
                    relatedBreakdownId: updated.id
                }
            });

            return updated;
        });

        res.json(result);
    } catch (error) {
        console.error('Error assigning breakdown:', error);
        res.status(500).json({ error: 'Error assigning breakdown' });
    }
});

// Technician Accepts Task
router.patch('/:id/accept', authenticate, requireRole(['admin', 'manager', 'supervisor', 'technician']), async (req: Request, res: Response) => {
    try {
        const { estimated_resolution_time } = req.body;
        if (!estimated_resolution_time) return res.status(400).json({ error: 'ETA required' });

        const result = await prisma.$transaction(async (tx) => {
            const task = await tx.breakdown.findUnique({ where: { id: String(req.params.id) }, include: { machine: true } });
            if (!task) throw new Error('Task not found');

            const updated = await tx.breakdown.update({
                where: { id: String(req.params.id) },
                data: {
                    status: 'in_progress',
                    technicianAcceptanceTime: new Date(),
                    estimatedResolutionTime: new Date(estimated_resolution_time)
                }
            });

            // Notify Manager that task was accepted
            if (task.machine?.assignedManagerId) {
                await tx.notification.create({
                    data: {
                        userId: task.machine.assignedManagerId,
                        title: 'Task Accepted',
                        message: `Task ${task.breakdownId} accepted by technician. ETA: ${new Date(estimated_resolution_time).toLocaleString()}`,
                        type: 'task_accepted',
                        relatedBreakdownId: task.id
                    }
                });
            }

            return updated;
        });

        res.json(result);
    } catch (error) {
        console.error('Error accepting breakdown:', error);
        res.status(500).json({ error: 'Error accepting breakdown' });
    }
});

// Update a breakdown (close / execute maintenance)
router.patch('/:id', authenticate, requireRole(['admin', 'manager', 'supervisor', 'technician']), async (req: Request, res: Response) => {
    try {
        const {
            status, assigned_to, action_taken, resolution_notes,
            actual_start_time, actual_end_time, checklist_completed, observations, manager_approval_time
        } = req.body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (assigned_to !== undefined) updateData.assignedToId = assigned_to;
        if (action_taken !== undefined) updateData.actionTaken = action_taken;
        if (resolution_notes !== undefined) updateData.resolutionNotes = resolution_notes;

        // Maintenance Execution Fields
        if (actual_start_time !== undefined) updateData.actualStartTime = new Date(actual_start_time);
        if (actual_end_time !== undefined) updateData.actualEndTime = new Date(actual_end_time);
        if (checklist_completed !== undefined) updateData.checklistCompleted = checklist_completed;
        if (observations !== undefined) updateData.observations = observations;
        if (manager_approval_time !== undefined) updateData.managerApprovalTime = new Date(manager_approval_time);

        if (status === 'closed' || status === 'resolved') {
            updateData.endTime = new Date();
        }

        const breakdown = await prisma.$transaction(async (tx) => {
            const existingTask = await tx.breakdown.findUnique({ where: { id: String(req.params.id) }, include: { machine: true } });

            const updatedBreakdown = await tx.breakdown.update({
                where: { id: String(req.params.id) },
                data: updateData,
                include: { machine: true }
            });

            if (existingTask && status && existingTask.status !== status) {
                if (status === 'closed' && updatedBreakdown.assignedToId) {
                    await tx.notification.create({
                        data: {
                            userId: updatedBreakdown.assignedToId,
                            title: 'Task Approved',
                            message: `Your task ${updatedBreakdown.breakdownId} was approved and closed.`,
                            type: 'task_approved',
                            relatedBreakdownId: updatedBreakdown.id
                        }
                    });
                }
            }

            // If resolving, update machine status back to running/good
            if (status === 'closed' || status === 'resolved' || status === 'pending_review') {
                const machine = await tx.machine.findUnique({ where: { id: updatedBreakdown.machineId } });
                const machineUpdateData: any = {
                    status: 'running',
                    health: 'good'
                };

                // If it was a maintenance task, update maintenance schedule
                if (updatedBreakdown.maintenanceType) {
                    machineUpdateData.lastMaintenance = new Date();
                    if (machine?.pmCycleDays) {
                        const nextDate = new Date();
                        nextDate.setDate(nextDate.getDate() + machine.pmCycleDays);
                        machineUpdateData.nextMaintenance = nextDate;
                    }
                }

                await tx.machine.update({
                    where: { id: updatedBreakdown.machineId },
                    data: machineUpdateData
                });
            }

            return updatedBreakdown;
        });

        res.json(breakdown);
    } catch (error) {
        console.error('Error updating breakdown:', error);
        res.status(500).json({ error: 'Error updating breakdown' });
    }
});

export default router;
