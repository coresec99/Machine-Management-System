const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function extractSqlite() {
    process.env.DATABASE_URL = "file:./dev.db";
    const sqlitePrisma = new PrismaClient({
        datasources: { db: { url: "file:./dev.db" } }
    });

    console.log('Fetching data from SQLite...');
    const users = await sqlitePrisma.user.findMany();
    const profiles = await sqlitePrisma.profile.findMany();
    const machines = await sqlitePrisma.machine.findMany();
    const breakdowns = await sqlitePrisma.breakdown.findMany();
    const maintenanceRecords = await sqlitePrisma.maintenanceRecord.findMany();
    const partReplacements = await sqlitePrisma.partReplacement.findMany();
    const taskLogNotes = await sqlitePrisma.taskLogNote.findMany();
    const notifications = await sqlitePrisma.notification.findMany();

    console.log(`Fetched: ${users.length} Users, ${profiles.length} Profiles, ${machines.length} Machines`);

    fs.writeFileSync('migration_data.json', JSON.stringify({
        users, profiles, machines, breakdowns, maintenanceRecords, partReplacements, taskLogNotes, notifications
    }, null, 2));

    console.log('Data saved to migration_data.json');
    await sqlitePrisma.$disconnect();
}

extractSqlite();
