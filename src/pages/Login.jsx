import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://127.0.0.1:8000'

function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('username', form.username)
      formData.append('password', form.password)

      const res = await axios.post(`${API}/auth/login`, formData)
      login(
        { username: res.data.username, role: res.data.role },
        res.data.access_token
      )
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🏦</div>
          <h1 style={{ color: '#1a237e', margin: '8px 0 4px' }}>Credit Scoring AI</h1>
          <p style={{ color: '#888', fontSize: '14px' }}>Connectez-vous à votre compte</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
            Nom d'utilisateur
          </label>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="Entrez votre username"
            style={{
              width: '100%', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Entrez votre mot de passe"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: '12px', backgroundColor: '#ffebee',
            borderRadius: '8px', color: '#c62828',
            fontSize: '14px', marginBottom: '16px'
          }}>
            ❌ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: loading ? '#ccc' : '#1a237e',
            color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '16px',
            fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Connexion...' : '🔐 Se connecter'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Pas de compte ?{' '}
          <Link to="/register" style={{ color: '#1a237e', fontWeight: 'bold' }}>
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login