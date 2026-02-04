import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function App() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCoins: 0,
    topUser: null
  })
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [newBalance, setNewBalance] = useState('')

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/admin/users`)
        setUsers(response.data)

        // Calculate stats
        const totalUsers = response.data.length
        const totalCoins = response.data.reduce((sum, user) => sum + user.balance, 0)
        const topUser = response.data.sort((a, b) => b.balance - a.balance)[0]

        setStats({ totalUsers, totalCoins, topUser })
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
    const interval = setInterval(fetchUsers, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const handleEditBalance = async (telegramId) => {
    if (!newBalance || isNaN(newBalance)) {
      alert('Please enter a valid number')
      return
    }

    try {
      await axios.post(`${API_URL}/api/admin/users/${telegramId}/balance`, {
        amount: parseInt(newBalance)
      })

      // Refresh users
      const response = await axios.get(`${API_URL}/api/admin/users`)
      setUsers(response.data)
      setEditingUser(null)
      setNewBalance('')
      alert('Balance updated!')
    } catch (error) {
      alert('Failed to update balance')
    }
  }

  const handleDeleteUser = async (telegramId) => {
    if (!confirm('Are you sure? This cannot be undone.')) return

    try {
      await axios.delete(`${API_URL}/api/admin/users/${telegramId}`)

      // Refresh users
      const response = await axios.get(`${API_URL}/api/admin/users`)
      setUsers(response.data)
      alert('User deleted!')
    } catch (error) {
      alert('Failed to delete user')
    }
  }

  const handleResetAll = async () => {
    if (!confirm('⚠️ This will DELETE ALL DATA! Are you absolutely sure?')) return

    try {
      await axios.post(`${API_URL}/api/admin/reset`)
      setUsers([])
      setStats({ totalUsers: 0, totalCoins: 0, topUser: null })
      alert('All data has been reset!')
    } catch (error) {
      alert('Failed to reset data')
    }
  }

  if (loading) {
    return <div className="loading">Loading admin panel...</div>
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="header">
        <h1>🎮 AETHARFELL Admin Panel</h1>
        <p style={{ color: '#6b7280', marginTop: '5px' }}>Manage your mini app and players</p>

        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">Total Players</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Coins</div>
            <div className="stat-value">{stats.totalCoins.toLocaleString()}</div>
          </div>
          {stats.topUser && (
            <div className="stat-card">
              <div className="stat-label">Top Player</div>
              <div className="stat-value">{stats.topUser.firstName}</div>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="control-panel">
        <h2>⚙️ Controls</h2>
        <button className="btn btn-danger" onClick={handleResetAll}>
          🔴 Reset All Data
        </button>
      </div>

      {/* Users Table */}
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Balance</th>
              <th>Level</th>
              <th>Taps</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.telegramId}>
                <td>{user.firstName}</td>
                <td>@{user.username}</td>
                <td>{user.balance.toLocaleString()}</td>
                <td>{user.level}</td>
                <td>{user.totalTaps}</td>
                <td>
                  <button
                    className="btn"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => {
                      setEditingUser(user.telegramId)
                      setNewBalance(user.balance)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '12px', marginLeft: '5px' }}
                    onClick={() => handleDeleteUser(user.telegramId)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="loading">No users yet</div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal active" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit User Balance</h2>
            <div className="form-group">
              <label>New Balance</label>
              <input
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="Enter new balance"
              />
            </div>
            <div>
              <button
                className="btn"
                onClick={() => handleEditBalance(editingUser)}
              >
                Save Changes
              </button>
              <button
                className="btn"
                style={{ background: '#6b7280' }}
                onClick={() => {
                  setEditingUser(null)
                  setNewBalance('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
