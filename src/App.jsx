import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import NewRequest from './pages/NewRequest'
import History from './pages/History'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminUsers from './pages/AdminUsers'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'admin') return <Navigate to="/" />
  return children
}

function App() {
  const { user } = useAuth()

  return (
    <div style={{
      fontFamily: 'Segoe UI, sans-serif',
      backgroundColor: '#f0f2f5',
      minHeight: '100vh', width: '100%'
    }}>
      {user && <Navbar />}
      <div style={{
        padding: user ? '30px' : '0',
        maxWidth: user ? '1400px' : '100%',
        margin: '0 auto', width: '100%'
      }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><NewRequest /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        </Routes>
      </div>
    </div>
  )
}

export default App