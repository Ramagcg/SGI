import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function StatCard({ icon, label, valor, color }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: color + "18", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 22, color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{valor}</div>
        <div style={{ fontSize: 12, color: "#78716c" }}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats({ pedidos: 0, enFabricacion: 0, clientes: 0, productos: 0 });
  }, []);

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>
          Bienvenido, {usuario?.nombre} 👋
        </h2>
        <p style={{ color: "#78716c", fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
          })}
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 14, marginBottom: 28
      }}>
        <StatCard icon="ti-clipboard-list" label="Pedidos activos"    valor={stats?.pedidos}       color="#2563eb" />
        <StatCard icon="ti-hammer"         label="En fabricación"     valor={stats?.enFabricacion} color="#d97706" />
        <StatCard icon="ti-address-book"   label="Clientes"           valor={stats?.clientes}      color="#16a34a" />
        <StatCard icon="ti-package"        label="Productos en stock" valor={stats?.productos}     color="#7c3aed" />
      </div>

      {/* Accesos rápidos */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#78716c",
          textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>
          Accesos rápidos
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { icon: "ti-plus",         label: "Nuevo pedido",  href: "/pedidos"   },
            { icon: "ti-package",      label: "Ver stock",     href: "/stock"     },
            { icon: "ti-device-tv",    label: "Monitor",       href: "/monitor"   },
            { icon: "ti-chart-bar",    label: "Reportes",      href: "/reportes"  },
          ].map(a => (
            <a key={a.href} href={a.href} className="btn">
              <i className={`ti ${a.icon}`} /> {a.label}
            </a>
          ))}
        </div>
      </div>

      {/* Estado de pedidos */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          Estado de pedidos
        </div>
        {[
          { estado: "Pendiente",          clase: "badge-pendiente",   n: 0 },
          { estado: "En Fabricación",     clase: "badge-fabricacion", n: 0 },
          { estado: "Control de Calidad", clase: "badge-calidad",     n: 0 },
          { estado: "Listo para Retirar", clase: "badge-listo",       n: 0 },
        ].map(e => (
          <div key={e.estado} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid #f5f5f4"
          }}>
            <span className={`badge ${e.clase}`}>{e.estado}</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{e.n} pedidos</span>
          </div>
        ))}
      </div>
    </div>
  );
}