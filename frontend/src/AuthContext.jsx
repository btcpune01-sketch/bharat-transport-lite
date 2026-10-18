import { createContext, useContext, useEffect, useState } from 'react'
import { authAPI } from './api'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      if (token && storedUser) setCurrentUser(JSON.parse(storedUser))
      else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    } catch (err) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      console.error('Unable to restore the saved session:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const response = await authAPI.login(username, password)
    const { token, user } = response.data || {}
    if (!token || !user) throw new Error('The server returned an incomplete sign-in response.')
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setCurrentUser(user)
    return user
  }

  const logout = async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
