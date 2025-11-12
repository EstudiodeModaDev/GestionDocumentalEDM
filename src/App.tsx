// src/App.tsx
import * as React from "react";
import "./App.css";

// === Providers ===
import { AuthProvider, useAuth } from "./auth/authContext";
import { GraphServicesProvider, useGraphServices } from "./graph/GrapServicesContext";
import { useUserRoleFromSP } from "./Funcionalidades/useUserRoleFromSP";

// === Componentes base ===
import WelcomeEDM from "./components/Welcome/WelcomeEDM";
import AreasPanel from "./components/Areas/AreasPanel";
import CompaniasPanel from "./components/Companias/CompaniasPanel"; // 👈 nuevo módulo

// === Iconos ===
import homeIcon from "./assets/home.svg";
import areasIcon from "./assets/areas.svg";
import companyIcon from "./assets/company.svg"; // 👈 agrega un icono simple (puede ser temporal)

/* ============================================================
   🔹 Tipos generales de navegación
   ============================================================ */
type Role =
  | "AdministradorGeneral"
  | "AdministradorArea"
  | "ResponsableSubarea"
  | "UsuarioSubarea";

type RenderCtx = { services?: ReturnType<typeof useGraphServices> };

export type MenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  to?: React.ReactNode | ((ctx: RenderCtx) => React.ReactNode);
  roles?: Role[];
  children?: MenuItem[];
  autocollapse?: boolean;
};

export type NavContext = { role: Role };

/* ============================================================
   🔹 Árbol de navegación inicial
   ============================================================ */
const NAV: MenuItem[] = [
  {
    id: "home",
    label: "Inicio",
    icon: <img src={homeIcon} className="sb-icon" alt="" />,
    to: <WelcomeEDM />,
    roles: ["AdministradorGeneral", "AdministradorArea", "ResponsableSubarea", "UsuarioSubarea"],
  },
  {
    id: "companias",
    label: "Compañías",
    icon: <img src={companyIcon} className="sb-icon" alt="" />, // 👈 nuevo ítem
    to: <CompaniasPanel />,
    roles: ["AdministradorGeneral"], // solo visible para el administrador general
  },
  {
    id: "areas",
    label: "Áreas",
    icon: <img src={areasIcon} className="sb-icon" alt="" />,
    to: <AreasPanel />,
    roles: ["AdministradorGeneral", "AdministradorArea"], // visible para administradores
  },
];

/* ============================================================
   🔹 Utilidades internas de navegación
   ============================================================ */
function filterNavTree(nodes: readonly MenuItem[], ctx: NavContext): MenuItem[] {
  return nodes
    .filter((n) => !n.roles || n.roles.includes(ctx.role))
    .map((n) => ({
      ...n,
      children: n.children ? filterNavTree(n.children, ctx) : undefined,
    }));
}

function firstLeafId(nodes: readonly MenuItem[]): string {
  const pick = (n: MenuItem): string => (n.children?.length ? pick(n.children[0]) : n.id);
  return nodes.length ? pick(nodes[0]) : "";
}

function findById(nodes: readonly MenuItem[], id: string): MenuItem | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const hit = findById(n.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

/* ============================================================
   🔹 Header superior con nombre y rol del usuario
   ============================================================ */
function HeaderBar(props: {
  onPrimaryAction?: { label: string; onClick: () => void; disabled?: boolean } | null;
  userName?: string;
  userRole?: string;
}) {
  const { onPrimaryAction, userName, userRole } = props;

  return (
    <header className="headerRow">
      <div className="header-inner">
        {/* Izquierda: nombre del sistema */}
        <div className="brand">
          <h1>Gestión Documental EDM</h1>
        </div>

        {/* Derecha: usuario + botón cerrar sesión */}
        <div className="userCluster">
          {userName && (
            <div className="userInfo">
              <span className="userName">{userName}</span>
              {userRole && <span className="userRole">{userRole}</span>}
            </div>
          )}

          {onPrimaryAction && (
            <button
              className="btn-logout"
              onClick={onPrimaryAction.onClick}
              disabled={onPrimaryAction.disabled}
              aria-busy={onPrimaryAction.disabled}
            >
              {onPrimaryAction.label}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   🔹 Sidebar (menú lateral)
   ============================================================ */
function Sidebar({
  navs,
  selected,
  onSelect,
  collapsed = false,
  onToggle,
}: {
  navs: readonly MenuItem[];
  selected: string;
  onSelect: (k: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__header">
        <div className="sb-brand">
          {!collapsed && (
            <>
              <span className="sb-logo">📂</span>
              <span className="sb-title">Menú</span>
            </>
          )}
        </div>
        <button className="sb-toggle" onClick={onToggle}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="sidebar__nav">
        <ul>
          {navs.map((n) => (
            <li key={n.id}>
              <button
                className={`sideItem ${selected === n.id ? "active" : ""}`}
                onClick={() => onSelect(n.id)}
              >
                {n.icon}
                {!collapsed && <span>{n.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

/* ============================================================
   🔹 Shell: control de autenticación + layout principal
   ============================================================ */
function Shell() {
  const { ready, account, signIn, signOut } = useAuth();
  const [loadingAuth, setLoadingAuth] = React.useState(false);
  const [userRole, setUserRole] = React.useState<string>(""); // rol actual del usuario autenticado
  const isLogged = Boolean(account);

  const handleAuthClick = async () => {
    if (!ready || loadingAuth) return;
    setLoadingAuth(true);
    try {
      if (isLogged) await signOut();
      else await signIn("popup");
    } finally {
      setLoadingAuth(false);
    }
  };

  const actionLabel = !ready
    ? "Cargando..."
    : loadingAuth
    ? isLogged
      ? "Cerrando..."
      : "Abriendo Microsoft..."
    : isLogged
    ? "Cerrar sesión"
    : "Iniciar sesión";

  if (!ready) {
    return (
      <div className="page layout">
        <HeaderBar onPrimaryAction={{ label: "Cargando...", onClick: () => {}, disabled: true }} />
        <section className="page-view">
          <p>Cargando autenticación...</p>
        </section>
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className="page layout">
        <HeaderBar
          onPrimaryAction={{
            label: actionLabel,
            onClick: handleAuthClick,
            disabled: loadingAuth,
          }}
        />
        <section className="page-view">
          <WelcomeEDM />
        </section>
      </div>
    );
  }

  return (
    <div className="page layout layout--withSidebar">
      <HeaderBar
        onPrimaryAction={{
          label: actionLabel,
          onClick: handleAuthClick,
          disabled: loadingAuth,
        }}
        userName={account?.name ?? account?.username ?? "Usuario"}
        userRole={userRole || "Cargando rol..."}
      />
      <LoggedApp account={account} onRoleResolved={setUserRole} />
    </div>
  );
}

/* ============================================================
   🔹 LoggedApp: Sidebar + Contenido dinámico
   ============================================================ */
function LoggedApp({
  account,
  onRoleResolved,
}: {
  account: any;
  onRoleResolved?: (role: string) => void;
}) {
  const services = useGraphServices();
  const userMail = account?.username ?? account?.userName ?? "";
  const { role, loading } = useUserRoleFromSP(userMail);

  React.useEffect(() => {
    if (!loading && onRoleResolved) onRoleResolved(role);
  }, [role, loading, onRoleResolved]);

  const navCtx = React.useMemo<NavContext>(() => ({ role }), [role]);
  const navs = React.useMemo(() => filterNavTree(NAV, navCtx), [navCtx]);

  const [selected, setSelected] = React.useState<string>(() => firstLeafId(navs));
  const item = React.useMemo(() => findById(navs, selected), [navs, selected]);

  const element = React.useMemo(() => {
    if (!item) return null;
    if (typeof item.to === "function")
      return (item.to as (ctx: RenderCtx) => React.ReactNode)({ services });
    return item.to ?? null;
  }, [item, services]);

  const [collapsed, setCollapsed] = React.useState(false);
  const toggleCollapsed = React.useCallback(() => setCollapsed((v) => !v), []);

  return (
    <div className={`layout--withSidebar ${collapsed ? "is-collapsed" : ""}`}>
      <Sidebar
        navs={navs}
        selected={selected}
        onSelect={setSelected}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
      />
      <main className="content content--withSidebar">
        <div className="page-viewport">
          <div className="page page--fluid">
            {loading ? (
              <p style={{ padding: "1rem" }}>Cargando permisos...</p>
            ) : (
              element
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   🔹 App Root con Providers
   ============================================================ */
export default function App() {
  return (
    <AuthProvider>
      <GraphServicesGate>
        <Shell />
      </GraphServicesGate>
    </AuthProvider>
  );
}

/* ============================================================
   🔹 Wrapper: solo provee Graph si hay sesión
   ============================================================ */
function GraphServicesGate({ children }: { children: React.ReactNode }) {
  const { ready, account } = useAuth();
  if (!ready || !account) return <>{children}</>;
  return <GraphServicesProvider>{children}</GraphServicesProvider>;
}
