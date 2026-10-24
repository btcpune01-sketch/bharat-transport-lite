import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './AuthContext.jsx'
import { Toaster } from 'react-hot-toast'

const chunkRetryKey = 'vite-chunk-retry'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (sessionStorage.getItem(chunkRetryKey)) {
    sessionStorage.removeItem(chunkRetryKey)
    return
  }
  sessionStorage.setItem(chunkRetryKey, '1')
  window.location.reload()
})

window.setTimeout(() => sessionStorage.removeItem(chunkRetryKey), 30_000)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster position="top-right" />
    </AuthProvider>
  </React.StrictMode>,
)
