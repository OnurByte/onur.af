import { runtimeEnv } from '../runtime-env';
import { Pool } from 'pg';
import { AnnotationStore } from './store';
let store: AnnotationStore | undefined;
export function annotationsEnabled(): boolean {
  return runtimeEnv('ANNOTATIONS_ENABLED') === '1';
}
export function annotationStore(): AnnotationStore {
  if (!annotationsEnabled()) throw new Error('Annotations disabled');
  const url = runtimeEnv('ANNOTATIONS_DATABASE_URL');
  if (!url) throw new Error('Annotations unavailable');
  return (store ??= new AnnotationStore(
    new Pool({
      connectionString: url,
      max: 3,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
    }),
  ));
}
