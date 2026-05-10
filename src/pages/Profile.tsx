// src/pages/Profile.tsx
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, GraduationCap, Calendar, Compass, Map,
  MessageCircle, Bookmark, ArrowRight, Clock,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getActivities, formatTimeAgo } from '@/lib/activityTracker';
import { getSavedCareers } from '@/lib/savedCareers';
import { userKey } from '@/lib/userStorage';
import { useAuth } from '@/hooks/useAuth';

// ── Typed activity icons (fixes fragile string matching) ──
const ACTION_ICON_MAP: Record<string, React.ElementType> = {
  recommendation: Compass,
  roadmap: Map,
  Viewed: Map,
  chat: MessageCircle,
  saved: Bookmark,
};

const getActivityIcon = (action: string): React.ElementType => {
  for (const [key, Icon] of Object.entries(ACTION_ICON_MAP)) {
    if (action.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return Clock; // neutral fallback
};

// ── Profile skeleton (was missing) ──
const ProfileSkeleton = () => (
  <Layout>
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="bg-card rounded-2xl border border-border p-8">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  </Layout>
);

const Profile = () => {
  const { user, isLoading } = useAuth();
  const [profileImage, setProfileImage] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    const load = () => {
      const stored = localStorage.getItem(userKey('profile_image'));
      setProfileImage(stored || user.avatar || undefined);
    };
    load();
    window.addEventListener('pathlytics_user:updated', load);
    return () => window.removeEventListener('pathlytics_user:updated', load);
  }, [user]);

  // ── Memoize expensive reads ──
  const activities = useMemo(() => getActivities(), []);
  const savedCount = useMemo(() => getSavedCareers().length, []);

  const stats = useMemo(() => [
    {
      icon: Bookmark,
      label: 'Saved Careers',
      value: savedCount,
      color: 'bg-success/10 text-success',
      href: '/saved-careers',
    },
    {
      icon: Compass,
      label: 'Recommendations',
      value: activities.filter(a => a.action.toLowerCase().includes('recommendation')).length,
      color: 'bg-primary/10 text-primary',
      href: '/career-recommendation',
    },
    {
      icon: Map,
      label: 'Roadmaps Viewed',
      value: activities.filter(a =>
        a.action.toLowerCase().includes('roadmap') ||
        a.action.toLowerCase().includes('viewed')
      ).length,
      color: 'bg-accent/10 text-accent',
      href: '/roadmaps',
    },
    {
      icon: MessageCircle,
      label: 'Chat Sessions',
      value: activities.filter(a => a.action.toLowerCase().includes('chat')).length,
      color: 'bg-warning/10 text-warning',
      href: '/chatbot',
    },
  ], [activities, savedCount]);

  if (isLoading || !user) return <ProfileSkeleton />;

  // ── Safe join date — never fallback to "today" ──
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const initial = (user.name?.charAt(0) ?? 'U').toUpperCase();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* ── Profile Header ── */}
        <div className="bg-card rounded-2xl border border-border p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 shadow-lg ring-2 ring-primary/20">
              {profileImage
                ? <AvatarImage src={profileImage} alt={`${user.name}'s profile`} />
                : <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-3xl font-bold">
                    {initial}
                  </AvatarFallback>
              }
            </Avatar>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {user.name || 'User'}
                </h1>
                {/* Role badge — more scannable than inline text */}
                <Badge variant="secondary" className="shrink-0">
                  {user.role || 'Student'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground justify-center sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </span>
                {joinDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Joined {joinDate}
                  </span>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link to="/settings">Edit Profile</Link>
            </Button>
          </div>
        </div>

        {/* ── Stats Grid — now clickable links ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.href}
              className="bg-card rounded-xl border border-border p-5 text-center hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* ── Recent Activity ── */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard" className="text-primary flex items-center gap-1">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {activities.length === 0 ? (
            // ── Proper empty state ──
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Compass className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Start exploring career recommendations to see your activity here.
              </p>
              <Button size="sm" asChild className="mt-2">
                <Link to="/career-recommendation">Explore Careers</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {activities.slice(0, 10).map((activity, index) => {
                const ActionIcon = getActivityIcon(activity.action);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Typed icon instead of generic User icon */}
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ActionIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        <span className="font-medium">{activity.action}</span>
                        {activity.item && <span className="text-muted-foreground"> · {activity.item}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatTimeAgo(activity.time)}
                    </span>
                  </div>
                );
              })}

              {activities.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-3">
                  Showing 10 of {activities.length} activities
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;