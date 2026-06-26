import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";


const nav = [
  { to: "/",          icon: "ti-dashboard",      label: "Dashboard"  },
  { to: "/pedidos",   icon: "ti-clipboard-list",  label: "Pedidos"    },
  { to: "/productos", icon: "ti-package",         label: "Productos"  },
  { to: "/stock",     icon: "ti-box",           label: "Stock"      },
  { to: "/clientes",  icon: "ti-address-book",    label: "Clientes"   },
  { to: "/monitor",   icon: "ti-device-tv",       label: "Monitor"    },
  { to: "/reportes",  icon: "ti-chart-bar",       label: "Reportes"   },
  { to: "/usuarios",  icon: "ti-users",           label: "Usuarios"   },
];

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const { dark, toggle }    = useTheme();
  const navigate            = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid var(--color-border)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, background:"var(--color-text)", borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <i className="ti ti-settings" style={{ color:"var(--color-bg)", fontSize:16 }} />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--color-text)" }}>SGI</div>
              <div style={{ fontSize:11, color:"var(--color-muted)" }}>Metalúrgica</div>
            </div>
          </div>
        </div>

        <nav style={{ padding:"8px", flex:1, overflowY:"auto" }}>
          {nav.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              style={({ isActive }) => ({
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 10px", borderRadius:8, marginBottom:2,
                textDecoration:"none", fontSize:13, fontWeight:500,
                color:      isActive ? "var(--color-text)"  : "var(--color-muted)",
                background: isActive ? "var(--color-hover)" : "transparent",
              })}>
              <i className={`ti ${icon}`} style={{ fontSize:17 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:"12px 16px", borderTop:"1px solid var(--color-border)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--color-muted)" }}>
              <i className={`ti ${dark ? "ti-moon" : "ti-sun"}`} style={{ fontSize:15 }} />
              {dark ? "Modo oscuro" : "Modo claro"}
            </div>

        <button className={`theme-toggle ${dark ? "on" : ""}`} 
        onClick={toggle} title="Cambiar tema" aria-label="Cambiar tema"
        style={{border: dark ? "none" : "2px solid #000000",
        }} />
        
          </div>
          <div style={{ fontSize:12, fontWeight:600, color:"var(--color-text)", marginBottom:2 }}>{usuario?.nombre}</div>
          <div style={{ fontSize:11, color:"var(--color-muted)", marginBottom:10 }}>{usuario?.rol}</div>
          <button className="btn btn-sm" style={{ width:"100%" }} onClick={handleLogout}>
            <i className="ti ti-logout" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
