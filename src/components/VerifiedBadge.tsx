// src/components/VerifiedBadge.tsx
//
// Shows a recruiter's verification status wherever their name/company
// appears — job listings, the candidate directory, recruiter profile
// headers. Backed by recruiter_profiles.verification_status
// ('pending' | 'approved' | 'rejected') via GET /api/auth/me or
// GET /api/recruiter/profile.

import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type VerificationStatus = "pending" | "approved" | "rejected";

interface VerifiedBadgeProps {
  status: VerificationStatus | undefined | null;
  className?: string;
  /** Icon-only, no label — for tight spaces like a candidate card header. */
  compact?: boolean;
}

const CONFIG: Record<
  VerificationStatus,
  { label: string; icon: typeof BadgeCheck; classes: string }
> = {
  approved: {
    label: "Verified",
    icon: BadgeCheck,
    classes: "border-transparent bg-success/10 text-success hover:bg-success/15",
  },
  pending: {
    label: "Verification pending",
    icon: Clock,
    classes: "border-transparent bg-warning/10 text-warning hover:bg-warning/15",
  },
  rejected: {
    label: "Verification rejected",
    icon: XCircle,
    classes: "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/15",
  },
};

export function VerifiedBadge({ status, className, compact = false }: VerifiedBadgeProps) {
  if (!status) return null;
  const { label, icon: Icon, classes } = CONFIG[status];

  return (
    <Badge className={cn(classes, "gap-1 font-medium", className)} title={label}>
      <Icon className="w-3 h-3" />
      {!compact && label}
    </Badge>
  );
}

export default VerifiedBadge;
