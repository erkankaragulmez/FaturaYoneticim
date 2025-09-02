import { Link } from "wouter";

interface BottomNavigationProps {
  currentPath: string;
}

export default function BottomNavigation({ currentPath }: BottomNavigationProps) {
  const navItems = [
    { path: "/", icon: "fas fa-th-large", label: "Panel" },
    { path: "/customers", icon: "fas fa-users", label: "Müşteriler" },
    { path: "/invoices", icon: "fas fa-file-invoice", label: "Faturalar" },
    { path: "/expenses", icon: "fas fa-credit-card", label: "Masraflar" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-border">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              currentPath === item.path
                ? "text-primary"
                : "text-muted-foreground"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <i className={`${item.icon} text-lg mb-1`}></i>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
