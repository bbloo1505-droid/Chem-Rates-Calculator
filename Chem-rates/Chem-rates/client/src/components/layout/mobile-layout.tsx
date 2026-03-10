import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Droplet, Backpack, History, Sprout } from "lucide-react";
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
    <div className="mx-auto max-w-md h-[100dvh] flex flex-col bg-background relative shadow-2xl shadow-black/10 overflow-hidden sm:border-x sm:border-border">
      
      {/* Header */}
      <header className="pt-12 pb-4 px-6 bg-primary text-primary-foreground shrink-0 rounded-b-[2rem] shadow-lg relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none rounded-b-[2rem]" />
        <div className="flex items-center gap-3 relative">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Sprout className="w-6 h-6 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight">{title}</h1>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 pt-6 px-4">
        {children}
      </main>

      {/* Glassmorphism Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 glass-nav pb-safe pt-2 px-6 z-50">
        <div className="flex justify-between items-center max-w-sm mx-auto mb-4 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-20 gap-1.5 touch-target transition-all duration-300",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                )}
              >
                <div className={cn(
                  "p-3 rounded-2xl transition-all duration-300",
                  isActive ? "bg-primary/10 scale-110" : "bg-transparent scale-100"
                )}>
                  <Icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                </div>
                <span className={cn(
                  "text-[11px] font-semibold tracking-wide transition-all",
                  isActive ? "opacity-100" : "opacity-70"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
