import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const APP_INPUT_CLASS =
  "h-10 border-0 bg-muted/70 px-3 shadow-none transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-primary/40";

export const AppInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentPropsWithoutRef<typeof Input>
>(({ className, ...props }, ref) => {
  return <Input ref={ref} className={cn(APP_INPUT_CLASS, className)} {...props} />;
});

AppInput.displayName = "AppInput";
