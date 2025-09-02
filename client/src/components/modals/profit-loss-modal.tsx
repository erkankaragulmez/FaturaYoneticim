import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

interface ProfitLossModalProps {
  type: "monthly" | "yearly" | null;
  data: any;
  onClose: () => void;
}

export default function ProfitLossModal({ type, data, onClose }: ProfitLossModalProps) {
  if (!type || !data) return null;

  const isMonthly = type === "monthly";
  const profit = isMonthly ? data.monthly?.profit || 0 : data.yearly?.profit || 0;
  const invoiceTotal = isMonthly ? data.monthly?.invoices || 0 : data.yearly?.invoices || 0;
  const expenseTotal = isMonthly ? data.monthly?.expenses || 0 : data.yearly?.expenses || 0;

  const isProfit = profit >= 0;
  const title = isMonthly ? "Aylık Kar/Zarar" : "Yıllık Kar/Zarar";
  const period = isMonthly ? "Eylül 2025" : "2025";

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="w-full max-w-sm">
        <div className="text-center p-2">
          <h3 className="text-lg font-semibold mb-4" data-testid="text-modal-title">
            {title}
          </h3>
          <div className={`text-3xl font-bold mb-2 ${
            isProfit ? 'text-green-600' : 'text-red-600'
          }`} data-testid="text-modal-amount">
            {formatCurrency(profit)}
          </div>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-modal-description">
            {period}: {formatCurrency(invoiceTotal)} (Faturalar) - {formatCurrency(expenseTotal)} (Masraflar)
          </p>
          <Button 
            onClick={onClose}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg"
            data-testid="button-close-modal"
          >
            Tamam
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
