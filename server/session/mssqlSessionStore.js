const { Store } = require('express-session');
const { getPool, sql } = require('../../src/main/db/pool');

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 1 gun

// express-session icin ozel MSSQL store — Redis/SQLite gibi yeni bir altyapi eklemek
// yerine zaten var olan pool'u ve `oturumlar` tablosunu (008_add_sessions.sql) kullanir.
class MssqlSessionStore extends Store {
  constructor(options = {}) {
    super();
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  }

  async get(sid, callback) {
    try {
      const pool = getPool();
      const result = await pool.request().input('sid', sql.NVarChar, sid).query('SELECT data, expires FROM oturumlar WHERE sid=@sid');
      const row = result.recordset[0];
      if (!row) return callback(null, null);
      if (new Date(row.expires).getTime() < Date.now()) {
        this.destroy(sid, () => {});
        return callback(null, null);
      }
      callback(null, JSON.parse(row.data));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, session, callback) {
    try {
      const pool = getPool();
      const expires = session.cookie && session.cookie.expires ? new Date(session.cookie.expires) : new Date(Date.now() + this.ttlMs);
      await pool
        .request()
        .input('sid', sql.NVarChar, sid)
        .input('data', sql.NVarChar(sql.MAX), JSON.stringify(session))
        .input('expires', sql.DateTime, expires)
        .query(`
          MERGE oturumlar AS target
          USING (SELECT @sid AS sid) AS source
          ON target.sid = source.sid
          WHEN MATCHED THEN UPDATE SET data=@data, expires=@expires
          WHEN NOT MATCHED THEN INSERT (sid, data, expires) VALUES (@sid, @data, @expires);
        `);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      const pool = getPool();
      await pool.request().input('sid', sql.NVarChar, sid).query('DELETE FROM oturumlar WHERE sid=@sid');
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  touch(sid, session, callback) {
    this.set(sid, session, callback);
  }
}

module.exports = MssqlSessionStore;
