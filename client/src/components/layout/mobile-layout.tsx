import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import BottomNavigation from "@/components/ui/bottom-navigation";
import SideMenu from "@/components/ui/side-menu";

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  const getPageTitle = () => {
    switch (location) {
      case "/": return "Panel";
      case "/customers": return "Müşteriler";
      case "/invoices": return "Faturalar";
      case "/expenses": return "Masraflar";
      case "/reports": return "Raporlar";
      default: return "FaturaYoneticim";
    }
  };

  return (
    <div className="mobile-container bg-white min-h-screen relative">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button 
          onClick={() => setIsSideMenuOpen(true)}
          className="text-xl"
          data-testid="button-menu"
        >
          <i className="fas fa-bars"></i>
        </button>
        <div className="flex items-center space-x-2">
          <i className="fas fa-receipt text-lg"></i>
          <h1 className="text-lg font-semibold">FaturaYoneticim</h1>
        </div>
        <button className="text-xl" data-testid="button-profile">
          <i className="fas fa-user-circle"></i>
        </button>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Side Menu */}
      <SideMenu 
        isOpen={isSideMenuOpen} 
        onClose={() => setIsSideMenuOpen(false)} 
      />

      {/* Bottom Navigation */}
      <BottomNavigation currentPath={location} />
    </div>
  );
}
