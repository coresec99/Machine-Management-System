const { execSync } = require('child_process');
const fs = require('fs');

const schemaPath = './prisma/schema.prisma';
const originalSchema = fs.readFileSync(schemaPath, 'utf8');

try {
    console.log('--- Step 1: Extract SQLite Data ---');
    console.log('Setting to SQLite Provider...');
    fs.writeFileSync(schemaPath, originalSchema.replace('provider = "postgresql"', 'provider = "sqlite"'));

    console.log('Generating Prisma Client...');
    execSync('npx prisma generate', { env: { ...process.env, DATABASE_URL: "file:./dev.db" }, stdio: 'inherit' });

    console.log('Extracting Data...');
    execSync('node step1_extract.js', { env: { ...process.env, DATABASE_URL: "file:./dev.db" }, stdio: 'inherit' });


    console.log('\n--- Step 2: Insert into PostgreSQL ---');
    console.log('Restoring PostgreSQL Provider...');
    fs.writeFileSync(schemaPath, originalSchema);

    console.log('Generating Prisma Client...');
    if (!process.env.RENDER_DB_URL) throw new Error("Missing RENDER_DB_URL env");
    execSync('npx prisma generate', { env: { ...process.env, DATABASE_URL: process.env.RENDER_DB_URL }, stdio: 'inherit' });

    console.log('Inserting Data...');
    execSync('node step2_insert.js', { env: { ...process.env, DATABASE_URL: process.env.RENDER_DB_URL }, stdio: 'inherit' });

    console.log('\nAll done!');
} catch (e) {
    console.error('Failed!', e.message);
} finally {
    console.log('Restoring schema and client...');
    fs.writeFileSync(schemaPath, originalSchema);
    execSync('npx prisma generate', { env: { ...process.env, DATABASE_URL: process.env.RENDER_DB_URL }, stdio: 'inherit' });
}
