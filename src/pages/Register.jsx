import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'conseiller'  // toujours conseiller
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!form.username || !form.email || !form.password) {
      setError('Veuillez remplir tous les champs')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/auth/register`, form)
      const msg = res.data?.message || "Demande envoyée !"
      setSuccess(msg)
      setTimeout(() => navigate('/login'), 3000)
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

        {/* Info conseiller */}
        <div style={{
          padding: '10px 14px', backgroundColor: '#e8eaf6',
          borderRadius: '8px', marginBottom: '20px',
          fontSize: '13px', color: '#3949ab', textAlign: 'center'
        }}>
          💼 Votre compte sera créé en tant que <strong>Conseiller</strong><br />
          <span style={{ fontSize: '12px', color: '#666' }}>
            Un administrateur devra approuver votre demande
          </span>
        </div>

        {[
          { key: 'username', label: "Nom d'utilisateur", type: 'text',     placeholder: 'ex: john_doe' },
          { key: 'email',    label: 'Email',              type: 'email',    placeholder: 'ex: john@banque.com' },
          { key: 'password', label: 'Mot de passe',       type: 'password', placeholder: 'Min. 6 caractères' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              {field.label}
            </label>
            <input
              type={field.type}
              value={form[field.key]}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={field.placeholder}
              style={{
                width: '100%', padding: '12px',
                border: '1px solid #ddd', borderRadius: '8px',
                fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>
        ))}

        {error && (
          <div style={{
            padding: '12px', backgroundColor: '#ffebee',
            borderRadius: '8px', color: '#c62828',
            fontSize: '14px', marginBottom: '16px'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '14px', backgroundColor: '#fff3e0',
            borderRadius: '8px', color: '#e65100',
            fontSize: '14px', marginBottom: '16px',
            border: '1px solid #ff9800'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⏳ Demande envoyée !</div>
            <div>{success}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              Redirection vers la page de connexion...
            </div>
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
          {loading ? '⏳ Envoi en cours...' : '📨 Envoyer la demande'}
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
