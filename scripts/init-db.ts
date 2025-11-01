import { createTables } from '../lib/db.js';
import 'dotenv/config';

(async () => {
  await createTables();
  console.log('✅ Database initialized');
  process.exit(0);
})();
