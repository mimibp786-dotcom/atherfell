import axios from 'axios'

export default function Shop({ user, setUser, apiUrl }) {
  const upgrades = [
    {
      id: 'tapBoost',
      name: '⬆️ Tap Boost',
      description: 'Increase coins per tap by 1',
      cost: 100,
      owned: user.upgrades.tapBoost
    },
    {
      id: 'energyBoost',
      name: '⚡ Energy Boost',
      description: 'Increase max energy by 20',
      cost: 500,
      owned: user.upgrades.energyBoost
    },
    {
      id: 'autoClicker',
      name: '🤖 Auto Clicker',
      description: 'Generate 1 coin per second automatically',
      cost: 5000,
      owned: user.upgrades.autoClicker
    }
  ]

  const handleBuyUpgrade = async (upgradeType) => {
    try {
      const response = await axios.post(`${apiUrl}/api/upgrades/buy`, {
        telegramId: user.telegramId,
        upgradeType
      })
      setUser(response.data.user)
    } catch (error) {
      alert(error.response?.data?.error || 'Purchase failed')
    }
  }

  return (
    <>
      <div className="card">
        <h2>💰 Your Balance: {user.balance.toLocaleString()}</h2>
      </div>

      {upgrades.map((upgrade) => (
        <div key={upgrade.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
            <div>
              <h3>{upgrade.name}</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '5px 0' }}>
                {upgrade.description}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                Owned: <strong>{upgrade.owned}</strong>
              </p>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
              {upgrade.cost.toLocaleString()}
            </span>
          </div>
          <button
            className="btn"
            onClick={() => handleBuyUpgrade(upgrade.id)}
            disabled={user.balance < upgrade.cost}
            style={{
              opacity: user.balance < upgrade.cost ? 0.5 : 1,
              cursor: user.balance < upgrade.cost ? 'not-allowed' : 'pointer'
            }}
          >
            {user.balance < upgrade.cost ? '❌ Not Enough Coins' : '✅ Buy'}
          </button>
        </div>
      ))}

      <div className="card">
        <h3>📝 Coming Soon</h3>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
          • Referral bonuses<br/>
          • Daily rewards<br/>
          • Limited editions<br/>
          • NFT rewards
        </p>
      </div>
    </>
  )
}
