import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://127.0.0.1:8000'
const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600' }
const td = { padding: '12px 16px', borderBottom: '1px solid #eee' }

function ExplicationBar({ label, valeur, maxVal, couleur, valeurReelle }) {
  const pct = Math.min((Math.abs(valeur) / maxVal) * 100, 100)
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
        <span style={{ fontWeight: '500', color: '#333' }}>{label}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {valeurReelle !== undefined && (
            <span style={{ color: '#bbb', fontSize: '10px' }}>val: {valeurReelle}</span>
          )}
          <span style={{ fontWeight: 'bold', color: couleur }}>
            {valeur > 0 ? '+' : ''}{valeur}
          </span>
        </div>
      </div>
      <div style={{ backgroundColor: '#eee', borderRadius: '6px', height: '8px' }}>
        <div style={{
          width: `${pct}%`, backgroundColor: couleur,
          height: '8px', borderRadius: '6px', transition: 'width 0.4s ease'
        }} />
      </div>
    </div>
  )
}

function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [loadingExpl, setLoadingExpl] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState(null)
  const [activeTab, setActiveTab] = useState('lime')
  const { token } = useAuth()

  const fetchHistory = () => {
    axios.get(`${API}/history`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setHistory(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchHistory() }, [token])

  const handleView = async (item) => {
    setSelected(item)
    setExplanation(null)
    setLoadingExpl(true)
    // Si refusé → ouvrir conseils automatiquement
    setActiveTab(item.decision === 'REFUSÉ' ? 'conseils' : 'lime')

    try {
      const payload = {
        "RevolvingUtilizationOfUnsecuredLines": item.revolving_utilization,
        "age": item.age,
        "NumberOfTime30-59DaysPastDueNotWorse": item.late_30_59 ?? 0,
        "DebtRatio": item.debt_ratio,
        "MonthlyIncome": item.monthly_income,
        "NumberOfOpenCreditLinesAndLoans": item.open_credit_lines,
        "NumberOfTimes90DaysLate": item.late_90,
        "NumberRealEstateLoansOrLines": item.real_estate_loans ?? 0,
        "NumberOfTime60-89DaysPastDueNotWorse": item.late_60_89 ?? 0,
        "NumberOfDependents": item.dependents
      }
      const res = await axios.post(`${API}/explain`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setExplanation(res.data.explication)
    } catch (err) {
      console.error('Explication error:', err)
      setExplanation(null)
    } finally {
      setLoadingExpl(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Supprimer la demande #${id} ?`)) return
    try {
      await axios.delete(`${API}/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDeleteMsg(`✅ Demande #${id} supprimée`)
      if (selected?.id === id) { setSelected(null); setExplanation(null) }
      fetchHistory()
      setTimeout(() => setDeleteMsg(null), 3000)
    } catch (err) {
      setDeleteMsg(`❌ ${err.response?.data?.detail || 'Erreur'}`)
      setTimeout(() => setDeleteMsg(null), 3000)
    }
  }

  const limeMax = explanation?.lime?.raisons
    ? Math.max(...explanation.lime.raisons.map(r => Math.abs(r.poids)), 0.01) : 0.01
  const shapMax = explanation?.shap?.raisons
    ? Math.max(...explanation.shap.raisons.map(r => Math.abs(r.shap_value)), 0.01) : 0.01
  const cf = explanation?.counterfactual

  const tabStyle = (tab) => ({
    padding: '7px 14px',
    backgroundColor: activeTab === tab ? '#1a237e' : '#f0f2f5',
    color: activeTab === tab ? 'white' : '#555',
    border: 'none', borderRadius: '6px 6px 0 0',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '11px',
    marginRight: '3px'
  })

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px' }}>⏳ Chargement...</div>
  )

  return (
    <div>
      <h1 style={{ color: '#1a237e', marginBottom: '24px' }}>📁 Historique des Demandes</h1>

      {deleteMsg && (
        <div style={{
          padding: '12px', borderRadius: '8px', marginBottom: '16px',
          backgroundColor: deleteMsg.includes('✅') ? '#e8f5e9' : '#ffebee',
          color: deleteMsg.includes('✅') ? '#2e7d32' : '#c62828', fontWeight: 'bold'
        }}>
          {deleteMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

        {/* Tableau */}
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flex: 2, overflowX: 'auto'
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
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={item.id} style={{
                    backgroundColor: selected?.id === item.id ? '#e8eaf6' :
                      index % 2 === 0 ? '#f9f9f9' : 'white'
                  }}>
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
                      <div style={{ backgroundColor: '#eee', borderRadius: '10px', height: '8px' }}>
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
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleView(item)} style={{
                          padding: '4px 10px', backgroundColor: '#1a237e',
                          color: 'white', border: 'none', borderRadius: '6px',
                          cursor: 'pointer', fontSize: '12px'
                        }}>
                          👁 Voir
                        </button>
                        <button onClick={() => handleDelete(item.id)} style={{
                          padding: '4px 10px', backgroundColor: '#f44336',
                          color: 'white', border: 'none', borderRadius: '6px',
                          cursor: 'pointer', fontSize: '12px'
                        }}>
                          🗑 Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panneau détail */}
        {selected && (
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            flex: 1, minWidth: '320px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ color: '#1a237e', margin: 0 }}>Détail #{selected.id}</h3>
              <button onClick={() => { setSelected(null); setExplanation(null) }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Infos client */}
            <div style={{ marginBottom: '12px' }}>
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
                  padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '12px'
                }}>
                  <span style={{ color: '#666' }}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            {/* Décision */}
            <div style={{
              padding: '10px', marginBottom: '14px',
              backgroundColor: selected.decision === 'REFUSÉ' ? '#ffebee' : '#e8f5e9',
              borderRadius: '8px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px' }}>{selected.decision === 'REFUSÉ' ? '❌' : '✅'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: selected.decision === 'REFUSÉ' ? '#c62828' : '#2e7d32' }}>
                {selected.decision}
              </div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>
                Risque : {(selected.probability_default * 100).toFixed(1)}%
              </div>
            </div>

            {/* LIME + SHAP + Conseils */}
            {loadingExpl ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '13px' }}>
                ⏳ Calcul LIME + SHAP + Conseils...
              </div>
            ) : explanation ? (
              <div>
                {/* Tabs */}
                <div style={{ borderBottom: '2px solid #e0e0e0', marginBottom: '0' }}>
                  <button style={tabStyle('lime')} onClick={() => setActiveTab('lime')}>🔎 LIME</button>
                  <button style={tabStyle('shap')} onClick={() => setActiveTab('shap')}>⚡ SHAP</button>
                  {selected.decision === 'REFUSÉ' && (
                    <button style={{
                      ...tabStyle('conseils'),
                      backgroundColor: activeTab === 'conseils' ? '#e65100' : '#fff3e0',
                      color: activeTab === 'conseils' ? 'white' : '#e65100',
                    }} onClick={() => setActiveTab('conseils')}>
                      💡 Conseils
                    </button>
                  )}
                </div>

                <div style={{ padding: '14px', border: '1px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>

                  {/* LIME */}
                  {activeTab === 'lime' && (
                    <div>
                      <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', marginTop: 0 }}>
                        {explanation.lime?.resume}
                      </p>
                      {explanation.lime?.raisons?.map((r, i) => (
                        <ExplicationBar key={i}
                          label={`${r.symbole} ${r.variable}`}
                          valeur={r.poids} maxVal={limeMax}
                          couleur={r.poids > 0 ? '#f44336' : '#4caf50'} />
                      ))}
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa' }}>
                        🔴 Augmente le risque &nbsp;|&nbsp; 🟢 Réduit le risque
                      </div>
                    </div>
                  )}

                  {/* SHAP */}
                  {activeTab === 'shap' && (
                    <div>
                      <div style={{ padding: '7px 10px', backgroundColor: '#fff3e0', borderRadius: '6px', fontSize: '11px', marginBottom: '10px' }}>
                        Valeur de base : <strong>{explanation.shap?.base_value}</strong>
                        &nbsp;|&nbsp; {explanation.shap?.resume}
                      </div>
                      {explanation.shap?.raisons?.map((r, i) => (
                        <ExplicationBar key={i}
                          label={`${r.symbole} ${r.variable}`}
                          valeur={r.shap_value} maxVal={shapMax}
                          couleur={r.shap_value > 0 ? '#f44336' : '#4caf50'}
                          valeurReelle={r.valeur_reelle} />
                      ))}
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa' }}>
                        🔴 Pousse vers REFUS &nbsp;|&nbsp; 🟢 Pousse vers ACCEPTATION
                      </div>
                    </div>
                  )}

                  {/* Conseils Counterfactual */}
                  {activeTab === 'conseils' && cf && (
                    <div>
                      {/* Message résultat */}
                      <div style={{
                        padding: '10px', borderRadius: '8px', marginBottom: '12px', textAlign: 'center',
                        backgroundColor: cf.decision_apres === 'ACCEPTÉ' ? '#e8f5e9' : '#fff3e0',
                        border: `2px solid ${cf.decision_apres === 'ACCEPTÉ' ? '#4caf50' : '#ff9800'}`
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: cf.decision_apres === 'ACCEPTÉ' ? '#2e7d32' : '#e65100' }}>
                          {cf.message}
                        </div>
                        {cf.probabilite_avant && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px', fontSize: '12px' }}>
                            <span style={{ backgroundColor: '#ffebee', padding: '2px 8px', borderRadius: '6px', color: '#c62828', fontWeight: 'bold' }}>
                              Avant : {cf.probabilite_avant}%
                            </span>
                            <span>→</span>
                            <span style={{ backgroundColor: '#e8f5e9', padding: '2px 8px', borderRadius: '6px', color: '#2e7d32', fontWeight: 'bold' }}>
                              Après : {cf.probabilite_apres}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Conseils détaillés */}
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a237e', marginBottom: '8px' }}>
                        📋 Modifications recommandées :
                      </div>
                      {cf.conseils?.map((conseil, i) => (
                        <div key={i} style={{
                          padding: '10px', marginBottom: '8px',
                          backgroundColor: '#fafafa', borderRadius: '8px',
                          borderLeft: '4px solid #ff9800'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px' }}>
                              {conseil.fleche} <strong>{conseil.variable}</strong>
                            </span>
                            <span style={{
                              padding: '2px 8px', backgroundColor: '#fff3e0',
                              borderRadius: '10px', fontSize: '11px', color: '#e65100', fontWeight: 'bold'
                            }}>
                              -{conseil.reduction_risque}%
                            </span>
                          </div>
                          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px' }}>
                            <span style={{ backgroundColor: '#ffebee', padding: '2px 6px', borderRadius: '4px', color: '#c62828' }}>
                              {conseil.valeur_actuelle}
                            </span>
                            <span>→</span>
                            <span style={{ backgroundColor: '#e8f5e9', padding: '2px 6px', borderRadius: '4px', color: '#2e7d32' }}>
                              {conseil.valeur_cible}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div style={{ marginTop: '10px', fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>
                        ℹ️ Basé sur LIME + SHAP. L'âge n'est pas modifiable.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: '#999', fontSize: '13px' }}>
                ⚠️ Explication non disponible
              </div>
            )}

            {/* Bouton supprimer */}
            <button onClick={() => handleDelete(selected.id)} style={{
              width: '100%', marginTop: '14px', padding: '10px',
              backgroundColor: '#f44336', color: 'white',
              border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
            }}>
              🗑 Supprimer cette demande
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default History
