import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Droplet, History, Sprout } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface MobileLayoutProps {
  children: ReactNode;
  title: string;
}

export function MobileLayout({ children, title }: MobileLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Spray Mix", icon: Droplet },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <div className="w-full min-h-[100dvh] overflow-x-hidden bg-background">
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-md min-w-0 flex-col overflow-hidden bg-background shadow-2xl shadow-black/10 sm:border-x sm:border-border">
        {/* Header */}
        <header className="relative z-10 w-full min-w-0 shrink-0 overflow-hidden rounded-b-[2rem] bg-primary px-6 pb-4 pt-12 text-primary-foreground shadow-lg">
          <div className="pointer-events-none absolute inset-0 rounded-b-[2rem] bg-gradient-to-b from-black/10 to-transparent" />
          <div className="relative flex w-full min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-white/20 p-2 backdrop-blur-sm">
              <Sprout className="h-6 w-6 text-secondary" />
            </div>
            <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight font-display">
              {title}
            </h1>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 w-full min-w-0 max-w-full overflow-y-auto overflow-x-hidden px-4 pb-24 pt-6">
          <div className="w-full min-w-0 max-w-full">{children}</div>
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 z-50 w-full min-w-0 overflow-hidden glass-nav px-6 pb-safe pt-2">
          <div className="mx-auto mb-4 mt-2 flex w-full max-w-sm min-w-0 items-center justify-between">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex w-20 min-w-0 flex-col items-center justify-center gap-1.5 touch-target transition-all duration-300",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary/70"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl p-3 transition-all duration-300",
                      isActive ? "scale-110 bg-primary/10" : "scale-100 bg-transparent"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        isActive ? "stroke-[2.5px]" : "stroke-2"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "truncate text-[11px] font-semibold tracking-wide transition-all",
                      isActive ? "opacity-100" : "opacity-70"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
