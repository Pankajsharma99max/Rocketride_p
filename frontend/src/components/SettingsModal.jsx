import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CloseIcon } from './Icons'
import { fetchSettings, saveSettings, clearSettingsFields } from '../api'

const EMPTY_FIELDS = { rocketride_uri: '', rocketride_apikey: '', gemini_apikey: '', ocr_profile: 'devanagari', tts_voice: 'af_heart' }

export default function SettingsModal({ open, onClose, showToast }) {
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [hints, setHints] = useState({ rocketride_apikey: null, gemini_apikey: null })
  const [status, setStatus] = useState({ text: '', type: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function load() {
    const { data } = await fetchSettings()
    setFields((f) => ({
      ...f,
      rocketride_uri: data.rocketride_uri?.value || '',
      ocr_profile: data.ocr_profile?.value || 'devanagari',
      tts_voice: data.tts_voice?.value || 'af_heart',
      rocketride_apikey: '',
      gemini_apikey: '',
    }))
    setHints({
      rocketride_apikey: data.rocketride_apikey?.set ? data.rocketride_apikey.masked : null,
      gemini_apikey: data.gemini_apikey?.set ? data.gemini_apikey.masked : null,
    })
    setStatus({ text: '', type: '' })
  }

  function set(key, value) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    const payload = {}
    if (fields.rocketride_uri.trim()) payload.rocketride_uri = fields.rocketride_uri.trim()
    if (fields.rocketride_apikey.trim()) payload.rocketride_apikey = fields.rocketride_apikey.trim()
    if (fields.gemini_apikey.trim()) payload.gemini_apikey = fields.gemini_apikey.trim()
    payload.ocr_profile = fields.ocr_profile
    payload.ocr_script_family = fields.ocr_profile
    payload.tts_voice = fields.tts_voice

    setSaving(true)
    setStatus({ text: 'Saving and reconnecting…', type: '' })
    const { ok, data } = await saveSettings(payload)
    setSaving(false)

    if (ok) {
      await load()
      if (data.reconnect_error) {
        setStatus({ text: data.reconnect_error, type: 'error' })
        showToast('Saved, but could not reconnect', 'error')
      } else {
        setStatus({ text: 'Saved.', type: 'success' })
        showToast('Settings saved', 'success')
      }
    } else {
      setStatus({ text: data.error || 'Could not save settings.', type: 'error' })
    }
  }

  async function handleClear(field) {
    setStatus({ text: 'Removing…', type: '' })
    const { ok, data } = await clearSettingsFields([field])
    if (ok) {
      await load()
      if (data.reconnect_error) {
        setStatus({ text: data.reconnect_error, type: 'error' })
        showToast('Removed, but could not reconnect', 'error')
      } else {
        setStatus({ text: 'Removed.', type: 'success' })
        showToast('Key removed', 'success')
      }
    } else {
      setStatus({ text: data.error || 'Could not remove key.', type: 'error' })
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <div className="modal-header">
              <h2 id="settings-title">Settings</h2>
              <button type="button" className="icon-btn small ghost" aria-label="Close settings" onClick={onClose}>
                <CloseIcon className="icon" />
              </button>
            </div>

            <div className="modal-body">
              <div className="field-group">
                <label htmlFor="setting-rocketride-uri">RocketRide server URL</label>
                <input
                  id="setting-rocketride-uri"
                  type="text"
                  placeholder="http://localhost:5565"
                  value={fields.rocketride_uri}
                  onChange={(e) => set('rocketride_uri', e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="setting-rocketride-key">RocketRide API key</label>
                <div className="key-input-row">
                  <input
                    id="setting-rocketride-key"
                    type="password"
                    placeholder="MYAPIKEY (local dev default)"
                    autoComplete="off"
                    value={fields.rocketride_apikey}
                    onChange={(e) => set('rocketride_apikey', e.target.value)}
                  />
                  <button type="button" className="text-btn danger" onClick={() => handleClear('rocketride_apikey')}>
                    Remove
                  </button>
                </div>
                <span className={`field-hint ${hints.rocketride_apikey ? 'configured' : ''}`}>
                  {hints.rocketride_apikey ? `Currently set (${hints.rocketride_apikey})` : 'Not set'}
                </span>
                <span className="field-hint">
                  Self-hosted RocketRide has no signup portal — this is a shared secret you set to match your server. Local
                  dev servers default to <code>MYAPIKEY</code>.
                </span>
              </div>

              <div className="field-group">
                <label htmlFor="setting-gemini-key">Gemini API key</label>
                <div className="key-input-row">
                  <input
                    id="setting-gemini-key"
                    type="password"
                    placeholder="Not set"
                    autoComplete="off"
                    value={fields.gemini_apikey}
                    onChange={(e) => set('gemini_apikey', e.target.value)}
                  />
                  <button type="button" className="text-btn danger" onClick={() => handleClear('gemini_apikey')}>
                    Remove
                  </button>
                </div>
                <span className={`field-hint ${hints.gemini_apikey ? 'configured' : ''}`}>
                  {hints.gemini_apikey ? `Currently set (${hints.gemini_apikey})` : 'Not set'}
                </span>
                <a className="field-link" href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">
                  Get a free key at aistudio.google.com
                </a>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label htmlFor="setting-ocr-language">Document language (OCR)</label>
                  <select id="setting-ocr-language" value={fields.ocr_profile} onChange={(e) => set('ocr_profile', e.target.value)}>
                    <option value="latin">English</option>
                    <option value="devanagari">Hindi (Devanagari)</option>
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="setting-voice">Read-aloud voice</label>
                  <select id="setting-voice" value={fields.tts_voice} onChange={(e) => set('tts_voice', e.target.value)}>
                    <option value="af_heart">English — af_heart</option>
                    <option value="am_adam">English — am_adam</option>
                    <option value="hf_alpha">Hindi — hf_alpha</option>
                    <option value="hf_beta">Hindi — hf_beta</option>
                    <option value="hm_omega">Hindi — hm_omega</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <span className={`modal-status ${status.type}`}>{status.text}</span>
              <button type="button" className="save-btn" disabled={saving} onClick={handleSave}>
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
