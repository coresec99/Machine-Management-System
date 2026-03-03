import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const initCronJobs = () => {
    console.log('Initializing Cron Jobs for Maintenance Automation...');

    // 1. Upcoming Maintenance Reminder (runs daily at 8AM)
    cron.schedule('0 8 * * *', async () => {
        console.log('[CRON] Running Upcoming Maintenance Reminder Check...');
        try {
            const twoDaysFromNow = new Date();
            twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
            const startOfDay = new Date(twoDaysFromNow.setHours(0, 0, 0, 0));
            const endOfDay = new Date(twoDaysFromNow.setHours(23, 59, 59, 999));

            const upcomingTasks = await prisma.breakdown.findMany({
                where: {
                    status: 'scheduled',
                    plannedDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                include: { machine: true }
            });

            for (const task of upcomingTasks) {
                if (task.assignedToId) {
                    await prisma.notification.create({
                        data: {
                            userId: task.assignedToId,
                            title: 'Upcoming Maintenance in 2 Days',
                            message: `Maintenance for ${task.machine.name} is scheduled on ${task.plannedDate?.toDateString()}.`,
                            type: 'maintenance_reminder',
                            relatedBreakdownId: task.id
                        }
                    });
                }
                // Optional: Notify manager/supervisor as well
            }
        } catch (error) {
            console.error('[CRON Error] Upcoming Reminder:', error);
        }
    });

    // 2. Overdue Maintenance Check (Escalation 1: runs every hour)
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Running Overdue Maintenance Check...');
        try {
            const now = new Date();
            const overdueTasks = await prisma.breakdown.findMany({
                where: {
                    status: 'scheduled',
                    plannedDate: { lt: now }
                },
                include: { machine: true }
            });

            for (const task of overdueTasks) {
                await prisma.breakdown.update({
                    where: { id: task.id },
                    data: {
                        status: 'overdue',
                        escalationTime: new Date()
                    }
                });

                if (task.assignedToId) {
                    await prisma.notification.create({
                        data: {
                            userId: task.assignedToId,
                            title: '🚨 Maintenance Overdue',
                            message: `Maintenance for ${task.machine.name} is overdue!`,
                            type: 'escalation',
                            relatedBreakdownId: task.id
                        }
                    });
                }
            }
        } catch (error) {
            console.error('[CRON Error] Overdue Check:', error);
        }
    });

    // 3. Delayed Maintenance Check (Escalation 2: runs every 30 mins)
    cron.schedule('*/30 * * * *', async () => {
        console.log('[CRON] Running Delayed Maintenance Check...');
        try {
            const inProgressTasks = await prisma.breakdown.findMany({
                where: {
                    status: 'in_progress',
                    actualStartTime: { not: null },
                    estimatedDuration: { not: null, gt: 0 }
                },
                include: { machine: true }
            });

            const now = new Date();

            for (const task of inProgressTasks) {
                if (task.actualStartTime && task.estimatedDuration) {
                    const expectedEndTime = new Date(task.actualStartTime.getTime() + task.estimatedDuration * 60 * 60 * 1000);

                    if (now > expectedEndTime) {
                        await prisma.breakdown.update({
                            where: { id: task.id },
                            data: { status: 'delayed' }
                        });

                        if (task.machine.assignedManagerId) {
                            await prisma.notification.create({
                                data: {
                                    userId: task.machine.assignedManagerId,
                                    title: '⚠️ Delayed Maintenance',
                                    message: `Task ${task.title} on ${task.machine.name} has exceeded estimated duration.`,
                                    type: 'escalation',
                                    relatedBreakdownId: task.id
                                }
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[CRON Error] Delayed Check:', error);
        }
    });

    // 4. Breakdown SLA Breach Monitor (runs every 15 minutes)
    cron.schedule('*/15 * * * *', async () => {
        console.log('[CRON] Running SLA Breach Check...');
        try {
            const now = new Date();
            const breachedTasks = await prisma.breakdown.findMany({
                where: {
                    status: { in: ['assigned', 'in_progress', 'open'] },
                    slaDeadline: { lt: now },
                    slaBreached: false
                },
                include: { machine: true }
            });

            for (const task of breachedTasks) {
                await prisma.breakdown.update({
                    where: { id: task.id },
                    data: {
                        slaBreached: true,
                        slaBreachTime: new Date()
                    }
                });

                // Notify Manager
                if (task.machine?.assignedManagerId) {
                    await prisma.notification.create({
                        data: {
                            userId: task.machine.assignedManagerId,
                            title: '🚨 SLA BREACHED',
                            message: `Task ${task.breakdownId} on ${task.machine.name} has breached its SLA!`,
                            type: 'sla_breach',
                            relatedBreakdownId: task.id
                        }
                    });
                }

                // Notify Supervisor
                if (task.machine?.backupSupervisorId && task.machine.backupSupervisorId !== task.machine.assignedManagerId) {
                    await prisma.notification.create({
                        data: {
                            userId: task.machine.backupSupervisorId,
                            title: '🚨 SLA BREACHED',
                            message: `Task ${task.breakdownId} on ${task.machine.name} has breached its SLA!`,
                            type: 'sla_breach',
                            relatedBreakdownId: task.id
                        }
                    });
                }

            }
        } catch (error) {
            console.error('[CRON Error] SLA Check:', error);
        }
    });

    console.log('Cron Jobs initialized successfully.');
};
