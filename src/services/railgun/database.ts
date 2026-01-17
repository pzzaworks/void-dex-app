// LevelDB-compatible database for RAILGUN wallet storage
import type { AbstractLevelDOWN } from 'abstract-leveldown';

const DB_NAME = 'voiddex-railgun-db';

let db: AbstractLevelDOWN<string, string> | null = null;

/**
 * Creates a LevelDB-compatible database for browser using IndexedDB
 * This is used by RAILGUN to store encrypted wallet data
 */
export async function createDatabase(): Promise<AbstractLevelDOWN<string, string>> {
  if (db) {
    return db;
  }

  // Dynamic import for browser-only module
  const leveljs = await import('level-js');
  db = leveljs.default(DB_NAME);

  return db;
}

/**
 * Get the existing database instance
 */
export function getDatabase(): AbstractLevelDOWN<string, string> | null {
  return db;
}

/**
 * Close and cleanup the database
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).close((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          db = null;
          resolve();
        }
      });
    });
  }
}
