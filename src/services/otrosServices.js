import { api } from "./api";

// ── Productos ─────────────────────────────────────────────────────────────────
export const productosService = {
  listar: ()    => api.get("/productos"),
  obtener: (id) => api.get(`/productos/${id}`),
  crear:  (body) => api.post("/productos", body),
  editar: (id, body) => api.put(`/productos/${id}`, body),

  // Stock virtual: cuántas unidades de un compuesto se pueden armar
  stockVirtual: (id) => api.get(`/productos/${id}/stock-virtual`),
};

// ── Clientes ──────────────────────────────────────────────────────────────────
export const clientesService = {
  listar: ()    => api.get("/clientes"),
  obtener: (id) => api.get(`/clientes/${id}`),
  crear:  (body) => api.post("/clientes", body),
  editar: (id, body) => api.put(`/clientes/${id}`, body),
};

// ── Listas de precio ──────────────────────────────────────────────────────────
export const listasService = {
  listar: () => api.get("/listas-precio"),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  login: async ({ email, password }) => {
    const data = await api.post("/auth/login", { email, password });
    // Guardamos el token y los datos del usuario en localStorage
    localStorage.setItem("sgi_token",   data.access_token);
    localStorage.setItem("sgi_usuario", JSON.stringify(data.usuario));
    return data;
  },

  logout: () => {
    localStorage.removeItem("sgi_token");
    localStorage.removeItem("sgi_usuario");
    window.location.href = "/login";
  },

  usuarioActual: () => {
    const raw = localStorage.getItem("sgi_usuario");
    return raw ? JSON.parse(raw) : null;
  },

  estaAutenticado: () => !!localStorage.getItem("sgi_token"),
};
