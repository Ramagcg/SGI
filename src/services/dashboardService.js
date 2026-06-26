import { api } from "./api";

const dashboardService = {
  // Obtiene las estadísticas del dashboard
  obtenerEstadisticas: async () => {
    try {
      // Obtiene todos los datos en paralelo
      const [pedidos, clientes, productos] = await Promise.all([
        api.get("/pedidos"),
        api.get("/clientes"),
        api.get("/productos")
      ]);

      // Calcula las estadísticas
      const pedidosActivos = pedidos?.filter(p => p.estado !== "Entregado").length || 0;
      const enFabricacion = pedidos?.filter(p => p.estado === "En Fabricación").length || 0;
      const clientesTotal = clientes?.length || 0;
      const productosStock = productos?.filter(p => (p.stock || 0) > 0).length || 0;

      return {
        pedidos: pedidosActivos,
        enFabricacion,
        clientes: clientesTotal,
        productos: productosStock
      };
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      return {
        pedidos: 0,
        enFabricacion: 0,
        clientes: 0,
        productos: 0
      };
    }
  },

  // Obtiene el conteo de pedidos por estado
  obtenerEstadoPedidos: async () => {
    try {
      const pedidos = await api.get("/pedidos");
      
      return {
        pendiente: pedidos?.filter(p => p.estado === "Pendiente").length || 0,
        fabricacion: pedidos?.filter(p => p.estado === "En Fabricación").length || 0,
        calidad: pedidos?.filter(p => p.estado === "Control de Calidad").length || 0,
        listo: pedidos?.filter(p => p.estado === "Listo para Retirar").length || 0
      };
    } catch (error) {
      console.error("Error al obtener estado de pedidos:", error);
      return {
        pendiente: 0,
        fabricacion: 0,
        calidad: 0,
        listo: 0
      };
    }
  }
};

export default dashboardService;