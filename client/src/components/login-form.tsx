import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "./ui/password-input"
import { useState, type ComponentProps } from "react"
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth"
import { useNavigate } from "react-router-dom"


type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  const providerGoogle = new GoogleAuthProvider()
  const providerMicrosoft = new OAuthProvider("microsoft.com")
  const auth = getAuth()
  const navigate = useNavigate()

  const [authorizing, setAuthorizing] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  // Helper: Call backend login endpoint with Firebase ID token
    const loginWithBackend = async (firebaseUser: any) => {
      try {
        console.log("=== LOGIN START ===")
        const idToken = await firebaseUser.getIdToken()
        console.log("Token obtained")
    
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
        })  

        console.log("Status:", response.status)
    
        const text = await response.text()
        console.log("Response body:", text)
    
        let data = null
        if (text) {
          data = JSON.parse(text)
          console.log("Parsed data:", data)
        }

        if (!response.ok) {
          if (response.status === 404) {
            setError("No account found. Please sign up first.")
            navigate("/register")
            return false
          }
      
          // IMPROVED: Extract the actual error message
          const errorMsg = data?.error?.message || data?.error || data?.message || `Login failed: ${response.status}`
          console.error("Error from server:", errorMsg)
          throw new Error(errorMsg)
        }

        console.log("=== LOGIN SUCCESS ===")
        return true

      } catch (error: any) {
        console.error("=== LOGIN ERROR ===")
        console.error("Error type:", error.constructor?.name)
        console.error("Error message:", error.message)
        console.error("Full error:", error)
    
        // IMPROVED: Better error display
        const displayError = error?.message || JSON.stringify(error) || "Failed to login"
        setError(displayError)
        return false
      }
    }
    
  // Email/Password Login
  const signInEmail: FormSubmitHandler = async (e) => {
    e.preventDefault()
    setAuthorizing(true)
    setError("")

    try {
      const response = await signInWithEmailAndPassword(auth, email, password)

      // Check email verification
      if (!auth.currentUser?.emailVerified) {
        setAuthorizing(false)
        setError(
          "Email not verified. Please check your inbox for a verification email"
        )
        return
      }

      console.log("Firebase sign-in successful:", response.user.uid)

      // Authenticate with backend
      const backendSuccess = await loginWithBackend(response.user)

      if (backendSuccess) {
        navigate("/dashboard")
      } else {
        setAuthorizing(false)
      }

    } catch (error: any) {
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email.")
          break
        case "auth/invalid-credential":
          setError("Invalid email or password.")
          break
        case "auth/invalid-email":
          setError("Invalid email.")
          break
        case "auth/wrong-password":
          setError("Invalid password.")
          break
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later.")
          break
        default:
          setError(error.message || "Failed to log in")
      }
      console.error("Firebase login error:", error)
      setAuthorizing(false)
    }
  }

  // Google OAuth Login
  const googleLogin = async () => {
    setAuthorizing(true)
    setError("")

    try {
      const result = await signInWithPopup(auth, providerGoogle)
      const user = result.user
      console.log("Google sign-in successful:", user.uid)

      // Authenticate with backend
      const backendSuccess = await loginWithBackend(user)

      if (backendSuccess) {
        navigate("/dashboard")
      } else {
        setAuthorizing(false)
      }

    } catch (error: any) {
      console.error("Google login error:", error)
      
      // User cancelled popup
      if (error.code === "auth/popup-closed-by-user") {
        setError("")
      } else {
        setError(error.message || "Failed to login with Google")
      }
      
      setAuthorizing(false)
    }
  }

  // Microsoft OAuth Login
  const microsoftLogin = async () => {
    setAuthorizing(true)
    setError("")

    try {
      const result = await signInWithPopup(auth, providerMicrosoft)
      const user = result.user
      console.log("Microsoft sign-in successful:", user.uid)

      // Authenticate with backend
      const backendSuccess = await loginWithBackend(user)

      if (backendSuccess) {
        navigate("/dashboard")
      } else {
        setAuthorizing(false)
      }

    } catch (error: any) {
      console.error("Microsoft login error:", error)
      
      // User cancelled popup
      if (error.code === "auth/popup-closed-by-user") {
        setError("")
      } else {
        setError(error.message || "Failed to login with Microsoft")
      }
      
      setAuthorizing(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back to LINAW</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}
          <form onSubmit={signInEmail}>
            <FieldGroup>
              <Field>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={googleLogin}
                  disabled={authorizing}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {authorizing ? "Signing in..." : "Login with Google"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={microsoftLogin}
                  disabled={authorizing}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M2 3h8v8H2V3zm10 0h8v8h-8V3zM2 13h8v8H2v-8zm10 0h8v8h-8v-8z"
                      fill="currentColor"
                    />
                  </svg>
                  {authorizing ? "Signing in..." : "Login with Microsoft"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={authorizing}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authorizing}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={authorizing}>
                  {authorizing ? "Logging in..." : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <a href="/register" className="hover:underline">
                    Register
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="/terms-of-service" className="hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy-policy" className="hover:underline">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  )
}