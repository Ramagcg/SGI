import { useState, useEffect, useCallback } from "react";
import pedidosService from "../services/pedidosService";

/**
 * Hook para manejar pedidos en cualquier componente.
 *
 * Uso:
 *   const { pedidos, cargando, error, recargar, crearPedido, cambiarEstado } = usePedidos();
 *   const { pedidos } = usePedidos({ estado: "En Fabricación" });
 */
export function usePedidos(filtros = {}) {
  const [pedidos,  setPedidos]  = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await pedidosService.listar(filtros);
      setPedidos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.estado, filtros.clienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crearPedido = async (body) => {
    const nuevo = await pedidosService.crear(body);
    setPedidos((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const cambiarEstado = async (id, body) => {
    const actualizado = await pedidosService.cambiarEstado(id, body);
    setPedidos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    return actualizado;
  };

  return { pedidos, cargando, error, recargar: cargar, crearPedido, cambiarEstado };
}
