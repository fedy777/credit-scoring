import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const API = 'http://127.0.0.1:8000'

function AdminUsers() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [statsByUser, setStatsByUser] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/')
      return
    }
    fetchData()
  }, [token])

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/stats-by-user`, { headers })
      ])
      setUsers(usersRes.data)
      setStatsByUser(statsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Supprimer l'utilisateur ${username} ?`)) return
    try {
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage(`✅ Utilisateur ${username} supprimé`)
      fetchData()
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.detail || 'Erreur'}`)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>⏳ Chargement...</div>

  return (
    <div>
      <h1 style={{ color: '#1a237e', marginBottom: '24px' }}>👑 Gestion des Utilisateurs</h1>

      {message && (
        <div style={{
          padding: '12px', borderRadius: '8px', marginBottom: '20px',
          backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee',
          color: message.includes('✅') ? '#2e7d32' : '#c62828'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

        {/* Liste des utilisateurs */}
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flex: 1
        }}>
          <h3 style={{ color: '#1a237e', marginTop: 0 }}>👥 Comptes utilisateurs</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Username</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Rôle</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <tr key={u.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={{ padding: '10px' }}>#{u.id}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{u.username}</td>
                  <td style={{ padding: '10px', color: '#666' }}>{u.email}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px',
                      backgroundColor: u.role === 'admin' ? '#fff3e0' : '#e8f5e9',
                      color: u.role === 'admin' ? '#e65100' : '#2e7d32',
                      fontSize: '12px', fontWeight: 'bold'
                    }}>
                      {u.role === 'admin' ? '👑 Admin' : '💼 Conseiller'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        style={{
                          padding: '4px 12px', backgroundColor: '#f44336',
                          color: 'white', border: 'none', borderRadius: '6px',
                          cursor: 'pointer', fontSize: '12px'
                        }}
                      >
                        🗑 Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats par conseiller */}
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flex: 1
        }}>
          <h3 style={{ color: '#1a237e', marginTop: 0 }}>📊 Performance par Conseiller</h3>
          {statsByUser.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              Aucun conseiller enregistré
            </div>
          ) : (
            statsByUser.map((stat, index) => (
              <div key={index} style={{
                padding: '16px', marginBottom: '12px',
                border: '1px solid #eee', borderRadius: '10px',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: '#1a237e' }}>💼 {stat.conseiller}</strong>
                  <span style={{ color: '#888', fontSize: '13px' }}>{stat.total} demandes</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                  <span style={{ color: '#4caf50' }}>✅ {stat.accepted} acceptés</span>
                  <span style={{ color: '#f44336' }}>❌ {stat.refused} refusés</span>
                  <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                    Taux : {stat.acceptance_rate}%
                  </span>
                </div>
                <div style={{ marginTop: '8px', backgroundColor: '#eee', borderRadius: '10px', height: '6px' }}>
                  <div style={{
                    width: `${stat.acceptance_rate}%`,
                    backgroundColor: '#4caf50',
                    height: '6px', borderRadius: '10px'
                  }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminUsers