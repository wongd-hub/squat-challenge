'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isSupabaseConfigured, sendLoginCode, verifyLoginCode } from '@/lib/supabase';
import { Mail, Shield, AlertCircle, CheckCircle, Hash } from 'lucide-react';

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // For display name, require at least 2 characters if provided
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
        setStep('code');
        setSuccess('📧 Check your email for a 6-digit verification code');
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
      setError('Please enter the 6-digit verification code');
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
        displayName.trim() || undefined
      );
      
      if (result.success && result.data.user) {
        setSuccess('✅ Successfully signed in!');
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
    setSuccess('');
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {step === 'form' ? 'Sign In to Squat Challenge' : 'Enter Verification Code'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {step === 'form' 
              ? 'Enter your email and name to receive a 6-digit verification code'
              : 'Enter the 6-digit code we sent to your email'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {step === 'form' ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-900 dark:text-white">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-gray-900 dark:text-white">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  maxLength={50}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoComplete="name"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This name will appear on the leaderboard. Leave blank to use your email.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white" 
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
                    Send 6-Digit Code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Hash className="w-4 h-4" />
                  6-Digit Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  maxLength={6}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 text-center text-2xl tracking-[0.5em] font-mono"
                  autoComplete="one-time-code"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p>📧 Code sent to: <strong className="text-gray-900 dark:text-white">{email}</strong></p>
                  {displayName && (
                    <p>👤 Display name: <strong className="text-gray-900 dark:text-white">{displayName}</strong></p>
                  )}
                  <p>⏰ Code expires in 10 minutes</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  disabled={isLoading}
                  className="flex-1 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white" 
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify & Sign In
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              🔒 No password required! We'll send you a secure 6-digit code to sign in.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}