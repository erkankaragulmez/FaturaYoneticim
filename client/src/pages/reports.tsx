import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function Reports() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("aging");
  const [expenseFilter, setExpenseFilter] = useState("monthly");
  const [customerFilter, setCustomerFilter] = useState("monthly");
  const [selectedPeriod, setSelectedPeriod] = useState("2025-09");

  // Handle URL parameters from dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab');
    
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  const currentMonth = parseInt(selectedPeriod.split("-")[1]);
  const currentYear = parseInt(selectedPeriod.split("-")[0]);

  // Fetch data for reports
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });

  // Invoice Aging Report Data
  const getAgingReport = () => {
    const today = new Date();
    const overdue10to20: any[] = [];
    const overdue20plus: any[] = [];

    invoices.forEach((invoice: any) => {
      // Skip paid invoices
      if (invoice.status === "paid") return;
      
      const dueDate = new Date(invoice.dueDate);
      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only include overdue invoices (past due date)
      if (daysDiff <= 0) return;
      
      const customer = customers.find((c: any) => c.id === invoice.customerId);
      const remaining = parseFloat(invoice.amount) - parseFloat(invoice.paidAmount || "0");
      
      // Skip if fully paid
      if (remaining <= 0) return;
      
      const invoiceData = {
        ...invoice,
        customerName: customer?.name || "Bilinmeyen Müşteri",
        customerCompany: customer?.company || "",
        remaining: remaining,
        daysPastDue: daysDiff
      };

      // Categorize by overdue period
      if (daysDiff >= 10 && daysDiff <= 20) {
        overdue10to20.push(invoiceData);
      } else if (daysDiff > 20) {
        overdue20plus.push(invoiceData);
      }
    });

    return { overdue10to20, overdue20plus };
  };

  // Expense Report Data
  const getExpenseReport = () => {
    const filteredExpenses = expenses.filter((expense: any) => {
      const date = new Date(expense.date);
      if (expenseFilter === "monthly") {
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
      } else {
        return date.getFullYear() === currentYear;
      }
    });

    const categoryData = filteredExpenses.reduce((acc: any, expense: any) => {
      const category = expense.category || "Diğer";
      if (!acc[category]) {
        acc[category] = { category, amount: 0, count: 0 };
      }
      acc[category].amount += parseFloat(expense.amount);
      acc[category].count += 1;
      return acc;
    }, {});

    return Object.values(categoryData);
  };

  // Top 5 Customers Report
  const getTopCustomers = () => {
    const customerInvoices = customers.map((customer: any) => {
      const customerInvs = invoices.filter((inv: any) => {
        const date = new Date(inv.issueDate);
        const matchesCustomer = inv.customerId === customer.id;
        
        if (customerFilter === "monthly") {
          return matchesCustomer && date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
        } else {
          return matchesCustomer && date.getFullYear() === currentYear;
        }
      });

      const totalAmount = customerInvs.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0);
      const totalPayments = payments.filter((payment: any) => {
        return customerInvs.some((inv: any) => inv.id === payment.invoiceId);
      }).reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);

      return {
        ...customer,
        totalInvoiced: totalAmount,
        totalPaid: totalPayments,
        invoiceCount: customerInvs.length
      };
    }).filter((customer: any) => customer.totalInvoiced > 0)
      .sort((a: any, b: any) => b.totalInvoiced - a.totalInvoiced)
      .slice(0, 5);

    return customerInvoices;
  };

  const agingData = getAgingReport();
  const expenseData = getExpenseReport();
  const topCustomersData = getTopCustomers();

  // Pie chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const tabs = [
    { id: "aging", label: "Geciken Alacaklar", icon: "fas fa-clock" },
    { id: "expenses", label: "Masraf Raporu", icon: "fas fa-chart-pie" },
    { id: "customers", label: "Top 5 Müşteri", icon: "fas fa-users" }
  ];

  return (
    <div>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <i className="fas fa-chart-bar mr-3"></i>
          Raporlar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Masraf, geciken alacaklar ve müşteri raporları
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border px-4">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 text-sm font-medium border-b-2 whitespace-nowrap rounded-t-lg ${
              index === 0 ? 'mr-4 pl-2 pr-4 py-4 justify-start text-left' : index === 1 ? 'mx-4 p-4' : 'ml-4 p-4'
            } ${
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
            } flex items-center`}
            data-testid={`tab-${tab.id}`}
          >
            <i className={`${tab.icon} mr-2`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "aging" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <i className="fas fa-clock mr-2 text-orange-600"></i>
                  Geciken Alacaklar Raporu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agingData.overdue10to20.length === 0 && agingData.overdue20plus.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-calendar-check text-4xl text-green-600 mb-4"></i>
                    <p className="text-muted-foreground">Alacak yok</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {agingData.overdue10to20.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3 text-orange-600">
                          10-20 Gün Arasında Bekleyen ({agingData.overdue10to20.length} fatura)
                        </h3>
                        <div className="space-y-2">
                          {agingData.overdue10to20.map((invoice) => (
                            <div key={invoice.id} className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">{invoice.customerName}</p>
                                {invoice.customerCompany && (
                                  <p className="text-xs text-muted-foreground">{invoice.customerCompany}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{invoice.daysPastDue} gün gecikmiş</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-orange-600">{formatCurrency(invoice.remaining)}</p>
                                <p className="text-xs text-muted-foreground">Vade: {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {agingData.overdue20plus.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3 text-red-600">
                          20+ Gün Bekleyen ({agingData.overdue20plus.length} fatura)
                        </h3>
                        <div className="space-y-2">
                          {agingData.overdue20plus.map((invoice) => (
                            <div key={invoice.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">{invoice.customerName}</p>
                                {invoice.customerCompany && (
                                  <p className="text-xs text-muted-foreground">{invoice.customerCompany}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{invoice.daysPastDue} gün gecikmiş</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-red-600">{formatCurrency(invoice.remaining)}</p>
                                <p className="text-xs text-muted-foreground">Vade: {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <i className="fas fa-chart-pie mr-2 text-blue-600"></i>
                    Masraf Raporu
                  </div>
                  <Select value={expenseFilter} onValueChange={setExpenseFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Aylık</SelectItem>
                      <SelectItem value="yearly">Yıllık</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenseData.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-chart-pie text-4xl text-gray-400 mb-4"></i>
                    <p className="text-muted-foreground">Bu dönem için masraf verisi bulunamadı</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="amount"
                            label={({ category, amount }: any) => `${category}: ${formatCurrency(amount)}`}
                          >
                            {expenseData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {expenseData.map((item: any, index: number) => (
                        <div key={item.category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <div>
                              <p className="text-sm font-medium">{item.category}</p>
                              <p className="text-xs text-muted-foreground">{item.count} masraf</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold">{formatCurrency(item.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "customers" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <i className="fas fa-users mr-2 text-green-600"></i>
                    Top 5 Müşteri
                  </div>
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Aylık</SelectItem>
                      <SelectItem value="yearly">Yıllık</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCustomersData.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-users text-4xl text-gray-400 mb-4"></i>
                    <p className="text-muted-foreground">Bu dönem için müşteri verisi bulunamadı</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topCustomersData.map((customer: any, index: number) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{customer.name}</p>
                            {customer.company && (
                              <p className="text-xs text-muted-foreground">{customer.company}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{customer.invoiceCount} fatura</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">{formatCurrency(customer.totalInvoiced)}</p>
                          <p className="text-xs text-muted-foreground">Ödenen: {formatCurrency(customer.totalPaid)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}