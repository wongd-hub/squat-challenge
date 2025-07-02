"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, User, CheckCircle, AlertCircle } from "lucide-react"
import { sendLoginCode, verifyLoginCode, checkUserExists } from "@/lib/supabase"

interface AuthModalProps {
  children: React.ReactNode
  onAuthSuccess?: (user: any) => void
}

export default function AuthModal({ children, onAuthSuccess }: AuthModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCheckingUser, setIsCheckingUser] = useState(false)
  const [userExists, setUserExists] = useState(false)
  const [existingProfile, setExistingProfile] = useState<any>(null)

  // Check if user exists when email changes
  useEffect(() => {
    const checkUser = async () => {
      if (email && email.includes("@")) {
        setIsCheckingUser(true)
        try {
          const result = await checkUserExists(email)
          setUserExists(result.exists)
          setExistingProfile(result.profile)
          if (result.exists && result.profile?.display_name) {
            setDisplayName(result.profile.display_name)
          }
        } catch (error) {
          console.error("Error checking user:", error)
        } finally {
          setIsCheckingUser(false)
        }
      } else {
        setUserExists(false)
        setExistingProfile(null)
      }
    }

    const timeoutId = setTimeout(checkUser, 500) // Debounce
    return () => clearTimeout(timeoutId)
  }, [email])

  const handleSendCode = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!userExists && !displayName.trim()) {
      setError("Please enter your display name")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await sendLoginCode(email, userExists ? undefined : displayName)
      setStep("code")
    } catch (error: any) {
      setError(error.message || "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await verifyLoginCode(email, code, userExists ? undefined : displayName)
      if (result.success) {
        onAuthSuccess?.(result.data?.user)
        setIsOpen(false)
        resetForm()
      }
    } catch (error: any) {
      setError(error.message || "Invalid verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setStep("email")
    setEmail("")
    setDisplayName("")
    setCode("")
    setError("")
    setUserExists(false)
    setExistingProfile(null)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (step === "email") {
        handleSendCode()
      } else if (step === "code") {
        handleVerifyCode()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div onClick={handleTriggerClick} style={{ cursor: "pointer" }}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {step === "email" ? "Sign In" : "Enter Verification Code"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === "email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  {isCheckingUser && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
                  )}
                </div>
                {email && !isCheckingUser && (
                  <div className="flex items-center gap-2 text-sm">
                    {userExists ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Welcome back!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400">New user</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="How should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={userExists || isCheckingUser}
                  className={userExists ? "bg-muted" : ""}
                />
                {userExists && (
                  <p className="text-xs text-muted-foreground">
                    Using existing display name: {existingProfile?.display_name}
                  </p>
                )}
              </div>

              <Button onClick={handleSendCode} disabled={isLoading || isCheckingUser} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </>
          )}

          {step === "code" && (
            <div className="space-y-4" onKeyDown={handleKeyDown}>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to <strong>{email}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP value={code} onChange={setCode} maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("email")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleVerifyCode} disabled={isLoading || code.length !== 6} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
