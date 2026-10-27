/** Fail closed when a validated invariant is unexpectedly absent. */
export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error('Required value missing');
  return value;
}
