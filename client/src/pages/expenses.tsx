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
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const currentMonth = parseInt(selectedPeriod.split("-")[1]);
  const currentYear = parseInt(selectedPeriod.split("-")[0]);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: categoryData = {} } = useQuery({
    queryKey: ["/api/analytics/expenses-by-category", currentMonth, currentYear],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/expenses-by-category?month=${currentMonth}&year=${currentYear}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch expense analytics');
      }
      return response.json();
    },
  });

  const periodOptions = [
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

  const totalExpenses = Object.values(categoryData as Record<string, any>).reduce((sum: number, cat: any) => sum + cat.total, 0);

  // Filter expenses by selected month
  const filteredExpenses = expenses.filter((expense) => {
    if (!expense.date) return false;
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() + 1 === currentMonth && expenseDate.getFullYear() === currentYear;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete expense");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to recalculate totals
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/expenses-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
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
        {Object.keys(categoryData as Record<string, any>).length === 0 && filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-credit-card text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">Bu dönemde masraf kaydı yok</p>
          </div>
        ) : (
          Object.entries(categoryData as Record<string, any>).map(([category, data]: [string, any]) => (
            <div 
              key={category} 
              className="bg-white border border-border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedCategory(category);
                setIsCategoryModalOpen(true);
              }}
              data-testid={`card-category-${category}`}
            >
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

      {/* Total Summary - Made More Prominent */}
      {totalExpenses > 0 && (
        <div className="mt-6 mb-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-6 shadow-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <i className="fas fa-chart-line text-2xl mr-2"></i>
              <span className="text-lg font-semibold">
                Aylık Toplam Masraf
              </span>
            </div>
            <div className="text-sm opacity-90 mb-3">
              {periodOptions.find(p => p.value === selectedPeriod)?.label}
            </div>
            <div className="text-3xl font-bold" data-testid="text-monthly-expense-total">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>
      )}

      {/* Category Details Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <i className={`${categoryIcons[selectedCategory as keyof typeof categoryIcons] || categoryIcons.Diğer} mr-2 ${categoryColors[selectedCategory as keyof typeof categoryColors] || categoryColors.Diğer}`}></i>
              {selectedCategory} Masrafları
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredExpenses
              .filter(expense => expense.category === selectedCategory)
              .map((expense) => (
                <div key={expense.id} className="bg-white border border-border rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{expense.category}</span>
                      </div>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-expense-description-${expense.id}`}>{expense.description}</p>
                      )}
                      {expense.date && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-expense-date-${expense.id}`}>
                          {new Date(expense.date).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium" data-testid={`text-expense-amount-${expense.id}`}>{formatCurrency(parseFloat(expense.amount))}</div>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 min-w-8 h-8 text-gray-600 hover:text-gray-800 text-lg font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExpense(expense);
                            setIsCategoryModalOpen(false);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-edit-expense-${expense.id}`}
                        >
                          ✎
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 min-w-8 h-8 text-gray-600 hover:text-red-600 text-lg font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(expense.id);
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            {filteredExpenses.filter(expense => expense.category === selectedCategory).length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Bu kategoride masraf yok</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
