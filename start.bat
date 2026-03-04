@echo off
echo Demarrage du Credit Scoring System...

start cmd /k "cd /d C:\Users\PC\Desktop\credit_scoring\credit_scoring && venv\Scripts\activate && uvicorn backend.main:app --reload"

timeout /t 5

start cmd /k "cd /d C:\Users\PC\Desktop\credit_scoring\credit_scoring\frontend && npm run dev"

timeout /t 5

start http://localhost:5173
```

**`Ctrl+S`** pour sauvegarder.

---

### Étape 4 — Tester

Dans l'**Explorateur Windows**, va dans :
```
C:\Users\PC\Desktop\credit_scoring\credit_scoring\