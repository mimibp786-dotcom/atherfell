import axios from 'axios'

export default function GameScreen({ user, setUser, apiUrl }) {
  const handleTap = async () => {
    if (user.energy < 1) return

    try {
      const response = await axios.post(`${apiUrl}/api/tap`, {
        telegramId: user.telegramId,
        taps: 1
      })
      setUser(prev => ({
        ...prev,
        balance: response.data.balance,
        energy: response.data.energy,
        totalTaps: response.data.totalTaps
      }))
    } catch (error) {
      console.error('Tap failed:', error)
    }
  }

  const energyPercent = (user.energy / user.maxEnergy) * 100

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
          <span className="stat-value">{user.energy} / {user.maxEnergy}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Per Click</span>
          <span className="stat-value">+{user.tapPerClick}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total Taps</span>
          <span className="stat-value">{user.totalTaps}</span>
        </div>
      </div>

      <button
        className="tap-button"
        onClick={handleTap}
        disabled={user.energy < 1}
      >
        TAP! 👆
      </button>

      <div className="card">
        <h3>💡 Tips</h3>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
          • Energy regenerates automatically<br/>
          • Upgrade your tap power in the shop<br/>
          • Climb the leaderboard to earn prestige<br/>
          • Daily bonuses coming soon!
        </p>
      </div>
    </>
  )
}
