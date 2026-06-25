import { useState, useCallback } from "react";
import { productosService } from "../services/otrosServices";

/**
 * Hook para validar stock en tiempo real mientras se arma un pedido.
 *
 * Uso:
 *   const { validarStock, stockDisponible, limpiar } = useStock();
 *
 *   // Al seleccionar un producto en el formulario:
 *   const disponible = await validarStock(productoId);
 */
export function useStock() {
  const [cache, setCache] = useState({});  // { [productoId]: stock }
  const [cargando, setCargando] = useState(false);

  const validarStock = useCallback(async (productoId) => {
    // Si ya lo consultamos antes, usamos el cache
    if (cache[productoId] !== undefined) return cache[productoId];

    setCargando(true);
    try {
      const data = await productosService.stockVirtual(productoId);
      const stock = data.stock_disponible ?? 0;
      setCache((prev) => ({ ...prev, [productoId]: stock }));
      return stock;
    } catch {
      return 0;
    } finally {
      setCargando(false);
    }
  }, [cache]);

  // Llama a esto al confirmar el pedido para que la próxima consulta sea fresca
  const limpiar = () => setCache({});

  const stockDisponible = (productoId) => cache[productoId] ?? null;

  return { validarStock, stockDisponible, limpiar, cargando };
}
