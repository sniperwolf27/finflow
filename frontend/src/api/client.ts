import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Redirect to login if session expired
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
    return Promise.reject(err)
  }
)
