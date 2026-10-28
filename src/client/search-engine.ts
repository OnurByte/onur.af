import MiniSearch from 'minisearch';

export function createRankedSearch(entries: readonly string[]) {
  const index = new MiniSearch({ idField: 'id', fields: ['text'] });
  index.addAll(entries.map((text, id) => ({ id, text })));
  return (query: string): Set<number> =>
    new Set(
      index
        .search(query, { prefix: true, combineWith: 'AND' })
        .map(({ id }) => Number(id)),
    );
}
