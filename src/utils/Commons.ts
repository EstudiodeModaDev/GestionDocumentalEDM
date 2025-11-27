// src/utils/Commons.ts (NUEVO)

/* ---------- GRAPH ---------- */
export * from "./graph/resolveIds";
export * from "./graph/cache";
export * from "./graph/resolveDrive"
export * from  "./graph/folders.ts"
export * from  "./graph/query.ts"


/* ---------- FORMATTING ---------- */
export * from "./formatting/strings";
export * from "./formatting/users.ts";
export * from "./formatting/dates.ts";
export * from "./formatting/files.ts";


/* ---------- SHAREPOINT ---------- */
export * from "./sharepoint/toSpModel.ts";
export * from "./sharepoint/upsert.ts";
export * from "./sharepoint/companias.ts";


/* ---------- ROLES ---------- */
export * from "./roles/normalizeRole.ts";

/* ---------- validation ---------- */
export * from "./validation/validateAdminComRules.ts";
export * from "./validation/validateNuevaArea.ts";
export * from "./validation/validateResponsable.ts";
