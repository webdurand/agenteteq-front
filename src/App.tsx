import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { AuthLayout } from "./components/AuthLayout";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { VerifyCode } from "./components/VerifyCode";
import { ConfirmPhone } from "./components/ConfirmPhone";
import { Dashboard } from "./components/Dashboard";

import { AdminDashboard } from "./components/AdminDashboard";
import { SubscriptionPage } from "./components/SubscriptionPage";
import { Spinner } from "./components/ui/Spinner";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { TermsConsentModal } from "./components/TermsConsentModal";
import { LegalPage } from "./components/LegalPage";
import { LandingPage } from "./components/LandingPage";

const CURRENT_TERMS_VERSION = "1.1";

const FIXED_TOGGLE_CLASS = "fixed top-5 right-5 z-50 w-9 h-9 rounded-full flex items-center justify-center bg-surface-card border border-line text-content-3 hover:text-content transition-colors duration-200";

function PendingVerification({ auth }: { auth: ReturnType<typeof useAuth> }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6">
      <ThemeToggle className={FIXED_TOGGLE_CLASS} />
      <div className="max-w-md w-full text-center bg-surface-card border border-line rounded-2xl p-8">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <h2 className="text-2xl font-light text-content mb-3">Verificação Pendente</h2>
        <p className="text-content-3 text-sm leading-relaxed mb-8">
          Para usar o Teq, você precisa verificar seu WhatsApp. Clique abaixo para receber o código de verificação.
        </p>

        {auth.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl text-center mb-4">
            {auth.error}
          </div>
        )}

        <button 
          onClick={auth.startVerification}
          disabled={auth.loading}
          className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mb-4 flex items-center justify-center gap-2"
        >
          {auth.loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
          {auth.loading ? "Enviando..." : "Verificar WhatsApp"}
        </button>
        <button 
          onClick={auth.logout}
          className="text-content-4 hover:text-content text-xs uppercase tracking-wider transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  const [isAdminView, setIsAdminView] = useState(false);
  const pathname = window.location.pathname;

  if (pathname === "/terms") return <LegalPage type="terms" />;
  if (pathname === "/privacy") return <LegalPage type="privacy" />;
  if (pathname === "/integrations/slack/callback") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner size="lg" label="Conectando Slack..." />
      </div>
    );
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner size="lg" label="Iniciando..." />
      </div>
    );
  }

  if (auth.screen === "login" || auth.screen === "register") {
    if (auth.screen === "login" && !auth.showAuthForm) {
      return (
        <LandingPage
          onLogin={() => auth.setShowAuthForm(true)}
          onRegister={() => { auth.setScreen("register"); auth.setShowAuthForm(true); }}
        />
      );
    }

    return (
      <>
        <ThemeToggle className={FIXED_TOGGLE_CLASS} />
        <AuthLayout>
          {auth.screen === "login" ? <LoginForm auth={auth} /> : <RegisterForm auth={auth} />}
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "confirm_phone") {
    return (
      <>
        <ThemeToggle className={FIXED_TOGGLE_CLASS} />
        <AuthLayout>
          <ConfirmPhone auth={auth} />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "verify_whatsapp") {
    return (
      <>
        <ThemeToggle className={FIXED_TOGGLE_CLASS} />
        <AuthLayout>
          <VerifyCode auth={auth} purpose="register" />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "verify_2fa") {
    return (
      <>
        <ThemeToggle className={FIXED_TOGGLE_CLASS} />
        <AuthLayout>
          <VerifyCode auth={auth} purpose="login_2fa" />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "pending_verification") {
    return <PendingVerification auth={auth} />;
  }

  if (auth.screen === "trial_expired") {
    return (
      <>
        <ThemeToggle className={FIXED_TOGGLE_CLASS} />
        <AuthLayout>
          <SubscriptionPage token={auth.token || ''} onLogout={auth.logout} onPaymentSuccess={auth.refreshUser} />
        </AuthLayout>
      </>
    );
  }

  if (auth.screen === "authenticated" && auth.token) {
    const needsTerms = auth.user && auth.user.terms_accepted_version !== CURRENT_TERMS_VERSION;

    if (isAdminView && auth.user?.role === "admin") {
      return (
        <>
          {needsTerms && <TermsConsentModal token={auth.token} onAccepted={auth.refreshUser} />}
          <AdminDashboard token={auth.token} onLogout={auth.logout} onExitAdmin={() => setIsAdminView(false)} />
        </>
      );
    }
    if (!auth.user) {
      return null;
    }
    return (
      <>
        {needsTerms && <TermsConsentModal token={auth.token} onAccepted={auth.refreshUser} />}
        <Dashboard token={auth.token} user={auth.user} onLogout={auth.logout} onOpenAdmin={auth.user.role === "admin" ? () => setIsAdminView(true) : undefined} onRefreshUser={auth.refreshUser} />
      </>
    );
  }

  return null;
}
