import { useEffect, useState } from 'react'
import { useSettings } from './hooks'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Injections } from './screens/Injections'
import { Weight } from './screens/Weight'
import { Symptoms } from './screens/Symptoms'
import { Nutrition } from './screens/Nutrition'
import { SettingsScreen } from './screens/Settings'
import { supabase } from './lib/supabase'
import { useAuthProfile } from './lib/auth-context'
import { AdminScreen } from './screens/Admin'
import { migrateLegacyToAccount, peekLegacyData, skipMigration, wasMigrated, type LegacyPeek } from './lib/legacy-migrate'
import { Btn } from './components/ui'

type Tab = 'inicio' | 'caneta' | 'peso' | 'sintomas' | 'nutricao' | 'config' | 'admin'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z' },
  { id: 'caneta', label: 'Caneta', icon: 'M4 20l4-1 10-10-3-3L5 16l-1 4zM15 5l3 3 2-2a2 2 0 0 0-3-3z' },
  { id: 'peso', label: 'Peso', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4l3 5H9z' },
  { id: 'sintomas', label: 'Sintomas', icon: 'M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z' },
  { id: 'nutricao', label: 'Nutrição', icon: 'M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-1.5 0-3 2-3 6s1.5 5 3 5v7' },
  { id: 'config', label: 'Config', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 12h2m14 0h2M12 3v2m0 14v2' },
  { id: 'admin', label: 'Contas', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
]

export default function App() {
  const settings = useSettings()
  const authProfile = useAuthProfile()
  const hasNutritionAccess = authProfile.is_admin || authProfile.nutrition_enabled
  const tabs = TABS.filter((item) => {
    if (item.id === 'admin') return authProfile.is_admin
    if (item.id === 'nutricao') return hasNutritionAccess
    return true
  })
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem('pesobic:tab') as Tab) || 'inicio'
    } catch {
      return 'inicio'
    }
  })
  const activeTab = tabs.some((item) => item.id === tab) ? tab : 'inicio'
  const [legacy, setLegacy] = useState<LegacyPeek | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [migrateError, setMigrateError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('pesobic:tab', tab)
    } catch {
      /* ok */
    }
  }, [tab])

  useEffect(() => {
    if (wasMigrated(authProfile.id)) return
    void peekLegacyData().then((found) => {
      if (found) setLegacy(found)
    })
  }, [authProfile.id])

  if (settings === undefined) {
    return (
      <div className="splash">
        <img src="/logo.svg" alt="Pesobic" width={64} height={64} />
      </div>
    )
  }

  if (settings === null || !settings.onboardedAt) {
    return (
      <>
        {legacy && (
          <LegacyModal
            peek={legacy}
            busy={migrating}
            error={migrateError}
            onSkip={() => {
              skipMigration(authProfile.id)
              setLegacy(null)
            }}
            onConfirm={async () => {
              setMigrating(true)
              setMigrateError(null)
              try {
                await migrateLegacyToAccount(authProfile.id, legacy.source)
                setLegacy(null)
                window.location.reload()
              } catch (caught) {
                setMigrateError(caught instanceof Error ? caught.message : 'Falha ao migrar.')
                setMigrating(false)
              }
            }}
          />
        )}
        <Onboarding />
      </>
    )
  }

  const go = (t: string) => setTab(t as Tab)

  const displayName = authProfile.full_name?.split(' ')[0] ?? authProfile.email.split('@')[0]
  const avatarChar = (authProfile.full_name ?? authProfile.email).slice(0, 1).toUpperCase()

  return (
    <div className="app">
      {legacy && (
        <LegacyModal
          peek={legacy}
          busy={migrating}
          error={migrateError}
          onSkip={() => {
            skipMigration(authProfile.id)
            setLegacy(null)
          }}
          onConfirm={async () => {
            setMigrating(true)
            setMigrateError(null)
            try {
              await migrateLegacyToAccount(authProfile.id, legacy.source)
              setLegacy(null)
              window.location.reload()
            } catch (caught) {
              setMigrateError(caught instanceof Error ? caught.message : 'Falha ao migrar.')
              setMigrating(false)
            }
          }}
        />
      )}
      <header className="app-bar">
        <img src="/logo.svg" alt="" width={24} height={24} />
        <span>Pesobic</span>
        <div className="app-user">
          <span className="app-user-avatar" aria-hidden="true">{avatarChar}</span>
          <span className="app-user-name">{displayName}</span>
        </div>
        <button className="app-signout" type="button" onClick={() => supabase?.auth.signOut()}>
          Sair
        </button>
      </header>

      <main className="app-main">
        {activeTab === 'inicio' && <Home settings={settings} onGo={go} />}
        {activeTab === 'caneta' && <Injections settings={settings} />}
        {activeTab === 'peso' && <Weight settings={settings} />}
        {activeTab === 'sintomas' && <Symptoms settings={settings} />}
        {activeTab === 'nutricao' && hasNutritionAccess && <Nutrition settings={settings} />}
        {activeTab === 'config' && <SettingsScreen settings={settings} />}
        {activeTab === 'admin' && authProfile.is_admin && <AdminScreen />}
      </main>

      <nav className="tabbar" aria-label="Navegação principal">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? 'tab-on' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={activeTab === t.id ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function LegacyModal({
  peek,
  busy,
  error,
  onSkip,
  onConfirm,
}: {
  peek: LegacyPeek
  busy: boolean
  error: string | null
  onSkip: () => void
  onConfirm: () => void
}) {
  return (
    <div className="legacy-backdrop" role="dialog" aria-modal="true" aria-labelledby="legacy-title">
      <section className="legacy-card">
        <h2 id="legacy-title">Achei registros neste aparelho</h2>
        <p>Mandar para a sua conta? Fotos ficam neste aparelho. Isso so acontece uma vez neste aparelho.</p>
        <ul>
          <li>{peek.injections} aplicacoes</li>
          <li>{peek.weighIns} pesagens</li>
          <li>{peek.symptoms} sintomas</li>
          <li>{peek.nutrition} dias de nutricao</li>
        </ul>
        {error && <p className="error-box">{error}</p>}
        <div className="btn-row wrap">
          <Btn variant="ghost" disabled={busy} onClick={onSkip}>Agora nao</Btn>
          <Btn variant="primary" disabled={busy} onClick={onConfirm}>{busy ? 'Enviando…' : 'Mandar para a conta'}</Btn>
        </div>
      </section>
    </div>
  )
}
