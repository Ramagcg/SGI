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

const TIPOS = ["simple", "compuesto"];
const UNIDADES = ["unidad", "metro", "kg", "litro", "par"];

export default function Productos() {
  const api = useApi();
  const [productos,  setProductos]  = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState(null);
  const [modal,      setModal]      = useState(false);
  const [editando,   setEditando]   = useState(null);
  const [guardando,  setGuardando]  = useState(false);
  const [formError,  setFormError]  = useState(null);
  const [busqueda,   setBusqueda]   = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [form, setForm] = useState({
    codigo: "", nombre: "", tipo: "simple",
    stock_actual: 0, stock_minimo: 0, unidad: "unidad",
  });

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try { setProductos(await api("/productos")); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ codigo:"", nombre:"", tipo:"simple", stock_actual:0, stock_minimo:0, unidad:"unidad" });
    setFormError(null);
    setModal(true);
  };

  const abrirEditar = (p) => {
    setEditando(p);
    setForm({ codigo:p.codigo, nombre:p.nombre, tipo:p.tipo,
      stock_actual:p.stock_actual, stock_minimo:p.stock_minimo, unidad:p.unidad });
    setFormError(null);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.codigo || !form.nombre) { setFormError("Código y nombre son obligatorios."); return; }
    setGuardando(true); setFormError(null);
    try {
      if (editando) {
        const actualizado = await api(`/productos/${editando.id}`, {
          method: "PUT", body: JSON.stringify(form),
        });
        setProductos(prev => prev.map(p => p.id === editando.id ? actualizado : p));
      } else {
        const nuevo = await api("/productos", { method:"POST", body:JSON.stringify(form) });
        setProductos(prev => [nuevo, ...prev]);
      }
      setModal(false);
    } catch (e) { setFormError(e.message); }
    finally { setGuardando(false); }
  };

  // Filtrado
  const lista = productos.filter(p => {
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                      p.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === "todos" || p.tipo === filtroTipo;
    return matchBusq && matchTipo;
  });

  const stockColor = (actual, minimo) => {
    if (actual <= 0)      return "#dc2626";
    if (actual <= minimo) return "#d97706";
    return "#16a34a";
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh" }}>
      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
       padding:"12px 24px", borderBottom:"1px solid var(--color-border)", background:"var(--color-surface)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <i className="ti ti-package" style={{ fontSize:18, color:"var(--color-muted)" }} />
          <span style={{ fontSize:15, fontWeight:600 }}>Productos</span>
          <span style={{ fontSize:12, color:"var(--color-muted)", marginLeft:4 }}>({productos.length})</span>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>
          <i className="ti ti-plus" /> Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div style={{ padding:"12px 24px", borderBottom:"1px solid var(--color-border)",
        background:"var(--color-surface)", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="Buscar por nombre o código…" value={busqueda}
          onChange={e=>setBusqueda(e.target.value)}
          style={{ width:260, padding:"7px 10px" }} />
        {["todos","simple","compuesto"].map(t=>(
          <button key={t} className={`btn btn-sm ${filtroTipo===t?"btn-primary":""}`}
            onClick={()=>setFiltroTipo(t)}>
            {t==="todos"?"Todos":t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Contenido */}
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
                  <th>Stock actual</th>
                  <th>Stock mínimo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">
                    {busqueda ? "Sin resultados para tu búsqueda." : "No hay productos cargados."}
                  </td></tr>
                )}
                {lista.map(p => (
                  <tr key={p.id} onClick={()=>abrirEditar(p)}>
                    <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--color-muted)" }}>{p.codigo}</td>
                    <td><strong>{p.nombre}</strong></td>
                    <td>
                      <span className="badge"
                        style={ p.tipo==="compuesto"
                          ? { background:"var(--color-info)", color:"var(--color-bg)" }
                          : { background:"var(--color-hover)", color:"var(--color-muted)" }}>
                        {p.tipo}
                      </span>
                    </td>
                    <td style={{ color:"var(--color-muted)" }}>{p.unidad}</td>
                    <td>
                      <span style={{ fontWeight:600, color: stockColor(p.stock_actual, p.stock_minimo) }}>
                        {Number(p.stock_actual).toLocaleString("es-AR")}
                      </span>
                    </td>
                    <td style={{ color:"var(--color-muted)" }}>{Number(p.stock_minimo).toLocaleString("es-AR")}</td>
                    <td>
                      <button className="btn btn-sm" onClick={e=>{e.stopPropagation();abrirEditar(p);}}>
                        <i className="ti ti-pencil" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo/editar */}
      {modal && (
        <div onClick={()=>setModal(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.4)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"var(--color-surface)", borderRadius:14, padding:24,
            width:"min(480px,95%)", boxShadow:"0 8px 40px rgba(0,0,0,.15)" }}>

            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ fontSize:15, fontWeight:600, color:"var(--color-text)" }}>
                {editando ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button onClick={()=>setModal(false)}
                style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--color-muted)" }}>×</button>
            </div>

            {formError && <div className="error-msg">{formError}</div>}

            <div className="form-grid">
              <div className="form-group">
                <label>Código *</label>
                <input value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}
                  placeholder="VIG-001" />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                  {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Nombre *</label>
              <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                placeholder="Viga HEB 200" />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Stock actual</label>
                <input type="number" min={0} value={form.stock_actual}
                  onChange={e=>setForm({...form,stock_actual:parseFloat(e.target.value)||0})} />
              </div>
              <div className="form-group">
                <label>Stock mínimo</label>
                <input type="number" min={0} value={form.stock_minimo}
                  onChange={e=>setForm({...form,stock_minimo:parseFloat(e.target.value)||0})} />
              </div>
              <div className="form-group">
                <label>Unidad</label>
                <select value={form.unidad} onChange={e=>setForm({...form,unidad:e.target.value})}>
                  {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:8 }}>
              <button className="btn" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando
                  ? <><i className="ti ti-loader-2" /> Guardando...</>
                  : <><i className="ti ti-check" /> {editando?"Guardar cambios":"Crear producto"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}