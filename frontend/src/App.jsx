import { useState, useEffect } from 'react'
import axios from 'axios'
import GameScreen from './components/GameScreen'
import Leaderboard from './components/Leaderboard'
import Shop from './components/Shop'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('game')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const initTelegram = async () => {
      try {
        const telegram = window.Telegram?.WebApp
        if (!telegram) {
          setError('This app only works in Telegram')
          setLoading(false)
          return
        }

        telegram.ready()
        const tgUser = telegram.initDataUnsafe?.user
        
        if (!tgUser) {
          setError('Unable to get Telegram user data')
          setLoading(false)
          return
        }

        // Create or get user
        const response = await axios.post(`${API_URL}/api/users`, {
          telegramId: tgUser.id,
          username: tgUser.username || `user_${tgUser.id}`,
          firstName: tgUser.first_name || 'User',
          photoUrl: tgUser.photo_url || null
        })

        setUser(response.data.user)
        setError(null)
      } catch (err) {
        console.error('Initialization error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initTelegram()
  }, [])

  // Update user data periodically
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/users/${user.telegram_id}`)
        setUser(response.data)
      } catch (err) {
        console.error('Update error:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [user?.telegram_id])

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading AETHARFELL...</div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="container">
        <div className="card">
          <h1>⚠️ AETHARFELL</h1>
          <div className="error">{error || 'Please open this in Telegram'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <h1>🌟 AETHARFELL</h1>
        <div className="stat">
          <span className="stat-label">Balance</span>
          <span className="stat-value">{user.balance.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Level</span>
          <span className="stat-value">{user.level}</span>
        </div>
      </div>

      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          🎮 Play
        </button>
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Rank
        </button>
        <button
          className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          🛍️ Shop
        </button>
      </div>

      {activeTab === 'game' && <GameScreen user={user} setUser={setUser} apiUrl={API_URL} />}
      {activeTab === 'leaderboard' && <Leaderboard user={user} apiUrl={API_URL} />}
      {activeTab === 'shop' && <Shop user={user} setUser={setUser} apiUrl={API_URL} />}
    </div>
  )
}

export default App
