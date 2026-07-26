import type { Pool } from "pg";
import type { Queryable, QueryResult } from "../queryable";

function sql2pg(sql: string, params: unknown[]): { text: string; values: unknown[] } {
  let text = sql;

  // datetime('now', '±N hour(s)/minute(s)/day(s)') → NOW() ± INTERVAL 'N hour(s)/minute(s)/day(s)'
  text = text.replace(/datetime\('now',\s*'([+-])(\d+)\s+(minutes?|hours?|days?)'\)/g, (_, sign: string, n: string, unit: string) => {
    if (sign === "+") return `NOW() + INTERVAL '${n} ${unit}'`;
    return `NOW() - INTERVAL '${n} ${unit}'`;
  });

  // bare datetime('now') → NOW()
  text = text.replace(/datetime\('now'\)/g, "NOW()");

  // Track if original had INSERT OR IGNORE (before we modify it)
  const hadInsertIgnore = /INSERT\s+OR\s+IGNORE/i.test(text);

  // INSERT OR IGNORE INTO → INSERT INTO
  text = text.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+/gi, "INSERT INTO ");

  // Add ON CONFLICT DO NOTHING to INSERT ... VALUES queries that originally had OR IGNORE
  if (hadInsertIgnore && !/ON CONFLICT/i.test(text)) {
    text = text.replace(/\)\s*;?\s*$/, ") ON CONFLICT DO NOTHING");
  }

  // UPDATE OR IGNORE → UPDATE
  text = text.replace(/UPDATE\s+OR\s+IGNORE\s+/gi, "UPDATE ");

  // Handle @named parameters: convert to $1, $2, ... using the single object param
  const namedMatch = text.match(/@\w+/g);
  if (namedMatch && params.length === 1 && typeof params[0] === "object" && params[0] !== null) {
    const obj = params[0] as Record<string, unknown>;
    const values: unknown[] = [];
    let i = 0;
    text = text.replace(/@(\w+)/g, (_, name) => {
      i++;
      values.push(obj[name]);
      return `$${i}`;
    });
    return { text, values };
  }

  // Convert ? to $1, $2, ... (positional)
  let idx = 0;
  text = text.replace(/\?/g, () => {
    idx++;
    return `$${idx}`;
  });

  return { text, values: params };
}

export function makePgQueryable(pool: Pool): Queryable {
  return {
    async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const { text, values } = sql2pg(sql, params);
      const result = await pool.query(text, values.length > 0 ? values : undefined);
      return result.rows as T[];
    },

    async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      const { text, values } = sql2pg(sql, params);
      const result = await pool.query(text, values.length > 0 ? values : undefined);
      return (result.rows[0] as T | undefined) ?? undefined;
    },

    async run(sql: string, ...params: unknown[]): Promise<QueryResult> {
      const { text, values } = sql2pg(sql, params);

      // Only add RETURNING id for tables that have an id column
      const tablesWithId = /\b(sources|feeds|articles|stories|users|digest_subscriptions)\b/i;
      let queryText = text;
      if (
        /^\s*INSERT\s+INTO\s+/i.test(queryText) &&
        !/RETURNING\s/i.test(queryText) &&
        tablesWithId.test(queryText)
      ) {
        queryText = queryText.replace(/;?\s*$/, "") + " RETURNING id";
      }

      const result = await pool.query(queryText, values.length > 0 ? values : undefined);
      const lastInsertRowid =
        result.rows.length > 0 && "id" in result.rows[0]
          ? Number(result.rows[0].id)
          : undefined;
      return { changes: result.rowCount ?? 0, lastInsertRowid };
    },
  };
}
