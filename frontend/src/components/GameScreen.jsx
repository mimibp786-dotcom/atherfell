import axios from 'axios'
import { useState } from 'react'

export default function GameScreen({ user, setUser, apiUrl }) {
  const [tapping, setTapping] = useState(false)
  const [error, setError] = useState(null)

  const handleTap = async () => {
    if (tapping || user.energy < 1) return

    setTapping(true)
    setError(null)

    try {
      const response = await axios.post(`${apiUrl}/api/tap`, {
        telegramId: user.telegram_id,
        taps: 1
      })

      setUser(prev => ({
        ...prev,
        balance: response.data.balance,
        energy: response.data.energy,
        total_taps: response.data.totalTaps
      }))
    } catch (err) {
      setError(err.response?.data?.error || 'Tap failed')
    } finally {
      setTapping(false)
    }
  }

  const energyPercent = (user.energy / user.max_energy) * 100

  return (
    <>
      <div className="card">
        <h2>⚡ Energy</h2>
        <div className="energy-bar">
          <div
            className="energy-fill"
            style={{ width: `${energyPercent}%` }}
          ></div>
        </div>
        <div className="stat">
          <span className="stat-label">Energy</span>
          <span className="stat-value">{user.energy} / {user.max_energy}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Per Click</span>
          <span className="stat-value">+{user.tap_per_click}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total Taps</span>
          <span className="stat-value">{user.total_taps}</span>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <button
        className="tap-button"
        onClick={handleTap}
        disabled={user.energy < 1 || tapping}
      >
        {tapping ? '⏳' : 'TAP! 👆'}
      </button>

      <div className="card">
        <h3>💡 Game Tips</h3>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8' }}>
          • Tap to earn coins<br/>
          • Energy regenerates over time<br/>
          • Buy upgrades to increase earnings<br/>
          • Climb the leaderboard to earn prestige<br/>
          • Daily bonuses coming soon!
        </p>
      </div>
    </>
  )
}
