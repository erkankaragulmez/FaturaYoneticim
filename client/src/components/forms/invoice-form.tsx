import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema, type Invoice, type InsertInvoice, type Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface InvoiceFormProps {
  invoice?: Invoice | null;
  customers: Customer[];
  onSuccess: () => void;
}

export default function InvoiceForm({ invoice, customers, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertInvoice>({
    resolver: zodResolver(insertInvoiceSchema),
    defaultValues: {
      number: invoice?.number || "",
      customerId: invoice?.customerId || "",
      amount: invoice?.amount || "",
      paidAmount: invoice?.paidAmount || "0",
      status: invoice?.status || "unpaid",
      description: invoice?.description || "",
      issueDate: invoice?.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "",
    },
  });

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
    onError: () => {
      toast({
        title: "Hata",
        description: "Fatura kaydedilemedi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInvoice) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="number">Fatura No *</Label>
        <Input
          id="number"
          {...form.register("number")}
          placeholder="FT-2025-001"
          data-testid="input-invoice-number"
        />
        {form.formState.errors.number && (
          <p className="text-sm text-red-600">{form.formState.errors.number.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerId">Müşteri</Label>
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
        <Label htmlFor="paidAmount">Ödenen Tutar (₺)</Label>
        <Input
          id="paidAmount"
          {...form.register("paidAmount")}
          placeholder="0.00"
          type="number"
          step="0.01"
          data-testid="input-invoice-paid-amount"
        />
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
          disabled={mutation.isPending}
          className="flex-1"
          data-testid="button-save-invoice"
        >
          {mutation.isPending ? "Kaydediliyor..." : invoice ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
