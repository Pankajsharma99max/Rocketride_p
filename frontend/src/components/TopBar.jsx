import { motion } from 'framer-motion'
import Logo from './Logo'
import { SettingsIcon, SunIcon, MoonIcon } from './Icons'

export default function TopBar({ theme, onToggleTheme, onOpenSettings, onBrandClick }) {
  return (
    <motion.header
      className="topbar"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="topbar-inner">
        <button type="button" className="brand brand-btn" onClick={onBrandClick} aria-label="Back to the Docket homepage">
          <Logo size={34} />
          <div className="brand-text">
            <span className="brand-name">Docket</span>
            <span className="brand-sub">RTI &amp; government, financial, and research documents — answered in plain language</span>
          </div>
        </button>
        <div className="topbar-actions">
          <motion.button
            type="button"
            className="icon-btn"
            aria-label="Open settings"
            title="Settings"
            onClick={onOpenSettings}
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: 20 }}
          >
            <SettingsIcon className="icon" />
          </motion.button>
          <motion.button
            type="button"
            className="icon-btn"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title="Switch appearance"
            onClick={onToggleTheme}
            whileTap={{ scale: 0.9 }}
          >
            {theme === 'dark' ? <MoonIcon className="icon" /> : <SunIcon className="icon" />}
          </motion.button>
        </div>
      </div>
    </motion.header>
  )
}
