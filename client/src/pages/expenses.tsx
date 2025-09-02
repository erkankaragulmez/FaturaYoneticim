import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Expense } from "@shared/schema";
import ExpenseForm from "@/components/forms/expense-form";
import { formatCurrency } from "@/lib/currency";
import { queryClient } from "@/lib/queryClient";

export default function Expenses() {
  const [selectedPeriod, setSelectedPeriod] = useState("2025-09");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentMonth = parseInt(selectedPeriod.split("-")[1]);
  const currentYear = parseInt(selectedPeriod.split("-")[0]);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: categoryData = {} } = useQuery({
    queryKey: ["/api/analytics/expenses-by-category", { month: currentMonth, year: currentYear }],
  });

  const periodOptions = [
    { value: "2025-09", label: "Eylül 2025" },
    { value: "2025-08", label: "Ağustos 2025" },
    { value: "2025-07", label: "Temmuz 2025" },
  ];

  const categoryIcons = {
    "Yakıt": "fas fa-gas-pump",
    "Yemek": "fas fa-utensils", 
    "Malzeme": "fas fa-tools",
    "İletişim": "fas fa-phone",
    "Ofis": "fas fa-building",
    "Ulaşım": "fas fa-car",
    "Diğer": "fas fa-ellipsis-h"
  };

  const categoryColors = {
    "Yakıt": "text-orange-500",
    "Yemek": "text-green-500",
    "Malzeme": "text-blue-500", 
    "İletişim": "text-purple-500",
    "Ofis": "text-gray-500",
    "Ulaşım": "text-red-500",
    "Diğer": "text-gray-400"
  };

  const totalExpenses = Object.values(categoryData).reduce((sum: number, cat: any) => sum + cat.total, 0);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/expenses-by-category"] });
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
          <i className="fas fa-credit-card mr-2 text-primary"></i>
          Masraflar
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              data-testid="button-add-expense"
            >
              <i className="fas fa-plus mr-1"></i>
              Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedExpense ? "Masrafı Düzenle" : "Yeni Masraf"}
              </DialogTitle>
            </DialogHeader>
            <ExpenseForm
              expense={selectedExpense}
              onSuccess={() => {
                setIsDialogOpen(false);
                setSelectedExpense(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Filter */}
      <div className="mb-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger data-testid="select-expense-period">
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

      {/* Expense Categories */}
      <div className="space-y-3">
        {Object.keys(categoryData).length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-credit-card text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">Bu dönemde masraf kaydı yok</p>
          </div>
        ) : (
          Object.entries(categoryData).map(([category, data]: [string, any]) => (
            <div key={category} className="bg-white border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground flex items-center">
                  <i className={`${categoryIcons[category as keyof typeof categoryIcons] || categoryIcons.Diğer} mr-2 ${categoryColors[category as keyof typeof categoryColors] || categoryColors.Diğer}`}></i>
                  <span data-testid={`text-category-name-${category}`}>{category}</span>
                </h3>
                <div className="text-sm font-medium text-foreground" data-testid={`text-category-total-${category}`}>
                  {formatCurrency(data.total)}
                </div>
              </div>
              <div className="text-xs text-muted-foreground" data-testid={`text-category-count-${category}`}>
                {data.count} işlem
              </div>
            </div>
          ))
        )}
      </div>

      {/* Total Summary */}
      {totalExpenses > 0 && (
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-orange-700 font-medium">
              Toplam Masraf ({periodOptions.find(p => p.value === selectedPeriod)?.label.split(" ")[0]})
            </span>
            <span className="text-xl font-bold text-orange-600" data-testid="text-monthly-expense-total">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
      )}

      {/* Recent Expenses List */}
      {expenses.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Son Masraflar</h3>
          <div className="space-y-2">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="bg-white border border-border rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <i className={`${categoryIcons[expense.category as keyof typeof categoryIcons] || categoryIcons.Diğer} ${categoryColors[expense.category as keyof typeof categoryColors] || categoryColors.Diğer}`}></i>
                      <span className="text-sm font-medium">{expense.category}</span>
                    </div>
                    {expense.description && (
                      <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(parseFloat(expense.amount))}</div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs p-2"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-edit-expense-${expense.id}`}
                      >
                        <i className="fas fa-edit text-gray-700"></i>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs p-2"
                        onClick={() => deleteMutation.mutate(expense.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-expense-${expense.id}`}
                      >
                        <i className="fas fa-trash text-red-600"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
