const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(id: string): boolean {
  return UUID_RE.test(id)
}

export function asUuid(id: string): string {
  return isUuid(id) ? id : crypto.randomUUID()
}

export function stableUuid(seed: string): string {
  const key = `pesobic:uuid:${seed}`
  try {
    const existing = localStorage.getItem(key)
    if (existing && isUuid(existing)) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}
