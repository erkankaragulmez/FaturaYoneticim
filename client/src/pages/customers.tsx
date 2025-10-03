import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer } from "@shared/schema";
import CustomerForm from "@/components/forms/customer-form";
import { formatCurrency } from "@/lib/currency";
import { queryClient } from "@/lib/queryClient";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hideZeroBalance, setHideZeroBalance] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpStep, setHelpStep] = useState(0);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  const getCustomerBalance = (customerId: string) => {
    const customerInvoices = invoices.filter((inv: any) => inv.customerId === customerId);
    return customerInvoices.reduce((total: number, invoice: any) => {
      const remaining = parseFloat(invoice.amount) - parseFloat(invoice.paidAmount || "0");
      return total + remaining;
    }, 0);
  };

  const filteredCustomers = customers.filter(customer => {
    // First filter by search term
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    // Then filter by balance if hideZeroBalance is enabled
    if (hideZeroBalance) {
      const balance = getCustomerBalance(customer.id);
      return balance > 0;
    }
    
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete customer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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

  const helpSteps = [
    {
      title: "Adım 1: Ekle Butonuna Tıklayın",
      content: "Yeni müşteri oluşturmak için sağ üst köşedeki 'Ekle' butonuna tıklayarak yeni müşteri ekleme formunu açın.",
      icon: "fas fa-plus-circle"
    },
    {
      title: "Adım 2: Müşteri Bilgilerini Girin",
      content: "Açılan formda müşterinin adını, soyadını ve isteğe bağlı olarak şirket adını girin. Ad ve soyad alanları zorunludur.",
      icon: "fas fa-user-edit"
    },
    {
      title: "Adım 3: İletişim Bilgileri",
      content: "Müşterinin telefon numarasını, e-posta adresini ve adres bilgilerini ekleyin. Bu bilgiler opsiyoneldir ancak iletişim için önemlidir.",
      icon: "fas fa-phone"
    },
    {
      title: "Adım 4: Kaydet",
      content: "Tüm bilgileri girdikten sonra 'Kaydet' butonuna tıklayın. Müşteri kaydınız oluşturulacak ve listeye eklenecektir.",
      icon: "fas fa-save"
    },
    {
      title: "Tamamlandı!",
      content: "Müşteri başarıyla oluşturuldu. Artık bu müşteri için fatura kesebilir ve ödeme takibi yapabilirsiniz.",
      icon: "fas fa-check-circle"
    }
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <i className="fas fa-users mr-2 text-primary"></i>
          Müşteriler
        </h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setShowHelpDialog(true);
              setHelpStep(0);
            }}
            data-testid="button-help"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <i className="fas fa-question-circle mr-1"></i>
            Yardım
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
                data-testid="button-add-customer"
              >
                <i className="fas fa-plus mr-1"></i>
                Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedCustomer ? "Müşteriyi Düzenle" : "Yeni Müşteri"}
                </DialogTitle>
              </DialogHeader>
              <CustomerForm
                customer={selectedCustomer}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  setSelectedCustomer(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className={`${helpSteps[helpStep].icon} text-primary`}></i>
              {helpSteps[helpStep].title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-6">{helpSteps[helpStep].content}</p>
            
            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {helpSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === helpStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setHelpStep(Math.max(0, helpStep - 1))}
                disabled={helpStep === 0}
                data-testid="button-help-previous"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Önceki
              </Button>
              
              {helpStep < helpSteps.length - 1 ? (
                <Button
                  onClick={() => setHelpStep(Math.min(helpSteps.length - 1, helpStep + 1))}
                  data-testid="button-help-next"
                >
                  Sonraki
                  <i className="fas fa-arrow-right ml-2"></i>
                </Button>
              ) : (
                <Button
                  onClick={() => setShowHelpDialog(false)}
                  data-testid="button-help-close"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <i className="fas fa-check mr-2"></i>
                  Anladım
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Input
          type="text"
          placeholder="Müşteri ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-customers"
        />
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
      </div>
      
      {/* Filter Options */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hide-zero-balance"
            checked={hideZeroBalance}
            onCheckedChange={(checked) => setHideZeroBalance(checked === true)}
            data-testid="checkbox-hide-zero-balance"
          />
          <label 
            htmlFor="hide-zero-balance" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Sıfır bakiyeli müşterileri gizle
          </label>
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">
              {searchTerm ? "Müşteri bulunamadı" : "Henüz müşteri eklenmemiş"}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const balance = getCustomerBalance(customer.id);
            return (
              <div key={customer.id} className="bg-white border border-border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground" data-testid={`text-customer-name-${customer.id}`}>
                      {customer.name}
                    </h3>
                    {customer.company && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-customer-company-${customer.id}`}>
                        {customer.company}
                      </p>
                    )}
                    {customer.phone && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-customer-phone-${customer.id}`}>
                        {customer.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(balance)}
                    </div>
                    <p className="text-xs text-muted-foreground">Bakiye</p>
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 min-w-8 h-8 text-gray-600 hover:text-gray-800 text-lg font-bold"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-view-customer-${customer.id}`}
                      >
                        ◉
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 min-w-8 h-8 text-gray-600 hover:text-gray-800 text-lg font-bold"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-edit-customer-${customer.id}`}
                      >
                        ✎
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 min-w-8 h-8 text-gray-600 hover:text-red-600 text-lg font-bold"
                        onClick={() => deleteMutation.mutate(customer.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-customer-${customer.id}`}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
