import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://127.0.0.1:8000'
const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600' }
const td = { padding: '12px 16px', borderBottom: '1px solid #eee' }

function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const { token } = useAuth()

  useEffect(() => {
    axios.get(`${API}/history`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setHistory(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px' }}>
      ⏳ Chargement...
    </div>
  )

  return (
    <div>
      <h1 style={{ color: '#1a237e', marginBottom: '24px' }}>📁 Historique des Demandes</h1>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flex: 2, overflowX: 'auto'
        }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              Aucune demande enregistrée.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                  <th style={th}>ID</th>
                  <th style={th}>Âge</th>
                  <th style={th}>Revenu</th>
                  <th style={th}>Décision</th>
                  <th style={th}>Risque</th>
                  <th style={th}>Date</th>
                  <th style={th}>Détail</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={td}>#{item.id}</td>
                    <td style={td}>{item.age} ans</td>
                    <td style={td}>${item.monthly_income?.toLocaleString()}</td>
                    <td style={td}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px',
                        backgroundColor: item.decision === 'REFUSÉ' ? '#ffebee' : '#e8f5e9',
                        color: item.decision === 'REFUSÉ' ? '#c62828' : '#2e7d32',
                        fontWeight: 'bold', fontSize: '12px'
                      }}>
                        {item.decision === 'REFUSÉ' ? '❌ REFUSÉ' : '✅ ACCEPTÉ'}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '10px', height: '8px' }}>
                        <div style={{
                          width: `${(item.probability_default * 100).toFixed(0)}%`,
                          backgroundColor: item.probability_default > 0.5 ? '#f44336' : '#4caf50',
                          height: '8px', borderRadius: '10px'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {(item.probability_default * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={td}>
                      {new Date(item.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={td}>
                      <button onClick={() => setSelected(item)} style={{
                        padding: '4px 10px', backgroundColor: '#1a237e',
                        color: 'white', border: 'none', borderRadius: '6px',
                        cursor: 'pointer', fontSize: '12px'
                      }}>
                        👁 Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div style={{
            backgroundColor: 'white', borderRadius: '12px',
            padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            flex: 1, minWidth: '280px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#1a237e', margin: 0 }}>Détail #{selected.id}</h3>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <div style={{ marginTop: '16px' }}>
              {[
                ['Âge', `${selected.age} ans`],
                ['Revenu mensuel', `$${selected.monthly_income?.toLocaleString()}`],
                ['Ratio endettement', selected.debt_ratio],
                ['Crédits ouverts', selected.open_credit_lines],
                ['Retards > 90j', selected.late_90],
                ['Personnes à charge', selected.dependents],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '14px'
                }}>
                  <span style={{ color: '#666' }}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: '16px', padding: '12px',
              backgroundColor: selected.decision === 'REFUSÉ' ? '#ffebee' : '#e8f5e9',
              borderRadius: '8px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px' }}>{selected.decision === 'REFUSÉ' ? '❌' : '✅'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: selected.decision === 'REFUSÉ' ? '#c62828' : '#2e7d32' }}>
                {selected.decision}
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                Risque : {(selected.probability_default * 100).toFixed(1)}%
              </div>
            </div>
            {selected.explanation_summary && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '13px', color: '#555' }}>
                <strong>Analyse :</strong><br />{selected.explanation_summary}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default History