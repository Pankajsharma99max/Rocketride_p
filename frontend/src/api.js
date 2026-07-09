// Thin fetch wrappers around the Flask backend (see ../../app.py). Kept
// framework-free on purpose -- this is the same JSON contract the previous
// vanilla-JS frontend used, just called from React state instead of DOM events.

async function asJson(res) {
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export async function fetchCategories() {
  const res = await fetch('/api/categories')
  return asJson(res)
}

export async function fetchDocuments() {
  const res = await fetch('/api/documents')
  return asJson(res)
}

export async function uploadDocument(file, category, onProgress) {
  return new Promise((resolve) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    })

    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = {}
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, data })
    }

    xhr.onerror = () => resolve({ ok: false, data: { error: 'Upload failed -- check your connection' } })

    xhr.send(formData)
  })
}

export async function askQuestion({ question, action, category, history }) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, action, category, history }),
  })
  return asJson(res)
}

export async function fetchSettings() {
  const res = await fetch('/api/settings')
  return asJson(res)
}

export async function saveSettings(payload) {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return asJson(res)
}

export async function clearSettingsFields(fields) {
  const res = await fetch('/api/settings', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  return asJson(res)
}

export async function sendContactMessage(payload) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return asJson(res)
}
