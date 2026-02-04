import axios from 'axios'
import { useState } from 'react'

export default function Shop({ user, setUser, apiUrl }) {
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState(null)

  const upgrades = [
    {
      id: 'tapBoost',
      name: '⬆️ Tap Boost',
      description: 'Increase coins per tap by 1',
      cost: 100,
      owned: user.tap_per_click - 1 // First level is free
    },
    {
      id: 'energyBoost',
      name: '⚡ Energy Boost',
      description: 'Increase max energy by 20',
      cost: 500,
      owned: user.max_energy - 100
    },
    {
      id: 'autoClicker',
      name: '🤖 Auto Clicker',
      description: 'Generate coins automatically (faster regeneration)',
      cost: 5000,
      owned: user.energy_regen_rate - 1
    }
  ]

  const handleBuyUpgrade = async (upgradeType) => {
    if (buying) return

    setBuying(true)
    setError(null)

    try {
      const response = await axios.post(`${apiUrl}/api/upgrades/buy`, {
        telegramId: user.telegram_id,
        upgradeType
      })

      setUser(response.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase failed')
    } finally {
      setBuying(false)
    }
  }

  return (
    <>
      <div className="card">
        <h2>💰 Your Balance: {user.balance.toLocaleString()}</h2>
      </div>

      {error && <div className="error">{error}</div>}

      {upgrades.map((upgrade) => (
        <div key={upgrade.id} className="card">
          <div style={{ marginBottom: '15px' }}>
            <h3>{upgrade.name}</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0' }}>
              {upgrade.description}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
              Owned: <strong>{upgrade.owned}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
              {upgrade.cost.toLocaleString()} 💵
            </span>
          </div>

          <button
            className="btn"
            onClick={() => handleBuyUpgrade(upgrade.id)}
            disabled={user.balance < upgrade.cost || buying}
          >
            {user.balance < upgrade.cost ? '❌ Not Enough' : '✅ Buy'}
          </button>
        </div>
      ))}

      <div className="card">
        <h3>🚀 Coming Soon</h3>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8' }}>
          • Referral bonuses<br/>
          • Daily rewards<br/>
          • Special events<br/>
          • Blockchain integration
        </p>
      </div>
    </>
  )
}
