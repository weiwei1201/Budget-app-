import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Polyfill window.storage using localStorage
// This replaces the Claude Artifact storage API with standard localStorage
window.storage = {
  get: async (key) => {
    try {
      const value = localStorage.getItem(key)
      if (value === null) throw new Error('not found')
      return { key, value }
    } catch (e) {
      throw e
    }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem(key, value)
      return { key, value }
    } catch (e) {
      throw e
    }
  },
  delete: async (key) => {
    localStorage.removeItem(key)
    return { key, deleted: true }
  },
  list: async (prefix) => {
    const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix))
    return { keys }
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
