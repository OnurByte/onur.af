import { Pool } from 'pg';
import { WebmentionStore } from '../src/server/webmentions/store';
import {
  resolveMentionTarget,
  validateMention,
} from '../src/portfolio/inbound-webmention';
import { validatePublicUrl } from '../src/portfolio/public-request';
const [command, arg, value] = process.argv.slice(2);
const url = process.env['WEBMENTIONS_DATABASE_URL'];
if (!url) throw new Error('WEBMENTIONS_DATABASE_URL required');
const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 3000,
  statement_timeout: 5000,
});
const store = new WebmentionStore(pool);
try {
  if (command === 'migrate') await store.migrate();
  else if (command === 'work') {
    const origin = process.env['SITE_URL'];
    if (!origin) throw new Error('SITE_URL required');
    for (let i = 0; i < 100; i++) {
      const job = await store.claim();
      if (!job) break;
      await store.finish(
        job,
        resolveMentionTarget(job.target, new URL(origin).origin)
          ? await validateMention(job.source, job.target)
          : { status: 'rejected' },
      );
    }
  } else if (command === 'revalidate') await store.revalidate();
  else if (
    command === 'moderate' &&
    arg &&
    (value === 'hidden' || value === 'visible' || value === 'blocked')
  )
    await store.moderate(arg, value);
  else if (command === 'block' && arg)
    await store.block(validatePublicUrl(arg).origin);
  else if (command === 'list')
    console.log(
      JSON.stringify(
        (
          await pool.query(
            'SELECT id,source,target,status,moderation,attempts,checked_at FROM webmentions ORDER BY updated_at DESC LIMIT 100',
          )
        ).rows,
        null,
        2,
      ),
    );
  else
    throw new Error(
      'Commands: migrate, work, revalidate, list, moderate ID hidden|visible|blocked, block SOURCE_ORIGIN',
    );
} finally {
  await pool.end();
}
