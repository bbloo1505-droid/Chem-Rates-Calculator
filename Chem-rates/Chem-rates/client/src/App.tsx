import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Page Imports
import SprayCalculator from "./pages/spray-calculator";
import History from "./pages/history";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SprayCalculator} />
      <Route path="/history" component={History} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Full bleed container to hold the constrained mobile layout */}
        <div className="min-h-screen bg-slate-100 sm:py-8 flex flex-col items-center">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
