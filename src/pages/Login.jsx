import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form,     setForm]     = useState({ email: "", password: "" });
  const [error,    setError]    = useState(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>

        {/* Logo / título */}
        <div style={styles.header}>
          <div style={styles.iconBox}>
            <i className="ti ti-settings" style={{ fontSize: 24, color: "#fff" }} />
          </div>
          <h1 style={styles.title}>SGI</h1>
          <p style={styles.sub}>Sistema de Gestión Integrado</p>
        </div>

        {/* Error */}
        {error && <div className="error-msg">{error}</div>}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@sgi.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            disabled={cargando}
          >
            {cargando
              ? <><i className="ti ti-loader-2" style={{ animation: "spin .6s linear infinite" }} /> Ingresando...</>
              : <><i className="ti ti-login" /> Ingresar</>
            }
          </button>
        </form>

        <p style={styles.hint}>
          Metalúrgica · Escuela Técnica N°32 · 2025
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f4",
    padding: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e7e5e4",
    borderRadius: 16,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 4px 24px rgba(0,0,0,.06)",
  },
  header: {
    textAlign: "center",
    marginBottom: 28,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "#1c1917",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    color: "#1c1917",
    margin: "0 0 4px",
  },
  sub: {
    fontSize: 13,
    color: "#78716c",
  },
  hint: {
    textAlign: "center",
    fontSize: 11,
    color: "#a8a29e",
    marginTop: 24,
  },
};
