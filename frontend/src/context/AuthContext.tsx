import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:4000/api";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "PATIENT" | "DOCTOR";
  patientId?: number | null;
  doctorId?: number | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string, role: "PATIENT" | "DOCTOR") => Promise<{ error?: string }>;
  logout: () => void;
  api: typeof axios;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const storageKey = "doctoroncall_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  const api = React.useMemo(() => {
    const instance = axios.create({ baseURL: API_URL });
    instance.interceptors.request.use((config) => {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const { token } = JSON.parse(raw);
          if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch {}
      }
      return config;
    });
    return instance;
  }, []);

  const loadStored = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setState((s) => ({ ...s, user: null, token: null, loading: false }));
        return;
      }
      const { token, user } = JSON.parse(raw);
      if (token && user) {
        setState((s) => ({ ...s, token, user, loading: false }));
      } else {
        setState((s) => ({ ...s, user: null, token: null, loading: false }));
      }
    } catch {
      setState((s) => ({ ...s, user: null, token: null, loading: false }));
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await axios.post<{ token: string; user: User }>(`${API_URL}/auth/login`, {
          email,
          password,
        });
        const { token, user } = res.data;
        localStorage.setItem(storageKey, JSON.stringify({ token, user }));
        setState({ user, token, loading: false });
        return {};
      } catch (err: any) {
        const message =
          err.response?.data?.message || err.message || "Login failed";
        return { error: message };
      }
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: "PATIENT" | "DOCTOR"
    ): Promise<{ error?: string }> => {
      try {
        await axios.post(`${API_URL}/auth/register`, {
          name,
          email,
          password,
          role,
        });
        return login(email, password);
      } catch (err: any) {
        const message =
          err.response?.data?.message || err.message || "Registration failed";
        return { error: message };
      }
    },
    [login]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState({ user: null, token: null, loading: false });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
