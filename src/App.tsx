// ============================================================
// src/App.tsx
// Gestión Documental EDM - App principal con menú dinámico
// Con NavContext para navegación global y expansión del menú.
// ============================================================

import * as React from "react";
import "./App.css";

// Providers
import { AuthProvider, useAuth } from "./auth/authContext";
import { GraphServicesProvider, useGraphServices } from "./graph/GrapServicesContext";
import { useUserRoleFromSP } from "./Funcionalidades/useUserRoleFromSP";
import { NavProvider, useNav } from "./components/Context/NavContext";

// Componentes base
import WelcomeEDM from "./components/Welcome/WelcomeEDM";
import AreasPanel from "./components/Areas/AreasPanel";
import CompaniasPanel from "./components/Companias/CompaniasPanel";
import VerAreas from "./components/Companias/VerAreas";

// Iconos
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
    to: <CompaniasPanel />,
    roles: ["AdministradorGeneral", "AdministradorCom", "ResponsableArea", "UsuarioArea"],
    children: [],
  },
];

/* ============================================================
   🔹 Buscar nodo por ID en el árbol
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
   🔹 RBAC: Filtrar menú según rol
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
   🔹 HeaderBar
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

        <div className="brand">
          <h1>Gestión Documental EDM</h1>
        </div>

        <div className="userCluster">
          <div className="userInfoLeft">
            <span className="userName">{userName}</span>
            <span className="userRole">{userRole}</span>
          </div>

          {onChangeRole && (
            <div className="userInfoRight">
              <span className="userLabel">Cambio Rol ⚙️</span>

              <select
                className="roleSelector"
                value={userRole}
                onChange={(e) => onChangeRole(e.target.value as Role)}
              >
                <option value="AdministradorGeneral">Administrador General</option>
                <option value="AdministradorCom">Administrador de Compañía</option>
                <option value="ResponsableArea">Responsable Área</option>
                <option value="UsuarioArea">Usuario Área</option>
                <option value="SinAcceso">Sin Acceso</option>
              </select>
            </div>
          )}

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
   🔹 Sidebar — versión NavContext
============================================================ */
function Sidebar({ navs }: { navs: MenuItem[] }) {
  const { selected, setSelected, expanded, toggleNode } = useNav();

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        <ul>
          {navs.map((n: any) => {
            const isExpanded = expanded[n.id] ?? false;

            return (
              <li key={n.id}>
                {/* =======================================================
                    NIVEL 0 — Inicio / Compañías
                ======================================================= */}
                <button
                  className={`sideItem ${selected === n.id ? "active" : ""}`}
                  onClick={() => {
                    if (n.children?.length) {
                      if (n.id === "companias") {
                        setSelected(n.id);
                        toggleNode(n.id);
                      } else {
                        toggleNode(n.id);
                        setSelected(n.id);
                      }
                    } else {
                      setSelected(n.id);
                    }
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

                {/* =======================================================
                    NIVEL 1 — Compañías → Áreas
                ======================================================= */}
                {n.children?.length > 0 && isExpanded && (
                  <ul className="subtree">
                    {n.children.map((c: any) => {
                      const isCompExpanded = expanded[c.id] ?? false;

                      return (
                        <li key={c.id}>
                          <button
                            className={`sideItem sub ${selected === c.id ? "active" : ""}`}
                            onClick={() => {
                              if (c.children?.length) {
                                setSelected(c.id);
                                toggleNode(c.id);
                              } else {
                                setSelected(c.id);
                              }
                            }}
                          >
                            {c.children?.length ? (
                              <span className="tree-arrow">{isCompExpanded ? "▾" : "▸"}</span>
                            ) : (
                              <span className="tree-arrow-placeholder" />
                            )}

                            {c.icon}
                            <span>{c.label}</span>
                          </button>

                          {/* =======================================================
                              NIVEL 2 — Áreas
                          ======================================================= */}
                          {c.children?.length > 0 && isCompExpanded && (
                            <ul className="subsubtree">
                              {c.children.map((a: any) => (
                                <li key={a.id}>
                                  <button
                                    className={`sideItem sub2 ${selected === a.id ? "active" : ""}`}
                                    onClick={() => setSelected(a.id)}
                                  >
                                    <span className="tree-arrow-placeholder" />
                                    {a.icon}
                                    <span>{a.label}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
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
   🔹 LoggedApp — construir árbol + contenido
============================================================ */
/* ============================================================
   LoggedApp — reconstruye el NAV dinámico en tiempo real
   Escucha:
   ✔ cambio de rol
   ✔ cambio de compañía del usuario
   ✔ cambio de área
   ✔ loading inicial
   ✔ refreshFlag (CREAR / EDITAR / ELIMINAR compañía o área)
============================================================ */

function LoggedApp({ account }: any) {
  const services = useGraphServices();
  const { selected, refreshFlag } = useNav(); // 👈 EXTRAEMOS refreshFlag

  const userMail = account?.username ?? "";

  // Cargamos rol + compañía + área del usuario
  const { role, companiaID, areaID, loading } = useUserRoleFromSP(userMail);

  // Si el usuario está usando overrideRole (modo admin), ese manda
  const effectiveRole: Role = account.overrideRole ?? role;

  // Estado local para el árbol del menú
  const [navTree, setNavTree] = React.useState<MenuItem[]>(NAV_BASE);

  /* ============================================================
     Efecto: reconstruir el NAV cuando:
     - cambia el rol
     - cambia su compañía asignada
     - cambia su área asignada
     - termina de cargar useUserRoleFromSP
     - 💥 CAMBIA refreshFlag (crear/eliminar/editar)
  ============================================================ */
  React.useEffect(() => {
    if (loading) return;        // aún no sabemos su rol
    if (!effectiveRole) return; // seguridad

    (async () => {
      // Obtener compañías y áreas
      const comps = await services.Companias.getAll();
      const areas = await services.Areas.getAll();

      /* ========================================================
         1) Filtrar compañías según rol
      ======================================================== */
      let filteredComps = comps;

      if (["AdministradorCom", "ResponsableArea", "UsuarioArea"].includes(effectiveRole)) {
        filteredComps = comps.filter(
          (c) =>
            c.Title.trim().toLowerCase() === (companiaID ?? "").trim().toLowerCase()
        );
      }

      /* ========================================================
         2) Construir árbol dinámico (compañías → áreas)
      ======================================================== */
      const tree = filteredComps.map((comp) => {
        const compAreas = areas.filter(
          (a) =>
            a.NombreCompania?.trim().toLowerCase() ===
            comp.Title.trim().toLowerCase()
        );

        let filteredAreas = compAreas;

        if (effectiveRole === "ResponsableArea" || effectiveRole === "UsuarioArea") {
          filteredAreas = compAreas.filter(
            (a) =>
              a.Title.trim().toLowerCase() === (areaID ?? "").trim().toLowerCase()
          );
        }

        return {
          id: `c-${comp.Id}`, // ID único del nodo de compañía
          label: comp.Title,
          icon: <img src={folderIcon} className="sb-icon" />,
          to: <VerAreas companiaName={comp.Title} />,
          children: filteredAreas.map((ar) => ({
            id: `a-${ar.Id}`,
            label: ar.Title,
            icon: <img src={fileIcon} className="sb-icon" />,
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

      /* ========================================================
         3) Insertar árbol dinámico dentro del menú base
      ======================================================== */
      const merged = NAV_BASE.map((item) =>
        item.id === "companias" ? { ...item, children: tree } : item
      );

      setNavTree(merged);
    })();

    /* ========================================================
       Dependencias:
       ✔ effectiveRole  → si cambia rol => reconstruir
       ✔ companiaID     → si le asignan otra compañía
       ✔ areaID         → si cambia de área
       ✔ loading        → apenas termina la carga inicial
       ✔ refreshFlag    → 🔥 cambios en Compañías/Áreas
    ======================================================== */
  }, [effectiveRole, companiaID, areaID, loading, refreshFlag]);

  /* ============================================================
     Renderizado — Sidebar + Página seleccionada
  ============================================================ */
  const filteredMenu = filterMenuByRole(navTree, effectiveRole);
  const selectedItem = findById(filteredMenu, selected);
  const content = selectedItem?.to ?? <WelcomeEDM />;

  return (
    <div className="layout--withSidebar">
      <Sidebar navs={filteredMenu} />

      <main className="content content--withSidebar">
        <div className="page-viewport">{content}</div>
      </main>
    </div>
  );
}


/* ============================================================
   🔹 Shell — autenticación y selección de rol temporal
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

  const ALLOWED = [
    "cesanchez@estudiodemoda.com.co",
    "practicantelisto@estudiodemoda.com.co",
  ];
  const canChangeRole = ALLOWED.includes(userMail);

  return (
    <div className="page layout layout--withSidebar">
      <HeaderBar
        userName={account.name}
        userRole={userRole}
        onPrimaryAction={{ label: "Cerrar sesión", onClick: signOut }}
        onChangeRole={canChangeRole ? (r) => setUserRole(r as Role) : undefined}
      />

      <LoggedApp account={{ ...account, overrideRole: userRole }} />
    </div>
  );
}

/* ============================================================
   🔹 App Root — incluye NavProvider
============================================================ */
export default function App() {
  return (
    <AuthProvider>
      <GraphServicesGate>
        <NavProvider>
          <Shell />
        </NavProvider>
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
