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

const LISTAS_DEFAULT = [
  { id: 1, nombre: "Mayorista" },
  { id: 2, nombre: "Minorista" },
  { id: 3, nombre: "Especial" },
];

export default function Clientes() {
  const api = useApi();
  const [clientes,  setClientes]  = useState([]);
  const [listas,    setListas]    = useState(LISTAS_DEFAULT);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);
  const [modal,     setModal]     = useState(false);
  const [editando,  setEditando]  = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState(null);
  const [busqueda,  setBusqueda]  = useState("");

  const [form, setForm] = useState({
    razon_social: "", cuit: "", telefono: "",
    email: "", direccion: "", lista_precio_id: "",
  });

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const [c, l] = await Promise.all([
        api("/clientes"),
        api("/listas-precio").catch(() => LISTAS_DEFAULT),
      ]);
      setClientes(c); setListas(l);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ razon_social:"", cuit:"", telefono:"", email:"", direccion:"", lista_precio_id:"" });
    setFormError(null); setModal(true);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    setForm({
      razon_social: c.razon_social, cuit: c.cuit||"",
      telefono: c.telefono||"", email: c.email||"",
      direccion: c.direccion||"", lista_precio_id: c.lista_precio_id||"",
    });
    setFormError(null); setModal(true);
  };

  const guardar = async () => {
    if (!form.razon_social) { setFormError("La razón social es obligatoria."); return; }
    setGuardando(true); setFormError(null);
    try {
      const body = { ...form, lista_precio_id: form.lista_precio_id ? parseInt(form.lista_precio_id) : null };
      if (editando) {
        const actualizado = await api(`/clientes/${editando.id}`, { method:"PUT", body:JSON.stringify(body) });
        setClientes(prev => prev.map(c => c.id === editando.id ? actualizado : c));
      } else {
        const nuevo = await api("/clientes", { method:"POST", body:JSON.stringify(body) });
        setClientes(prev => [nuevo, ...prev]);
      }
      setModal(false);
    } catch (e) { setFormError(e.message); }
    finally { setGuardando(false); }
  };

  const lista = clientes.filter(c =>
    c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.cuit||"").includes(busqueda) ||
    (c.email||"").toLowerCase().includes(busqueda.toLowerCase())
  );

  const nombreLista = (id) => listas.find(l => l.id === id)?.nombre || "—";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh" }}>
      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 24px", borderBottom:"1px solid var(--color-border)",
        background:"var(--color-surface)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <i className="ti ti-address-book" style={{ fontSize:18, color:"var(--color-muted)" }} />
          <span style={{ fontSize:15, fontWeight:600 }}>Clientes</span>
          <span style={{ fontSize:12, color:"var(--color-muted)", marginLeft:4 }}>({clientes.length})</span>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>
          <i className="ti ti-plus" /> Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <div style={{ padding:"12px 24px", borderBottom:"1px solid var(--color-border)",
        background:"var(--color-surface)" }}>
        <input placeholder="Buscar por razón social, CUIT o email…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth:340 }} />
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
                  <th>Razón social</th>
                  <th>CUIT</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Lista de precio</th>
                  <th>Deuda</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">
                    {busqueda ? "Sin resultados." : "No hay clientes cargados."}
                  </td></tr>
                )}
                {lista.map(c => (
                  <tr key={c.id} onClick={() => abrirEditar(c)}>
                    <td><strong>{c.razon_social}</strong></td>
                    <td style={{ color:"var(--color-muted)", fontFamily:"monospace", fontSize:12 }}>
                      {c.cuit || "—"}
                    </td>
                    <td style={{ color:"var(--color-muted)" }}>{c.telefono || "—"}</td>
                    <td style={{ color:"var(--color-muted)" }}>{c.email || "—"}</td>
                    <td>
                      <span className="badge" style={{ background:"var(--color-hover)", color:"var(--color-muted)" }}>
                        {nombreLista(c.lista_precio_id)}
                      </span>
                    </td>
                    <td style={{ color: Number(c.deuda_total) > 0 ? "var(--color-danger)" : "var(--color-muted)" }}>
                      ${Number(c.deuda_total||0).toLocaleString("es-AR", { minimumFractionDigits:2 })}
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={e => { e.stopPropagation(); abrirEditar(c); }}>
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

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.4)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:"var(--color-surface)", borderRadius:14, padding:24,
            width:"min(520px,95%)", boxShadow:"0 8px 40px rgba(0,0,0,.15)" }}>

            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ fontSize:15, fontWeight:600, color:"var(--color-text)" }}>
                {editando ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <button onClick={() => setModal(false)}
                style={{ background:"none", border:"none", fontSize:20,
                  cursor:"pointer", color:"var(--color-muted)" }}>×</button>
            </div>

            {formError && <div className="error-msg">{formError}</div>}

            <div className="form-group">
              <label>Razón social *</label>
              <input value={form.razon_social}
                onChange={e => setForm({ ...form, razon_social: e.target.value })}
                placeholder="Empresa S.R.L." />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>CUIT</label>
                <input value={form.cuit}
                  onChange={e => setForm({ ...form, cuit: e.target.value })}
                  placeholder="30-12345678-9" />
              </div>
              <div className="form-group">
                <label>Lista de precio</label>
                <select value={form.lista_precio_id}
                  onChange={e => setForm({ ...form, lista_precio_id: e.target.value })}>
                  <option value="">Sin lista asignada</option>
                  {listas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  placeholder="011-4444-5555" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@email.com" />
              </div>
            </div>

            <div className="form-group">
              <label>Dirección</label>
              <input value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
                placeholder="Av. Corrientes 1234, CABA" />
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:8 }}>
              <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando
                  ? <><i className="ti ti-loader-2" /> Guardando...</>
                  : <><i className="ti ti-check" /> {editando ? "Guardar cambios" : "Crear cliente"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}