const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock Database (we'll use this for now)
let users = {};
let leaderboard = [];

// ===== USER ROUTES =====

// Create or get user
app.post('/api/users', (req, res) => {
  const { telegramId, username, firstName, photoUrl } = req.body;

  if (!telegramId) {
    return res.status(400).json({ error: 'Telegram ID required' });
  }

  if (!users[telegramId]) {
    users[telegramId] = {
      telegramId,
      username: username || 'Unknown',
      firstName: firstName || 'User',
      photoUrl: photoUrl || null,
      balance: 0,
      totalTaps: 0,
      level: 1,
      energy: 100,
      maxEnergy: 100,
      tapPerClick: 1,
      energyRegenRate: 1, // per second
      lastEnergyUpdate: Date.now(),
      createdAt: new Date(),
      referrals: [],
      referredBy: null,
      upgrades: {
        tapBoost: 0,
        energyBoost: 0,
        autoClicker: 0
      }
    };

    leaderboard.push(telegramId);
  }

  const user = users[telegramId];
  
  // Update energy regeneration
  const timePassed = (Date.now() - user.lastEnergyUpdate) / 1000;
  const energyRegen = Math.floor(timePassed * user.energyRegenRate);
  user.energy = Math.min(user.maxEnergy, user.energy + energyRegen);
  user.lastEnergyUpdate = Date.now();

  res.json({ success: true, user });
});

// Get user profile
app.get('/api/users/:telegramId', (req, res) => {
  const user = users[req.params.telegramId];
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update energy
  const timePassed = (Date.now() - user.lastEnergyUpdate) / 1000;
  const energyRegen = Math.floor(timePassed * user.energyRegenRate);
  user.energy = Math.min(user.maxEnergy, user.energy + energyRegen);
  user.lastEnergyUpdate = Date.now();

  res.json(user);
});

// ===== TAP SYSTEM =====

// Process a tap
app.post('/api/tap', (req, res) => {
  const { telegramId, taps = 1 } = req.body;

  if (!telegramId) {
    return res.status(400).json({ error: 'Telegram ID required' });
  }

  const user = users[telegramId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user has enough energy
  if (user.energy < taps) {
    return res.status(400).json({ 
      error: 'Not enough energy',
      currentEnergy: user.energy 
    });
  }

  // Process the tap
  const reward = taps * user.tapPerClick;
  user.balance += reward;
  user.totalTaps += taps;
  user.energy -= taps;
  user.lastEnergyUpdate = Date.now();

  res.json({ 
    success: true,
    balance: user.balance,
    energy: user.energy,
    totalTaps: user.totalTaps
  });
});

// ===== UPGRADES =====

app.post('/api/upgrades/buy', (req, res) => {
  const { telegramId, upgradeType } = req.body;

  const user = users[telegramId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const upgradeCosts = {
    tapBoost: 100,      // Cost: 100 coins, Benefit: +1 tap per click
    energyBoost: 500,   // Cost: 500 coins, Benefit: +20 max energy
    autoClicker: 5000   // Cost: 5000 coins, Benefit: auto tap 1 per second
  };

  const cost = upgradeCosts[upgradeType];
  if (!cost) {
    return res.status(400).json({ error: 'Invalid upgrade type' });
  }

  if (user.balance < cost) {
    return res.status(400).json({ error: 'Not enough balance' });
  }

  // Apply upgrade
  user.balance -= cost;
  user.upgrades[upgradeType] += 1;

  if (upgradeType === 'tapBoost') {
    user.tapPerClick += 1;
  } else if (upgradeType === 'energyBoost') {
    user.maxEnergy += 20;
    user.energy = Math.min(user.energy + 20, user.maxEnergy);
  } else if (upgradeType === 'autoClicker') {
    user.energyRegenRate += 1;
  }

  res.json({ success: true, user });
});

// ===== LEADERBOARD =====

app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;

  const sorted = leaderboard
    .map(id => users[id])
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);

  res.json(sorted);
});

app.get('/api/leaderboard/rank/:telegramId', (req, res) => {
  const user = users[req.params.telegramId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const rank = leaderboard
    .map(id => users[id])
    .sort((a, b) => b.balance - a.balance)
    .findIndex(u => u.telegramId === req.params.telegramId) + 1;

  res.json({ rank, balance: user.balance });
});

// ===== ADMIN ROUTES =====

// Get all users (Admin only)
app.get('/api/admin/users', (req, res) => {
  // TODO: Add proper JWT authentication
  const allUsers = Object.values(users);
  res.json(allUsers);
});

// Update user balance (Admin)
app.post('/api/admin/users/:telegramId/balance', (req, res) => {
  const { amount } = req.body;
  const user = users[req.params.telegramId];

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.balance = amount;
  res.json({ success: true, user });
});

// Delete user (Admin)
app.delete('/api/admin/users/:telegramId', (req, res) => {
  const telegramId = req.params.telegramId;
  delete users[telegramId];
  leaderboard = leaderboard.filter(id => id !== telegramId);

  res.json({ success: true, message: 'User deleted' });
});

// Reset all data (Admin)
app.post('/api/admin/reset', (req, res) => {
  users = {};
  leaderboard = [];
  res.json({ success: true, message: 'All data reset' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AETHARFELL Backend running on http://localhost:${PORT}`);
});

module.exports = app;
