import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Check, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setTimeout(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendTimer]);

  const requirements = useMemo(
    () => [
      { label: 'At least 8 characters', met: newPassword.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
      { label: 'Contains a number', met: /\d/.test(newPassword) },
      { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
    ],
    [newPassword]
  );

  const allMet = requirements.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const sendOtp = async () => {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || 'Unable to send OTP');
    }

    setResendTimer(RESEND_SECONDS);
    return data;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await sendOtp();
      toast.success('OTP Sent', {
        description: 'Check your email for the 6-digit verification code.',
      });
      setStep('otp');
    } catch (error: any) {
      toast.error('Error', {
        description: error?.message || 'Unable to send OTP',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !email.trim()) return;

    setIsLoading(true);
    try {
      await sendOtp();
      toast.success('OTP Resent', {
        description: 'A new verification code has been sent to your email.',
      });
    } catch (error: any) {
      toast.error('Error', {
        description: error?.message || 'Unable to resend OTP',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('OTP Verified', {
          description: 'You can now reset your password.',
        });
        setStep('reset');
      } else {
        toast.error('Invalid OTP', {
          description: data?.message || 'Please check the code and try again.',
        });
      }
    } catch {
      toast.error('Server Error', {
        description: 'Unable to verify OTP',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allMet || !passwordsMatch) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Password reset successful', {
          description: 'You can now log in with your new password.',
        });

        setStep('email');
        setEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        navigate('/login');
      } else {
        toast.error('Error', {
          description: data?.message || 'Unable to reset password.',
        });
      }
    } catch {
      toast.error('Server Error', {
        description: 'Unable to reset password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="bg-card rounded-2xl border border-border p-6">
          {step === 'email' ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Forgot Password</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your email to receive an OTP
                  </p>
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            </>
          ) : step === 'otp' ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Verify OTP</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to {email}
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
                Your OTP may expire after a short time. If it does not work, request a new code.
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="grid gap-2">
                  <Label>OTP Code</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={OTP_LENGTH} value={otp} onChange={(value) => setOtp(value)}>
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

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isLoading || otp.length !== OTP_LENGTH}
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResendOtp}
                  disabled={isLoading || resendTimer > 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('email')}
                  disabled={isLoading}
                >
                  Back to Email
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
                  <p className="text-sm text-muted-foreground">Set a new password for {email}</p>
                </div>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      placeholder="Enter new password"
                      className="pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showNew ? 'Hide new password' : 'Show new password'}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {requirements.map((req) => (
                        <li
                          key={req.label}
                          className={`flex items-center gap-2 text-xs ${
                            req.met ? 'text-success' : 'text-muted-foreground'
                          }`}
                        >
                          <Check className={`w-3 h-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                          {req.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      className="pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isLoading || !allMet || !passwordsMatch}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;