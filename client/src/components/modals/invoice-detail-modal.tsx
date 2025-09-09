import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type Invoice, type Customer, type Payment } from "@shared/schema";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  customer: Customer | null;
  onClose: () => void;
  onEdit: () => void;
}

export default function InvoiceDetailModal({ 
  invoice, 
  customer, 
  onClose, 
  onEdit 
}: InvoiceDetailModalProps) {

  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError } = useQuery<Payment[]>({
    queryKey: ["/api/payments/invoice", invoice?.id],
    enabled: !!invoice?.id,
    staleTime: 0, // Always refetch to get latest payments
    gcTime: 0, // Don't cache to avoid stale data
  });

  // Debug logging
  console.log("Invoice ID:", invoice?.id);
  console.log("Payments data:", payments);
  console.log("Payments loading:", paymentsLoading);
  console.log("Payments error:", paymentsError);

  if (!invoice) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Ödendi", className: "bg-green-100 text-green-700" },
      partial: { label: "Kısmi", className: "bg-orange-100 text-orange-700" },
      unpaid: { label: "Ödenmemiş", className: "bg-red-100 text-red-700" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const remainingAmount = parseFloat(invoice.amount) - parseFloat(invoice.paidAmount || "0");

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Fatura Detayı</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              data-testid="button-edit-invoice-detail"
            >
              <i className="fas fa-edit"></i>
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">{invoice.number}</h3>
              {getStatusBadge(invoice.status || "unpaid")}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>Müşteri: {customer?.name || "Bilinmeyen"}</div>
              {customer?.company && <div>Şirket: {customer.company}</div>}
              <div>Fatura Tarihi: {formatDate(invoice.issueDate!)}</div>
              {invoice.dueDate && <div>Vade Tarihi: {formatDate(invoice.dueDate)}</div>}
              {invoice.description && <div>Açıklama: {invoice.description}</div>}
            </div>
          </div>

          {/* Amount Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Toplam Tutar:</span>
                <span className="font-medium">{formatCurrency(parseFloat(invoice.amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ödenen:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(parseFloat(invoice.paidAmount || "0"))}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Kalan:</span>
                <span className={`font-bold ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div>
              <h3 className="font-medium text-foreground mb-3">Ödeme Geçmişi ({payments.length} ödeme)</h3>
              <div className="space-y-2">
                {payments
                  .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
                  .map((payment, index) => (
                  <div key={payment.id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-green-700">
                            {formatCurrency(parseFloat(payment.amount))}
                          </div>
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-xs text-green-600">
                          {payment.date ? formatDate(payment.date) : 'Tarih belirtilmemiş'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {payment.date ? new Date(payment.date).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <i className="fas fa-check-circle text-green-500 text-lg"></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-700 text-center">
                  Toplam {payments.length} ödeme • Son ödeme: {payments.length > 0 ? formatDate(Math.max(...payments.map(p => new Date(p.date!).getTime()))) : ''}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
              data-testid="button-close-invoice-detail"
            >
              Kapat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}