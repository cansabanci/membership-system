// Bazı ağlarda (bozuk/yavaş IPv6 çözümlemesi) DNS aralıklı olarak IPv6 denemesinde
// takılıp hataya düşebiliyor — IPv4'ü önceliklendirmek bunu önlüyor.
require('dns').setDefaultResultOrder('ipv4first');
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
  console.log('✅ MSSQL veritabanina baglanildi.');
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Veritabani havuzu henüz hazir değil. Önce connect() çağrilmali.');
  }
  return pool;
}

module.exports = { connect, getPool, sql };
