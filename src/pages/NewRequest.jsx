import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://127.0.0.1:8000'

const fields = [
  { key: 'RevolvingUtilizationOfUnsecuredLines', label: "Taux d'utilisation du crédit", placeholder: "ex: 0.85" },
  { key: 'age', label: "Âge du client", placeholder: "ex: 35" },
  { key: 'NumberOfTime30-59DaysPastDueNotWorse', label: "Retards 30-59 jours", placeholder: "ex: 2" },
  { key: 'DebtRatio', label: "Ratio d'endettement", placeholder: "ex: 0.45" },
  { key: 'MonthlyIncome', label: "Revenu mensuel ($)", placeholder: "ex: 3500" },
  { key: 'NumberOfOpenCreditLinesAndLoans', label: "Nombre de crédits ouverts", placeholder: "ex: 5" },
  { key: 'NumberOfTimes90DaysLate', label: "Retards > 90 jours", placeholder: "ex: 1" },
  { key: 'NumberRealEstateLoansOrLines', label: "Crédits immobiliers", placeholder: "ex: 1" },
  { key: 'NumberOfTime60-89DaysPastDueNotWorse', label: "Retards 60-89 jours", placeholder: "ex: 0" },
  { key: 'NumberOfDependents', label: "Personnes à charge", placeholder: "ex: 2" }
]

function ExplicationBar({ label, valeur, maxVal, couleur, valeurReelle }) {
  const pct = Math.min((Math.abs(valeur) / maxVal) * 100, 100)
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
        <span style={{ fontWeight: '500', color: '#333' }}>{label}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {valeurReelle !== undefined && (
            <span style={{ color: '#999', fontSize: '11px' }}>val: {valeurReelle}</span>
          )}
          <span style={{ fontWeight: 'bold', color: couleur }}>
            {valeur > 0 ? '+' : ''}{valeur}
          </span>
        </div>
      </div>
      <div style={{ backgroundColor: '#eee', borderRadius: '6px', height: '10px' }}>
        <div style={{
          width: `${pct}%`, backgroundColor: couleur,
          height: '10px', borderRadius: '6px', transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  )
}

function NewRequest() {
  const { token } = useAuth()
  const [form, setForm] = useState({
    RevolvingUtilizationOfUnsecuredLines: '',
    age: '',
    'NumberOfTime30-59DaysPastDueNotWorse': '',
    DebtRatio: '',
    MonthlyIncome: '',
    NumberOfOpenCreditLinesAndLoans: '',
    NumberOfTimes90DaysLate: '',
    NumberRealEstateLoansOrLines: '',
    'NumberOfTime60-89DaysPastDueNotWorse': '',
    NumberOfDependents: ''
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('lime')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        "RevolvingUtilizationOfUnsecuredLines": parseFloat(form["RevolvingUtilizationOfUnsecuredLines"]),
        "age": parseInt(form["age"]),
        "NumberOfTime30-59DaysPastDueNotWorse": parseFloat(form["NumberOfTime30-59DaysPastDueNotWorse"]),
        "DebtRatio": parseFloat(form["DebtRatio"]),
        "MonthlyIncome": parseFloat(form["MonthlyIncome"]),
        "NumberOfOpenCreditLinesAndLoans": parseInt(form["NumberOfOpenCreditLinesAndLoans"]),
        "NumberOfTimes90DaysLate": parseInt(form["NumberOfTimes90DaysLate"]),
        "NumberRealEstateLoansOrLines": parseInt(form["NumberRealEstateLoansOrLines"]),
        "NumberOfTime60-89DaysPastDueNotWorse": parseFloat(form["NumberOfTime60-89DaysPastDueNotWorse"]),
        "NumberOfDependents": parseFloat(form["NumberOfDependents"])
      }
      const res = await axios.post(`${API}/explain`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(res.data)
      // Si refusé → ouvrir automatiquement l'onglet conseils
      if (res.data.decision === 'REFUSÉ') setActiveTab('conseils')
      else setActiveTab('lime')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) setError("Validation : " + detail.map(d => d.msg).join(', '))
      else setError("Erreur : " + (typeof detail === 'string' ? detail : JSON.stringify(detail) || err.message))
    } finally {
      setLoading(false)
    }
  }

  const isRefused = result?.decision === 'REFUSÉ'
  const cf = result?.explication?.counterfactual
  const limeMax = result?.explication?.lime?.raisons
    ? Math.max(...result.explication.lime.raisons.map(r => Math.abs(r.poids)), 0.01) : 0.01
  const shapMax = result?.explication?.shap?.raisons
    ? Math.max(...result.explication.shap.raisons.map(r => Math.abs(r.shap_value)), 0.01) : 0.01

  const tabStyle = (tab) => ({
    padding: '10px 20px',
    backgroundColor: activeTab === tab ? '#1a237e' : '#f0f2f5',
    color: activeTab === tab ? 'white' : '#555',
    border: 'none', borderRadius: '8px 8px 0 0',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
    marginRight: '3px'
  })

  return (
    <div>
      <h1 style={{ color: '#1a237e', marginBottom: '24px' }}>📋 Nouvelle Demande de Crédit</h1>
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>

        {/* Formulaire */}
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', padding: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flex: 1, minWidth: '300px'
        }}>
          <h3 style={{ color: '#1a237e', marginTop: 0 }}>Données du client</h3>
          {fields.map(field => (
            <div key={field.key} style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#333', fontSize: '13px' }}>
                {field.label}
              </label>
              <input
                type="number" name={field.key}
                value={form[field.key]} onChange={handleChange}
                placeholder={field.placeholder}
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid #ddd', borderRadius: '8px',
                  fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>
          ))}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '14px',
            backgroundColor: loading ? '#ccc' : '#1a237e',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px'
          }}>
            {loading ? '⏳ Analyse LIME + SHAP + Conseils...' : '🔍 Analyser la demande'}
          </button>

          {error && (
            <div style={{
              marginTop: '16px', padding: '12px', backgroundColor: '#ffebee',
              borderRadius: '8px', color: '#c62828', fontSize: '14px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Résultats */}
        {result && (
          <div style={{ flex: 2, minWidth: '400px' }}>

            {/* Décision */}
            <div style={{
              backgroundColor: isRefused ? '#ffebee' : '#e8f5e9',
              border: `2px solid ${isRefused ? '#f44336' : '#4caf50'}`,
              borderRadius: '12px', padding: '20px',
              marginBottom: '20px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '44px', marginBottom: '6px' }}>{isRefused ? '❌' : '✅'}</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: isRefused ? '#c62828' : '#2e7d32' }}>
                {result.decision}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Risque de défaut</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f44336' }}>
                    {(result.probability_default * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Prob. acceptation</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
                    {(result.probability_accepted * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888' }}>ID Demande</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a237e' }}>#{result.id}</div>
                </div>
              </div>
            </div>

            {/* Onglets */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 14px 0 14px', borderBottom: '2px solid #e0e0e0' }}>
                <button style={tabStyle('lime')} onClick={() => setActiveTab('lime')}>🔎 LIME</button>
                <button style={tabStyle('shap')} onClick={() => setActiveTab('shap')}>⚡ SHAP</button>
                <button style={tabStyle('compare')} onClick={() => setActiveTab('compare')}>📊 Comparaison</button>
                {isRefused && (
                  <button style={{
                    ...tabStyle('conseils'),
                    backgroundColor: activeTab === 'conseils' ? '#e65100' : '#fff3e0',
                    color: activeTab === 'conseils' ? 'white' : '#e65100',
                    border: '1px solid #e65100'
                  }} onClick={() => setActiveTab('conseils')}>
                    💡 Conseils
                  </button>
                )}
              </div>

              <div style={{ padding: '20px' }}>

                {/* LIME */}
                {activeTab === 'lime' && (
                  <div>
                    <div style={{ padding: '10px', backgroundColor: '#e8eaf6', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                      <strong>LIME</strong> explique la décision en analysant l'impact local de chaque variable.
                    </div>
                    <p style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>
                      {result.explication?.lime?.resume}
                    </p>
                    {result.explication?.lime?.raisons?.map((r, i) => (
                      <ExplicationBar key={i} label={`${r.symbole} ${r.variable}`}
                        valeur={r.poids} maxVal={limeMax}
                        couleur={r.poids > 0 ? '#f44336' : '#4caf50'} />
                    ))}
                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#aaa' }}>
                      🔴 Augmente le risque &nbsp;|&nbsp; 🟢 Réduit le risque
                    </div>
                  </div>
                )}

                {/* SHAP */}
                {activeTab === 'shap' && (
                  <div>
                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                      <strong>SHAP</strong> mesure la contribution exacte de chaque variable basée sur la théorie des jeux de Shapley.
                    </div>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>Valeur de base (risque moyen)</span>
                      <strong>{result.explication?.shap?.base_value}</strong>
                    </div>
                    {result.explication?.shap?.raisons?.map((r, i) => (
                      <ExplicationBar key={i} label={`${r.symbole} ${r.variable}`}
                        valeur={r.shap_value} maxVal={shapMax}
                        couleur={r.shap_value > 0 ? '#f44336' : '#4caf50'}
                        valeurReelle={r.valeur_reelle} />
                    ))}
                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#aaa' }}>
                      🔴 Pousse vers REFUS &nbsp;|&nbsp; 🟢 Pousse vers ACCEPTATION
                    </div>
                  </div>
                )}

                {/* Comparaison */}
                {activeTab === 'compare' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <h4 style={{ color: '#1a237e', marginTop: 0, textAlign: 'center' }}>🔎 LIME — Top 5</h4>
                        {result.explication?.lime?.raisons?.slice(0, 5).map((r, i) => (
                          <div key={i} style={{
                            padding: '8px 10px', marginBottom: '6px',
                            backgroundColor: r.poids > 0 ? '#ffebee' : '#e8f5e9',
                            borderRadius: '8px', fontSize: '12px',
                            borderLeft: `4px solid ${r.poids > 0 ? '#f44336' : '#4caf50'}`
                          }}>
                            <span>{r.symbole} {r.variable}</span>
                            <span style={{ float: 'right', fontWeight: 'bold', color: r.poids > 0 ? '#f44336' : '#4caf50' }}>
                              {r.poids > 0 ? '+' : ''}{r.poids}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 style={{ color: '#e65100', marginTop: 0, textAlign: 'center' }}>⚡ SHAP — Top 5</h4>
                        {result.explication?.shap?.raisons?.slice(0, 5).map((r, i) => (
                          <div key={i} style={{
                            padding: '8px 10px', marginBottom: '6px',
                            backgroundColor: r.shap_value > 0 ? '#ffebee' : '#e8f5e9',
                            borderRadius: '8px', fontSize: '12px',
                            borderLeft: `4px solid ${r.shap_value > 0 ? '#f44336' : '#4caf50'}`
                          }}>
                            <span>{r.symbole} {r.variable}</span>
                            <span style={{ float: 'right', fontWeight: 'bold', color: r.shap_value > 0 ? '#f44336' : '#4caf50' }}>
                              {r.shap_value > 0 ? '+' : ''}{r.shap_value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: '14px', padding: '10px', backgroundColor: '#e8eaf6', borderRadius: '8px', fontSize: '12px' }}>
                      <strong>💡 Différence :</strong> LIME = approximation locale &nbsp;|&nbsp; SHAP = contribution exacte (théorie des jeux)
                    </div>
                  </div>
                )}

                {/* Conseils Counterfactual */}
                {activeTab === 'conseils' && cf && (
                  <div>
                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                      <strong>💡 Explication Contrefactuelle</strong> — "Que modifier pour être ACCEPTÉ ?"
                    </div>

                    {/* Message résultat */}
                    <div style={{
                      padding: '14px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center',
                      backgroundColor: cf.decision_apres === 'ACCEPTÉ' ? '#e8f5e9' : '#fff3e0',
                      border: `2px solid ${cf.decision_apres === 'ACCEPTÉ' ? '#4caf50' : '#ff9800'}`
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: cf.decision_apres === 'ACCEPTÉ' ? '#2e7d32' : '#e65100' }}>
                        {cf.message}
                      </div>
                      {cf.probabilite_avant && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: '#888' }}>Risque avant : </span>
                            <strong style={{ color: '#f44336' }}>{cf.probabilite_avant}%</strong>
                          </div>
                          <div style={{ fontSize: '18px' }}>→</div>
                          <div>
                            <span style={{ color: '#888' }}>Risque après : </span>
                            <strong style={{ color: '#4caf50' }}>{cf.probabilite_apres}%</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Conseils détaillés */}
                    <h4 style={{ color: '#1a237e', marginBottom: '12px' }}>
                      📋 Modifications recommandées :
                    </h4>
                    {cf.conseils?.map((conseil, i) => (
                      <div key={i} style={{
                        padding: '14px', marginBottom: '10px',
                        backgroundColor: '#f9f9f9', borderRadius: '10px',
                        borderLeft: '4px solid #ff9800'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '18px', marginRight: '8px' }}>{conseil.fleche}</span>
                            <strong style={{ color: '#1a237e', fontSize: '14px' }}>{conseil.variable}</strong>
                          </div>
                          <span style={{
                            padding: '3px 10px', backgroundColor: '#fff3e0',
                            borderRadius: '12px', fontSize: '12px', color: '#e65100', fontWeight: 'bold'
                          }}>
                            -{conseil.reduction_risque}% risque
                          </span>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#555' }}>
                          {conseil.conseil}
                        </div>
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                            <span style={{ backgroundColor: '#ffebee', padding: '2px 8px', borderRadius: '6px', color: '#c62828' }}>
                              Actuel : {conseil.valeur_actuelle}
                            </span>
                            <span>→</span>
                            <span style={{ backgroundColor: '#e8f5e9', padding: '2px 8px', borderRadius: '6px', color: '#2e7d32' }}>
                              Cible : {conseil.valeur_cible}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e8eaf6', borderRadius: '8px', fontSize: '12px', color: '#555' }}>
                      ℹ️ Ces conseils sont basés sur les variables les plus impactantes identifiées par LIME et SHAP.
                      L'âge et les crédits immobiliers ne sont pas modifiables.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewRequest
