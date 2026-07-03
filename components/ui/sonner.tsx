"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-neutral-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-neutral-muted",
          actionButton:
            "group-[.toast]:bg-brand-navy group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-neutral-bg group-[.toast]:text-neutral-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
