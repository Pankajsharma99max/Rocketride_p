import { useState } from 'react'
import { motion } from 'framer-motion'
import { sendContactMessage } from '../api'
import { MailIcon } from './Icons'
import { EASE, reveal } from '../motion'

export default function ContactSection({ showToast }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorText, setErrorText] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    const { ok, data } = await sendContactMessage(form)
    if (ok) {
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
      showToast('Message sent — thanks for reaching out', 'success')
    } else {
      setStatus('error')
      setErrorText(data.error || 'Could not send your message.')
      showToast('Could not send message', 'error')
    }
  }

  return (
    <section className="landing-section" id="contact">
      <motion.h2 className="landing-section-title" {...reveal(0)}>
        Contact us
      </motion.h2>
      <motion.p className="landing-section-sub" {...reveal(0.06)}>
        Questions, feedback, or want to talk about deploying this for your own documents? Send a message.
      </motion.p>

      <motion.form
        className="contact-form"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
      >
        <span className="contact-form-icon">
          <MailIcon className="icon" />
        </span>

        {status === 'sent' ? (
          <motion.div
            className="contact-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p>Thanks — your message has been received. We'll get back to you soon.</p>
            <button type="button" className="link-btn" onClick={() => setStatus('idle')}>
              Send another message
            </button>
          </motion.div>
        ) : (
          <>
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                rows={4}
                required
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
              />
            </div>
            {status === 'error' && <span className="modal-status error">{errorText}</span>}
            <motion.button
              type="submit"
              className="save-btn"
              disabled={status === 'sending'}
              whileTap={{ scale: 0.97 }}
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </motion.button>
          </>
        )}
      </motion.form>
    </section>
  )
}
