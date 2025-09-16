import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema, type Invoice, type InsertInvoice, type Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import QrFieldMappingConfig, { type QrFieldMapping } from "@/components/qr/qr-field-mapping";
import QrScreenScanner from "@/components/qr/qr-screen-scanner";
import { parseQrCode, formatAmount, formatDate } from "@/utils/qr-parser";

interface InvoiceFormProps {
  invoice?: Invoice | null;
  customers: Customer[];
  onSuccess: () => void;
}

export default function InvoiceForm({ invoice, customers, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  
  // QR scanning state
  const [qrFieldMapping, setQrFieldMapping] = useState<QrFieldMapping>({
    customerId: true,
    amount: true,
    issueDate: false,
    dueDate: false,
    description: true
  });
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const form = useForm<InsertInvoice>({
    resolver: zodResolver(insertInvoiceSchema),
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

  const mutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      if (invoice) {
        return apiRequest("PUT", `/api/invoices/${invoice.id}`, data);
      } else {
        return apiRequest("POST", "/api/invoices", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
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
    mutation.mutate(data);
  };

  // QR code scanning handlers
  const handleStartQrScan = () => {
    setIsScanning(true);
    setIsQrScannerOpen(true);
  };

  const handleQrScanComplete = (qrData: string) => {
    setIsScanning(false);
    setIsQrScannerOpen(false);
    
    const parseResult = parseQrCode(qrData);
    
    if (!parseResult.success) {
      toast({
        title: "QR Kod Hatası",
        description: parseResult.error || "QR kod okunamadı",
        variant: "destructive",
      });
      return;
    }

    // Apply field mapping and populate form
    const data = parseResult.data!;
    let fieldsUpdated = 0;

    if (qrFieldMapping.customerId && (data.customerName || data.companyName)) {
      const customerName = data.customerName || data.companyName;
      // Find matching customer
      const matchingCustomer = customers.find(c => 
        c.name.toLowerCase().includes(customerName!.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(customerName!.toLowerCase()))
      );
      
      if (matchingCustomer) {
        form.setValue("customerId", matchingCustomer.id);
        fieldsUpdated++;
      }
    }

    if (qrFieldMapping.amount && data.amount) {
      const formattedAmount = formatAmount(data.amount);
      if (formattedAmount) {
        form.setValue("amount", formattedAmount);
        fieldsUpdated++;
      }
    }

    if (qrFieldMapping.description && data.description) {
      form.setValue("description", data.description);
      fieldsUpdated++;
    }

    if (qrFieldMapping.issueDate && data.issueDate) {
      const formattedDate = formatDate(data.issueDate);
      if (formattedDate) {
        form.setValue("issueDate", formattedDate);
        fieldsUpdated++;
      }
    }

    if (qrFieldMapping.dueDate && data.dueDate) {
      const formattedDate = formatDate(data.dueDate);
      if (formattedDate) {
        form.setValue("dueDate", formattedDate);
        fieldsUpdated++;
      }
    }

    toast({
      title: "QR Kod Başarıyla Okundu",
      description: `${fieldsUpdated} alan dolduruldu. Format: ${parseResult.format}`,
    });
  };

  const handleQrScanCancel = () => {
    setIsScanning(false);
    setIsQrScannerOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* QR Code Scanning Section */}
      {!invoice && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-blue-900 dark:text-blue-100">QR Kod ile Otomatik Doldur</h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            Fatura QR kodunu ekrandan tarayarak formu otomatik olarak doldurabilirsiniz.
          </p>
          <QrFieldMappingConfig
            mapping={qrFieldMapping}
            onMappingChange={setQrFieldMapping}
            onStartScan={handleStartQrScan}
            isScanning={isScanning}
          />
        </div>
      )}

      {/* QR Scanner Modal */}
      <QrScreenScanner
        isOpen={isQrScannerOpen}
        onClose={handleQrScanCancel}
        onQrDetected={handleQrScanComplete}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="number">Fatura No</Label>
        <Input
          id="number"
          {...form.register("number")}
          placeholder="Otomatik olarak oluşturulacak (FT-2025-001)"
          data-testid="input-invoice-number"
          disabled={!invoice}
        />
        {!invoice && (
          <p className="text-sm text-gray-500">Fatura numarası otomatik olarak oluşturulacak</p>
        )}
        {form.formState.errors.number && (
          <p className="text-sm text-red-600">{form.formState.errors.number.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerId">Müşteri *</Label>
        {customers.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">Henüz müşteri eklememişsiniz</p>
            <p className="text-xs text-gray-500">Fatura oluşturmak için önce bir müşteri eklemeniz gerekiyor</p>
          </div>
        ) : (
          <Select
            value={form.watch("customerId") || ""}
            onValueChange={(value) => form.setValue("customerId", value)}
          >
            <SelectTrigger data-testid="select-invoice-customer">
              <SelectValue placeholder="Müşteri seçin" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} {customer.company && `- ${customer.company}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
          disabled={mutation.isPending || customers.length === 0}
          className="flex-1"
          data-testid="button-save-invoice"
        >
          {mutation.isPending ? "Kaydediliyor..." : invoice ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
      </form>
    </div>
  );
}
