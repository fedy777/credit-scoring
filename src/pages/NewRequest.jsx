import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://127.0.0.1:8000'

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

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
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError("Validation : " + detail.map(d => d.msg).join(', '))
      } else {
        setError("Erreur : " + (typeof detail === 'string' ? detail : JSON.stringify(detail) || err.message))
      }
    } finally {
      setLoading(false)
    }
  }

  const isRefused = result?.decision === 'REFUSÉ'

  return (
    <div>
      <h1 style={{ color: '#1a237e', marginBottom: '24px' }}>📋 Nouvelle Demande de Crédit</h1>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>

        {/* Formulaire */}
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flex: 1, minWidth: '300px'
        }}>
          <h3 style={{ color: '#1a237e', marginTop: 0 }}>Données du client</h3>
          {fields.map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block', marginBottom: '6px',
                fontWeight: '500', color: '#333', fontSize: '14px'
              }}>
                {field.label}
              </label>
              <input
                type="number"
                name={field.key}
                value={form[field.key]}
                onChange={handleChange}
                placeholder={field.placeholder}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #ddd', borderRadius: '8px',
                  fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              backgroundColor: loading ? '#ccc' : '#1a237e',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px'
            }}
          >
            {loading ? '⏳ Analyse en cours...' : '🔍 Analyser la demande'}
          </button>

          {error && (
            <div style={{
              marginTop: '16px', padding: '12px',
              backgroundColor: '#ffebee', borderRadius: '8px',
              color: '#c62828', fontSize: '14px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Résultat */}
        {result && (
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{
              backgroundColor: isRefused ? '#ffebee' : '#e8f5e9',
              border: `2px solid ${isRefused ? '#f44336' : '#4caf50'}`,
              borderRadius: '12px', padding: '24px',
              marginBottom: '20px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                {isRefused ? '❌' : '✅'}
              </div>
              <div style={{
                fontSize: '28px', fontWeight: 'bold',
                color: isRefused ? '#c62828' : '#2e7d32'
              }}>
                {result.decision}
              </div>
              <div style={{ marginTop: '12px', fontSize: '15px', color: '#555' }}>
                Probabilité de défaut : <strong>{(result.probability_default * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ fontSize: '15px', color: '#555' }}>
                Probabilité d'acceptation : <strong>{(result.probability_accepted * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#888' }}>
                ID Demande : #{result.id}
              </div>
            </div>

            {/* Explication LIME */}
            <div style={{
              backgroundColor: 'white', borderRadius: '12px',
              padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#1a237e', marginTop: 0 }}>🔎 Explication de la décision</h3>
              <p style={{ color: '#555', fontSize: '14px', marginBottom: '16px' }}>
                {result.explication.resume_fr}
              </p>
              {result.explication.raisons.map((raison, index) => (
                <div key={index} style={{
                  padding: '12px', marginBottom: '8px',
                  backgroundColor: raison.poids > 0 ? '#fff3e0' : '#e8f5e9',
                  borderLeft: `4px solid ${raison.poids > 0 ? '#f44336' : '#4caf50'}`,
                  borderRadius: '4px', fontSize: '14px'
                }}>
                  <strong>{raison.symbole} {raison.variable}</strong>
                  <span style={{ float: 'right', color: '#888' }}>
                    poids: {raison.poids > 0 ? '+' : ''}{raison.poids}
                  </span>
                  <div style={{ color: '#666', marginTop: '4px' }}>{raison.impact}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewRequest