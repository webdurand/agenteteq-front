import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../lib/api";

export type AuthScreen =
  | "login"
  | "register"
  | "confirm_phone"
  | "verify_whatsapp"
  | "verify_2fa"
  | "pending_verification"
  | "authenticated"
  | "trial_expired";

export interface GoogleData {
  email: string;
  name: string;
  idToken: string;
}

export interface UserInfo {
  phone_number: string;
  name: string;
  username: string;
  email: string;
  whatsapp_verified: boolean;
  plan_active: boolean;
  role?: string;
  subscription_status?: string;
  trial_end?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  plan_code?: string | null;
  has_stripe_subscription?: boolean;
  terms_accepted_version?: string | null;
}

const TOKEN_KEY = "teq_token";

export function useAuth() {
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [registerMode, setRegisterMode] = useState<"register" | "google">("register");
  const [pendingRegistration, setPendingRegistration] = useState<any>(null);
  const initialCheckDone = useRef(false);

  const saveTokenAndAuth = useCallback(async (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    try {
      const userData = await api.getMe(newToken);
      setUser(userData);
      if (!userData.whatsapp_verified) {
        setPhone(userData.phone_number);
        setScreen("pending_verification");
      } else if (!userData.plan_active) {
        setScreen("trial_expired");
      } else {
        setScreen("authenticated");
      }
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setScreen("login");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = token || localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;
    try {
      const userData = await api.getMe(storedToken);
      setUser(userData);
      if (!userData.whatsapp_verified) {
        setPhone(userData.phone_number);
        setScreen("pending_verification");
      } else if (!userData.plan_active) {
        setScreen("trial_expired");
      } else {
        setScreen("authenticated");
      }
    } catch (err) {
      // silently fail
    }
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setScreen("login");
  }, []);

  useEffect(() => {
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      api.getMe(storedToken)
        .then((userData) => {
          setUser(userData);
          if (!userData.whatsapp_verified) {
            setToken(storedToken);
            setPhone(userData.phone_number);
            setScreen("pending_verification");
          } else if (!userData.plan_active) {
            setToken(storedToken);
            setScreen("trial_expired");
          } else {
            setToken(storedToken);
            setScreen("authenticated");
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setScreen("login");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleRegister = (data: any) => {
    setError("");
    setPhone(data.phone);
    setPendingRegistration(data);
    setScreen("confirm_phone");
  };

  const confirmRegistration = async () => {
    if (!pendingRegistration) return;
    setLoading(true);
    setError("");
    try {
      if (registerMode === "google" && googleData) {
        await api.googleComplete({
          ...pendingRegistration,
          google_id_token: googleData.idToken,
        });
      } else {
        await api.register(pendingRegistration);
      }
      setScreen("verify_whatsapp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const editPhone = () => {
    setError("");
    setScreen("register");
  };

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.login(email, pass);
      setPhone(res.phone);
      if (res.purpose === "register") {
        setScreen("verify_whatsapp");
      } else {
        setScreen("verify_2fa");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWhatsapp = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyWhatsapp(phone, code);
      await saveTokenAndAuth(res.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.verify2fa(phone, code);
      await saveTokenAndAuth(res.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (idToken: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.googleAuth(idToken);
      if (res.needs_registration) {
        setGoogleData({
          email: res.email,
          name: res.name,
          idToken,
        });
        setRegisterMode("google");
        setScreen("register");
      } else if (res.needs_verification) {
        setPhone(res.phone);
        setScreen("verify_whatsapp");
      } else {
        await saveTokenAndAuth(res.token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startVerification = async () => {
    if (!phone) return;
    setLoading(true);
    setError("");
    try {
      await api.resendCode(phone, "register");
      setScreen("verify_whatsapp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (purpose: string) => {
    setLoading(true);
    setError("");
    try {
      await api.resendCode(phone, purpose);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    screen,
    setScreen,
    token,
    phone,
    user,
    googleData,
    error,
    setError,
    loading,
    registerMode,
    setRegisterMode,
    pendingRegistration,
    handleRegister,
    confirmRegistration,
    editPhone,
    handleLogin,
    handleVerifyWhatsapp,
    handleVerify2fa,
    handleGoogleAuth,
    handleResendCode,
    startVerification,
    logout,
    refreshUser,
  };
}
