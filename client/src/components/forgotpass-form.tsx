import {cn} from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {getAuth, sendPasswordResetEmail} from "firebase/auth"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function ForgotPassForm({ className, ...props }: React.ComponentProps<"div">) {
    const [email, setEmail] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const sendResetEmail = async () => {
        setError(null)
        if (!email) {
            setError("Email is required")
            return
        }
        const auth = getAuth()
        sendPasswordResetEmail(auth, email)
            .then(() => {
                setSuccess(true)
            })
            .catch((error) => {
                switch (error.code) {
                    case "auth/invalid-email":
                        setError("Invalid email address")
                        break
                    case "auth/user-not-found":
                        setError("No user found with this email")
                        break
                    default:
                        setError("Failed to send password reset email")
                }
            })
    }
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <FieldGroup>
                    <FieldDescription>
                        Enter your email address below and we will send you a link to reset your password.
                        {error && <p className="text-red-500">{error}</p>}
                        {success && <p className="text-green-500">Password reset email sent successfully!</p>}
                    </FieldDescription>
                    <Field>
                        <FieldLabel>Email</FieldLabel>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </Field>
                    <Button onClick={sendResetEmail}>Send Reset Email</Button>
                </FieldGroup> 
            </Card>

        </div>
    )
}