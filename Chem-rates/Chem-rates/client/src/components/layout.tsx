import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Droplet, Ruler, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function MobileLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Spray", icon: Droplet },
    { path: "/calibration", label: "Calibrate", icon: Ruler },
    { path: "/history", label: "History", icon: Clock },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-muted/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md z-10 sticky top-0">
        <h1 className="text-xl font-bold font-display tracking-wide">
          BushRegen Calc
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-[84px] max-w-2xl mx-auto w-full relative">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-nav shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="flex justify-around items-center h-[72px] max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`
                  flex flex-col items-center justify-center w-full h-full space-y-1 relative
                  ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}
                `}
              >
                <div className="relative p-1">
                  <Icon className={`w-6 h-6 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -inset-2 bg-primary/10 rounded-full -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className={`text-[11px] font-medium ${isActive ? "font-bold" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="h-safe-area-bottom bg-background" />
      </nav>
    </div>
  );
}
