import * as React from "react";

import { cn } from "@/lib/utils";
import { SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

export const APP_SELECT_TRIGGER_CLASS =
  "h-10 w-full border-0 bg-muted/70 px-3 text-sm shadow-none transition-colors hover:bg-muted focus:ring-1 focus:ring-primary/40";
export const APP_SELECT_CONTENT_CLASS =
  "max-h-64 overflow-y-auto rounded-xl border-primary/20 bg-popover/95 p-1 shadow-lg backdrop-blur-sm";
export const APP_SELECT_ITEM_CLASS =
  "rounded-md px-3 py-2.5 text-sm focus:bg-primary/10 focus:text-primary";

export function AppSelectTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectTrigger>) {
  return <SelectTrigger className={cn(APP_SELECT_TRIGGER_CLASS, className)} {...props} />;
}

export function AppSelectContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectContent>) {
  return <SelectContent className={cn(APP_SELECT_CONTENT_CLASS, className)} {...props} />;
}

export function AppSelectItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectItem>) {
  return <SelectItem className={cn(APP_SELECT_ITEM_CLASS, className)} {...props} />;
}
