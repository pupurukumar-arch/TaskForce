const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
let accessToken = ''
let refreshPromise = null

export const getToken = () => accessToken
export const setToken = (token) => { accessToken = token || '' }
export const clearToken = () => { accessToken = '' }

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json')
    ? response.json()
    : { message: 'The API route was not found. Restart the backend server and try again.' }
}

const request = (path, options, token) => {
  const isFormData = options.body instanceof FormData
  return fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
}

const storeTokens = (data) => {
  if (data?.accessToken) setToken(data.accessToken)
}

const refreshAccessToken = () => {
  refreshPromise ||= request('/auth/refresh-token', { method: 'POST' })
    .then(async (response) => {
      const result = await parseResponse(response)
      if (!response.ok || !result.data?.accessToken) {
        clearToken()
        return false
      }
      storeTokens(result.data)
      return true
    })
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

export async function bootstrapCurrentUser() {
  if (!getToken() && !(await refreshAccessToken())) return null
  return api('/auth/current-user', { method: 'POST' })
}

export async function api(path, options = {}) {
  let response = await request(path, options, getToken())
  let result = await parseResponse(response)

  if (response.status === 401 && path !== '/auth/refresh-token') {
    if (await refreshAccessToken()) {
      response = await request(path, options, getToken())
      result = await parseResponse(response)
    } else {
      clearToken()
    }
  }

  if (!response.ok) {
    const error = new Error(result.message || 'Something went wrong')
    error.fieldErrors = Object.assign({}, ...(result.errors || []))
    throw error
  }
  storeTokens(result.data)
  return result.data
}
