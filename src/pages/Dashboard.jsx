import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts'

const API = 'http://127.0.0.1:8000'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [statsRes, historyRes] = await Promise.all([
          axios.get(`${API}/stats`, { headers }),
          axios.get(`${API}/history`, { headers })
        ])
        setStats(statsRes.data)
        setHistory(historyRes.data.slice(0, 10))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px' }}>
      ⏳ Chargement...
    </div>
  )

  const pieData = stats ? [
    { name: 'Acceptés', value: stats.accepted },
    { name: 'Refusés', value: stats.refused }
  ] : []

  const COLORS = ['#4caf50', '#f44336']

  const cardStyle = (color) => ({
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: `5px solid ${color}`,
    flex: 1
  })

  return (
    <div>
      <h1 style={{ color: '#1a237e', marginBottom: '24px' }}>📊 Dashboard</h1>

      {/* Cartes statistiques */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={cardStyle('#1a237e')}>
          <div style={{ fontSize: '14px', color: '#666' }}>Total Demandes</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1a237e' }}>
            {stats?.total ?? 0}
          </div>
        </div>
        <div style={cardStyle('#4caf50')}>
          <div style={{ fontSize: '14px', color: '#666' }}>Acceptés</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4caf50' }}>
            {stats?.accepted ?? 0}
          </div>
        </div>
        <div style={cardStyle('#f44336')}>
          <div style={{ fontSize: '14px', color: '#666' }}>Refusés</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f44336' }}>
            {stats?.refused ?? 0}
          </div>
        </div>
        <div style={cardStyle('#ff9800')}>
          <div style={{ fontSize: '14px', color: '#666' }}>Taux d'Acceptation</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ff9800' }}>
            {stats?.acceptance_rate ?? 0}%
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flex: 1
        }}>
          <h3 style={{ color: '#1a237e', marginTop: 0 }}>Répartition des décisions</h3>
          {stats?.total > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              Aucune donnée disponible
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flex: 2
        }}>
          <h3 style={{ color: '#1a237e', marginTop: 0 }}>Dernières demandes</h3>
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="id" />
                <YAxis domain={[0, 1]} />
                <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                <Bar dataKey="probability_default" name="Risque défaut" fill="#f44336" />
                <Bar dataKey="probability_accepted" name="Prob. acceptation" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              Aucune demande enregistrée
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard