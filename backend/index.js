import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import crypto from "crypto";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Validate telegram login
function verify(initData) {
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN);
  const hash = initData.hash;
  const data = Object.keys(initData)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${initData[k]}`)
    .join("\n");

  const h = crypto
    .createHmac("sha256", secret.digest())
    .update(data)
    .digest("hex");

  return h === hash;
}

// Auth
app.post("/auth", async (req, res) => {
  const { initDataUnsafe } = req.body;
  if (!verify(initDataUnsafe)) return res.status(403).json({ ok: false });

  const user = JSON.parse(initDataUnsafe.user);

  await pool.query(
    `INSERT INTO users (tg_id, gold, stamina) 
     VALUES ($1, 0, 200)
     ON CONFLICT (tg_id) DO NOTHING`,
    [user.id]
  );

  res.json({ ok: true });
});

// Stamina regen helper
async function regenStamina(tg_id) {
  const { rows } = await pool.query(
    "SELECT stamina, max_stamina, last_stamina_update FROM users WHERE tg_id=$1",
    [tg_id]
  );
  const u = rows[0];
  if (!u) return;

  const now = Date.now();
  const last = new Date(u.last_stamina_update).getTime();

  const seconds = Math.floor((now - last) / 1000);
  const regen = Math.floor(seconds / 10); // +1 every 10 sec

  if (regen <= 0) return;

  const newStamina = Math.min(u.stamina + regen, u.max_stamina);

  await pool.query(
    `UPDATE users SET stamina=$1, last_stamina_update=NOW() WHERE tg_id=$2`,
    [newStamina, tg_id]
  );
}

// Tap
app.post("/tap", async (req, res) => {
  const { tg_id } = req.body;

  await regenStamina(tg_id);

  const { rows } = await pool.query(
    "SELECT stamina FROM users WHERE tg_id=$1",
    [tg_id]
  );

  if (rows[0].stamina <= 0)
    return res.json({ ok: false, reason: "no_stamina" });

  await pool.query(
    "UPDATE users SET gold = gold + 1, stamina = stamina - 1 WHERE tg_id=$1",
    [tg_id]
  );

  res.json({ ok: true });
});

// Leaderboard
app.get("/leaderboard", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT tg_id, gold FROM users ORDER BY gold DESC LIMIT 100`
  );
  res.json(rows);
});

// Daily
app.post("/daily", async (req, res) => {
  const { tg_id } = req.body;

  const { rows } = await pool.query(
    "SELECT daily_claim FROM users WHERE tg_id=$1",
    [tg_id]
  );

  const last = rows[0].daily_claim;
  const today = new Date().toDateString();

  if (last && new Date(last).toDateString() === today)
    return res.json({ ok: false, reason: "claimed" });

  await pool.query(
    `UPDATE users 
     SET gold = gold + 50, daily_claim = NOW()
     WHERE tg_id=$1`,
    [tg_id]
  );

  res.json({ ok: true, reward: 50 });
});

app.listen(5000, () => console.log("Atherfell API running"));
