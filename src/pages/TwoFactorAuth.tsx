// src/pages/TwoFactorAuth.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Smartphone, Copy, Check, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserId } from '@/lib/userStorage';
import { useAuth } from '@/hooks/useAuth';

const MOCK_SECRET = 'JBSWY3DPEHPK3PXP';
const MOCK_BACKUP_CODES = ['8A3F-K29D', '7M4P-Q62X', 'B5TN-W81C', 'D9RL-Y34H', 'F2GJ-Z57V'];

const TwoFactorAuth = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'verify' | 'backup'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) return;

    const twoFAStatus = localStorage.getItem(`pathlytics_2fa_${userId}`);
    setIs2FAEnabled(twoFAStatus === 'enabled');
  }, [isLoading, user, navigate]);

  const handleToggle2FA = (checked: boolean) => {
    const userId = getCurrentUserId();

    if (!userId) {
      toast({
        title: 'Authentication error',
        description: 'Please log in again.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (checked) {
      setOtpCode('');
      setSetupStep('verify');
    } else {
      localStorage.removeItem(`pathlytics_2fa_${userId}`);
      setIs2FAEnabled(false);
      setSetupStep('idle');
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been turned off.',
      });
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_SECRET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy the secret key.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_BACKUP_CODES.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy the backup codes.',
        variant: 'destructive',
      });
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-digit code.',
        variant: 'destructive',
      });
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      toast({
        title: 'Authentication error',
        description: 'Please log in again.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      localStorage.setItem(`pathlytics_2fa_${userId}`, 'enabled');
      setIs2FAEnabled(true);
      setIsVerifying(false);
      setSetupStep('backup');
      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication is now active.',
      });
    }, 1000);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <div className="bg-card rounded-2xl border border-border p-6 flex items-center justify-center min-h-[260px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading security settings...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </button>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Two-Factor Authentication</h1>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 mb-6">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Authenticator App</p>
                <p className="text-xs text-muted-foreground">
                  {is2FAEnabled ? 'Currently enabled' : 'Currently disabled'}
                </p>
              </div>
            </div>
            <Switch checked={is2FAEnabled} onCheckedChange={handleToggle2FA} />
          </div>

          {setupStep === 'verify' && !is2FAEnabled && (
            <div className="space-y-5">
              <Separator />
              <div>
                <h2 className="font-semibold text-foreground mb-1">Set up Authenticator</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Open your authenticator app and enter this secret key:
                </p>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border font-mono text-sm text-foreground">
                  <span className="flex-1 tracking-widest">{MOCK_SECRET}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="text-center tracking-[0.5em] text-lg font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isVerifying || otpCode.length !== 6}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </form>
            </div>
          )}

          {setupStep === 'backup' && is2FAEnabled && (
            <div className="space-y-5">
              <Separator />
              <div>
                <h2 className="font-semibold text-foreground mb-1">Backup Recovery Codes</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Save these codes in a secure place. You can use them to access your account if you lose your authenticator.
                </p>

                <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-muted border border-border">
                  {MOCK_BACKUP_CODES.map((code) => (
                    <span key={code} className="font-mono text-sm text-foreground text-center py-1">
                      {code}
                    </span>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyBackupCodes}
                  className="w-full mt-3 gap-2"
                >
                  {copiedBackup ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copiedBackup ? 'Copied!' : 'Copy All Codes'}
                </Button>
              </div>

              <Button
                type="button"
                onClick={() => {
                  setSetupStep('idle');
                  navigate('/settings');
                }}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                Done
              </Button>
            </div>
          )}

          {is2FAEnabled && setupStep === 'idle' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-success" />
              </div>
              <p className="font-medium text-foreground">2FA is active</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your account is protected with two-factor authentication.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TwoFactorAuth;