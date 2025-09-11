import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import BottomNavigation from "@/components/ui/bottom-navigation";
import SideMenu from "@/components/ui/side-menu";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const { user, logout } = useAuth();

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-primary-foreground/80 bg-white/10 rounded-full px-3 py-2" data-testid="button-profile">
              <i className="fas fa-user-circle text-2xl mr-2"></i>
              <span className="text-sm font-medium">{user?.firstName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled>
              <div className="flex flex-col text-left">
                <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                <span className="text-xs text-muted-foreground">@{user?.username}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600" data-testid="button-logout">
              <i className="fas fa-sign-out-alt mr-2"></i>
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
