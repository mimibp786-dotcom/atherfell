import { useState, useEffect } from 'react'
import axios from 'axios'
import TelegramInitializer from './components/TelegramInitializer'
import GameScreen from './components/GameScreen'
import Leaderboard from './components/Leaderboard'
import Shop from './components/Shop'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function App() {
  const [user, setUser] = useState(null)
  const [telegramUser, setTelegramUser] = useState(null)
  const [activeTab, setActiveTab] = useState('game') // game, leaderboard, shop
  const [loading, setLoading] = useState(true)

  // Initialize Telegram
  useEffect(() => {
    const initTelegram = async () => {
      try {
        const telegram = window.Telegram?.WebApp
        if (telegram) {
          telegram.ready()
          const user = telegram.initDataUnsafe?.user
          if (user) {
            setTelegramUser(user)
            // Create or get user from backend
            const response = await axios.post(`${API_URL}/api/users`, {
              telegramId: user.id,
              username: user.username || 'User',
              firstName: user.first_name || 'User',
              photoUrl: user.photo_url
            })
            setUser(response.data.user)
          }
        }
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setLoading(false)
      }
    }

    initTelegram()
  }, [])

  // Fetch user data periodically
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/users/${user.telegramId}`)
        setUser(response.data)
      } catch (error) {
        console.error('Failed to fetch user:', error)
      }
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [user?.telegramId])

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading AETHARFELL...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container">
        <TelegramInitializer />
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
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

      {/* Tab Buttons */}
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

      {/* Content */}
      {activeTab === 'game' && <GameScreen user={user} setUser={setUser} apiUrl={API_URL} />}
      {activeTab === 'leaderboard' && <Leaderboard user={user} apiUrl={API_URL} />}
      {activeTab === 'shop' && <Shop user={user} setUser={setUser} apiUrl={API_URL} />}
    </div>
  )
}

export default App
