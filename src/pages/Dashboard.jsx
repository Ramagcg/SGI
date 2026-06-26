import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import dashboardService from "../services/dashboardService";

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
        <div style={{ fontSize: 22, fontWeight: 600 }}>{valor ?? 0}</div>
        <div style={{ fontSize: 12, color: "#78716c" }}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState({
    pedidos: 0,
    enFabricacion: 0,
    clientes: 0,
    productos: 0
  });
  const [estadoPedidos, setEstadoPedidos] = useState({
    pendiente: 0,
    fabricacion: 0,
    calidad: 0,
    listo: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carga estadísticas generales y estado de pedidos en paralelo
        const [stats, estado] = await Promise.all([
          dashboardService.obtenerEstadisticas(),
          dashboardService.obtenerEstadoPedidos()
        ]);

        setStats(stats);
        setEstadoPedidos(estado);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setError("No se pudieron cargar los datos del dashboard");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();

    // Opcionalmente: recargar cada 30 segundos para mantener datos actualizados
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="page">
        <div style={{
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: 8,
          padding: 16,
          color: "#c00",
          marginBottom: 20
        }}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

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
        <StatCard icon="ti-clipboard-list" label="Pedidos activos"    valor={stats.pedidos}       color="#2563eb" />
        <StatCard icon="ti-hammer"         label="En fabricación"     valor={stats.enFabricacion} color="#d97706" />
        <StatCard icon="ti-address-book"   label="Clientes"           valor={stats.clientes}      color="#16a34a" />
        <StatCard icon="ti-package"        label="Productos en stock" valor={stats.productos}     color="#7c3aed" />
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
          { estado: "Pendiente",          clase: "badge-pendiente",   key: "pendiente" },
          { estado: "En Fabricación",     clase: "badge-fabricacion", key: "fabricacion" },
          { estado: "Control de Calidad", clase: "badge-calidad",     key: "calidad" },
          { estado: "Listo para Retirar", clase: "badge-listo",       key: "listo" },
        ].map(e => (
          <div key={e.estado} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid #f5f5f4"
          }}>
            <span className={`badge ${e.clase}`}>{e.estado}</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {estadoPedidos[e.key]} pedidos
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}