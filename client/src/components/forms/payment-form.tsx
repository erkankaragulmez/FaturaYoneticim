import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertPaymentSchema, type InsertPayment, type Invoice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";

interface PaymentFormProps {
  invoice: Invoice;
  onSuccess: () => void;
}

export default function PaymentForm({ invoice, onSuccess }: PaymentFormProps) {
  const { toast } = useToast();
  
  const remainingAmount = parseFloat(invoice.amount) - parseFloat(invoice.paidAmount || "0");
  
  const form = useForm<InsertPayment>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: {
      invoiceId: invoice.id,
      amount: remainingAmount.toString(),
      date: new Date().toISOString().split('T')[0],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertPayment) => {
      return apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({
        title: "Başarılı",
        description: "Ödeme kaydedildi",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Ödeme kaydedilemedi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPayment) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-2">Fatura Bilgisi</h3>
        <div className="text-sm text-muted-foreground">
          <div>Fatura No: {invoice.number}</div>
          <div>Toplam Tutar: {formatCurrency(parseFloat(invoice.amount))}</div>
          <div>Ödenen: {formatCurrency(parseFloat(invoice.paidAmount || "0"))}</div>
          <div className="font-medium text-orange-600">
            Kalan: {formatCurrency(remainingAmount)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium text-foreground">
          Ödeme Tutarı (₺) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="amount"
          {...form.register("amount")}
          placeholder="0.00"
          type="number"
          step="0.01"
          max={remainingAmount}
          className="h-12 text-base bg-gray-50 border-gray-200 placeholder:text-gray-400"
          data-testid="input-payment-amount"
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date" className="text-sm font-medium text-foreground">
          Ödeme Tarihi <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date"
          type="date"
          {...form.register("date")}
          className="h-12 text-base bg-gray-50 border-gray-200"
          data-testid="input-payment-date"
        />
      </div>

      <div className="pt-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full h-12 text-base text-gray-500 bg-transparent border-0 mb-4"
        >
          İptal
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-12 text-base bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium"
          data-testid="button-save-payment"
        >
          <i className="fas fa-money-bill-wave mr-2"></i>
          {mutation.isPending ? "Kaydediliyor..." : "Ödeme Kaydet"}
        </Button>
      </div>
    </form>
  );
}