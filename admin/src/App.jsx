import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCoins: 0,
    topUser: null
  })
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [newBalance, setNewBalance] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setPassword('')
      setError(null)
      fetchUsers()
    } else {
      setError('Invalid password')
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/admin/users`)
      setUsers(response.data)

      const totalUsers = response.data.length
      const totalCoins = response.data.reduce((sum, user) => sum + user.balance, 0)
      const topUser = response.data.sort((a, b) => b.balance - a.balance)[0]

      setStats({ totalUsers, totalCoins, topUser })
      setError(null)
    } catch (err) {
      setError('Failed to fetch users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchUsers()
      const interval = setInterval(fetchUsers, 5000)
      return () => clearInterval(interval)
    }
  }, [authenticated])

  const handleEditBalance = async (telegramId) => {
    if (!newBalance || isNaN(newBalance)) {
      setError('Please enter a valid number')
      return
    }

    try {
      await axios.post(`${API_URL}/api/admin/users/${telegramId}/balance`, {
        amount: parseInt(newBalance)
      })

      setSuccess('Balance updated successfully!')
      setEditingUser(null)
      setNewBalance('')
      await fetchUsers()
    } catch (err) {
      setError('Failed to update balance: ' + err.message)
    }
  }

  const handleDeleteUser = async (telegramId) => {
    if (!confirm('Are you sure? This cannot be undone.')) return

    try {
      await axios.delete(`${API_URL}/api/admin/users/${telegramId}`)
      setSuccess('User deleted successfully!')
      await fetchUsers()
    } catch (err) {
      setError('Failed to delete user: ' + err.message)
    }
  }

  const handleResetAll = async () => {
    if (!confirm('⚠️ This will DELETE ALL DATA! Are you absolutely sure?')) return

    try {
      await axios.post(`${API_URL}/api
