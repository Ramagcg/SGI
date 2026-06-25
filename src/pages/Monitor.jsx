import { useState, useEffect, useCallback, useRef } from "react";

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
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  }, [token]);
}

const ESTADOS = ["Pendiente", "En Fabricación", "Control de Calidad", "Listo para Retirar"];
const BADGE_COLOR = {
  "Pendiente":          { bg:"#fef3c7", text:"#92400e" },
  "En Fabricación":     { bg:"#dbeafe", text:"#1e40af" },
  "Control de Calidad": { bg:"#dcfce7", text:"#166534" },
  "Listo para Retirar": { bg:"#d1fae5", text:"#065f46" },
};
const DARK_BADGE = {
  "Pendiente":          { bg:"#451a03", text:"#fcd34d" },
  "En Fabricación":     { bg:"#1e3a5f", text:"#93c5fd" },
  "Control de Calidad": { bg:"#052e16", text:"#86efac" },
  "Listo para Retirar": { bg:"#022c22", text:"#6ee7b7" },
};

function tiempoTranscurrido(fecha) {
  if (!fecha) return null;
  const diff = Date.now() - new Date(fecha).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Monitor() {
  const api = useApi();
  const [pedidos,    setPedidos]    = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [ultimaAct,  setUltimaAct]  = useState(null);
  const [dark,       setDark]       = useState(
    document.documentElement.getAttribute("data-theme") === "dark"
  );
  const intervalRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api("/pedidos");
      setPedidos(data.filter(p => p.estado !== "Entregado"));
      setUltimaAct(new Date());
    } catch {}
    finally { setCargando(false); }
  }, [api]);

  // Refresco automático cada 30 segundos
  useEffect(() => {
    cargar();
    intervalRef.current = setInterval(cargar, 30000);
    return () => clearInterval(intervalRef.current);
  }, [cargar]);

  // Detecta cambio de tema
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const badge = (estado) => dark ? DARK_BADGE[estado] : BADGE_COLOR[estado];

  const containerStyle = fullscreen ? {
    position: "fixed", inset: 0, zIndex: 999,
    background: dark ? "#0a0a0a" : "#f0f0ef",
    display: "flex", flexDirection: "column", overflow: "hidden",
  } : {
    display: "flex", flexDirection: "column", height: "100vh",
  };

  return (
    <div style={containerStyle}>

      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 24px", borderBottom:`1px solid var(--color-border)`,
        background:"var(--color-surface)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <i className="ti ti-device-tv" style={{ fontSize:18, color:"var(--color-muted)" }} />
          <span style={{ fontSize:15, fontWeight:600 }}>Monitor de producción</span>
          {ultimaAct && (
            <span style={{ fontSize:11, color:"var(--color-muted)" }}>
              Actualizado: {ultimaAct.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
            </span>
          )}
          {/* Pulso live */}
          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11,
            color:"#22c55e", fontWeight:500 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e",
              display:"inline-block", animation:"pulse 2s infinite" }} />
            EN VIVO
          </span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-sm" onClick={cargar}>
            <i className="ti ti-refresh" /> Actualizar
          </button>
          <button className="btn btn-sm" onClick={() => setFullscreen(f => !f)}>
            <i className={`ti ${fullscreen ? "ti-minimize" : "ti-maximize"}`} />
            {fullscreen ? " Salir" : " Pantalla completa"}
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid var(--color-border)`,
        background:"var(--color-surface)", flexShrink:0 }}>
        {ESTADOS.map(e => {
          const n = pedidos.filter(p => p.estado === e).length;
          const b = badge(e);
          return (
            <div key={e} style={{ flex:1, padding:"10px 16px", borderRight:`1px solid var(--color-border)`,
              display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ width:10, height:10, borderRadius:"50%",
                background:b?.text, display:"inline-block", flexShrink:0 }} />
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:"var(--color-text)" }}>{n}</div>
                <div style={{ fontSize:11, color:"var(--color-muted)", whiteSpace:"nowrap" }}>{e}</div>
              </div>
            </div>
          );
        })}
        <div style={{ flex:1, padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:10, height:10, borderRadius:"50%",
            background:"var(--color-info)", display:"inline-block" }} />
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:"var(--color-text)" }}>{pedidos.length}</div>
            <div style={{ fontSize:11, color:"var(--color-muted)" }}>Total activos</div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex:1, overflowX:"auto", overflowY:"hidden" }}>
        {cargando && <div className="spinner" />}
        {!cargando && (
          <div style={{ display:"flex", gap:0, height:"100%", minWidth: `${ESTADOS.length * 260}px` }}>
            {ESTADOS.map(estado => {
              const col = pedidos.filter(p => p.estado === estado);
              const b   = badge(estado);
              return (
                <div key={estado} style={{ flex:1, borderRight:`1px solid var(--color-border)`,
                  display:"flex", flexDirection:"column", minWidth:240 }}>

                  {/* Cabecera columna */}
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid var(--color-border)`,
                    background:"var(--color-surface)", position:"sticky", top:0, flexShrink:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ display:"inline-flex", padding:"3px 10px", borderRadius:99,
                        fontSize:11, fontWeight:600,
                        background:b?.bg, color:b?.text }}>
                        {estado}
                      </span>
                      <span style={{ fontSize:13, fontWeight:600, color:"var(--color-muted)" }}>
                        {col.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards de pedidos */}
                  <div style={{ flex:1, overflowY:"auto", padding:12, display:"flex",
                    flexDirection:"column", gap:10 }}>
                    {col.length === 0 && (
                      <div style={{ textAlign:"center", padding:"32px 0",
                        color:"var(--color-muted)", fontSize:12 }}>
                        Sin pedidos
                      </div>
                    )}
                    {col.map(p => (
                      <div key={p.id} style={{
                        background:"var(--color-surface)",
                        border:`1px solid var(--color-border)`,
                        borderLeft:`3px solid ${b?.text}`,
                        borderRadius:10, padding:"12px 14px",
                        boxShadow:"var(--shadow-card)",
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"flex-start", marginBottom:6 }}>
                          <span style={{ fontSize:11, fontWeight:600,
                            color:"var(--color-muted)", fontFamily:"monospace" }}>
                            {p.numero}
                          </span>
                          {p.fecha_pedido && (
                            <span style={{ fontSize:10, color:"var(--color-muted)" }}>
                              {tiempoTranscurrido(p.fecha_pedido)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:14, fontWeight:600, marginBottom:4,
                          color:"var(--color-text)" }}>
                          {p.cliente_nombre || "Sin cliente"}
                        </div>
                        {p.items?.length > 0 && (
                          <div style={{ fontSize:11, color:"var(--color-muted)", marginBottom:6 }}>
                            {p.items.slice(0,2).map(i =>
                              `${i.producto_nombre || "Producto"} ×${Number(i.cantidad)}`
                            ).join(" · ")}
                            {p.items.length > 2 && ` +${p.items.length-2} más`}
                          </div>
                        )}
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginTop:8 }}>
                          <span style={{ fontSize:11, color:"var(--color-muted)" }}>
                            {p.fecha_entrega
                              ? `Entrega: ${new Date(p.fecha_entrega).toLocaleDateString("es-AR")}`
                              : "Sin fecha"}
                          </span>
                          <span style={{ fontSize:12, fontWeight:600, color:"var(--color-text)" }}>
                            ${Number(p.total||0).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity:1; }
          50%       { opacity:.3; }
        }
      `}</style>
    </div>
  );
}