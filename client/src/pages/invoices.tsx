import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Invoice, Customer } from "@shared/schema";
import InvoiceForm from "@/components/forms/invoice-form";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";
import { queryClient } from "@/lib/queryClient";

export default function Invoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

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
    if (activeTab === "all") return true;
    return invoice.status === activeTab;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete invoice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
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

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted rounded-lg">
          <TabsTrigger value="all" data-testid="tab-all-invoices">Tümü</TabsTrigger>
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
              {activeTab === "all" ? "Henüz fatura eklenmemiş" : `${activeTab} durumunda fatura yok`}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-white border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground" data-testid={`text-invoice-number-${invoice.id}`}>
                    {invoice.number}
                  </span>
                  {getStatusBadge(invoice.status || "unpaid")}
                </div>
                <div className="text-sm font-medium text-foreground" data-testid={`text-invoice-amount-${invoice.id}`}>
                  {formatCurrency(parseFloat(invoice.amount))}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span data-testid={`text-invoice-customer-${invoice.id}`}>
                  {getCustomerName(invoice.customerId)}
                </span>
                <span data-testid={`text-invoice-date-${invoice.id}`}>
                  {formatDate(invoice.issueDate!)}
                </span>
              </div>
              <div className="flex space-x-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setIsDialogOpen(true);
                  }}
                  data-testid={`button-edit-invoice-${invoice.id}`}
                >
                  <i className="fas fa-edit mr-1"></i>
                  Düzenle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(invoice.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-invoice-${invoice.id}`}
                >
                  <i className="fas fa-trash text-red-500 mr-1"></i>
                  Sil
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
