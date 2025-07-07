import toast from "react-hot-toast";
import { useAuth } from "@/authContext";
import { useAuthReady } from "@/hooks/useAuthReady";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function apiFetch(path: string, options?: RequestInit) {
  const fullUrl = `${API_BASE}${path}`;
  const token = localStorage.getItem("token");

  console.log("📦 Fetching with token:", token);

  const incomingHeaders = options?.headers || {};
  const hasAuth = "Authorization" in incomingHeaders;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...incomingHeaders,
    ...(token && !hasAuth ? { Authorization: `Bearer ${token}` } : {}),
  };

  console.log("🔍 Fetching:", fullUrl);
  console.log("🧾 Headers:", headers);

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

  if (res.status === 401 && !path.includes("/user")) {
    let hadAuthHeader = false;

    if (headers instanceof Headers) {
      hadAuthHeader = headers.has("Authorization");
    } else if (typeof headers === "object" && "Authorization" in headers) {
      hadAuthHeader = true;
    }

    if (hadAuthHeader) {
      console.warn("⚠️ 401 received with token, but not logging out automatically.");
      toast.error(`Sync failed: Unauthorized`);
    } else {
      console.warn("⚠️ 401 received with no Authorization header — skipping logout");
    }

    return res;
  }


    // other error and parsing logic here...
    return res;
  } catch (networkError) {
    toast.error("Unable to connect to server.");
    throw networkError;
  }
}

export async function safeApiFetch(path: string, options: RequestInit = {}) {
  const { token } = useAuth();
  const { canMakeAPICall } = useAuthReady();

  if (!canMakeAPICall) {
    console.warn("🚫 safeApiFetch blocked: canMakeAPICall is false");
    throw new Error("Auth not ready — cannot make API call");
  }

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
  const fullUrl = `${API_BASE}${path}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "API error");
  }

  return res.json();
}
