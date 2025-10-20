import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertExpenseSchema, type Expense, type InsertExpense } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess: () => void;
}

const expenseCategories = [
  "Yakıt",
  "Yemek", 
  "Malzeme",
  "İletişim",
  "Ofis",
  "Ulaşım",
  "Diğer"
];

export default function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      category: expense?.category || "",
      amount: expense?.amount || "",
      description: expense?.description || "",
      date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      if (expense) {
        return apiRequest("PUT", `/api/expenses/${expense.id}`, data);
      } else {
        return apiRequest("POST", "/api/expenses", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/expenses-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({
        title: "Başarılı",
        description: expense ? "Masraf güncellendi" : "Masraf eklendi",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Masraf kaydedilemedi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertExpense) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium text-foreground">
          Kategori <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.watch("category") || ""}
          onValueChange={(value) => form.setValue("category", value)}
        >
          <SelectTrigger className="h-12 text-base bg-gray-50 border-gray-200" data-testid="select-expense-category">
            <SelectValue placeholder="Kategori seçin" />
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.category && (
          <p className="text-sm text-red-600">{form.formState.errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium text-foreground">
          Tutar <span className="text-red-500">*</span>
        </Label>
        <Input
          id="amount"
          {...form.register("amount")}
          placeholder="0.00"
          type="number"
          step="0.01"
          className="h-12 text-base bg-gray-50 border-gray-200 placeholder:text-gray-400"
          data-testid="input-expense-amount"
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date" className="text-sm font-medium text-foreground">
          Tarih <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="date"
            type="date"
            {...form.register("date")}
            className="h-12 text-base bg-gray-50 border-gray-200"
            data-testid="input-expense-date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-foreground">
          Masraf Açıklaması
        </Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Masraf açıklaması girin (isteğe bağlı)"
          rows={3}
          className="text-base bg-gray-50 border-gray-200 placeholder:text-gray-400 resize-none"
          data-testid="input-expense-description"
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
          className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-lg font-medium"
          data-testid="button-save-expense"
        >
          <i className="fas fa-receipt mr-2"></i>
          {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
