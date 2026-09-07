import { useEffect, useState } from 'react'
import { useSettings } from './hooks'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Injections } from './screens/Injections'
import { Weight } from './screens/Weight'
import { Symptoms } from './screens/Symptoms'
import { Nutrition } from './screens/Nutrition'
import { SettingsScreen } from './screens/Settings'
import { exportBackup } from './lib/backup'

type Tab = 'inicio' | 'caneta' | 'peso' | 'sintomas' | 'nutricao' | 'config'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z' },
  { id: 'caneta', label: 'Caneta', icon: 'M4 20l4-1 10-10-3-3L5 16l-1 4zM15 5l3 3 2-2a2 2 0 0 0-3-3z' },
  { id: 'peso', label: 'Peso', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4l3 5H9z' },
  { id: 'sintomas', label: 'Sintomas', icon: 'M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z' },
  { id: 'nutricao', label: 'Nutricao', icon: 'M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-1.5 0-3 2-3 6s1.5 5 3 5v7' },
  { id: 'config', label: 'Config', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 12h2m14 0h2M12 3v2m0 14v2' },
]

const MONTH = 30 * 86_400_000

export default function App() {
  const settings = useSettings()
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem('pesobic:tab') as Tab) || 'inicio'
    } catch {
      return 'inicio'
    }
  })
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('pesobic:tab', tab)
    } catch {
      /* ok */
    }
  }, [tab])

  if (settings === undefined) {
    return (
      <div className="splash">
        <img src="/logo.svg" alt="Pesobic" width={64} height={64} />
      </div>
    )
  }

  if (settings === null || !settings.onboardedAt) {
    return <Onboarding />
  }

  const lastExport = settings.lastExportAt ?? settings.onboardedAt
  const showNudge =
    !nudgeDismissed && Date.now() - lastExport > MONTH

  const go = (t: string) => setTab(t as Tab)

  return (
    <div className="app">
      <header className="app-bar">
        <img src="/logo.svg" alt="" width={24} height={24} />
        <span>Pesobic</span>
      </header>

      {showNudge && (
        <div className="nudge">
          <span>
            {settings.lastExportAt
              ? 'Faz mais de 30 dias desde o ultimo backup.'
              : 'Voce ainda nao fez backup dos seus dados.'}
          </span>
          <div>
            <button
              className="link"
              onClick={async () => {
                await exportBackup()
                setNudgeDismissed(true)
              }}
            >
              Exportar agora
            </button>
            <button className="link muted" onClick={() => setNudgeDismissed(true)}>
              Depois
            </button>
          </div>
        </div>
      )}

      <main className="app-main">
        {tab === 'inicio' && <Home settings={settings} onGo={go} />}
        {tab === 'caneta' && <Injections settings={settings} />}
        {tab === 'peso' && <Weight settings={settings} />}
        {tab === 'sintomas' && <Symptoms settings={settings} />}
        {tab === 'nutricao' && <Nutrition settings={settings} />}
        {tab === 'config' && <SettingsScreen settings={settings} />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'tab-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
