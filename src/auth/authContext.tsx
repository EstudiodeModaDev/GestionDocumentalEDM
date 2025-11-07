// src/auth/AuthProvider.tsx
import * as React from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import {
  initMSAL,
  ensureActiveAccount,
  isLoggedIn,
  getAccessToken,
  ensureLogin,
  logout,
} from './msal';

type AuthCtx = {
  ready: boolean;
  account: AccountInfo | null;
  getToken: () => Promise<string>;     // NO fuerza login; falla si no hay sesión
  signIn: (mode?: 'popup' | 'redirect') => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = React.createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = React.useState(false);
  const [account, setAccount] = React.useState<AccountInfo | null>(null);

  // Inicializa MSAL y rehidrata sesión si existe
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await initMSAL();                              // procesa handleRedirectPromise
        const acc = ensureActiveAccount();             // toma active o primera cuenta
        if (!cancel) {
          setAccount(acc ?? null);
          setReady(true);
        }
        console.log('[AuthProvider] MSAL initialized');
      } catch (err) {
        console.error('[AuthProvider] init error:', err);
        if (!cancel) setReady(true);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Login explícito (por defecto, POPUP para evitar loops de redirect)
  const signIn = React.useCallback(async (mode: 'popup' | 'redirect' = 'popup') => {
    const acc = await ensureLogin(mode);
    setAccount(acc);
    setReady(true);
  }, []);

  // Logout
  const signOut = React.useCallback(async () => {
    await logout();
    setAccount(null);
    setReady(true);
  }, []);

  // Obtener token SIN forzar interacción (si no hay sesión, lanza error)
  const getToken = React.useCallback(async () => {
    if (!isLoggedIn()) {
      // evita iniciar interacción desde aquí; deja que UI llame signIn()
      throw new Error('No hay sesión iniciada. Inicia sesión para continuar.');
    }
    return getAccessToken({ interactionMode: 'popup', forceSilent: false });
  }, []);

  const value = React.useMemo<AuthCtx>(() => ({
    ready,
    account,
    getToken,
    signIn,
    signOut,
  }), [ready, account, getToken, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
