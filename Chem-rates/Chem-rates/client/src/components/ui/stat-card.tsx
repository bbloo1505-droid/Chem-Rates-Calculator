import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  delay?: number;
  highlight?: boolean;
}

export function StatCard({ title, value, unit, icon, delay = 0, highlight = false }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl p-5 border ${
        highlight 
          ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20" 
          : "tactile-card"
      }`}
    >
      {highlight && (
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      )}
      
      <div className="flex items-start justify-between mb-3 relative z-10">
        <h3 className={`text-sm font-semibold tracking-wide uppercase ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {title}
        </h3>
        {icon && (
          <div className={highlight ? "text-secondary" : "text-primary/60"}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-1.5 relative z-10">
        <span className={`text-3xl font-bold font-display ${highlight ? "text-white" : "text-foreground"}`}>
          {value}
        </span>
        {unit && (
          <span className={`text-lg font-medium ${highlight ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
            {unit}
          </span>
        )}
      </div>
    </motion.div>
  );
}
