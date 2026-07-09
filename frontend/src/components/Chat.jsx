import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatToolbar from './ChatToolbar'
import { UserMessage, AssistantMessage, ErrorMessage, TypingIndicator } from './MessageBubble'
import { TrashIcon, ExportIcon, SendIcon } from './Icons'
import { askQuestion } from '../api'

const MAX_HISTORY_TURNS = 12

const SUGGESTIONS = ['What documents are required?', 'Summarize this in simple terms', "What's the deadline mentioned here?"]

export default function Chat({ categories, quickActions }) {
  const [messages, setMessages] = useState([]) // { id, kind: 'user'|'assistant'|'error'|'typing', ... }
  const [history, setHistory] = useState([]) // [{role, content}]
  const [focus, setFocus] = useState('general')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const idRef = useRef(0)
  const scrollRef = useRef(null)

  function nextId() {
    idRef.current += 1
    return idRef.current
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }

  async function send({ question, action, displayText }) {
    const userId = nextId()
    setMessages((m) => [...m, { id: userId, kind: 'user', text: displayText ?? question }])
    setBusy(true)
    const typingId = nextId()
    setMessages((m) => [...m, { id: typingId, kind: 'typing' }])
    scrollToBottom()

    const { ok, data } = await askQuestion({
      question,
      action,
      category: focus,
      history: history.slice(-MAX_HISTORY_TURNS * 2),
    })

    setMessages((m) => m.filter((msg) => msg.id !== typingId))

    if (ok) {
      setMessages((m) => [...m, { id: nextId(), kind: 'assistant', answer: data.answer, sources: data.sources, audioBase64: data.audio_base64 }])
      setHistory((h) => [...h, { role: 'user', content: displayText ?? question }, { role: 'assistant', content: data.answer }])
    } else {
      setMessages((m) => [...m, { id: nextId(), kind: 'error', text: data.error || 'Something went wrong.' }])
    }
    setBusy(false)
    scrollToBottom()
  }

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return
    setInput('')
    send({ question: q })
  }

  function handleQuickAction(action) {
    send({ question: '', action: action.id, displayText: action.label })
  }

  function handleSuggestion(text) {
    send({ question: text })
  }

  function clearChat() {
    setMessages([])
    setHistory([])
  }

  function exportChat() {
    if (!history.length) return
    const lines = ['# Docket — conversation export', `_Exported ${new Date().toLocaleString()}_`, '']
    history.forEach((turn) => {
      lines.push(turn.role === 'user' ? `**You:** ${turn.content}` : `**Assistant:** ${turn.content}`, '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `docket-conversation-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasMessages = messages.length > 0

  return (
    <main className="chat">
      <ChatToolbar
        categories={categories}
        quickActions={quickActions}
        focus={focus}
        onFocusChange={setFocus}
        onQuickAction={handleQuickAction}
        disabled={busy}
      />

      <div className="chat-scroll" ref={scrollRef}>
        {!hasMessages && (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <h1>Ask about your documents</h1>
            <p>Upload an RTI reply, government form, financial statement, or research paper on the left, then ask in plain language.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <motion.button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => handleSuggestion(s)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => {
            if (m.kind === 'user') return <UserMessage key={m.id} text={m.text} />
            if (m.kind === 'error') return <ErrorMessage key={m.id} text={m.text} />
            if (m.kind === 'typing') return <TypingIndicator key={m.id} />
            return <AssistantMessage key={m.id} answer={m.answer} sources={m.sources} audioBase64={m.audioBase64} />
          })}
        </AnimatePresence>
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        {hasMessages && (
          <>
            <motion.button
              type="button"
              className="icon-btn small ghost"
              aria-label="Clear conversation"
              title="Clear conversation"
              onClick={clearChat}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <TrashIcon className="icon" />
            </motion.button>
            <motion.button
              type="button"
              className="icon-btn small ghost"
              aria-label="Export conversation"
              title="Export conversation"
              onClick={exportChat}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <ExportIcon className="icon" />
            </motion.button>
          </>
        )}
        <input
          type="text"
          className="question-input"
          placeholder="Ask a question…"
          autoComplete="off"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <motion.button type="submit" className="send-btn" aria-label="Ask" whileTap={{ scale: 0.9 }} disabled={busy}>
          <SendIcon className="icon" />
        </motion.button>
      </form>
    </main>
  )
}
