import { Pool } from 'pg';
import { AnnotationStore } from '../src/server/annotations/store';
const [command] = process.argv.slice(2);
const url = process.env['ANNOTATIONS_DATABASE_URL'];
if (!url) throw new Error('ANNOTATIONS_DATABASE_URL required');
const pool = new Pool({ connectionString: url, max: 1 });
try {
  if (command === 'migrate') await new AnnotationStore(pool).migrate();
  else if (command === 'reports') {
    const rows = await pool.query(
      'SELECT annotation_id,reason,created_at FROM annotation_reports ORDER BY created_at DESC LIMIT 100',
    );
    console.log(JSON.stringify(rows.rows));
  } else throw new Error('Commands: migrate, reports');
} finally {
  await pool.end();
}
