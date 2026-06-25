import { tokenStore } from "@app/services/tokenStore"

export function mediaUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return ""
  const raw = value.trim()
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw

  const normalized = raw.startsWith("api/") ? `/${raw}` : raw
  const token = tokenStore.get()
  if (!token) return normalized

  try {
    const url = normalized.startsWith("http")
      ? new URL(normalized)
      : new URL(normalized, typeof window === "undefined" ? "http://localhost" : window.location.origin)
    if (url.pathname.startsWith("/api/documents/download/") && !url.searchParams.has("exp") && !url.searchParams.has("sig")) {
      url.searchParams.set("token", token)
      return normalized.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`
    }
  } catch {
    return normalized
  }

  return normalized
}
