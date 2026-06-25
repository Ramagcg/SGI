import { api } from "./api";

const pedidosService = {
  // Trae todos los pedidos. Acepta filtros opcionales.
  listar: ({ estado, clienteId } = {}) => {
    const params = new URLSearchParams();
    if (estado)    params.append("estado", estado);
    if (clienteId) params.append("cliente_id", clienteId);
    const query = params.toString() ? `?${params}` : "";
    return api.get(`/pedidos${query}`);
  },

  // Trae un pedido por ID
  obtener: (id) => api.get(`/pedidos/${id}`),

  // Crea un nuevo pedido
  // body: { cliente_id, lista_precio_id, fecha_entrega, items: [{producto_id, cantidad, precio_unitario}] }
  crear: (body) => api.post("/pedidos", body),

  // Cambia el estado de un pedido
  // body: { estado, observacion? }
  cambiarEstado: (id, body) => api.patch(`/pedidos/${id}/estado`, body),

  // Trae los pedidos activos para el monitor de producción
  monitor: () => api.get("/pedidos/monitor/activos"),
};

export default pedidosService;
