import type Database from "better-sqlite3";
import type { Queryable, QueryResult } from "./queryable";

type Db = Database.Database;

export function makeSqliteQueryable(db: Db): Queryable {
  return {
    all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      return Promise.resolve(
        (params.length > 0
          ? db.prepare(sql).all(...params)
          : db.prepare(sql).all()) as T[]
      );
    },

    get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      return Promise.resolve(
        (params.length > 0
          ? db.prepare(sql).get(...params)
          : db.prepare(sql).get()) as T | undefined
      );
    },

    run(sql: string, ...params: unknown[]): Promise<QueryResult> {
      const stmt = db.prepare(sql);
      const result = params.length > 0 ? stmt.run(...params) : stmt.run();
      return Promise.resolve({
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      });
    },
  };
}
