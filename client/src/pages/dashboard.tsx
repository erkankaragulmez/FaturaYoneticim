import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("2025-09");
  const [showProfitSection, setShowProfitSection] = useState<"monthly" | "yearly" | null>(null);

  const currentMonth = parseInt(selectedPeriod.split("-")[1]);
  const currentYear = parseInt(selectedPeriod.split("-")[0]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics/dashboard", { month: currentMonth, year: currentYear }],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard?month=${currentMonth}&year=${currentYear}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
  });

  const periodOptions = [
    { value: "2025-12", label: "Aralık 2025" },
    { value: "2025-11", label: "Kasım 2025" },
    { value: "2025-10", label: "Ekim 2025" },
    { value: "2025-09", label: "Eylül 2025" },
    { value: "2025-08", label: "Ağustos 2025" },
    { value: "2025-07", label: "Temmuz 2025" },
    { value: "2025-06", label: "Haziran 2025" },
    { value: "2025-05", label: "Mayıs 2025" },
    { value: "2025-04", label: "Nisan 2025" },
    { value: "2025-03", label: "Mart 2025" },
    { value: "2025-02", label: "Şubat 2025" },
    { value: "2025-01", label: "Ocak 2025" },
  ];

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Period Selection */}
      <div className="p-4 bg-muted">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <i className="fas fa-calendar-alt mr-2"></i>
            Dönem Seçimi
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="bg-white border border-border" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="icon"
            className="bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 hover:border-primary/90 shadow-md"
            onClick={() => {
              const currentIndex = periodOptions.findIndex(p => p.value === selectedPeriod);
              if (currentIndex < periodOptions.length - 1) {
                setSelectedPeriod(periodOptions[currentIndex + 1].value);
              }
            }}
            data-testid="button-previous-month"
          >
            <i className="fas fa-chevron-left"></i>
          </Button>
          <Button 
            size="icon"
            className="bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 hover:border-primary/90 shadow-md"
            onClick={() => {
              const currentIndex = periodOptions.findIndex(p => p.value === selectedPeriod);
              if (currentIndex > 0) {
                setSelectedPeriod(periodOptions[currentIndex - 1].value);
              }
            }}
            data-testid="button-next-month"
          >
            <i className="fas fa-chevron-right"></i>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Son güncelleme: <span data-testid="text-last-update">{analytics?.lastUpdate || "..."}</span>
        </p>
      </div>

      {/* Financial Cards */}
      <div className="p-4 space-y-4">
        {/* Yapılan İş Card */}
        <Link href={`/invoices?period=${selectedPeriod}`}>
          <div className="bg-white border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground text-sm">Yapılan İş ({currentMonth}/2025)</h3>
              <i className="fas fa-file-invoice text-primary"></i>
            </div>
            <div className="text-2xl font-bold text-primary mb-1" data-testid="text-monthly-invoices">
              {formatCurrency(analytics?.monthly?.invoices || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Girilen fatura tutarları</p>
          </div>
        </Link>

        {/* Gelen Ödemeler Card */}
        <Link href={`/invoices?period=${selectedPeriod}&status=paid-partial`}>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-green-700 text-sm">Gelen Ödemeler ({currentMonth}/2025)</h3>
              <i className="fas fa-chart-line text-green-600"></i>
            </div>
            <div className="text-2xl font-bold text-green-600 mb-1" data-testid="text-monthly-payments">
              {formatCurrency(analytics?.monthly?.payments || 0)}
            </div>
            <p className="text-xs text-green-600">Yapılan ödemeler toplamı</p>
          </div>
        </Link>

        {/* Alacaklar Card */}
        <Link href="/reports?tab=aging">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-orange-700 text-sm">Alacaklar</h3>
              <i className="fas fa-clock text-orange-600"></i>
            </div>
            <div className="text-2xl font-bold text-orange-600 mb-1" data-testid="text-total-receivables">
              {formatCurrency(analytics?.receivables || 0)}
            </div>
            <p className="text-xs text-orange-600">Piyasadan tüm alacaklar</p>
          </div>
        </Link>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-3">
        <Button 
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium"
          onClick={() => setShowProfitSection(showProfitSection === "monthly" ? null : "monthly")}
          data-testid="button-monthly-profit"
        >
          <i className="fas fa-calculator mr-2"></i>
          Aylık Kar/Zarar Hesapla
        </Button>
        <Button 
          className="w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-medium"
          onClick={() => setShowProfitSection(showProfitSection === "yearly" ? null : "yearly")}
          data-testid="button-yearly-profit"
        >
          <i className="fas fa-chart-bar mr-2"></i>
          Yıllık Kar/Zarar Hesapla
        </Button>
      </div>

      {/* Profit/Loss Section */}
      {showProfitSection && analytics && (
        <div className="p-4 border-t border-border">
          <div className="bg-white border border-border rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold mb-4" data-testid="text-profit-title">
              {showProfitSection === "monthly" ? "Aylık Kar/Zarar" : "Yıllık Kar/Zarar"}
            </h3>
            
            {(() => {
              const isMonthly = showProfitSection === "monthly";
              const profit = isMonthly ? analytics.monthly?.profit || 0 : analytics.yearly?.profit || 0;
              const invoiceTotal = isMonthly ? analytics.monthly?.invoices || 0 : analytics.yearly?.invoices || 0;
              const expenseTotal = isMonthly ? analytics.monthly?.expenses || 0 : analytics.yearly?.expenses || 0;
              const isProfit = profit >= 0;
              
              // Get period label
              const monthNames = [
                "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
              ];
              const [year, monthNum] = selectedPeriod.split("-");
              const monthName = monthNames[parseInt(monthNum) - 1];
              const period = isMonthly ? `${monthName} ${year}` : year;
              
              return (
                <>
                  <div className={`text-3xl font-bold mb-4 ${
                    isProfit ? 'text-green-600' : 'text-red-600'
                  }`} data-testid="text-profit-amount">
                    {formatCurrency(profit)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4" data-testid="text-profit-calculation">
                    {period}: {formatCurrency(invoiceTotal)} (Faturalar) - {formatCurrency(expenseTotal)} (Masraflar)
                  </p>
                  <Button 
                    onClick={() => setShowProfitSection(null)}
                    variant="outline"
                    className="w-full"
                    data-testid="button-close-profit"
                  >
                    Kapat
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
