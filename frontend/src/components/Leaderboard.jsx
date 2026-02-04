import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Leaderboard({ user, apiUrl }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/leaderboard?limit=100`)
        setLeaderboard(response.data)

        const rankResponse = await axios.get(
          `${apiUrl}/api/leaderboard/rank/${user.telegram_id}`
        )
        setUserRank(rankResponse.data.rank)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 5000)

    return () => clearInterval(interval)
  }, [user.telegram_id, apiUrl])

  if (loading) {
    return <div className="loading">Loading leaderboard...</div>
  }

  return (
    <>
      <div className="card">
        <h2>🏆 Your Rank: #{userRank}</h2>
        <div className="stat">
          <span className="stat-label">Your Balance</span>
          <span className="stat-value">{user.balance.toLocaleString()}</span>
        </div>
      </div>

      <div className="card">
        <h3>📊 Top Players</h3>
        {leaderboard.map((player, index) => (
          <div
            key={player.id}
            className="leaderboard-item"
            style={{
              background: player.telegram_id === user.telegram_id ? '#f0f9ff' : 'transparent',
              borderRadius: '8px',
              padding: '10px',
              margin: '5px 0'
            }}
          >
            <span className="rank">#{index + 1}</span>
            <div className="user-info">
              <div className="username">{player.first_name}</div>
              <small style={{ color: '#9ca3af' }}>@{player.username}</small>
            </div>
            <span className="balance">{player.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  )
}
