import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const API = 'http://127.0.0.1:8000'

function AdminUsers() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [statsByUser, setStatsByUser] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return }
    fetchData()
  }, [token])

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [usersRes, pendingRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/pending`, { headers }),
        axios.get(`${API}/admin/stats-by-user`, { headers })
      ])
      setUsers(usersRes.data)
      setPending(pendingRes.data)
      setStatsByUser(statsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleApprove = async (userId, username) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/approuver`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      showMessage(`✅ ${username} approuvé avec succès`)
      fetchData()
    } catch (err) {
      showMessage(`❌ ${err.response?.data?.detail || 'Erreur'}`)
    }
  }

  const handleRefuse = async (userId, username) => {
    if (!window.confirm(`Refuser la demande de ${username} ?`)) return
    try {
      await axios.put(`${API}/admin/users/${userId}/refuser`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      showMessage(`❌ Demande de ${username} refusée`)
      fetchData()
    } catch (err) {
      showMessage(`❌ ${err.response?.data?.detail || 'Erreur'}`)
    }
  }

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Supprimer l'utilisateur ${username} ?`)) return
    try {
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      showMessage(`✅ Utilisateur ${username} supprimé`)
      fetchData()
    } catch (err) {
      showMessage(`❌ ${err.response?.data?.detail || 'Erreur'}`)
    }
  }

  const tabStyle = (tab) => ({
    padding: '10px 20px',
    backgroundColor: activeTab === tab ? '#1a237e' : '#f0f2f5',
    color: activeTab === tab ? 'white' : '#555',
    border: 'none', borderRadius: '8px 8px 0 0',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
    marginRight: '4px', position: 'relative'
  })

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>⏳ Chargement...</div>

  return (
    <div>
      <h1 style={{ color: '#1a237e', marginBottom: '24px' }}>👑 Gestion des Utilisateurs</h1>

      {message && (
        <div style={{
          padding: '12px', borderRadius: '8px', marginBottom: '20px',
          backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee',
          color: message.includes('✅') ? '#2e7d32' : '#c62828',
          fontWeight: 'bold', fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e0e0e0', marginBottom: '0' }}>
        <button style={tabStyle('pending')} onClick={() => setActiveTab('pending')}>
          ⏳ Demandes en attente
          {pending.length > 0 && (
            <span style={{
              marginLeft: '8px', backgroundColor: '#f44336', color: 'white',
              borderRadius: '50%', padding: '1px 7px', fontSize: '12px'
            }}>
              {pending.length}
            </span>
          )}
        </button>
        <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>
          👥 Tous les comptes
        </button>
        <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}>
          📊 Performance
        </button>
      </div>

      <div style={{
        backgroundColor: 'white', borderRadius: '0 12px 12px 12px',
        padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>

        {/* ── Demandes en attente ── */}
        {activeTab === 'pending' && (
          <div>
            <h3 style={{ color: '#1a237e', marginTop: 0 }}>
              ⏳ Demandes d'inscription en attente ({pending.length})
            </h3>

            {pending.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px',
                backgroundColor: '#f9f9f9', borderRadius: '12px', color: '#888'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                <div>Aucune demande en attente</div>
              </div>
            ) : (
              pending.map((u) => (
                <div key={u.id} style={{
                  padding: '20px', marginBottom: '12px',
                  border: '2px solid #ff9800', borderRadius: '12px',
                  backgroundColor: '#fffde7'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '24px' }}>👤</span>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a237e' }}>
                            {u.username}
                          </div>
                          <div style={{ color: '#666', fontSize: '13px' }}>{u.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '3px 10px', backgroundColor: '#e8f5e9',
                          borderRadius: '12px', fontSize: '12px', color: '#2e7d32'
                        }}>
                          💼 Conseiller
                        </span>
                        <span style={{
                          padding: '3px 10px', backgroundColor: '#fff3e0',
                          borderRadius: '12px', fontSize: '12px', color: '#e65100'
                        }}>
                          ⏳ En attente
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleApprove(u.id, u.username)}
                        style={{
                          padding: '10px 20px', backgroundColor: '#4caf50',
                          color: 'white', border: 'none', borderRadius: '8px',
                          cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                        }}
                      >
                        ✅ Approuver
                      </button>
                      <button
                        onClick={() => handleRefuse(u.id, u.username)}
                        style={{
                          padding: '10px 20px', backgroundColor: '#f44336',
                          color: 'white', border: 'none', borderRadius: '8px',
                          cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                        }}
                      >
                        ❌ Refuser
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tous les comptes ── */}
        {activeTab === 'users' && (
          <div>
            <h3 style={{ color: '#1a237e', marginTop: 0 }}>👥 Tous les comptes ({users.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                  {['ID', 'Username', 'Email', 'Rôle', 'Statut', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '10px 14px' }}>#{u.id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{u.username}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: u.role === 'admin' ? '#fff3e0' : '#e8f5e9',
                        color: u.role === 'admin' ? '#e65100' : '#2e7d32'
                      }}>
                        {u.role === 'admin' ? '👑 Admin' : '💼 Conseiller'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor:
                          u.statut === 'approuve' ? '#e8f5e9' :
                          u.statut === 'en_attente' ? '#fff3e0' : '#ffebee',
                        color:
                          u.statut === 'approuve' ? '#2e7d32' :
                          u.statut === 'en_attente' ? '#e65100' : '#c62828'
                      }}>
                        {u.statut === 'approuve' ? '✅ Approuvé' :
                         u.statut === 'en_attente' ? '⏳ En attente' : '❌ Refusé'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {u.statut === 'en_attente' && (
                          <button onClick={() => handleApprove(u.id, u.username)} style={{
                            padding: '4px 10px', backgroundColor: '#4caf50',
                            color: 'white', border: 'none', borderRadius: '6px',
                            cursor: 'pointer', fontSize: '12px'
                          }}>✅</button>
                        )}
                        {u.statut === 'approuve' && u.role !== 'admin' && (
                          <button onClick={() => handleRefuse(u.id, u.username)} style={{
                            padding: '4px 10px', backgroundColor: '#ff9800',
                            color: 'white', border: 'none', borderRadius: '6px',
                            cursor: 'pointer', fontSize: '12px'
                          }}>⏸ Suspendre</button>
                        )}
                        {u.role !== 'admin' && (
                          <button onClick={() => handleDelete(u.id, u.username)} style={{
                            padding: '4px 10px', backgroundColor: '#f44336',
                            color: 'white', border: 'none', borderRadius: '6px',
                            cursor: 'pointer', fontSize: '12px'
                          }}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Stats par conseiller ── */}
        {activeTab === 'stats' && (
          <div>
            <h3 style={{ color: '#1a237e', marginTop: 0 }}>📊 Performance par Conseiller</h3>
            {statsByUser.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                Aucun conseiller enregistré
              </div>
            ) : (
              statsByUser.map((stat, i) => (
                <div key={i} style={{
                  padding: '16px', marginBottom: '12px',
                  border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: '#1a237e' }}>💼 {stat.conseiller}</strong>
                    <span style={{ color: '#888', fontSize: '13px' }}>{stat.total} demandes</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: '#4caf50' }}>✅ {stat.accepted} acceptés</span>
                    <span style={{ color: '#f44336' }}>❌ {stat.refused} refusés</span>
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Taux : {stat.acceptance_rate}%</span>
                  </div>
                  <div style={{ backgroundColor: '#eee', borderRadius: '10px', height: '8px' }}>
                    <div style={{
                      width: `${stat.acceptance_rate}%`, backgroundColor: '#4caf50',
                      height: '8px', borderRadius: '10px'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsers
