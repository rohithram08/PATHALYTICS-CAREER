// src/pages/Settings.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, GraduationCap, Calendar, Bell, Shield, LogOut,
  Camera, Trash2, Check, AlertTriangle, KeyRound, Smartphone,
  Loader2, Upload, X,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { userKey } from '@/lib/userStorage';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NOTIF_KEY = 'notif_prefs';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface NotificationPrefs {
  email: boolean;
  product: boolean;
  weeklyDigest: boolean;
}

const DEFAULT_NOTIFS: NotificationPrefs = {
  email: true,
  product: true,
  weeklyDigest: false,
};

interface SectionProps {
  icon: typeof User;
  iconClass?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingsSection = ({ icon: Icon, iconClass, title, description, children }: SectionProps) => (
  <section className="bg-card rounded-2xl border border-border p-6">
    <header className="flex items-start gap-3 mb-6">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </header>
    {children}
  </section>
);

const SettingsSkeleton = () => (
  <Layout>
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-64 mb-8" />
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-2xl border border-border p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-32" />
          </div>
        ))}
      </div>
    </div>
  </Layout>
);

const Settings = () => {
  const { user, isLoading, updateUser, token, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Student');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFS);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [baseline, setBaseline] = useState({
    name: '',
    role: 'Student',
    profileImage: null as string | null,
    notifications: DEFAULT_NOTIFS,
  });

  useEffect(() => {
    if (!user) return;
    const storedImg = localStorage.getItem(userKey('profile_image')) || user.avatar || null;
    let storedNotifs: NotificationPrefs = DEFAULT_NOTIFS;
    const raw = localStorage.getItem(userKey(NOTIF_KEY));
    if (raw) {
      try { storedNotifs = { ...DEFAULT_NOTIFS, ...JSON.parse(raw) }; } catch { /* noop */ }
    }
    setName(user.name || '');
    setEmail(user.email || '');
    setRole(user.role || 'Student');
    setProfileImage(storedImg);
    setNotifications(storedNotifs);
    setBaseline({
      name: user.name || '',
      role: user.role || 'Student',
      profileImage: storedImg,
      notifications: storedNotifs,
    });
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) navigate('/login');
  }, [isLoading, user, navigate]);

  const isDirty = useMemo(() => (
    name !== baseline.name ||
    role !== baseline.role ||
    profileImage !== baseline.profileImage ||
    JSON.stringify(notifications) !== JSON.stringify(baseline.notifications)
  ), [name, role, profileImage, notifications, baseline]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const processAvatarFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Unsupported file', description: 'Please choose an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: 'Image too large', description: 'Max size is 2 MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleAvatarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAvatarFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processAvatarFile(file);
  };

  const handleSave = useCallback(async () => {
    if (!user || !isDirty) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          avatar: profileImage || null,
          notifications,
        }),
      });
      if (!res.ok) throw new Error('Failed to update profile');

      updateUser({ name: name.trim(), avatar: profileImage || undefined });
      localStorage.setItem(userKey(NOTIF_KEY), JSON.stringify(notifications));
      const imgKey = userKey('profile_image');
      if (profileImage) localStorage.setItem(imgKey, profileImage);
      else localStorage.removeItem(imgKey);
      window.dispatchEvent(new Event('pathlytics_user:updated'));
      setBaseline({ name: name.trim(), role, profileImage, notifications });
      toast({ title: 'Changes saved', description: 'Your profile has been updated.' });
    } catch {
      toast({ title: 'Save failed', description: 'Could not update your profile. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [user, isDirty, name, role, profileImage, notifications, token, updateUser, toast]);

  const handleDiscard = () => {
    setName(baseline.name);
    setRole(baseline.role);
    setProfileImage(baseline.profileImage);
    setNotifications(baseline.notifications);
    toast({ title: 'Changes discarded' });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, isSaving, handleSave]);

  const handleLogout = () => {
    localStorage.removeItem(userKey('profile_image'));
    localStorage.removeItem(userKey(NOTIF_KEY));
    window.dispatchEvent(new Event('pathlytics_user:updated'));
    logout();
    navigate('/');
  };

  // ✅ FIX: handleDeleteAccount with useCallback, isDeleting guard, and full dep array
  const handleDeleteAccount = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');

      localStorage.removeItem(userKey('profile_image'));
      localStorage.removeItem(userKey(NOTIF_KEY));
      window.dispatchEvent(new Event('pathlytics_user:updated'));
      logout();
      navigate('/');
      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' });
    } catch {
      toast({
        title: 'Delete failed',
        description: 'Could not delete your account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, token, logout, navigate, toast]);

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const initial = (name || user?.name || 'U').charAt(0).toUpperCase();

  if (isLoading || !user) return <SettingsSkeleton />;

  return (
    <Layout>
      <div className={cn("container mx-auto px-4 py-8 max-w-3xl", isDirty ? "pb-32" : "pb-8")}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account, preferences, and security.</p>
        </div>

        <div className="space-y-6">
          {/* PROFILE */}
          <SettingsSection icon={User} iconClass="bg-primary/10 text-primary" title="Profile" description="This is how others will see you on the platform.">
            <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
              {/* Avatar */}
              <div className="space-y-3">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleAvatarDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                  aria-label="Upload profile photo"
                  className={cn(
                    'group relative rounded-2xl border-2 border-dashed bg-muted/40 p-4 cursor-pointer transition-all',
                    isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/60'
                  )}
                >
                  {profileImage
                    ? <img src={profileImage} alt="Profile" className="mx-auto h-32 w-32 rounded-full object-cover" />
                    : <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-5xl font-bold text-primary-foreground">{initial}</div>
                  }
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center gap-1 text-foreground">
                      <Camera className="w-6 h-6" />
                      <span className="text-xs font-medium">{isDragging ? 'Drop image' : 'Change photo'}</span>
                    </div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarInput} />
                <div className="flex flex-col gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Upload className="w-3.5 h-3.5 mr-2" /> Upload photo
                  </Button>
                  {profileImage && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setProfileImage(null)} className="w-full text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground text-center">JPG, PNG · max 2 MB</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-5 min-w-0">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Your name" />
                  <p className="text-[11px] text-muted-foreground">{name.length}/60 characters</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="flex items-center justify-between">
                    Email
                    <span className="text-[11px] font-normal text-muted-foreground">Verified · contact support to change</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" value={email} disabled className="pl-10" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role" className="flex items-center justify-between">
                    Role
                    <span className="text-[11px] font-normal text-muted-foreground">Set during signup</span>
                  </Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="role" value={role} disabled className="pl-10" />
                  </div>
                </div>
                {joinDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Joined {joinDate}</span>
                  </div>
                )}
              </div>
            </div>
          </SettingsSection>

          {/* NOTIFICATIONS */}
          <SettingsSection icon={Bell} iconClass="bg-accent/10 text-accent" title="Notifications" description="Choose what you want to hear about.">
            <div className="divide-y divide-border">
              {[
                { key: 'email' as const, title: 'Email notifications', desc: 'Account activity, security alerts, and important updates.' },
                { key: 'product' as const, title: 'Product updates', desc: 'New features, roadmap releases, and platform improvements.' },
                { key: 'weeklyDigest' as const, title: 'Weekly career digest', desc: 'Curated career tips and recommended roadmaps every Monday.' },
              ].map((opt) => (
                <div key={opt.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{opt.title}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[opt.key]}
                    onCheckedChange={(v) => setNotifications((n) => ({ ...n, [opt.key]: v }))}
                    aria-label={opt.title}
                  />
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* SECURITY */}
          <SettingsSection
            icon={Shield}
            iconClass="bg-success/10 text-success"
            title="Security"
            description="Keep your account safe."
          >
            <div className="space-y-2">
              {[
                { label: 'Password', desc: 'Change your password', icon: KeyRound, path: '/change-password' },
                { label: 'Two-factor authentication', desc: 'Add an extra verification step', icon: Smartphone, path: '/two-factor-auth' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between gap-4 p-4 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Manage →</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* LOGOUT */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Log out</p>
                <p className="text-sm text-muted-foreground">You'll need to sign in again on this device.</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out of Pathalytics?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isDirty
                      ? 'You have unsaved changes. Logging out will discard them.'
                      : "You'll need to sign in again to access your account."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* DANGER ZONE */}
          <SettingsSection icon={AlertTriangle} iconClass="bg-destructive/10 text-destructive" title="Danger zone" description="Irreversible actions — proceed carefully.">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Delete account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All your data — saved careers, roadmaps, chat history — will be permanently deleted. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    {/* ✅ FIX: Cancel disabled during deletion */}
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    {/* ✅ FIX: onClick wired + loading state */}
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      {isDeleting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                      ) : (
                        'Yes, delete my account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SettingsSection>
        </div>
      </div>

      {/* STICKY SAVE BAR */}
      {isDirty && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom duration-200"
          role="region"
          aria-label="Save changes"
        >
          <div className="container mx-auto px-4 py-3 max-w-3xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <p className="text-sm font-medium text-foreground truncate">Unsaved changes</p>
              <kbd className="hidden md:inline-flex items-center text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-2 bg-muted">
                ⌘S
              </kbd>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving}>
                <X className="w-3.5 h-3.5 mr-1" /> Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isSaving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  : <><Check className="w-4 h-4 mr-2" /> Save changes</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Settings;