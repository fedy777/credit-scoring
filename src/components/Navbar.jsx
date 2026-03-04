import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const linkStyle = (path) => ({
    color: location.pathname === path ? '#90caf9' : 'white',
    textDecoration: 'none',
    marginLeft: '24px',
    fontSize: '15px',
    fontWeight: location.pathname === path ? 'bold' : 'normal',
    borderBottom: location.pathname === path ? '2px solid #90caf9' : 'none',
    paddingBottom: '4px'
  })

  return (
    <nav style={{
      backgroundColor: '#1a237e', padding: '0 30px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', height: '64px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    }}>
      <Link to="/" style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', textDecoration: 'none' }}>
        🏦 Credit Scoring AI
      </Link>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={linkStyle('/')}>Dashboard</Link>

        {/* Conseiller voit Nouvelle Demande */}
        {user?.role === 'conseiller' && (
          <Link to="/new" style={linkStyle('/new')}>Nouvelle Demande</Link>
        )}

        <Link to="/history" style={linkStyle('/history')}>Historique</Link>

        {/* Admin voit en plus : Gestion Utilisateurs */}
        {user?.role === 'admin' && (
          <Link to="/admin/users" style={linkStyle('/admin/users')}>
            👑 Gestion Users
          </Link>
        )}

        <div style={{
          marginLeft: '32px', paddingLeft: '24px',
          borderLeft: '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
              👤 {user?.username}
            </span>
            <span style={{
              marginLeft: '8px', padding: '2px 8px',
              backgroundColor: user?.role === 'admin' ? '#ff9800' : '#4caf50',
              color: 'white', borderRadius: '10px', fontSize: '11px'
            }}>
              {user?.role === 'admin' ? '👑 Admin' : '💼 Conseiller'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px', backgroundColor: '#c62828',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '13px'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar