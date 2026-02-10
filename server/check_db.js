// Temporary script to inspect the submission_queue table
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const db = await open({ filename: './server/data/lab.db', driver: sqlite3.Database });

console.log('\n=== submission_queue ===');
const submissions = await db.all('SELECT id, email, verification_token, is_verified, created_at FROM submission_queue ORDER BY created_at DESC LIMIT 10');
console.log(JSON.stringify(submissions, null, 2));

console.log('\n=== proposals ===');
const proposals = await db.all('SELECT id, model_id, submitter_email, votes, created_at FROM proposals ORDER BY created_at DESC LIMIT 10');
console.log(JSON.stringify(proposals, null, 2));

await db.close();
