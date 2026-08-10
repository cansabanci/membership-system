const { getPool, sql } = require('../pool');

async function findByCredentials(email, password) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('email', sql.NVarChar, email)
    .input('password', sql.NVarChar, password)
    .query('SELECT email, rol FROM kullanicilar WHERE email=@email AND password=@password');

  return result.recordset[0] || null;
}

module.exports = { findByCredentials };
