import { Link } from "wouter";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const menuItems = [
    { path: "/", icon: "fas fa-th-large", label: "Özet" },
    { path: "/customers", icon: "fas fa-users", label: "Müşteriler" },
    { path: "/invoices", icon: "fas fa-file-invoice", label: "Faturalar" },
    { path: "/expenses", icon: "fas fa-credit-card", label: "Masraflar" },
    { path: "/reports", icon: "fas fa-chart-bar", label: "Raporlar" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
        data-testid="overlay-menu"
      />
      <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Menü</h2>
            <button 
              onClick={onClose}
              className="text-muted-foreground"
              data-testid="button-close-menu"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onClick={onClose}
                  className="block w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                  data-testid={`menu-${item.label.toLowerCase()}`}
                >
                  <i className={`${item.icon} mr-3 text-primary`}></i>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="mt-8 pt-4 border-t border-border">
            <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <i className="fas fa-sync-alt mr-3"></i>
              <span>Senkronize</span>
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-red-600">
              <i className="fas fa-sign-out-alt mr-3"></i>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
