'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isSupabaseConfigured, sendLoginCode, verifyLoginCode } from '@/lib/supabase';
import { Mail, Shield, AlertCircle, CheckCircle, User } from 'lucide-react';

interface AuthModalProps {
  children: React.ReactNode;
  onAuthSuccess?: (user: any) => void;
}

export default function AuthModal({ children, onAuthSuccess }: AuthModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured()) {
      setError('Authentication is not available in offline mode. Please configure Supabase to use this feature.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // For new users, require display name
    if (displayName.trim() && displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters long');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await sendLoginCode(email.trim(), displayName.trim() || undefined);
      
      if (result.success) {
        setIsNewUser(result.isNewUser);
        setStep('code');
        setSuccess('Check your email for a verification link or 6-digit code');
      }
    } catch (error: any) {
      console.error('❌ Error sending code:', error);
      setError(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (code.trim().length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyLoginCode(
        email.trim(), 
        code.trim(), 
        isNewUser ? displayName.trim() : undefined
      );
      
      if (result.success && result.data.user) {
        setSuccess('Successfully signed in!');
        onAuthSuccess?.(result.data.user);
        
        // Close modal after a brief delay
        setTimeout(() => {
          setIsOpen(false);
          resetForm();
        }, 1000);
      }
    } catch (error: any) {
      console.error('❌ Error verifying code:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setEmail('');
    setDisplayName('');
    setCode('');
    setError('');
    setSuccess('');
    setIsLoading(false);
    setIsNewUser(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const goBack = () => {
    setStep('form');
    setError('');
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="opacity-50 cursor-not-allowed">
        {children}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {step === 'form' ? 'Sign In to Squat Challenge' : 'Verify Your Email'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' 
              ? 'Enter your email and name (for new accounts) to get started'
              : 'Enter the 6-digit code from your email'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500/20 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {step === 'form' ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="glass-subtle"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name (for new accounts)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  maxLength={50}
                  className="glass-subtle"
                />
                <p className="text-xs text-muted-foreground">
                  Only required for new accounts. This name will appear on the leaderboard.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  maxLength={6}
                  className="glass-subtle text-center text-lg tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Code sent to {email}
                  {isNewUser && displayName && (
                    <span className="block mt-1">
                      Display name: <strong>{displayName}</strong>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              No password required! We'll send you a secure verification code to sign in.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}