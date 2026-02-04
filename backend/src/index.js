import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();

// ===== DATABASE CONNECTION =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/aetharfell',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// ===== MIDDLEWARE =====
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(','),
  credentials: true
}));
app.use(express.json());

// ===== DATABASE INITIALIZATION =====
async function initializeDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        photo_url TEXT,
        balance BIGINT DEFAULT 0,
        total_taps BIGINT DEFAULT 0,
        level INTEGER DEFAULT 1,
        energy INTEGER DEFAULT 100,
        max_energy INTEGER DEFAULT 100,
        tap_per_click INTEGER DEFAULT 1,
        energy_regen_rate FLOAT DEFAULT 1.0,
        last_energy_update BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Upgrades table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS upgrades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tap_boost INTEGER DEFAULT 0,
        energy_boost INTEGER DEFAULT 0,
        auto_clicker INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Leaderboard table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rank INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

initializeDatabase();

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ===== USER ROUTES =====

// Create or get user
app.post('/api/users', async (req, res) => {
  try {
    const { telegramId, username, firstName, photoUrl } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      
      // Update energy
      const timePassed = (Date.now() - user.last_energy_update) / 1000;
      const energyRegen = Math.floor(timePassed * user.energy_regen_rate);
      const newEnergy = Math.min(user.max_energy, user.energy + energyRegen);
      
      await pool.query(
        'UPDATE users SET energy = $1, last_energy_update = $2 WHERE id = $3',
        [newEnergy, Date.now(), user.id]
      );

      user.energy = newEnergy;
      return res.json({ success: true, user });
    }

    // Create new user
    const result = await pool.query(
      `INSERT INTO users (telegram_id, username, first_name, photo_url, last_energy_update)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [telegramId, username || 'Unknown', firstName || 'User', photoUrl || null, Date.now()]
    );

    // Create upgrades record
    await pool.query(
      'INSERT INTO upgrades (user_id) VALUES ($1)',
      [result.rows[0].id]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/users/:telegramId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [req.params.telegramId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Update energy
    const timePassed = (Date.now() - user.last_energy_update) / 1000;
    const energyRegen = Math.floor(timePassed * user.energy_regen_rate);
    const newEnergy = Math.min(user.max_energy, user.energy + energyRegen);
    
    await pool.query(
      'UPDATE users SET energy = $1, last_energy_update = $2 WHERE id = $3',
      [newEnergy, Date.now(), user.id]
    );

    user.energy = newEnergy;
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TAP SYSTEM =====

app.post('/api/tap', async (req, res) => {
  try {
    const { telegramId, taps = 1 } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID required' });
    }

    const userResult = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.energy < taps) {
      return res.status(400).json({
        error: 'Not enough energy',
        currentEnergy: user.energy
      });
    }

    const reward = taps * user.tap_per_click;
    const newBalance = user.balance + reward;
    const newEnergy = user.energy - taps;
    const newTotalTaps = user.total_taps + taps;

    await pool.query(
      `UPDATE users 
       SET balance = $1, energy = $2, total_taps = $3, last_energy_update = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [newBalance, newEnergy, newTotalTaps, Date.now(), user.id]
    );

    res.json({
      success: true,
      balance: newBalance,
      energy: newEnergy,
      totalTaps: newTotalTaps
    });
  } catch (error) {
    console.error('Tap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== UPGRADES =====

app.post('/api/upgrades/buy', async (req, res) => {
  try {
    const { telegramId, upgradeType } = req.body;

    const userResult = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const upgradeCosts = {
      tapBoost: 100,
      energyBoost: 500,
      autoClicker: 5000
    };

    const cost = upgradeCosts[upgradeType];
    if (!cost) {
      return res.status(400).json({ error: 'Invalid upgrade type' });
    }

    if (user.balance < cost) {
      return res.status(400).json({ error: 'Not enough balance' });
    }

    const newBalance = user.balance - cost;
    let tapPerClick = user.tap_per_click;
    let maxEnergy = user.max_energy;
    let energyRegenRate = user.energy_regen_rate;

    if (upgradeType === 'tapBoost') {
      tapPerClick += 1;
    } else if (upgradeType === 'energyBoost') {
      maxEnergy += 20;
    } else if (upgradeType === 'autoClicker') {
      energyRegenRate += 1;
    }

    await pool.query(
      `UPDATE users 
       SET balance = $1, tap_per_click = $2, max_energy = $3, energy_regen_rate = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [newBalance, tapPerClick, maxEnergy, energyRegenRate, user.id]
    );

    // Update upgrades table
    if (upgradeType === 'tapBoost') {
      await pool.query(`UPDATE upgrades SET tap_boost = tap_boost + 1 WHERE user_id = $1`, [user.id]);
    } else if (upgradeType === 'energyBoost') {
      await pool.query(`UPDATE upgrades SET energy_boost = energy_boost + 1 WHERE user_id = $1`, [user.id]);
    } else if (upgradeType === 'autoClicker') {
      await pool.query(`UPDATE upgrades SET auto_clicker = auto_clicker + 1 WHERE user_id = $1`, [user.id]);
    }

    const updatedUser = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    res.json({ success: true, user: updatedUser.rows[0] });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LEADERBOARD =====

app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const result = await pool.query(
      'SELECT * FROM users ORDER BY balance DESC LIMIT $1',
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaderboard/rank/:telegramId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, balance FROM users WHERE telegram_id = $1`,
      [req.params.telegramId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rankResult = await pool.query(
      `SELECT COUNT(*) + 1 as rank FROM users WHERE balance > $1`,
      [result.rows[0].balance]
    );

    res.json({
      rank: rankResult.rows[0].rank,
      balance: result.rows[0].balance
    });
  } catch (error) {
    console.error('Rank error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ADMIN ROUTES =====

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/users/:telegramId/balance', async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await pool.query(
      'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING *',
      [amount, req.params.telegramId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Balance update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/users/:telegramId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE telegram_id = $1 RETURNING id',
      [req.params.telegramId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/reset', async (req, res) => {
  try {
    await pool.query('DELETE FROM upgrades');
    await pool.query('DELETE FROM leaderboard');
    await pool.query('DELETE FROM users');
    res.json({ success: true, message: 'All data reset' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AETHARFELL Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
