import { useState, useEffect, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

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

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StockBar({ actual, minimo }) {
  const pct = minimo > 0 ? Math.min((actual / (minimo * 3)) * 100, 100) : actual > 0 ? 100 : 0;
  const color = actual <= 0 ? "#ef4444" : actual <= minimo ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, height:6, borderRadius:99, background:"var(--color-border)", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color,
          borderRadius:99, transition:"width .4s" }} />
      </div>
      <span style={{ fontSize:12, fontWeight:600, color, minWidth:60, textAlign:"right" }}>
        {fmt(actual)}
      </span>
    </div>
  );
}

// ✅ STAT CARD - Funciona en modo oscuro
function StatCard({ icon, label, value, color, filtro, isActive, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        display:"flex", 
        alignItems:"center", 
        gap:12, 
        padding:"12px 16px",
        borderRadius:10,
        cursor:"pointer",
        transition:"all .2s",
        border: `2px solid ${isActive ? color : "var(--color-border)"}`,
        background: isActive ? `${color}18` : "var(--color-hover)",
      }}>
      {/* Icono */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: `${color}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20, color }} />
      </div>
      
      {/* Contenido */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export default function Stock() {
  const api = useApi();
  const [productos,  setProductos]  = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState(null);
  const [busqueda,   setBusqueda]   = useState("");
  const [filtro,     setFiltro]     = useState("todos");
  const [modalAdj,   setModalAdj]   = useState(null);
  const [adjTipo,    setAdjTipo]    = useState("ingreso");
  const [adjCant,    setAdjCant]    = useState(0);
  const [adjMotivo,  setAdjMotivo]  = useState("");
  const [guardando,  setGuardando]  = useState(false);
  const [adjError,   setAdjError]   = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try { setProductos(await api("/productos")); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  // Estadísticas rápidas
  const sinStock   = productos.filter(p => Number(p.stock_actual) <= 0).length;
  const bajoMinimo = productos.filter(p => Number(p.stock_actual) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo)).length;
  const ok         = productos.filter(p => Number(p.stock_actual) > Number(p.stock_minimo)).length;

  // Filtrado
  const lista = productos.filter(p => {
    const matchB = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                   p.codigo.toLowerCase().includes(busqueda.toLowerCase());
    if (!matchB) return false;
    if (filtro === "sin_stock")   return Number(p.stock_actual) <= 0;
    if (filtro === "bajo_minimo") return Number(p.stock_actual) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo);
    if (filtro === "ok")          return Number(p.stock_actual) > Number(p.stock_minimo);
    return true;
  });

  // Ajuste de stock
  const abrirAjuste = (p) => {
    setModalAdj(p); setAdjTipo("ingreso");
    setAdjCant(0); setAdjMotivo(""); setAdjError(null);
  };

  const confirmarAjuste = async () => {
    if (!adjCant || adjCant <= 0) { setAdjError("Ingresá una cantidad mayor a 0."); return; }
    setGuardando(true); setAdjError(null);
    try {
      const delta = adjTipo === "ingreso" ? adjCant : -adjCant;
      const nuevoStock = Number(modalAdj.stock_actual) + delta;
      if (nuevoStock < 0) { setAdjError("El stock no puede quedar negativo."); setGuardando(false); return; }
      const actualizado = await api(`/productos/${modalAdj.id}`, {
        method: "PUT",
        body: JSON.stringify({
          codigo:        modalAdj.codigo,
          nombre:        modalAdj.nombre,
          tipo:          modalAdj.tipo,
          stock_actual:  nuevoStock,
          stock_minimo:  modalAdj.stock_minimo,
          unidad:        modalAdj.unidad,
        }),
      });
      setProductos(prev => prev.map(p => p.id === modalAdj.id ? actualizado : p));
      setModalAdj(null);
    } catch (e) { setAdjError(e.message); }
    finally { setGuardando(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh" }}>

      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 24px", borderBottom:"1px solid var(--color-border)",
        background:"var(--color-surface)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <i className="ti ti-boxes" style={{ fontSize:18, color:"var(--color-muted)" }} />
          <span style={{ fontSize:15, fontWeight:600 }}>Stock</span>
        </div>
        <button className="btn btn-sm" onClick={cargar}>
          <i className="ti ti-refresh" /> Actualizar
        </button>
      </div>

      {/* ✅ CARDS RESUMEN CON ICONOS - Ahora funciona en oscuro */}
      <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--color-border)",
        background:"var(--color-surface)", display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12 }}>
        
        <StatCard
          icon="ti-alert-circle"
          label="Sin stock"
          value={sinStock}
          color="#ef4444"
          filtro="sin_stock"
          isActive={filtro === "sin_stock"}
          onClick={() => setFiltro("sin_stock")}
        />
        
        <StatCard
          icon="ti-alert-triangle"
          label="Bajo mínimo"
          value={bajoMinimo}
          color="#f59e0b"
          filtro="bajo_minimo"
          isActive={filtro === "bajo_minimo"}
          onClick={() => setFiltro("bajo_minimo")}
        />
        
        <StatCard
          icon="ti-check"
          label="Stock OK"
          value={ok}
          color="#22c55e"
          filtro="ok"
          isActive={filtro === "ok"}
          onClick={() => setFiltro("ok")}
        />
        
        <StatCard
          icon= "ti-database"
          label="Total"
          value={productos.length}
          color="var(--color-info)"
          filtro="todos"
          isActive={filtro === "todos"}
          onClick={() => setFiltro("todos")}
        />
      </div>

      {/* Búsqueda */}
      <div style={{ padding:"12px 24px", borderBottom:"1px solid var(--color-border)",
        background:"var(--color-surface)", display:"flex", justifyContent:"flex-end" }}>
        <input placeholder="Buscar producto…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width:220, padding:"7px 10px" }} />
      </div>

      {/* Tabla */}
      <div style={{ padding:20, flex:1, overflowY:"auto" }}>
        {cargando && <div className="spinner" />}
        {error    && <div className="error-msg">{error}</div>}

        {!cargando && !error && (
          <div className="card" style={{ padding:0 }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Unidad</th>
                  <th style={{ minWidth:200 }}>Stock actual / mínimo</th>
                  <th>Stock mínimo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr><td colSpan={8} className="empty-state">
                    {busqueda ? "Sin resultados." : "No hay productos."}
                  </td></tr>
                )}
                {lista.map(p => {
                  const actual  = Number(p.stock_actual);
                  const minimo  = Number(p.stock_minimo);
                  const estado  = actual <= 0 ? "sin_stock" : actual <= minimo ? "bajo_minimo" : "ok";
                  const estadoLabel = { sin_stock:"Sin stock", bajo_minimo:"Bajo mínimo", ok:"OK" }[estado];
                  const estadoColor = { sin_stock:"#ef4444",   bajo_minimo:"#f59e0b",     ok:"#22c55e" }[estado];
                  const estadoIcon = { sin_stock:"ti-alert-circle", bajo_minimo:"ti-alert-triangle", ok:"ti-check" }[estado];
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--color-muted)" }}>
                        {p.codigo}
                      </td>
                      <td><strong>{p.nombre}</strong></td>
                      <td>
                        <span className="badge"
                          style={ p.tipo === "compuesto"
                            ? { background:"var(--color-info)", color:"var(--color-bg)" }
                            : { background:"var(--color-hover)", color:"var(--color-muted)" }}>
                          {p.tipo}
                        </span>
                      </td>
                      <td style={{ color:"var(--color-muted)" }}>{p.unidad}</td>
                      <td style={{ minWidth:200 }}>
                        <StockBar actual={actual} minimo={minimo} />
                      </td>
                      <td style={{ color:"var(--color-muted)" }}>{fmt(minimo)}</td>
                      <td>
                        <span style={{ fontSize:11, fontWeight:600, color:estadoColor,
                          background:estadoColor+"18", padding:"4px 10px",
                          borderRadius:99, display:"inline-flex", alignItems:"center", gap:"4px" }}>
                          <i className={`ti ${estadoIcon}`} style={{ fontSize:12 }} />
                          {estadoLabel}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => abrirAjuste(p)}
                          title="Ajustar stock">
                          <i className="ti ti-adjustments-horizontal" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajuste de stock */}
      {modalAdj && (
        <div onClick={() => setModalAdj(null)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.4)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:"var(--color-surface)", borderRadius:14, padding:24,
            width:"min(400px,95%)", boxShadow:"0 8px 40px rgba(0,0,0,.15)" }}>

            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600 }}>Ajuste de stock</div>
                <div style={{ fontSize:12, color:"var(--color-muted)", marginTop:2 }}>
                  {modalAdj.nombre}
                </div>
              </div>
              <button onClick={() => setModalAdj(null)}
                style={{ background:"none", border:"none", fontSize:20,
                  cursor:"pointer", color:"var(--color-muted)" }}>×</button>
            </div>

            {/* Stock actual */}
            <div style={{ background:"var(--color-hover)", borderRadius:10, padding:"12px 14px",
              marginBottom:16, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:"var(--color-muted)" }}>Stock actual</span>
              <span style={{ fontSize:16, fontWeight:600, color:"var(--color-text)" }}>
                {fmt(modalAdj.stock_actual)} {modalAdj.unidad}
              </span>
            </div>

            {adjError && <div className="error-msg">{adjError}</div>}

            {/* Tipo de movimiento */}
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {[["ingreso","Ingreso","#22c55e"],["egreso","Egreso","#ef4444"]].map(([v,l,c]) => (
                <button key={v} onClick={() => setAdjTipo(v)}
                  className={`btn ${adjTipo===v?"btn-primary":""}`}
                  style={{ flex:1, justifyContent:"center",
                    ...(adjTipo===v ? { background:c, borderColor:c, color:"white" } : {}) }}>
                  <i className={`ti ${v==="ingreso"?"ti-arrow-up":"ti-arrow-down"}`} /> {l}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label>Cantidad ({modalAdj.unidad})</label>
              <input type="number" min={1} value={adjCant || ""}
                onChange={e => setAdjCant(parseFloat(e.target.value) || 0)}
                placeholder="0" autoFocus />
            </div>

            <div className="form-group">
              <label>Motivo (opcional)</label>
              <input value={adjMotivo} onChange={e => setAdjMotivo(e.target.value)}
                placeholder="Ej: Recepción de mercadería, ajuste inventario…" />
            </div>

            {/* Previsualización */}
            {adjCant > 0 && (
              <div style={{ background:"var(--color-hover)", borderRadius:10, padding:"10px 14px",
                marginBottom:14, display:"flex", justifyContent:"space-between",
                fontSize:13 }}>
                <span style={{ color:"var(--color-muted)" }}>Nuevo stock</span>
                <span style={{ fontWeight:600, color:"var(--color-text)",
                  color: (Number(modalAdj.stock_actual) + (adjTipo==="ingreso"?adjCant:-adjCant)) < 0
                    ? "#ef4444" : "#22c55e" }}>
                  {fmt(Number(modalAdj.stock_actual) + (adjTipo==="ingreso" ? adjCant : -adjCant))} {modalAdj.unidad}
                </span>
              </div>
            )}

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn" onClick={() => setModalAdj(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarAjuste} disabled={guardando}>
                {guardando
                  ? <><i className="ti ti-loader-2" /> Guardando...</>
                  : <><i className="ti ti-check" /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}