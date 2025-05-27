const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables if they don't exist
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      difficulty VARCHAR(50),
      prep_time VARCHAR(50),
      ingredients JSONB,
      instructions TEXT,
      plating TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_ratings (
      id SERIAL PRIMARY KEY,
      recipe_id INTEGER REFERENCES recipes(id),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

initDb().catch(console.error);

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Add other database methods as needed
}; 