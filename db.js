require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS assignments (
          id         SERIAL  PRIMARY KEY,
          role       TEXT    NOT NULL,
          name       TEXT    NOT NULL,
          is_lead    BOOLEAN NOT NULL DEFAULT FALSE,
          sort_order INTEGER NOT NULL DEFAULT 0
        )
      `);
      console.log('Database ready');
      return;
    } catch (err) {
      if (i < maxRetries - 1) {
        console.log(`Database not ready, retrying in 2s... (${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw err;
      }
    }
  }
}

async function getAll() {
  const { rows } = await pool.query(
    'SELECT id, role, name, is_lead AS "isLead" FROM assignments ORDER BY sort_order, id'
  );
  return rows;
}

async function create({ role, name, isLead }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (isLead) {
      await client.query('UPDATE assignments SET is_lead = FALSE');
    }
    const { rows } = await client.query(
      `INSERT INTO assignments (role, name, is_lead)
       VALUES ($1, $2, $3)
       RETURNING id, role, name, is_lead AS "isLead"`,
      [role, name, !!isLead]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(id, { role, name, isLead }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (isLead) {
      await client.query('UPDATE assignments SET is_lead = FALSE WHERE id != $1', [id]);
    }
    const { rows } = await client.query(
      `UPDATE assignments
       SET role = $1, name = $2, is_lead = $3
       WHERE id = $4
       RETURNING id, role, name, is_lead AS "isLead"`,
      [role, name, !!isLead, id]
    );
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function remove(id) {
  await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
}

module.exports = { init, getAll, create, update, remove };
