// Shim de localStorage para correr el store de Zustand (con persist) fuera del
// browser. Solo para el benchmark de rendimiento; no es código de producción.
class MemLocalStorage {
  private store = new Map<string, string>()
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null
  }
  setItem(k: string, v: string): void {
    this.store.set(k, String(v))
  }
  removeItem(k: string): void {
    this.store.delete(k)
  }
  clear(): void {
    this.store.clear()
  }
  key(i: number): string | null {
    return [...this.store.keys()][i] ?? null
  }
  get length(): number {
    return this.store.size
  }
}

;(globalThis as unknown as { localStorage: MemLocalStorage }).localStorage = new MemLocalStorage()
