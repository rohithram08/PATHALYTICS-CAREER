// src/hooks/use-toast.ts
/**
 * 🔄 COMPATIBILITY LAYER
 * 
 * The old shadcn `useToast` API mapped to sonner.
 * 
 * This lets existing code keep using:
 *   const { toast } = useToast();
 *   toast({ title: "...", description: "...", variant: "destructive" });
 * 
 * ...while we migrate files one at a time to native sonner:
 *   import { toast } from "sonner";
 *   toast.success("...");
 * 
 * TODO: Delete this file once all pages have migrated.
 */

import { toast as sonnerToast } from "sonner";

type Variant = "default" | "destructive" | "success" | "warning" | "info";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: Variant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const toast = ({
  title,
  description,
  variant = "default",
  duration,
  action,
}: ToastOptions) => {
  const message = title || description || "";
  const opts = {
    description: title && description ? description : undefined,
    duration,
    action: action
      ? { label: action.label, onClick: action.onClick }
      : undefined,
  };

  switch (variant) {
    case "destructive":
      return sonnerToast.error(message, opts);
    case "success":
      return sonnerToast.success(message, opts);
    case "warning":
      return sonnerToast.warning(message, opts);
    case "info":
      return sonnerToast.info(message, opts);
    default:
      return sonnerToast(message, opts);
  }
};

// Mimic the old hook signature
export const useToast = () => ({
  toast,
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  toasts: [], // sonner manages internally; kept for type compat
});

export { toast };