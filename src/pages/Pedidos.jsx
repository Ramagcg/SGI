import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const ESTADOS = ["Pendiente","En Fabricación","Control de Calidad","Listo para Retirar","Entregado"];
const BADGE = {
  "Pendiente":          "badge-pendiente",
  "En Fabricación":     "badge-fabricacion",
  "Control de Calidad": "badge-calidad",
  "Listo para Retirar": "badge-listo",
  "Entregado":          "badge-entregado",
};

function fmt(n){ return "$" + Number(n||0).toLocaleString("es-AR",{minimumFractionDigits:2}); }

// ── Hook para llamadas a la API ───────────────────────────────────────────────
function useApi() {
  const token = localStorage.getItem("sgi_token");
  const call = useCallback(async (endpoint, options={}) => {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: { "Content-Type":"application/json",
        ...(token ? { Authorization:`Bearer ${token}` } : {}),
        ...options.headers },
    });
    if (!res.ok) {
      const e = await res.json().catch(()=>({}));
      throw new Error(e.detail || `Error ${res.status}`);
    }
    return res.status===204 ? null : res.json();
  }, [token]);
  return call;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Pedidos() {
  const api = useApi();
  const [tab,      setTab]      = useState("lista");
  const [pedidos,  setPedidos]  = useState([]);
  const [filtro,   setFiltro]   = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [detalle,  setDetalle]  = useState(null);

  // Form nuevo pedido
  const [clientes,  setClientes]  = useState([]);
  const [listas,    setListas]    = useState([]);
  const [productos, setProductos] = useState([]);
  const [form,      setForm]      = useState({ cliente_id:"", lista_precio_id:"", fecha_entrega:"" });
  const [items,     setItems]     = useState([]);
  const [selProd,   setSelProd]   = useState("");
  const [selCant,   setSelCant]   = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState(null);

  // Cargar pedidos
  const cargarPedidos = useCallback(async () => {
    setCargando(true); setError(null);
    try { setPedidos(await api("/pedidos")); }
    catch(e){ setError(e.message); }
    finally { setCargando(false); }
  }, [api]);

  // Cargar datos para el formulario
  const cargarFormData = useCallback(async () => {
    try {
      const [c, l, p] = await Promise.all([
        api("/clientes").catch(()=>[]),
        api("/listas-precio").catch(()=>[]),
        api("/productos").catch(()=>[]),
      ]);
      setClientes(c); setListas(l); setProductos(p);
    } catch {}
  }, [api]);

  useEffect(() => { cargarPedidos(); cargarFormData(); }, [cargarPedidos, cargarFormData]);

  // Filtrar lista
  const lista = filtro==="todos" ? pedidos : pedidos.filter(p=>p.estado===filtro);

  // Cambiar estado
const cambiarEstado = async (id, estado) => {
  console.log("Enviando estado:", JSON.stringify(estado)); // ← VE QUÉ ENVÍA
  try {
    const actualizado = await api(`/pedidos/${id}/estado`, {
      method:"PATCH", 
      body:JSON.stringify({ 
        estado: estado.trim(),  // ← Elimina espacios
        observacion: ""
      })
    });
    setPedidos(prev => prev.map(p => p.id===id ? actualizado : p));
    if (detalle?.id===id) setDetalle(actualizado);
  } catch(e){ 
    alert("Error: " + e.message); 
  }
};

  // Agregar item al formulario
  const agregarItem = () => {
    if (!selProd) return;
    const prod = productos.find(p=>p.id===parseInt(selProd));
    if (!prod) return;
    const existe = items.find(i=>i.producto_id===prod.id);
    if (existe) {
      setItems(prev=>prev.map(i=>i.producto_id===prod.id ? {...i,cantidad:i.cantidad+selCant} : i));
    } else {
      setItems(prev=>[...prev,{
        producto_id: prod.id, nombre: prod.nombre, tipo: prod.tipo,
        stock: prod.stock_actual, precio: 0, cantidad: selCant
      }]);
    }
    setSelProd(""); setSelCant(1);
  };

  // Confirmar pedido
  const confirmarPedido = async () => {
    if (!form.cliente_id || !form.lista_precio_id) { setFormError("Completá cliente y lista de precio."); return; }
    if (items.length===0) { setFormError("Agregá al menos un producto."); return; }
    setGuardando(true); setFormError(null);
    try {
      const body = {
        cliente_id:      parseInt(form.cliente_id),
        lista_precio_id: parseInt(form.lista_precio_id),
        fecha_entrega:   form.fecha_entrega || null,
        items: items.map(i=>({ producto_id:i.producto_id, cantidad:i.cantidad, precio_unitario:i.precio||0 }))
      };
      const nuevo = await api("/pedidos", { method:"POST", body:JSON.stringify(body) });
      setPedidos(prev=>[nuevo,...prev]);
      setItems([]); setForm({ cliente_id:"", lista_precio_id:"", fecha_entrega:"" });
      setTab("lista");
    } catch(e){ setFormError(e.message); }
    finally { setGuardando(false); }
  };

  const total = items.reduce((s,i)=>s+(i.precio||0)*i.cantidad,0);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh" }}>
      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
     padding:"12px 24px", borderBottom:"1px solid #646464" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <i className="ti ti-clipboard-list" style={{ fontSize:18, color:"#78716c" }} />
          <span style={{ fontSize:15, fontWeight:600 }}>Pedidos de venta</span>
        </div>
        <button className="btn btn-primary" onClick={()=>setTab("nuevo")}>
          <i className="ti ti-plus" /> Nuevo pedido
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid #646464", padding:"0 24px" }}>
        {[["lista","Lista"],["nuevo","Nuevo pedido"],["monitor","Monitor"]].map(([t,l])=>(
          <div key={t} onClick={()=>setTab(t)} style={{
            padding:"10px 14px", fontSize:13, cursor:"pointer", //#78716c
            borderBottom: tab===t ? "2px solid #ffffff" : "2px solid transparent",
            fontWeight: tab===t ? 600 : 400, color: tab===t ? "#817e7e" : "#78716c",
            marginBottom:-1, transition:"color .15s"
          }}>{l}</div>
        ))}
      </div>

      {/* ── LISTA ── */}
      {tab==="lista" && (
        <div style={{ padding:20, flex:1, overflowY:"auto" }}>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {["todos",...ESTADOS].map(e=>(
              <button key={e} onClick={()=>setFiltro(e)}
                className={`btn btn-sm ${filtro===e?"btn-primary":""}`}>
                {e==="todos"?"Todos":e}
                <span style={{ marginLeft:4, opacity:.7 }}>
                  ({e==="todos"?pedidos.length:pedidos.filter(p=>p.estado===e).length})
                </span>
              </button>
            ))}
          </div>

          {cargando && <div className="spinner" />}
          {error    && <div className="error-msg">{error}</div>}

          {!cargando && !error && (
            <div className="card" style={{ padding:0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Número</th><th>Cliente</th><th>Lista</th>
                    <th>Total</th><th>Estado</th><th>Siguiente estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.length===0 && (
                    <tr><td colSpan={6} className="empty-state">No hay pedidos en este estado.</td></tr>
                  )}
                  {lista.map(p=>{
                    const idx = ESTADOS.indexOf(p.estado);
                    const sig = ESTADOS[idx+1];
                    return (
                      <tr key={p.id} onClick={()=>setDetalle(p)}>
                        <td><strong>{p.numero}</strong></td>
                        <td>{p.cliente_nombre || "—"}</td>
                        <td style={{ color:"#78716c" }}>{p.lista_nombre || "—"}</td>
                        <td>{fmt(p.total)}</td>
                        <td><span className={`badge ${BADGE[p.estado]||""}`}>{p.estado}</span></td>
                        <td>
                          {sig && (
                            <button className="btn btn-sm" onClick={e=>{e.stopPropagation();cambiarEstado(p.id,sig);}}>
                              → {sig}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── NUEVO PEDIDO ── */}
      {tab==="nuevo" && (
        <div style={{ padding:20, flex:1, overflowY:"auto" }}>
          <div className="card">
            {formError && <div className="error-msg">{formError}</div>}
            <div className="form-grid" style={{ marginBottom:20 }}>
              <div className="form-group">
                <label>Cliente</label>
                <select value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}>
                  <option value="">Seleccioná un cliente…</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Lista de precio</label>
                <select value={form.lista_precio_id} onChange={e=>setForm({...form,lista_precio_id:e.target.value})}>
                  <option value="">Seleccioná una lista…</option>
                  {listas.map(l=><option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha de entrega</label>
                <input type="date" value={form.fecha_entrega}
                  onChange={e=>setForm({...form,fecha_entrega:e.target.value})} />
              </div>
            </div>

            <div style={{ fontSize:12, fontWeight:600, color:"#78716c",
              textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>
              Productos
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              <select value={selProd} onChange={e=>setSelProd(e.target.value)} style={{ flex:1, minWidth:180 }}>
                <option value="">Seleccioná un producto…</option>
                {productos.map(p=>(
                  <option key={p.id} value={p.id}>
                    {p.nombre} — Stock: {p.stock_actual} {p.unidad}
                  </option>
                ))}
              </select>
              <input type="number" min={1} value={selCant}
                onChange={e=>setSelCant(parseInt(e.target.value)||1)}
                style={{ width:80 }} />
              <button className="btn" onClick={agregarItem}>
                <i className="ti ti-plus" /> Agregar
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Producto</th><th>Tipo</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.length===0 && (
                  <tr><td colSpan={6} className="empty-state" style={{padding:"20px 0"}}>
                    Añadí productos para comenzar.
                  </td></tr>
                )}
                {items.map(it=>(
                  <tr key={it.producto_id}>
                    <td>{it.nombre}</td>
                    <td>
                      <span className={`badge ${it.tipo==="compuesto"?"badge-fabricacion":""}`}
                        style={it.tipo!=="compuesto"?{background:"#f5f5f4",color:"#78716c"}:{}}>
                        {it.tipo}
                      </span>
                    </td>
                    <td>
                      <input type="number" min={1} value={it.cantidad} style={{ width:60 }}
                        onChange={e=>setItems(prev=>prev.map(i=>
                          i.producto_id===it.producto_id ? {...i,cantidad:parseInt(e.target.value)||1} : i
                        ))} />
                    </td>
                    <td>
                      <input type="number" min={0} value={it.precio} style={{ width:100 }}
                        placeholder="$0"
                        onChange={e=>setItems(prev=>prev.map(i=>
                          i.producto_id===it.producto_id ? {...i,precio:parseFloat(e.target.value)||0} : i
                        ))} />
                    </td>
                    <td>{fmt((it.precio||0)*it.cantidad)}</td>
                    <td>
                      <button className="btn btn-sm btn-danger"
                        onClick={()=>setItems(prev=>prev.filter(i=>i.producto_id!==it.producto_id))}>
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center",
              gap:20, padding:"14px 0 0", borderTop:"1px solid #e7e5e4", marginTop:4 }}>
              <span style={{ color:"#78716c", fontSize:13 }}>Total</span>
              <span style={{ fontSize:20, fontWeight:600 }}>{fmt(total)}</span>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
              <button className="btn" onClick={()=>setTab("lista")}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarPedido} disabled={guardando}>
                {guardando
                  ? <><i className="ti ti-loader-2" /> Guardando...</>
                  : <><i className="ti ti-check" /> Confirmar pedido</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MONITOR ── */}
      {tab==="monitor" && (
        <div style={{ padding:20, flex:1, overflowY:"auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
            {ESTADOS.filter(e=>e!=="Entregado").map(estado=>{
              const peds = pedidos.filter(p=>p.estado===estado);
              return (
                <div key={estado}>
                  <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase",
                    letterSpacing:".05em", color:"#78716c", marginBottom:8, display:"flex",
                    alignItems:"center", gap:6 }}>
                    <span className={`badge ${BADGE[estado]}`}>{estado}</span>
                    <span style={{ color:"#a8a29e" }}>({peds.length})</span>
                  </div>
                  {peds.length===0 && (
                    <div className="card" style={{ padding:16, textAlign:"center",
                      color:"#a8a29e", fontSize:12 }}>Sin pedidos</div>
                  )}
                  {peds.map(p=>(
                    <div key={p.id} className="card"
                      style={{ marginBottom:8, cursor:"pointer", padding:"12px 14px" }}
                      onClick={()=>setDetalle(p)}>
                      <div style={{ fontSize:11, color:"#78716c" }}>{p.numero}</div>
                      <div style={{ fontSize:13, fontWeight:600, margin:"4px 0" }}>
                        {p.cliente_nombre || "Sin cliente"}
                      </div>
                      <div style={{ fontSize:11, color:"#a8a29e" }}>
                        {p.fecha_entrega
                          ? "Entrega: " + new Date(p.fecha_entrega).toLocaleDateString("es-AR")
                          : "Sin fecha"}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

{/* ── PANEL DETALLE ── */}
{detalle && (
  <div onClick={()=>setDetalle(null)} style={{
    position:"fixed", inset:0, background:"rgba(0,0,0,.3)",
    display:"flex", justifyContent:"flex-end", zIndex:200 }}>
    <div onClick={e=>e.stopPropagation()} style={{
      width: "min(360px,90%)", 
      background:"#1a1918",  // ✅ CAMBIAR: Fondo oscuro
      color:"#ffffff",       // ✅ CAMBIAR: Texto blanco
      height:"100%",
      borderLeft:"1px solid #363432", 
      padding:20, overflowY:"auto",
      display:"flex", flexDirection:"column", gap:16 }}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600 }}>{detalle.numero}</div>
                <span className={`badge ${BADGE[detalle.estado]}`} style={{ marginTop:6, display:"inline-flex" }}>
                  {detalle.estado}
                </span>
              </div>
              <button onClick={()=>setDetalle(null)}
                style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#78716c" }}>
                ×
              </button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                ["Cliente",       detalle.cliente_nombre||"—"],
                ["Total",         fmt(detalle.total)],
                ["Lista",         detalle.lista_nombre||"—"],
                ["Fecha entrega", detalle.fecha_entrega
                  ? new Date(detalle.fecha_entrega).toLocaleDateString("es-AR") : "—"],
              ].map(([l,v])=>(
                <div key={l}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#78716c",
                    textTransform:"uppercase", letterSpacing:".05em" }}>{l}</div>
                  <div style={{ fontSize:13, marginTop:3 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Cambiar estado */}
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#78716c",
                textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>
                Cambiar estado
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {ESTADOS.slice(ESTADOS.indexOf(detalle.estado)+1).slice(0,2).map(s=>(
                  <button key={s} className="btn btn-sm"
                    onClick={()=>cambiarEstado(detalle.id, s)}>
                    → {s}
                  </button>
                ))}
                {ESTADOS.indexOf(detalle.estado)===ESTADOS.length-1 && (
                  <span style={{ fontSize:12, color:"#78716c" }}>Pedido finalizado.</span>
                )}
              </div>
            </div>

            {/* Items */}
            {detalle.items?.length>0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:"#78716c",
                  textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>
                  Productos
                </div>
                {detalle.items.map(i=>(
                  <div key={i.id} style={{ display:"flex", justifyContent:"space-between",
                    padding:"8px 0", borderBottom:"1px solid #f5f5f4", fontSize:13 }}>
                    <span>{i.producto_nombre||`Producto #${i.producto_id}`} ×{Number(i.cantidad)}</span>
                    <span style={{ fontWeight:500 }}>{fmt(i.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
