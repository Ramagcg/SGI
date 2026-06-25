import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const ROLES = ["Administrador", "Vendedor", "Producción", "Almacén", "Consulta"];

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

function rolColor(rol) {
  const colores = {
    Administrador: ["#dbeafe", "#1e40af"],
    Vendedor: ["#dcfce7", "#166534"],
    Producción: ["#fef3c7", "#92400e"],
    Almacén: ["#ede9fe", "#6d28d9"],
    Consulta: ["var(--color-hover)", "var(--color-muted)"],
  };
  return colores[rol] || colores.Consulta;
}

function estadoUsuario(activo) {
  return activo
    ? { label: "Activo", color: "#16a34a", bg: "#dcfce7" }
    : { label: "Inactivo", color: "#dc2626", bg: "#fee2e2" };
}

function iniciales(nombre = "") {
  const partes = nombre.trim().split(" ").filter(Boolean);
  if (partes.length === 0) return "U";
  return partes.slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function formatFecha(value) {
  if (!value) return "Sin fecha";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleDateString("es-AR");
}

function Stat({ icon, label, value, color }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20, color }} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const api = useApi();
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    rol: "Vendedor",
    activo: true,
    password: "",
  });

  const usuariosFallback = useMemo(() => ([
    {
      id: usuario?.id || 1,
      nombre: usuario?.nombre || "Administrador",
      email: usuario?.email || "admin@sgi.com",
      rol: usuario?.rol || "Administrador",
      activo: true,
      creado_en: new Date().toISOString(),
    },
  ]), [usuario]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setAviso(null);
    try {
      const data = await api("/usuarios/");
      setUsuarios(Array.isArray(data) ? data : []);
    } catch {
      setUsuarios(usuariosFallback);
      setAviso("La API de usuarios todavía no está disponible. Se muestra una vista preparada con el usuario actual.");
    } finally {
      setCargando(false);
    }
  }, [api, usuariosFallback]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: "", email: "", rol: "Vendedor", activo: true, password: "" });
    setFormError(null);
    setModal(true);
  };

  const abrirEditar = (u) => {
    setEditando(u);
    setForm({
      nombre: u.nombre || "",
      email: u.email || "",
      rol: u.rol || "Consulta",
      activo: u.activo !== false,
      password: "",
    });
    setFormError(null);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    if (!form.email.trim()) { setFormError("El email es obligatorio."); return; }
    if (!editando && !form.password.trim()) { setFormError("La contraseña inicial es obligatoria."); return; }

    setGuardando(true);
    setFormError(null);

    const body = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
      activo: form.activo,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (editando) {
        const actualizado = await api(`/usuarios/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setUsuarios(prev => prev.map(u => u.id === editando.id ? actualizado : u));
      } else {
        const nuevo = await api("/usuarios/", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setUsuarios(prev => [nuevo, ...prev]);
      }
      setModal(false);
    } catch {
      const local = {
        id: editando?.id || Date.now(),
        ...body,
        creado_en: editando?.creado_en || new Date().toISOString(),
      };
      setUsuarios(prev => editando
        ? prev.map(u => u.id === editando.id ? local : u)
        : [local, ...prev]
      );
      setAviso("Cambios guardados solo en esta pantalla porque falta conectar el backend de usuarios.");
      setModal(false);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (u) => {
    const actualizadoLocal = { ...u, activo: !u.activo };
    setUsuarios(prev => prev.map(item => item.id === u.id ? actualizadoLocal : item));
    try {
      const actualizado = await api(`/usuarios/${u.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ activo: actualizadoLocal.activo }),
      });
      setUsuarios(prev => prev.map(item => item.id === u.id ? actualizado : item));
    } catch {
      setAviso("El cambio de estado quedó simulado en el frontend hasta implementar la API de usuarios.");
    }
  };

  const lista = usuarios.filter(u => {
    const texto = `${u.nombre || ""} ${u.email || ""} ${u.rol || ""}`.toLowerCase();
    const matchBusqueda = texto.includes(busqueda.toLowerCase());
    const matchRol = filtroRol === "todos" || u.rol === filtroRol;
    const matchEstado = filtroEstado === "todos" ||
      (filtroEstado === "activos" && u.activo !== false) ||
      (filtroEstado === "inactivos" && u.activo === false);
    return matchBusqueda && matchRol && matchEstado;
  });

  const activos = usuarios.filter(u => u.activo !== false).length;
  const admins = usuarios.filter(u => u.rol === "Administrador").length;
  const rolesUsados = new Set(usuarios.map(u => u.rol).filter(Boolean)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)", gap: 12, flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-users" style={{ fontSize: 18, color: "var(--color-muted)" }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Usuarios</span>
          <span style={{ fontSize: 12, color: "var(--color-muted)" }}>({usuarios.length})</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={cargar}>
            <i className="ti ti-refresh" /> Actualizar
          </button>
          <button className="btn btn-primary" onClick={abrirNuevo}>
            <i className="ti ti-user-plus" /> Nuevo usuario
          </button>
        </div>
      </div>

      <div style={{
        padding: "14px 24px", borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12
      }}>
        <Stat icon="ti-users" label="Usuarios cargados" value={usuarios.length} color="#2563eb" />
        <Stat icon="ti-user-check" label="Usuarios activos" value={activos} color="#16a34a" />
        <Stat icon="ti-shield-lock" label="Administradores" value={admins} color="#7c3aed" />
        <Stat icon="ti-id-badge-2" label="Roles en uso" value={rolesUsados} color="#d97706" />
      </div>

      <div style={{
        padding: "12px 24px", borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)", display: "flex", gap: 10,
        flexWrap: "wrap", alignItems: "center"
      }}>
        <input
          placeholder="Buscar por nombre, email o rol..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 280, padding: "7px 10px" }}
        />
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} style={{ width: 170 }}>
          <option value="todos">Todos los roles</option>
          {ROLES.map(rol => <option key={rol} value={rol}>{rol}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: 150 }}>
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        {aviso && (
          <div style={{
            border: "1px solid rgba(217,119,6,.25)", background: "rgba(217,119,6,.08)",
            color: "var(--color-warning)", borderRadius: 10, padding: "10px 14px",
            fontSize: 13, marginBottom: 14
          }}>
            {aviso}
          </div>
        )}

        {cargando && <div className="spinner" />}

        {!cargando && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Alta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">No hay usuarios para los filtros seleccionados.</td></tr>
                )}
                {lista.map(u => {
                  const [rolBg, rolText] = rolColor(u.rol);
                  const estado = estadoUsuario(u.activo !== false);
                  return (
                    <tr key={u.id} onClick={() => abrirEditar(u)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 9, background: "var(--color-text)",
                            color: "var(--color-bg)", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0
                          }}>
                            {iniciales(u.nombre)}
                          </div>
                          <strong>{u.nombre}</strong>
                        </div>
                      </td>
                      <td style={{ color: "var(--color-muted)" }}>{u.email}</td>
                      <td>
                        <span className="badge" style={{ background: rolBg, color: rolText }}>
                          {u.rol || "Sin rol"}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: estado.bg, color: estado.color }}>
                          {estado.label}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-muted)" }}>{formatFecha(u.creado_en)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn btn-sm" title="Editar usuario"
                            onClick={e => { e.stopPropagation(); abrirEditar(u); }}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button className="btn btn-sm" title={u.activo !== false ? "Desactivar" : "Activar"}
                            onClick={e => { e.stopPropagation(); cambiarEstado(u); }}>
                            <i className={`ti ${u.activo !== false ? "ti-user-off" : "ti-user-check"}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--color-surface)", borderRadius: 14, padding: 24,
            width: "min(520px,95%)", boxShadow: "0 8px 40px rgba(0,0,0,.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                  {editando ? "Editar usuario" : "Nuevo usuario"}
                </h3>
                <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 3 }}>
                  {editando ? "Actualizá los permisos y datos de acceso." : "Cargá los datos iniciales para el acceso al sistema."}
                </div>
              </div>
              <button onClick={() => setModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-muted)" }}>
                ×
              </button>
            </div>

            {formError && <div className="error-msg">{formError}</div>}

            <div className="form-grid">
              <div className="form-group">
                <label>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre y apellido" autoFocus />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                  {ROLES.map(rol => <option key={rol} value={rol}>{rol}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@sgi.com" />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>{editando ? "Nueva contraseña" : "Contraseña inicial *"}</label>
                <input type="password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={editando ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <button type="button" className={`btn ${form.activo ? "btn-primary" : ""}`}
                  onClick={() => setForm({ ...form, activo: !form.activo })}
                  style={{ justifyContent: "center", height: 37 }}>
                  <i className={`ti ${form.activo ? "ti-user-check" : "ti-user-off"}`} />
                  {form.activo ? "Activo" : "Inactivo"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando
                  ? <><i className="ti ti-loader-2" /> Guardando...</>
                  : <><i className="ti ti-check" /> {editando ? "Guardar cambios" : "Crear usuario"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
