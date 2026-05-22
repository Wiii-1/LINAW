import { getAuth } from "firebase/auth"

export async function getAuthToken(): Promise<string | null> {
  const auth = getAuth()

  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken()
    } catch {
      // Fall through to localStorage keys.
    }
  }

  const keys = [
    "authToken",
    "accessToken",
    "idToken",
    "token",
    "firebaseToken",
  ]

  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value) return value
  }

  return null
}

export async function authHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function mapTenantApiError(status: number, backendMessage: string): string {
  if (status === 401) {
    return "Please sign in to manage your tenant CA."
  }
  if (status === 403) {
    return backendMessage || "Complete signup before provisioning a tenant CA."
  }
  if (status === 404 && backendMessage.includes("not found in database")) {
    return "Complete signup before provisioning a tenant CA."
  }
  if (status === 409) {
    return backendMessage || "A CA is already provisioned for your tenant."
  }
  return backendMessage || `Request failed (${status})`
}
