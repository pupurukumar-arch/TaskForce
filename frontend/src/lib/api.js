const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const accessTokenKey = 'taskforce_access_token'
const refreshTokenKey = 'taskforce_refresh_token'

export const getToken = () => localStorage.getItem(accessTokenKey)
export const setToken = (token) => localStorage.setItem(accessTokenKey, token)
const getRefreshToken = () => localStorage.getItem(refreshTokenKey)
const setRefreshToken = (token) => localStorage.setItem(refreshTokenKey, token)
export const clearToken = () => {
  localStorage.removeItem(accessTokenKey)
  localStorage.removeItem(refreshTokenKey)
}

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
  if (data?.refreshToken) setRefreshToken(data.refreshToken)
}

export async function api(path, options = {}) {
  let response = await request(path, options, getToken())
  let result = await parseResponse(response)

  const refreshToken = getRefreshToken()
  if (response.status === 401 && path !== '/auth/refresh-token' && refreshToken) {
    const refreshResponse = await request('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
    const refreshResult = await parseResponse(refreshResponse)

    if (refreshResponse.ok && refreshResult.data?.accessToken) {
      storeTokens(refreshResult.data)
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
