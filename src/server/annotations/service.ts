import { Pool } from 'pg';
import { AnnotationStore } from './store';
let store: AnnotationStore | undefined;
export function annotationsEnabled(): boolean {
  return (
    (process.env['ANNOTATIONS_ENABLED'] ??
      import.meta.env['ANNOTATIONS_ENABLED']) === '1'
  );
}
export function annotationStore(): AnnotationStore {
  if (!annotationsEnabled()) throw new Error('Annotations disabled');
  const url =
    process.env['ANNOTATIONS_DATABASE_URL'] ??
    import.meta.env['ANNOTATIONS_DATABASE_URL'];
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
