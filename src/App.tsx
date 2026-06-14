import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/layouts/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import Dashboard from "@/pages/Dashboard";
import DiscoverHackathons from "@/pages/DiscoverHackathons";
import MyTeams from "@/pages/MyTeams";
import MyRequests from "@/pages/MyRequests";
import Messages from "@/pages/Messages";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import AITeamBuilder from "@/pages/AITeamBuilder";
import HostHackathon from "@/pages/HostHackathon";
import HackathonDetail from "@/pages/HackathonDetail";
import NotFound from "@/pages/NotFound";
import ProfileSetupWizard from "@/pages/ProfileSetupWizard";
import SettingsPage from "@/pages/SettingsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-hack-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-hack-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading HackOS...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const isSetupPath = window.location.pathname === "/profile-setup";
  if (user?.profile_completed !== true && !isSetupPath) {
    return <Navigate to="/profile-setup" replace />;
  }
  if (user?.profile_completed === true && isSetupPath) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) {
    const savedRedirect = sessionStorage.getItem("oauth_redirect_path");
    if (savedRedirect) {
      sessionStorage.removeItem("oauth_redirect_path");
      return <Navigate to={savedRedirect} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

          {/* Profile setup wizard — protected but no sidebar layout */}
          <Route
            path="/profile-setup"
            element={<ProtectedRoute><ProfileSetupWizard /></ProtectedRoute>}
          />


          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/discover" element={<DiscoverHackathons />} />
            <Route path="/hackathon/:id" element={<HackathonDetail />} />
            <Route path="/my-teams" element={<MyTeams />} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/ai-team-builder" element={<AITeamBuilder />} />
            <Route path="/host-hackathon" element={<HostHackathon />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "#131826",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E8EAF0",
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
