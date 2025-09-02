import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Invoice, Customer } from "@shared/schema";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overdue");

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: expenseData = {} } = useQuery({
    queryKey: ["/api/analytics/expenses-by-category", { month: new Date().getMonth() + 1, year: new Date().getFullYear() }],
  });

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "Müşteri Seçilmemiş";
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Bilinmeyen Müşteri";
  };

  // Overdue receivables (invoices past due date that are unpaid/partial)
  const overdueInvoices = invoices.filter(invoice => {
    if (invoice.status === "paid") return false;
    if (!invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date();
  });

  // Top 5 customers by total invoice amount
  const customerTotals = customers.map(customer => {
    const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
    const total = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    return { customer, total };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
        <i className="fas fa-chart-bar mr-2 text-primary"></i>
        Raporlar
      </h2>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted rounded-lg">
          <TabsTrigger value="overdue" data-testid="tab-overdue-report">Geciken</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expense-report">Masraf</TabsTrigger>
          <TabsTrigger value="top5" data-testid="tab-top5-report">Top 5</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          <h3 className="font-semibold text-foreground mb-4 flex items-center">
            <i className="fas fa-clock mr-2 text-orange-500"></i>
            Geciken Alacaklar Raporu
          </h3>

          {overdueInvoices.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-calendar-times text-4xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Geciken alacak yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueInvoices.map((invoice) => {
                const remaining = parseFloat(invoice.amount) - parseFloat(invoice.paidAmount || "0");
                const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={invoice.id} className="bg-white border border-red-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground" data-testid={`text-overdue-invoice-${invoice.id}`}>
                        {invoice.number}
                      </span>
                      <span className="text-sm font-medium text-red-600" data-testid={`text-overdue-amount-${invoice.id}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{getCustomerName(invoice.customerId)}</span>
                      <span className="text-red-600">{daysOverdue} gün gecikme</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses">
          <h3 className="font-semibold text-foreground mb-4 flex items-center">
            <i className="fas fa-chart-pie mr-2 text-blue-500"></i>
            Masraf Raporu
          </h3>
          
          {Object.keys(expenseData).length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-chart-pie text-4xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Bu dönemde masraf kaydı yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(expenseData).map(([category, data]: [string, any]) => {
                const totalExpenses = Object.values(expenseData).reduce((sum: number, cat: any) => sum + cat.total, 0);
                const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
                
                return (
                  <div key={category} className="bg-white border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium" data-testid={`text-expense-category-${category}`}>
                        {category}
                      </span>
                      <span className="text-sm" data-testid={`text-expense-amount-${category}`}>
                        {formatCurrency(data.total)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      %{percentage.toFixed(1)} - {data.count} işlem
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="top5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center">
            <i className="fas fa-trophy mr-2 text-yellow-500"></i>
            Top 5 Müşteri
          </h3>
          
          {customerTotals.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-trophy text-4xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Henüz müşteri verisi yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customerTotals.map((item, index) => (
                <div key={item.customer.id} className="bg-white border border-border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium" data-testid={`text-top-customer-${index + 1}`}>
                      {item.customer.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium" data-testid={`text-top-customer-total-${index + 1}`}>
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
