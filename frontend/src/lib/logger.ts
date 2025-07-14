const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function logFrontendError(message: string, context: any = {}) {
  try {
    await fetch(`${API_BASE}/log-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });
  } catch {
    // Silent fail
  }
}

