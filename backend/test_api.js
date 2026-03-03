const API_URL = 'http://localhost:4000/api';

async function testApis() {
    try {
        console.log('--- Starting API Tests ---\n');

        let res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@mms.com', password: 'admin' })
        });

        if (!res.ok) {
            console.log('   [FAIL] Admin login failed', await res.text());
            return;
        }

        const data = await res.json();
        const token = data.token;
        console.log('   [PASS] Login successful');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 3. Create machine
        console.log('\n3. Creating a new machine');
        res = await fetch(`${API_URL}/machines`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                machine_id: 'TEST-123',
                name: 'Test Test 01',
                type: 'Drilling',
                location: 'Factory 99',
                serial_number: 'SN-X12345',
                status: 'running',
                health: 'good',
                description: 'Test Description'
            })
        });

        if (!res.ok) {
            console.log('   [FAIL] Create machine failed', await res.text());
            return;
        }

        let newMachine = await res.json();
        console.log('   [RAW CREATE RESPONSE]', newMachine);
        console.log('   [PASS] Machine created!');

        if (newMachine && newMachine.id) {
            // 4. Fetch machine by ID
            console.log('\n4. Fetching machine by ID');
            res = await fetch(`${API_URL}/machines/${newMachine.id}`, { headers });

            if (!res.ok) {
                console.log('   [FAIL] Fetch machine by ID failed', await res.text());
            } else {
                const fetchedMachine = await res.json();
                console.log('   [RAW GET BY ID RESPONSE]', fetchedMachine);
                if (fetchedMachine.serial_number !== 'SN-X12345') {
                    console.log('   [WARN] Mapped field (serial_number) not in response correctly! Make sure to restart the backend (npm run dev) so the latest code is live.');
                } else {
                    console.log('   [PASS] Fetched machine mapped serial_number successfully');
                }
            }

            // 5. Update machine
            console.log('\n5. Updating machine status');
            res = await fetch(`${API_URL}/machines/${newMachine.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    status: 'down',
                    serial_number: 'SN-UPDATED-99'
                })
            });

            if (!res.ok) {
                console.log('   [FAIL] Update machine failed', await res.text());
            } else {
                const updatedMachine = await res.json();
                console.log('   [PASS] Machine updated. New status:', updatedMachine.status || updatedMachine.status);
            }

            // 6. Delete machine
            console.log('\n6. Deleting test machine');
            res = await fetch(`${API_URL}/machines/${newMachine.id}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) {
                console.log('   [FAIL] Delete machine failed', await res.text());
            } else {
                console.log('   [PASS] Machine deleted successfully');
            }
        }
        console.log('\n--- API Tests Complete ---');
    } catch (e) {
        console.error('Test script crashed:', e);
    }
}

testApis();
