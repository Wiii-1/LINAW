import { TooltipProvider } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

const AuthenticationRoute = lazy(() => import("./AuthenticationRoute"))
const AuthenticationRouteReversed = lazy(
  () => import("./AuthenticationRouteReversed")
)
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const TermsOfService = lazy(() => import("./pages/TermsOfService"))
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"))

export function App() {
  return (
    <TooltipProvider>
      <Suspense fallback={<Skeleton />}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route
              path="/login"
              element={
                <AuthenticationRouteReversed>
                  <Login />
                </AuthenticationRouteReversed>
              }
            />
            <Route
              path="/register"
              element={
                <AuthenticationRouteReversed>
                  <Register />
                </AuthenticationRouteReversed>
              }
            />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route
              path="/dashboard"
              element={
                <AuthenticationRoute>
                  <Dashboard />
                </AuthenticationRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </TooltipProvider>
  )
}

export default App
