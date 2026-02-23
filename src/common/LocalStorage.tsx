export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error: unknown) {
    const err = error as { name?: string; code?: number };
    if (
      err?.name === "QuotaExceededError" ||
      err?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err?.code === 22 ||
      err?.code === 1014
    ) {
      console.warn("LocalStorage quota exceeded; skipping cache write for key:", key);
      return;
    }
    throw error;
  }
}

export function getItem<T>(key: string): T | null {
  const item = localStorage.getItem(key);
  return item ? (JSON.parse(item) as T) : null;
}
