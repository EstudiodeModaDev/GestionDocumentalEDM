// ============================================================
// src/App.tsx
// Gestión Documental EDM - App principal con menú dinámico
// Con soporte para:
//  - Selector de rol temporal (Cambio Rol ⚙️)
//  - Filtro real por roles usando NAV_BASE
//  - Filtro dinámico de compañías/áreas por rol
//  - Envío de props a AreasPanel (areaId, areaName, companiaName)
// ============================================================

import * as React from "react";
import "./App.css";

// === Providers ===
import { AuthProvider, useAuth } from "./auth/authContext";
import { GraphServicesProvider, useGraphServices } from "./graph/GrapServicesContext";
import { useUserRoleFromSP } from "./Funcionalidades/useUserRoleFromSP";

// === Componentes base ===
import WelcomeEDM from "./components/Welcome/WelcomeEDM";
import AreasPanel from "./components/Areas/AreasPanel";
import CompaniasPanel from "./components/Companias/CompaniasPanel";

// === Iconos ===
import homeIcon from "./assets/home.svg";
import folderIcon from "./assets/folder.svg";
import fileIcon from "./assets/file.svg";
import companyIcon from "./assets/company.svg";

import type { RolUsuario } from "./Models/UsuarioGD";
type Role = RolUsuario;

/* ============================================================
   🔹 Tipo MenuItem
============================================================ */
export type MenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  to?: React.ReactNode;
  roles?: Role[];
  children?: MenuItem[];
};

/* ============================================================
   🔹 Menú base
============================================================ */
const NAV_BASE: MenuItem[] = [
  {
    id: "home",
    label: "Inicio",
    icon: <img src={homeIcon} className="sb-icon" alt="" />,
    to: <WelcomeEDM />,
    roles: ["AdministradorGeneral", "AdministradorCom", "ResponsableArea", "UsuarioArea", "SinAcceso"],
  },
  {
    id: "companias",
    label: "Compañías",
    icon: <img src={companyIcon} className="sb-icon" alt="" />,
    roles: ["AdministradorGeneral", "AdministradorCom", "ResponsableArea", "UsuarioArea"],
    children: [],
  },
];

/* ============================================================
   🔹 Buscar nodo por ID
============================================================ */
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
   🔹 RBAC: Filtrar menú por rol
============================================================ */
function filterMenuByRole(items: MenuItem[], role: Role): MenuItem[] {
  return items
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByRole(item.children, role) : [],
    }));
}

/* ============================================================
   🔹 Header con Cambio Rol (⚙️)
============================================================ */
function HeaderBar({
  onPrimaryAction,
  userName,
  userRole,
  onChangeRole,
}: {
  onPrimaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  userName?: string;
  userRole?: string;
  onChangeRole?: (rol: string) => void;
}) {
  return (
    <header className="headerRow">
      <div className="header-inner">

        {/* Título */}
        <div className="brand">
          <h1>Gestión Documental EDM</h1>
        </div>

        <div className="userCluster">

          {/* === COLUMNA IZQUIERDA === */}
          <div className="userInfoLeft">
            <span className="userName">{userName}</span>
            <span className="userRole">{userRole}</span>
          </div>

          {/* === Cambio Rol ⚙️ === */}
          {onChangeRole && (
            <div className="userInfoRight">
              <span className="userLabel">Cambio Rol ⚙️</span>

              <select
                className="roleSelector"
                value={userRole}
                onChange={(e) => onChangeRole(e.target.value)}
              >
                <option value="AdministradorGeneral">Administrador General</option>
                <option value="AdministradorCom">Admin de Compañia</option>
                <option value="ResponsableArea">Responsable de Área</option>
                <option value="UsuarioArea">Usuario de Área</option>
                <option value="SinAcceso">Sin Acceso</option>
              </select>
            </div>
          )}

          {/* Logout */}
          {onPrimaryAction && (
            <button className="btn-logout" onClick={onPrimaryAction.onClick}>
              {onPrimaryAction.label}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   🔹 Sidebar
============================================================ */
function Sidebar({ navs, selected, onSelect }: any) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        <ul>
          {navs.map((n: any) => {
            const isExpanded = expanded[n.id] ?? false;

            return (
              <li key={n.id}>
                <button
                  className={`sideItem ${selected === n.id ? "active" : ""}`}
                  onClick={() => {
                    if (n.children?.length) toggleExpand(n.id);
                    else onSelect(n.id);
                  }}
                >
                  {n.children?.length ? (
                    <span className="tree-arrow">{isExpanded ? "▾" : "▸"}</span>
                  ) : (
                    <span className="tree-arrow-placeholder" />
                  )}

                  {n.icon}
                  <span>{n.label}</span>
                </button>

                {/* Subniveles */}
                {n.children?.length && isExpanded && (
                  <ul className="subtree">
                    {n.children.map((c: any) => (
                      <li key={c.id}>
                        <button
                          className={`sideItem sub ${selected === c.id ? "active" : ""}`}
                          onClick={() => onSelect(c.id)}
                        >
                          {c.icon}
                          <span>{c.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/* ============================================================
   🔹 LoggedApp — Construye menú dinámico + envía props a AreasPanel
============================================================ */
function LoggedApp({ account }: any) {
  const services = useGraphServices();

  const userMail = account?.username ?? "";
  const { role, companiaID, areaID, loading } = useUserRoleFromSP(userMail);

  const effectiveRole: Role = account.overrideRole ?? role;

  const [navTree, setNavTree] = React.useState<MenuItem[]>(NAV_BASE);
  const [selected, setSelected] = React.useState("home");

  React.useEffect(() => {
    if (loading) return;

    (async () => {
      const comps = await services.Companias.getAll();
      const areas = await services.Areas.getAll();

      // ============================
      // 🔥 FILTRAR COMPAÑÍAS SEGÚN ROL
      // ============================
      let filteredComps = comps;

      if (
        effectiveRole === "AdministradorCom" ||
        effectiveRole === "ResponsableArea" ||
        effectiveRole === "UsuarioArea"
      ) {
        filteredComps = comps.filter((c) => c.Title === companiaID);
      }

      // ============================
      // 🔥 FILTRAR ÁREAS SEGÚN ROL
      // ============================
      const tree = filteredComps.map((comp) => {
        const compAreas = areas.filter(
          (a) =>
            a.NombreCompania?.trim().toLowerCase() ===
            comp.Title.trim().toLowerCase()
        );

        let filteredAreas = compAreas;

        if (effectiveRole === "ResponsableArea" || effectiveRole === "UsuarioArea") {
          filteredAreas = compAreas.filter((a) => a.Id === areaID);
        }

        return {
          id: `c-${comp.Id}`,
          label: comp.Title,
          icon: <img src={folderIcon} className="sb-icon" />,
          to: <CompaniasPanel />,
          children: filteredAreas.map((ar) => ({
            id: `a-${ar.Id}`,
            label: ar.Title,
            icon: <img src={fileIcon} className="sb-icon" />,

            // ⭐⭐ ENVÍO DE PROPS — CORREGIDO
            to: (
              <AreasPanel
                areaId={String(ar.Id)}
                areaName={ar.Title}
                companiaName={comp.Title}
              />
            ),
          })),
        };
      });

      // Insertar árbol en NAV_BASE
      const merged = NAV_BASE.map((item) =>
        item.id === "companias" ? { ...item, children: tree } : item
      );

      setNavTree(merged);
    })();
  }, [effectiveRole, companiaID, areaID, loading]);

  // Menú filtrado por rol
  const filteredMenu = filterMenuByRole(navTree, effectiveRole);

  // Ítem seleccionado
  const selectedItem = findById(filteredMenu, selected);
  const content = selectedItem?.to ?? <WelcomeEDM />;

  return (
    <div className="layout--withSidebar">
      <Sidebar navs={filteredMenu} selected={selected} onSelect={setSelected} />

      <main className="content content--withSidebar">
        <div className="page-viewport">{content}</div>
      </main>
    </div>
  );
}

/* ============================================================
   🔹 Shell — Control de rol temporal
============================================================ */
function Shell() {
  const { ready, account, signIn, signOut } = useAuth();

  const [userRole, setUserRole] = React.useState<Role>("SinAcceso");

  if (!ready) return <p>Cargando autenticación...</p>;

  if (!account)
    return (
      <div className="page layout">
        <HeaderBar
          onPrimaryAction={{
            label: "Iniciar sesión",
            onClick: () => signIn("popup"),
          }}
        />
        <section className="page-view">
          <WelcomeEDM />
        </section>
      </div>
    );

  const userMail = account.username;
  const { role, loading } = useUserRoleFromSP(userMail);

  React.useEffect(() => {
    if (!loading) setUserRole(role);
  }, [role, loading]);

  const ALLOWED = ["cesanchez@estudiodemoda.com.co", "practicantelisto@estudiodemoda.com.co"];
  const canChangeRole = ALLOWED.includes(userMail);

  return (
    <div className="page layout layout--withSidebar">
      <HeaderBar
        userName={account.name}
        userRole={userRole}
        onPrimaryAction={{ label: "Cerrar sesión", onClick: signOut }}
        onChangeRole={canChangeRole ? (rol) => setUserRole(rol as Role) : undefined}
      />

      <LoggedApp account={{ ...account, overrideRole: userRole }} />
    </div>
  );
}

/* ============================================================
   🔹 App Root
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
   🔹 Graph Services Gate
============================================================ */
function GraphServicesGate({ children }: { children: React.ReactNode }) {
  const { ready, account } = useAuth();
  if (!ready || !account) return <>{children}</>;
  return <GraphServicesProvider>{children}</GraphServicesProvider>;
}
