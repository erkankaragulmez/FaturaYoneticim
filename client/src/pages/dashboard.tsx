import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProfitLossModal from "@/components/modals/profit-loss-modal";
import { formatCurrency } from "@/lib/currency";

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("2025-09");
  const [showProfitModal, setShowProfitModal] = useState<"monthly" | "yearly" | null>(null);

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
    { value: "2025-09", label: "Eylül 2025" },
    { value: "2025-08", label: "Ağustos 2025" },
    { value: "2025-07", label: "Temmuz 2025" },
    { value: "2025-06", label: "Haziran 2025" },
    { value: "2025-05", label: "Mayıs 2025" },
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
            variant="outline" 
            size="icon"
            onClick={() => {
              const currentIndex = periodOptions.findIndex(p => p.value === selectedPeriod);
              if (currentIndex < periodOptions.length - 1) {
                setSelectedPeriod(periodOptions[currentIndex + 1].value);
              }
            }}
            data-testid="button-previous-month"
          >
            <i className="fas fa-chevron-left text-muted-foreground"></i>
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              const currentIndex = periodOptions.findIndex(p => p.value === selectedPeriod);
              if (currentIndex > 0) {
                setSelectedPeriod(periodOptions[currentIndex - 1].value);
              }
            }}
            data-testid="button-next-month"
          >
            <i className="fas fa-chevron-right text-muted-foreground"></i>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Son güncelleme: <span data-testid="text-last-update">{analytics?.lastUpdate || "..."}</span>
        </p>
      </div>

      {/* Financial Cards */}
      <div className="p-4 space-y-4">
        {/* Yapılan İş Card */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-muted-foreground text-sm">Yapılan İş ({currentMonth}/2025)</h3>
            <i className="fas fa-file-invoice text-primary"></i>
          </div>
          <div className="text-2xl font-bold text-primary mb-1" data-testid="text-monthly-invoices">
            {formatCurrency(analytics?.monthly?.invoices || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Girilen fatura tutarları</p>
        </div>

        {/* Gelen Ödemeler Card */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-green-700 text-sm">Gelen Ödemeler ({currentMonth}/2025)</h3>
            <i className="fas fa-chart-line text-green-600"></i>
          </div>
          <div className="text-2xl font-bold text-green-600 mb-1" data-testid="text-monthly-payments">
            {formatCurrency(analytics?.monthly?.payments || 0)}
          </div>
          <p className="text-xs text-green-600">Yapılan ödemeler toplamı</p>
        </div>

        {/* Alacaklar Card */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-orange-700 text-sm">Alacaklar</h3>
            <i className="fas fa-clock text-orange-600"></i>
          </div>
          <div className="text-2xl font-bold text-orange-600 mb-1" data-testid="text-total-receivables">
            {formatCurrency(analytics?.receivables || 0)}
          </div>
          <p className="text-xs text-orange-600">Piyasadan tüm alacaklar</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-3">
        <Button 
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium"
          onClick={() => setShowProfitModal("monthly")}
          data-testid="button-monthly-profit"
        >
          <i className="fas fa-calculator mr-2"></i>
          Aylık Kar/Zarar Hesapla
        </Button>
        <Button 
          className="w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-medium"
          onClick={() => setShowProfitModal("yearly")}
          data-testid="button-yearly-profit"
        >
          <i className="fas fa-chart-bar mr-2"></i>
          Yıllık Kar/Zarar Hesapla
        </Button>
      </div>

      {/* Profit/Loss Modal */}
      <ProfitLossModal
        type={showProfitModal}
        data={analytics}
        onClose={() => setShowProfitModal(null)}
      />
    </div>
  );
}
