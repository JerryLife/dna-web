#!/bin/sh
node -e "
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
(async () => {
  const db = await open({ filename: '/app/server/data/lab.db', driver: sqlite3.Database });
  console.log('=== proposals table schema ===');
  const schema = await db.all('PRAGMA table_info(proposals)');
  console.log(JSON.stringify(schema, null, 2));
  console.log('=== submission_queue schema ===');
  const schema2 = await db.all('PRAGMA table_info(submission_queue)');
  console.log(JSON.stringify(schema2, null, 2));
  await db.close();
})();
"
