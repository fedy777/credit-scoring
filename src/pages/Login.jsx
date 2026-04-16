import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

const API = 'http://127.0.0.1:8000'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)
      const res = await axios.post(`${API}/auth/login`, formData)
      login(res.data)
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail || 'Erreur de connexion'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  const isPending = error?.includes('en attente')
  const isRefused = error?.includes('refusée')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f0f2f5'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px',
        padding: '40px', width: '100%', maxWidth: '420px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏦</div>
          <h2 style={{ color: '#1a237e', margin: 0, fontSize: '24px' }}>Credit Scoring AI</h2>
          <p style={{ color: '#888', margin: '6px 0 0 0', fontSize: '14px' }}>Connectez-vous à votre compte</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
            Nom d'utilisateur
          </label>
          <input type="text" value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Votre username"
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
            Mot de passe
          </label>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Votre mot de passe"
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{
            padding: '14px', borderRadius: '10px', marginBottom: '20px',
            backgroundColor: isPending ? '#fff3e0' : '#ffebee',
            border: `1px solid ${isPending ? '#ff9800' : '#f44336'}`, fontSize: '14px'
          }}>
            <div style={{ fontWeight: 'bold', color: isPending ? '#e65100' : '#c62828', marginBottom: '4px' }}>
              {isPending ? '⏳ Compte en attente' : isRefused ? '❌ Accès refusé' : '❌ Erreur'}
            </div>
            <div style={{ color: '#555' }}>{error}</div>
            {isPending && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                Contactez votre administrateur pour obtenir l'approbation.
              </div>
            )}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '14px',
          backgroundColor: loading ? '#ccc' : '#1a237e',
          color: 'white', border: 'none', borderRadius: '8px',
          fontSize: '16px', fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}>
          {loading ? '⏳ Connexion...' : '🔐 Se connecter'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#888' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: '#1a237e', fontWeight: 'bold' }}>S'inscrire</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
