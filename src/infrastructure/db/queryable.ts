export interface QueryResult {
  changes: number;
  lastInsertRowid?: number;
}

export interface Queryable {
  all<T = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<T[]>;
  get<T = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<T | undefined>;
  run(sql: string, ...params: unknown[]): Promise<QueryResult>;
}
