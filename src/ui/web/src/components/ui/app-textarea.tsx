import * as React from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const APP_TEXTAREA_CLASS =
  "border-0 bg-muted/40 shadow-none transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-primary/40";

export const AppTextarea = React.forwardRef<
  React.ElementRef<typeof Textarea>,
  React.ComponentPropsWithoutRef<typeof Textarea>
>(({ className, ...props }, ref) => {
  return <Textarea ref={ref} className={cn(APP_TEXTAREA_CLASS, className)} {...props} />;
});

AppTextarea.displayName = "AppTextarea";
