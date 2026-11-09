// Deletes the local SQLite database. A fresh demo database is created on the next request.
const fs = require('fs');
for (const f of ['local.db', 'local.db-wal', 'local.db-shm', 'local.db-journal']) fs.rmSync(f, { force: true });
console.log('Local database deleted. Fresh demo data will be seeded on the next request.');
