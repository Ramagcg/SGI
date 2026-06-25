import { useCallback, useEffect, useMemo, useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const ESTADOS = [
  "Pendiente",
  "En Fabricación",
  "Control de Calidad",
  "Listo para Retirar",
  "Entregado",
];

const BADGE = {
  "Pendiente": "badge-pendiente",
  "En Fabricación": "badge-fabricacion",
  "Control de Calidad": "badge-calidad",
  "Listo para Retirar": "badge-listo",
  "Entregado": "badge-entregado",
};

const PERIODOS = {
  mes: "Este mes",
  treinta: "Últimos 30 días",
  anio: "Este año",
  todos: "Todo",
};

function useApi() {
  const token = localStorage.getItem("sgi_token");
  return useCallback(async (endpoint, options = {}) => {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || `Error ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }, [token]);
}

function money(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function number(n) {
  return Number(n || 0).toLocaleString("es-AR");
}

function pedidoFecha(pedido) {
  return pedido.fecha || pedido.fecha_pedido || pedido.created_at || pedido.fecha_creacion || null;
}

function inPeriodo(pedido, periodo) {
  if (periodo === "todos") return true;
  const raw = pedidoFecha(pedido);
  if (!raw) return false;

  const fecha = new Date(raw);
  if (Number.isNaN(fecha.getTime())) return false;

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 30);

  if (periodo === "mes") return fecha >= inicioMes;
  if (periodo === "treinta") return fecha >= hace30;
  if (periodo === "anio") return fecha >= inicioAnio;
  return true;
}

function StatCard({ icon, label, value, color, hint }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 96 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: color + "18", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 21, color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.15 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 3 }}>{hint}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
        <i className={`ti ${icon}`} style={{ color: "var(--color-muted)", fontSize: 17 }} />
        {title}
      </div>
      {right}
    </div>
  );
}

function BarRow({ label, value, total, color, detail }) {
  const pct = total > 0 ? Math.max((value / total) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) 2fr auto", gap: 12, alignItems: "center", padding: "8px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        {detail && <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>{detail}</div>}
      </div>
      <div style={{ height: 8, background: "var(--color-hover)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: "right" }}>{number(value)}</div>
    </div>
  );
}

export default function Reportes() {
  const api = useApi();
  const [periodo, setPeriodo] = useState("mes");
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [ped, prod, cli] = await Promise.all([
        api("/pedidos").catch(() => []),
        api("/productos").catch(() => []),
        api("/clientes").catch(() => []),
      ]);
      setPedidos(Array.isArray(ped) ? ped : []);
      setProductos(Array.isArray(prod) ? prod : []);
      setClientes(Array.isArray(cli) ? cli : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const datos = useMemo(() => {
    const pedidosPeriodo = pedidos.filter(p => inPeriodo(p, periodo));
    const totalVendido = pedidosPeriodo.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const entregados = pedidosPeriodo.filter(p => p.estado === "Entregado");
    const activos = pedidosPeriodo.filter(p => p.estado !== "Entregado");
    const ticketPromedio = pedidosPeriodo.length ? totalVendido / pedidosPeriodo.length : 0;

    const porEstado = ESTADOS.map(estado => ({
      estado,
      cantidad: pedidosPeriodo.filter(p => p.estado === estado).length,
    }));

    const ventasPorCliente = Object.values(pedidosPeriodo.reduce((acc, p) => {
      const key = p.cliente_id || p.cliente_nombre || "sin-cliente";
      const nombre = p.cliente_nombre || "Sin cliente";
      if (!acc[key]) acc[key] = { nombre, total: 0, pedidos: 0 };
      acc[key].total += Number(p.total || 0);
      acc[key].pedidos += 1;
      return acc;
    }, {})).sort((a, b) => b.total - a.total).slice(0, 5);

    const bajoStock = productos
      .filter(p => Number(p.stock_actual) <= Number(p.stock_minimo))
      .sort((a, b) => Number(a.stock_actual) - Number(b.stock_actual))
      .slice(0, 6);

    const productosVendidos = Object.values(pedidosPeriodo.reduce((acc, pedido) => {
      (pedido.items || []).forEach(item => {
        const key = item.producto_id || item.producto_nombre || item.id;
        const nombre = item.producto_nombre || item.nombre || `Producto #${item.producto_id || item.id}`;
        if (!acc[key]) acc[key] = { nombre, cantidad: 0, total: 0 };
        acc[key].cantidad += Number(item.cantidad || 0);
        acc[key].total += Number(item.subtotal || 0);
      });
      return acc;
    }, {})).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

    return {
      pedidosPeriodo,
      totalVendido,
      entregados,
      activos,
      ticketPromedio,
      porEstado,
      ventasPorCliente,
      bajoStock,
      productosVendidos,
    };
  }, [pedidos, productos, periodo]);

  const exportarCsv = () => {
    const rows = [
      ["Numero", "Cliente", "Estado", "Total", "Fecha"],
      ...datos.pedidosPeriodo.map(p => [
        p.numero || p.id,
        p.cliente_nombre || "",
        p.estado || "",
        Number(p.total || 0).toFixed(2),
        pedidoFecha(p) || "",
      ]),
    ];
    const csv = rows.map(row => row.map(col => `"${String(col).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-sgi-${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)", gap: 12, flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 18, color: "var(--color-muted)" }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Reportes</span>
          <span style={{ fontSize: 12, color: "var(--color-muted)" }}>({PERIODOS[periodo]})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, padding: 3, border: "1px solid var(--color-border)", borderRadius: 10 }}>
            {Object.entries(PERIODOS).map(([key, label]) => (
              <button key={key} className={`btn btn-sm ${periodo === key ? "btn-primary" : ""}`}
                onClick={() => setPeriodo(key)} style={{ borderColor: "transparent" }}>
                {label}
              </button>
            ))}
          </div>
          <button className="btn btn-sm" onClick={cargar}>
            <i className="ti ti-refresh" /> Actualizar
          </button>
          <button className="btn btn-sm" onClick={exportarCsv} disabled={datos.pedidosPeriodo.length === 0}>
            <i className="ti ti-download" /> CSV
          </button>
        </div>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        {cargando && <div className="spinner" />}
        {error && <div className="error-msg">{error}</div>}

        {!cargando && !error && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 14, marginBottom: 18
            }}>
              <StatCard icon="ti-currency-dollar" label="Ventas del período" value={money(datos.totalVendido)} color="#16a34a" />
              <StatCard icon="ti-clipboard-list" label="Pedidos registrados" value={number(datos.pedidosPeriodo.length)} color="#2563eb" />
              <StatCard icon="ti-truck-delivery" label="Pedidos entregados" value={number(datos.entregados.length)} color="#7c3aed" />
              <StatCard icon="ti-receipt-2" label="Ticket promedio" value={money(datos.ticketPromedio)} color="#d97706" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, .9fr)", gap: 16, marginBottom: 16 }}>
              <div className="card">
                <SectionTitle icon="ti-progress" title="Estado de pedidos" />
                {datos.porEstado.map((e, idx) => (
                  <BarRow key={e.estado} label={e.estado} value={e.cantidad}
                    total={datos.pedidosPeriodo.length} color={["#d97706", "#2563eb", "#16a34a", "#059669", "#78716c"][idx]} />
                ))}
              </div>

              <div className="card">
                <SectionTitle icon="ti-alert-triangle" title="Stock a revisar" />
                {datos.bajoStock.length === 0 && (
                  <div className="empty-state" style={{ padding: "28px 0" }}>No hay productos bajo mínimo.</div>
                )}
                {datos.bajoStock.map(p => {
                  const sinStock = Number(p.stock_actual) <= 0;
                  return (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between", gap: 12,
                      padding: "9px 0", borderBottom: "1px solid var(--color-border)", alignItems: "center"
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>{p.codigo} · mínimo {number(p.stock_minimo)} {p.unidad}</div>
                      </div>
                      <span className="badge" style={{
                        background: sinStock ? "#fee2e2" : "#fef3c7",
                        color: sinStock ? "#991b1b" : "#92400e",
                        flexShrink: 0,
                      }}>
                        {number(p.stock_actual)} {p.unidad}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div className="card">
                <SectionTitle icon="ti-users" title="Ventas por cliente" />
                {datos.ventasPorCliente.length === 0 && (
                  <div className="empty-state" style={{ padding: "28px 0" }}>Sin ventas en el período.</div>
                )}
                {datos.ventasPorCliente.map(c => (
                  <BarRow key={c.nombre} label={c.nombre} value={c.total}
                    total={datos.totalVendido} color="#16a34a" detail={`${number(c.pedidos)} pedidos`} />
                ))}
              </div>

              <div className="card">
                <SectionTitle icon="ti-package-export" title="Productos más pedidos" />
                {datos.productosVendidos.length === 0 && (
                  <div className="empty-state" style={{ padding: "28px 0" }}>Los pedidos no tienen productos cargados para este reporte.</div>
                )}
                {datos.productosVendidos.map(p => (
                  <BarRow key={p.nombre} label={p.nombre} value={p.cantidad}
                    total={datos.productosVendidos[0]?.cantidad || 0} color="#2563eb" detail={money(p.total)} />
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--color-border)" }}>
                <SectionTitle icon="ti-table" title="Detalle de pedidos" right={
                  <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{number(datos.activos.length)} activos</span>
                } />
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.pedidosPeriodo.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">No hay pedidos para el período seleccionado.</td></tr>
                  )}
                  {datos.pedidosPeriodo.slice(0, 12).map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.numero || `#${p.id}`}</strong></td>
                      <td>{p.cliente_nombre || "Sin cliente"}</td>
                      <td style={{ color: "var(--color-muted)" }}>
                        {pedidoFecha(p) ? new Date(pedidoFecha(p)).toLocaleDateString("es-AR") : "Sin fecha"}
                      </td>
                      <td>{money(p.total)}</td>
                      <td><span className={`badge ${BADGE[p.estado] || ""}`}>{p.estado || "Sin estado"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
