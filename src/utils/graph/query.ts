export function buildStartsWithQuery(endpoint: string, fieldA: string, fieldB: string, term: string, select = "") {
  const base = `${endpoint}?$filter=startswith(${fieldA},'${term}') or startswith(${fieldB},'${term}')`;
  return select ? `${base}&$select=${select}` : base;
}
