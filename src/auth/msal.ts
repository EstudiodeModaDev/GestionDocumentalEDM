// src/auth/msal.ts
import {
  PublicClientApplication,
  EventType,
  InteractionRequiredAuthError,
  type AccountInfo,
  type EventMessage,
  type PopupRequest,
  type RedirectRequest,
  type SilentRequest,
} from '@azure/msal-browser';

/* ===========================
   Configuración básica MSAL
   =========================== */
export const msal = new PublicClientApplication({
  auth: {
    clientId: 'd2290169-4e11-4316-8d72-5547fa3daa08',
    authority: 'https://login.microsoftonline.com/cd48ecd9-7e15-4f4b-97d9-ec813ee42b2c',
    redirectUri: window.location.origin, // asegúrate que esté registrado en Azure
    // postLogoutRedirectUri: window.location.origin, // opcional
  },
  cache: {
    cacheLocation: 'localStorage', // o 'sessionStorage' si prefieres
    storeAuthStateInCookie: false,
  },
  system: {
    // opcional: más logs para depurar
    loggerOptions: {
      loggerCallback: (level, message) => {
        if (message?.includes('msal')) {
          console.debug('[MSAL]', level, message);
        }
      },
      piiLoggingEnabled: false,
    },
  },
});

/* ===========================
   Estado de inicialización
   =========================== */
let initialized = false;

/** Scopes centralizados para login/token */
export const SCOPES = [
  'openid', 'profile', 'email',
  'User.Read',
  'Sites.ReadWrite.All',
  'Directory.Read.All',
] as const;

/** Helpers de requests */
const loginPopupRequest: PopupRequest = { scopes: [...SCOPES], prompt: 'select_account' };
const loginRedirectRequest: RedirectRequest = { scopes: [...SCOPES], prompt: 'select_account' };

/** initMSAL: inicializa y procesa el retorno de redirect */
export async function initMSAL(): Promise<void> {
  if (initialized) return;
  await msal.initialize();
  // MUY IMPORTANTE: procesa el hash de retorno del redirect (si lo hay)
  await msal.handleRedirectPromise().catch((e) => {
    console.error('[MSAL] handleRedirectPromise error:', e);
  });
  wireEventsOnce();
  // Si hay cuentas guardadas, selecciona una como activa
  ensureActiveAccount();
  initialized = true;
}

/* ===========================
   Gestión de cuenta activa
   =========================== */

/** Selecciona/retorna una cuenta activa si existe */
export function ensureActiveAccount(): AccountInfo | null {
  const acc = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
  if (acc) msal.setActiveAccount(acc);
  return acc;
}

/** ¿Hay sesión? */
export function isLoggedIn(): boolean {
  return !!(msal.getActiveAccount() ?? msal.getAllAccounts()[0]);
}

/** Obtiene la cuenta activa (o la primera disponible) */
export function getAccount(): AccountInfo | null {
  return msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
}

/* ===========================
   Login (popup / redirect)
   =========================== */

/** Login por POPUP (requiere gesto de usuario, o cae a redirect si lo bloquean) */
export async function ensureLoginPopup(): Promise<AccountInfo> {
  await initMSAL();
  let account = ensureActiveAccount();
  if (!account) {
    try {
      const res = await msal.loginPopup(loginPopupRequest);
      account = res.account ?? msal.getAllAccounts()[0]!;
      msal.setActiveAccount(account);
    } catch (e) {
      console.warn('[MSAL] loginPopup falló, haciendo fallback a redirect…', e);
      await msal.loginRedirect(loginRedirectRequest); // navega y no retorna
      return new Promise<AccountInfo>(() => {});
    }
  }
  return account;
}

/** Login por REDIRECT (recomendado para auto-login sin gesto) */
export async function ensureLoginRedirect(): Promise<AccountInfo> {
  await initMSAL();
  let account = ensureActiveAccount();
  if (!account) {
    await msal.loginRedirect(loginRedirectRequest); // navega y no retorna
    return new Promise<AccountInfo>(() => {});
  }
  return account;
}

/** Login “genérico” con modo configurable (por defecto: 'redirect') */
export async function ensureLogin(mode: 'popup' | 'redirect' = 'redirect'): Promise<AccountInfo> {
  return mode === 'popup' ? ensureLoginPopup() : ensureLoginRedirect();
}

/* ===========================
   Tokens (silent → popup → redirect)
   =========================== */

/**
 * Obtiene un access token:
 *  1) intenta silent,
 *  2) si requiere interacción: popup (si popup falla por bloqueo/cancel, hace redirect),
 *  3) si no hay sesión, también hace redirect.
 */
export async function getAccessToken(opts?: {
  interactionMode?: 'popup' | 'redirect'; // por defecto: 'popup'
  silentExtraScopesToConsent?: string[];
  forceSilent?: boolean; // si true, no intenta interacción, solo silent
}): Promise<string> {
  await initMSAL();
  const account = ensureActiveAccount();
  if (!account) {
    // Sin sesión, fuerza login según modo
    const mode = opts?.interactionMode ?? 'popup';
    if (mode === 'popup') {
      try {
        const res = await msal.loginPopup(loginPopupRequest);
        msal.setActiveAccount(res.account ?? null);
      } catch {
        await msal.loginRedirect(loginRedirectRequest);
        return new Promise<string>(() => {});
      }
    } else {
      await msal.loginRedirect(loginRedirectRequest);
      return new Promise<string>(() => {});
    }
  }

  const silentReq: SilentRequest = {
    account: ensureActiveAccount()!, // puede haber cambiado tras login
    scopes: [...SCOPES, ...(opts?.silentExtraScopesToConsent ?? [])],
  };

  try {
    const res = await msal.acquireTokenSilent(silentReq);
    return res.accessToken;
  } catch (e) {
    if (opts?.forceSilent) throw e; // solicitado explícitamente

    if (e instanceof InteractionRequiredAuthError) {
      const mode = opts?.interactionMode ?? 'popup';
      if (mode === 'popup') {
        try {
          const res = await msal.acquireTokenPopup({ scopes: [...SCOPES], account: silentReq.account });
          return res.accessToken;
        } catch (popupErr) {
          console.warn('[MSAL] popup bloqueado/cancelado; fallback a redirect para token…', popupErr);
          await msal.acquireTokenRedirect({ scopes: [...SCOPES], account: silentReq.account });
          return new Promise<string>(() => {});
        }
      } else {
        await msal.acquireTokenRedirect({ scopes: [...SCOPES], account: silentReq.account });
        return new Promise<string>(() => {});
      }
    }
    throw e;
  }
}

/* ===========================
   Logout
   =========================== */

export async function logout(): Promise<void> {
  await initMSAL();
  const account = ensureActiveAccount();
  await msal.logoutRedirect({ account });
}

/* ===========================
   Eventos MSAL (opcional)
   =========================== */
let eventsWired = false;

/** Conecta listeners una sola vez */
function wireEventsOnce() {
  if (eventsWired) return;
  msal.addEventCallback((ev: EventMessage) => {
    switch (ev.eventType) {
      case EventType.LOGIN_SUCCESS: {
        // guarda la cuenta como activa
        const acc = (ev.payload as any)?.account as AccountInfo | undefined;
        if (acc) {
          msal.setActiveAccount(acc);
          // console.info('[MSAL] LOGIN_SUCCESS:', acc.username);
        }
        break;
      }
      case EventType.HANDLE_REDIRECT_END:
        // console.debug('[MSAL] HANDLE_REDIRECT_END');
        break;
      case EventType.ACQUIRE_TOKEN_SUCCESS:
        // console.debug('[MSAL] TOKEN OK');
        break;
      case EventType.LOGOUT_SUCCESS:
        // console.debug('[MSAL] LOGOUT_SUCCESS');
        break;
      case EventType.LOGIN_FAILURE:
      case EventType.ACQUIRE_TOKEN_FAILURE:
      case EventType.LOGOUT_FAILURE:
        console.warn('[MSAL] Event error:', ev);
        break;
      default:
        break;
    }
  });
  eventsWired = true;
}

/** Registrar tu propio callback adicional (si quieres auditar) */
export function onMsalEvent(cb: (ev: EventMessage) => void): void {
  msal.addEventCallback(cb);
}
