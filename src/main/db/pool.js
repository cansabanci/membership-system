const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

let pool = null;

async function connect() {
  if (pool) return pool;
  pool = await sql.connect(dbConfig);
  console.log('✅ MSSQL veritabanına bağlanıldı.');
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Veritabanı havuzu henüz hazır değil. Önce connect() çağrılmalı.');
  }
  return pool;
}

module.exports = { connect, getPool, sql };
