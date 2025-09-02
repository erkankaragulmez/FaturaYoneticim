import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer } from "@shared/schema";
import CustomerForm from "@/components/forms/customer-form";
import { formatCurrency } from "@/lib/currency";
import { queryClient } from "@/lib/queryClient";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCustomerBalance = (customerId: string) => {
    const customerInvoices = invoices.filter((inv: any) => inv.customerId === customerId);
    return customerInvoices.reduce((total: number, invoice: any) => {
      const remaining = parseFloat(invoice.amount) - parseFloat(invoice.paidAmount || "0");
      return total + remaining;
    }, 0);
  };

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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <i className="fas fa-users mr-2 text-primary"></i>
          Müşteriler
        </h2>
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
                        variant="outline"
                        size="sm"
                        className="text-xs p-2"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-view-customer-${customer.id}`}
                      >
                        <i className="fas fa-eye text-blue-600"></i>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs p-2"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-edit-customer-${customer.id}`}
                      >
                        <i className="fas fa-edit text-gray-700"></i>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs p-2"
                        onClick={() => deleteMutation.mutate(customer.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-customer-${customer.id}`}
                      >
                        <i className="fas fa-trash text-red-600"></i>
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
