import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema, type Invoice, type InsertInvoice, type Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceFormProps {
  invoice?: Invoice | null;
  customers: Customer[];
  onSuccess: () => void;
}

export default function InvoiceForm({ invoice, customers, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    invoice ? customers.find(c => c.id === invoice.customerId) || null : null
  );
  
  // Custom schema for form validation - customerId is optional because we support creating new customers
  const formSchema = insertInvoiceSchema.extend({
    customerId: insertInvoiceSchema.shape.customerId.optional().or(z.literal("")),
  });

  const form = useForm<InsertInvoice>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: invoice?.number || "",
      customerId: invoice?.customerId || "",
      amount: invoice?.amount || "",
      paidAmount: "0",
      status: invoice?.status || "unpaid",
      description: invoice?.description || "",
      issueDate: invoice?.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0],
    },
  });

  // Fatura tarihi değiştiğinde vade tarihini otomatik güncelle
  const issueDate = form.watch("issueDate");
  useEffect(() => {
    if (issueDate && !invoice) { // Sadece yeni fatura oluştururken otomatik güncelle
      form.setValue("dueDate", issueDate);
    }
  }, [issueDate, form, invoice]);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    (customer.company && customer.company.toLowerCase().includes(searchValue.toLowerCase()))
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Clear selected customer if search doesn't match selected customer name
    if (selectedCustomer && !selectedCustomer.name.toLowerCase().includes(value.toLowerCase())) {
      setSelectedCustomer(null);
      form.setValue("customerId", "");
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertInvoice & { newCustomerName?: string }) => {
      if (invoice) {
        return apiRequest("PUT", `/api/invoices/${invoice.id}`, data);
      } else {
        return apiRequest("POST", "/api/invoices", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({
        title: "Başarılı",
        description: invoice ? "Fatura güncellendi" : "Fatura eklendi",
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Invoice save error:", error);
      let errorMessage = "Fatura kaydedilemedi";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        // Validation errors
        const validationErrors = error.details.map((err: any) => `${err.path?.join('.')}: ${err.message}`).join(', ');
        errorMessage = `Doğrulama hatası: ${validationErrors}`;
      }
      
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInvoice) => {
    // If no customer selected but search value exists, create new customer
    if (!selectedCustomer && searchValue.trim()) {
      mutation.mutate({ ...data, customerId: "", newCustomerName: searchValue.trim() });
    } else if (selectedCustomer) {
      mutation.mutate({ ...data, customerId: selectedCustomer.id });
    } else {
      toast({
        title: "Hata",
        description: "Lütfen bir müşteri seçin veya yeni müşteri adı girin",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewCustomer = () => {
    if (searchValue.trim()) {
      setSelectedCustomer(null);
      form.setValue("customerId", "");
      setOpen(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchValue(customer.name);
    form.setValue("customerId", customer.id);
    setOpen(false);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Müşteri *</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              data-testid="select-invoice-customer"
            >
              {selectedCustomer ? (
                <span>
                  {selectedCustomer.name} 
                  {selectedCustomer.company && ` - ${selectedCustomer.company}`}
                </span>
              ) : searchValue ? (
                <span className="text-muted-foreground">
                  Yeni müşteri: {searchValue}
                </span>
              ) : (
                <span className="text-muted-foreground">Müşteri seçin veya yeni ekleyin</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Müşteri ara veya yeni ekle..." 
                value={searchValue}
                onValueChange={handleSearchChange}
              />
              <CommandList>
                {searchValue.trim() && filteredCustomers.length === 0 && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateNewCustomer}
                      className="bg-accent/50"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Yeni müşteri oluştur: <strong>{searchValue}</strong></span>
                    </CommandItem>
                  </CommandGroup>
                )}
                {filteredCustomers.length === 0 && !searchValue && (
                  <CommandEmpty>Müşteri bulunamadı. Yeni müşteri eklemek için isim yazın.</CommandEmpty>
                )}
                {filteredCustomers.length > 0 && (
                  <>
                    {searchValue.trim() && !filteredCustomers.some(c => c.name.toLowerCase() === searchValue.toLowerCase()) && (
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleCreateNewCustomer}
                          className="bg-accent/50"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Yeni müşteri oluştur: <strong>{searchValue}</strong></span>
                        </CommandItem>
                      </CommandGroup>
                    )}
                    <CommandGroup heading="Mevcut Müşteriler">
                      {filteredCustomers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.name}
                          onSelect={() => handleSelectCustomer(customer)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div>
                            <div>{customer.name}</div>
                            {customer.company && (
                              <div className="text-xs text-muted-foreground">{customer.company}</div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Mevcut müşteri seçin veya yeni müşteri adı yazın
        </p>
        {form.formState.errors.customerId && (
          <p className="text-sm text-red-600">{form.formState.errors.customerId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Tutar (₺) *</Label>
        <Input
          id="amount"
          {...form.register("amount")}
          placeholder="0.00"
          type="number"
          step="0.01"
          data-testid="input-invoice-amount"
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="issueDate">Fatura Tarihi</Label>
        <Input
          id="issueDate"
          type="date"
          {...form.register("issueDate")}
          data-testid="input-invoice-issue-date"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Vade Tarihi</Label>
        <Input
          id="dueDate"
          type="date"
          {...form.register("dueDate")}
          data-testid="input-invoice-due-date"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Fatura açıklaması"
          rows={3}
          data-testid="input-invoice-description"
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending || (!selectedCustomer && !searchValue.trim())}
          className="flex-1"
          data-testid="button-save-invoice"
        >
          {mutation.isPending ? "Kaydediliyor..." : invoice ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
