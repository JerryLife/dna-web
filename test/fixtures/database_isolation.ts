// Executed in a synthetic application checkout, never the real application cwd.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { initDatabase, closeDatabase } from '../../server/database.js';
const db = await initDatabase();
try {
    const databases = await db.all('PRAGMA database_list');
    assert.equal(resolve(databases.find(row => row.name === 'main').file), resolve(process.argv[3]));
    await db.run("INSERT INTO proposals (id,model_id,submitter_email) VALUES ('sentinel','sentinel/model','sentinel@example.org')");
    await db.run("INSERT INTO votes (proposal_id,user_email) VALUES ('sentinel','sentinel@example.org')");
    await db.run("INSERT INTO submission_queue (email,payload) VALUES ('sentinel@example.org','{}')");
    if (process.argv[2] === 'exercise') {
        await db.run('DELETE FROM votes');
        await db.run('DELETE FROM proposals');
        await db.run('DELETE FROM submission_queue');
    }
} finally {
    await closeDatabase();
}
