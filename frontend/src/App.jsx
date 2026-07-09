import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import SettingsModal from './components/SettingsModal'
import ToastStack from './components/ToastStack'
import LandingPage from './components/LandingPage'
import { fetchCategories, fetchDocuments } from './api'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('docket-theme')
    return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('docket-theme', theme)
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useState(() => (localStorage.getItem('docket-entered-app') ? 'app' : 'landing'))
  const [categories, setCategories] = useState([])
  const [quickActions, setQuickActions] = useState([])
  const [documents, setDocuments] = useState([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const showToast = useCallback((message, type = 'success', duration = 3200) => {
    toastIdRef.current += 1
    const id = toastIdRef.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration)
  }, [])

  const refreshDocuments = useCallback(async () => {
    const { ok, data } = await fetchDocuments()
    if (ok) setDocuments(data.documents || [])
  }, [])

  useEffect(() => {
    ;(async () => {
      const { ok, data } = await fetchCategories()
      if (ok) {
        setCategories(data.categories || [])
        setQuickActions(data.quick_actions || [])
      }
    })()
    refreshDocuments()
  }, [refreshDocuments])

  function enterApp() {
    localStorage.setItem('docket-entered-app', '1')
    setView('app')
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div key="landing" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LandingPage onEnterApp={enterApp} showToast={showToast} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            className="app-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <TopBar
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenSettings={() => setSettingsOpen(true)}
              onBrandClick={() => setView('landing')}
            />

            <motion.div
              className="workspace"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Sidebar categories={categories} documents={documents} onUploaded={refreshDocuments} showToast={showToast} />
              <Chat categories={categories} quickActions={quickActions} />
            </motion.div>

            <ToastStack toasts={toasts} />
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} showToast={showToast} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
