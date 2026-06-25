// ─── Configuración base ───────────────────────────────────────────────────────
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

/**
 * Wrapper de fetch que agrega automáticamente:
 *  - Content-Type: application/json
 *  - Authorization: Bearer <token> si hay sesión activa
 *  - Manejo de errores centralizado
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("sgi_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Si el token expiró, limpiamos sesión y redirigimos al login
  if (response.status === 401) {
    localStorage.removeItem("sgi_token");
    localStorage.removeItem("sgi_usuario");
    window.location.href = "/login";
    return;
  }

  // Para errores del servidor, lanzamos el mensaje que devuelve FastAPI
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  // 204 No Content no tiene body
  if (response.status === 204) return null;

  return response.json();
}

// Métodos HTTP
export const api = {
  get:    (endpoint)        => request(endpoint, { method: "GET" }),
  post:   (endpoint, body)  => request(endpoint, { method: "POST",   body: JSON.stringify(body) }),
  patch:  (endpoint, body)  => request(endpoint, { method: "PATCH",  body: JSON.stringify(body) }),
  put:    (endpoint, body)  => request(endpoint, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (endpoint)        => request(endpoint, { method: "DELETE" }),
};
