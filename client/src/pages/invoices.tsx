import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Invoice, Customer } from "@shared/schema";
import InvoiceForm from "@/components/forms/invoice-form";
import InvoiceDetailModal from "@/components/modals/invoice-detail-modal";
import PaymentForm from "@/components/forms/payment-form";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";
import { queryClient } from "@/lib/queryClient";

export default function Invoices() {
  const [location] = useLocation();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("unpaid");
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Handle URL parameters from dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const period = params.get('period');
    const status = params.get('status');
    
    if (period) {
      setSelectedPeriod(period);
    }
    
    if (status === 'paid-partial') {
      setActiveTab('paid'); // Default to paid, user can switch to partial
    }
  }, [location]);

  const currentMonth = selectedPeriod === "yearly" ? 9 : parseInt(selectedPeriod.split("-")[1]);
  const currentYear = selectedPeriod === "yearly" ? 2025 : parseInt(selectedPeriod.split("-")[0]);

  const periodOptions = [
    { value: "yearly", label: "Yıllık" },
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

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "Müşteri Seçilmemiş";
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Bilinmeyen Müşteri";
  };

  const getCustomer = (customerId: string | null) => {
    if (!customerId) return null;
    return customers.find(c => c.id === customerId) || null;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Ödendi", className: "bg-green-100 text-green-700" },
      partial: { label: "Kısmi", className: "bg-orange-100 text-orange-700" },
      unpaid: { label: "Ödenmemiş", className: "bg-red-100 text-red-700" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (!invoice.issueDate) return false;
    const invoiceDate = new Date(invoice.issueDate);
    
    // Filter by date based on selected period
    let dateMatch;
    if (selectedPeriod === "yearly") {
      dateMatch = invoiceDate.getFullYear() === currentYear;
    } else {
      dateMatch = invoiceDate.getMonth() + 1 === currentMonth && invoiceDate.getFullYear() === currentYear;
    }
    
    if (!dateMatch) return false;
    
    // Filter by status tab for both yearly and monthly views
    return invoice.status === activeTab;
  });

  const getRemainingBalance = (invoice: Invoice) => {
    const total = parseFloat(invoice.amount);
    const paid = parseFloat(invoice.paidAmount || "0");
    return total - paid;
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete invoice");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to recalculate totals
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <i className="fas fa-file-invoice mr-2 text-primary"></i>
          Faturalar
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              data-testid="button-add-invoice"
            >
              <i className="fas fa-plus mr-1"></i>
              Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedInvoice ? "Faturayı Düzenle" : "Yeni Fatura"}
              </DialogTitle>
            </DialogHeader>
            <InvoiceForm
              invoice={selectedInvoice}
              customers={customers}
              onSuccess={() => {
                setIsDialogOpen(false);
                setSelectedInvoice(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Filter */}
      <div className="mb-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger data-testid="select-invoice-period">
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
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted rounded-lg">
          <TabsTrigger value="unpaid" data-testid="tab-unpaid-invoices">Ödenmemiş</TabsTrigger>
          <TabsTrigger value="partial" data-testid="tab-partial-invoices">Kısmi</TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-paid-invoices">Ödendi</TabsTrigger>
        </TabsList>
      </Tabs>


      {/* Invoice List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-file-invoice text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">
              {selectedPeriod === "yearly" ? "Henüz fatura eklenmemiş" : `${activeTab} durumunda fatura yok`}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-white border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-foreground" data-testid={`text-invoice-number-${invoice.id}`}>
                    {invoice.number}
                  </span>
                  {getStatusBadge(invoice.status || "unpaid")}
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-foreground" data-testid={`text-invoice-amount-${invoice.id}`}>
                    {formatCurrency(parseFloat(invoice.amount))}
                  </div>
                  {invoice.status === "partial" && (
                    <div className="text-xs text-orange-600 font-medium" data-testid={`text-remaining-balance-${invoice.id}`}>
                      Kalan: {formatCurrency(getRemainingBalance(invoice))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span data-testid={`text-invoice-customer-${invoice.id}`}>
                  {getCustomerName(invoice.customerId)}
                </span>
                <span data-testid={`text-invoice-date-${invoice.id}`}>
                  {formatDate(invoice.issueDate!)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 min-w-8 h-8 text-gray-600 hover:text-gray-800 text-sm font-bold"
                    onClick={() => setViewingInvoice(invoice)}
                    data-testid={`button-view-invoice-${invoice.id}`}
                  >
                    ◉
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 min-w-8 h-8 text-gray-600 hover:text-gray-800 text-sm font-bold"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setIsDialogOpen(true);
                    }}
                    data-testid={`button-edit-invoice-${invoice.id}`}
                  >
                    ✎
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 min-w-8 h-8 text-gray-600 hover:text-red-600 text-sm font-bold"
                    onClick={() => deleteMutation.mutate(invoice.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-invoice-${invoice.id}`}
                  >
                    ✕
                  </Button>
                </div>
                {(invoice.status === "unpaid" || invoice.status === "partial") && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                    onClick={() => {
                      setPaymentInvoice(invoice);
                      setIsPaymentDialogOpen(true);
                    }}
                    data-testid={`button-add-payment-${invoice.id}`}
                  >
                    <i className="fas fa-plus mr-1"></i>
                    Ödeme Ekle
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invoice Detail Modal */}
      {viewingInvoice && (
        <InvoiceDetailModal
          invoice={viewingInvoice}
          customer={getCustomer(viewingInvoice.customerId)}
          onClose={() => setViewingInvoice(null)}
          onEdit={() => {
            setSelectedInvoice(viewingInvoice);
            setViewingInvoice(null);
            setIsDialogOpen(true);
          }}
        />
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme Ekle</DialogTitle>
          </DialogHeader>
          {paymentInvoice && (
            <PaymentForm
              invoice={paymentInvoice}
              onSuccess={() => {
                setIsPaymentDialogOpen(false);
                setPaymentInvoice(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
