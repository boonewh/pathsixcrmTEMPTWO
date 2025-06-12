import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (res.status === 401) {
    toast.error("Unauthorized Activity. Please log in again.");
    window.dispatchEvent(new Event("unauthorized"));
  }

  if (!res.ok && res.status !== 401) {
    try {
      const errorData = await res.json();
      const errorMessage = errorData.error || `Error: ${res.status}`;
      toast.error(errorMessage);
    } catch {
      const text = await res.text();
      toast.error(`Error: ${res.status} ${text}`);
    }
  }

  return res;
}