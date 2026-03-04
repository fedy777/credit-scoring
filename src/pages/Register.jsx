import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'conseiller' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      await axios.post(`${API}/auth/register`, form)
      setSuccess("Compte créé avec succès !")
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur d'inscription")
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
          <div style={{ fontSize: '48px' }}>📝</div>
          <h1 style={{ color: '#1a237e', margin: '8px 0 4px' }}>Créer un compte</h1>
          <p style={{ color: '#888', fontSize: '14px' }}>Rejoignez Credit Scoring AI</p>
        </div>

        {[
          { key: 'username', label: "Nom d'utilisateur", type: 'text', placeholder: 'ex: john_doe' },
          { key: 'email', label: 'Email', type: 'email', placeholder: 'ex: john@banque.com' },
          { key: 'password', label: 'Mot de passe', type: 'password', placeholder: 'Min. 6 caractères' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
              {field.label}
            </label>
            <input
              type={field.type}
              value={form[field.key]}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              style={{
                width: '100%', padding: '12px',
                border: '1px solid #ddd', borderRadius: '8px',
                fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
            Rôle
          </label>
          <select
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            style={{
              width: '100%', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', boxSizing: 'border-box'
            }}
          >
            <option value="conseiller">👤 Conseiller</option>
            <option value="admin">👑 Administrateur</option>
          </select>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828', fontSize: '14px', marginBottom: '16px' }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', fontSize: '14px', marginBottom: '16px' }}>
            ✅ {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: loading ? '#ccc' : '#1a237e',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '16px', fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Création...' : '✅ Créer mon compte'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#1a237e', fontWeight: 'bold' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register