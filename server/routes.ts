import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertInvoiceSchema, insertExpenseSchema, insertPaymentSchema, insertUserSchema, signInSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication API
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists (generated username = firstName + first 3 letters of lastName)
      const existingUsername = validatedData.firstName + validatedData.lastName.substring(0, 3);
      const existingUser = await storage.getUserByUsername(existingUsername);
      
      if (existingUser) {
        return res.status(400).json({ 
          error: "Bu isim ve soyisim kombinasyonu ile zaten bir kullanıcı kayıtlı",
          generatedUsername: existingUsername
        });
      }
      
      const user = await storage.createUser(validatedData);
      res.status(201).json({ 
        success: true, 
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username
        },
        message: "Kayıt başarılı"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Geçersiz kullanıcı bilgileri", details: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı kaydı başarısız" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const validatedData = signInSchema.parse(req.body);
      const user = await storage.signInUser(validatedData.username);
      
      if (!user) {
        return res.status(401).json({ error: "Kullanıcı adı hatalı" });
      }
      
      // Store user in session
      (req as any).session.userId = user.id;
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username
        },
        message: "Giriş başarılı"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Geçersiz giriş bilgileri", details: error.errors });
      }
      res.status(500).json({ error: "Giriş başarısız" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Çıkış başarısız" });
      }
      res.json({ success: true, message: "Çıkış başarılı" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }
    
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Kullanıcı bulunamadı" });
      }
      
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username
      });
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı bilgileri alınamadı" });
    }
  });
  
  // Customers API
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.message && error.message.includes("sistemde faturası")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Invoices API
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      // Get the invoice before deletion to update related payments if needed
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      // Force recalculation by setting cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json({ success: true, recalculateNeeded: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Expenses API
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validatedData);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      
      // Force recalculation by setting cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json({ success: true, recalculateNeeded: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Payments API
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/invoice/:invoiceId", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByInvoice(req.params.invoiceId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      
      // Update invoice status based on payments
      if (payment.invoiceId) {
        const invoice = await storage.getInvoice(payment.invoiceId);
        if (invoice) {
          const payments = await storage.getPaymentsByInvoice(payment.invoiceId);
          const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const invoiceAmount = parseFloat(invoice.amount);
          
          let status: "unpaid" | "partial" | "paid" = "unpaid";
          if (totalPaid >= invoiceAmount) {
            status = "paid";
          } else if (totalPaid > 0) {
            status = "partial";
          }
          
          await storage.updateInvoice(payment.invoiceId, { 
            paidAmount: totalPaid.toString(),
            status 
          });
        }
      }
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Analytics API
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const { month, year } = req.query;
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const invoices = await storage.getInvoices();
      const expenses = await storage.getExpenses();
      const payments = await storage.getPayments();
      
      // Monthly calculations
      const monthlyInvoices = invoices.filter(inv => {
        const date = new Date(inv.issueDate!);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
      });
      
      const monthlyExpenses = expenses.filter(exp => {
        const date = new Date(exp.date!);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
      });
      
      const monthlyPayments = payments.filter(pay => {
        const date = new Date(pay.date!);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
      });
      
      // Calculations
      const monthlyInvoiceTotal = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const monthlyExpenseTotal = monthlyExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const monthlyPaymentTotal = monthlyPayments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);
      
      // Receivables (all unpaid invoice amounts - including remaining amounts from partial invoices)
      const receivables = invoices.filter(inv => inv.status === "unpaid" || inv.status === "partial");
      const totalReceivables = receivables.reduce((sum, inv) => {
        const remaining = parseFloat(inv.amount) - parseFloat(inv.paidAmount || "0");
        return sum + remaining;
      }, 0);
      
      // Yearly calculations
      const yearlyInvoices = invoices.filter(inv => {
        const date = new Date(inv.issueDate!);
        return date.getFullYear() === currentYear;
      });
      
      const yearlyExpenses = expenses.filter(exp => {
        const date = new Date(exp.date!);
        return date.getFullYear() === currentYear;
      });
      
      const yearlyInvoiceTotal = yearlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const yearlyExpenseTotal = yearlyExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      
      res.json({
        monthly: {
          invoices: monthlyInvoiceTotal,
          expenses: monthlyExpenseTotal,
          payments: monthlyPaymentTotal,
          profit: monthlyInvoiceTotal - monthlyExpenseTotal
        },
        yearly: {
          invoices: yearlyInvoiceTotal,
          expenses: yearlyExpenseTotal,
          profit: yearlyInvoiceTotal - yearlyExpenseTotal
        },
        receivables: totalReceivables,
        lastUpdate: new Date().toLocaleTimeString('tr-TR')
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/expenses-by-category", async (req, res) => {
    try {
      const { month, year } = req.query;
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const expenses = await storage.getExpenses();
      const filteredExpenses = expenses.filter(exp => {
        const date = new Date(exp.date!);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
      });
      
      const categoryTotals = filteredExpenses.reduce((acc, expense) => {
        const category = expense.category;
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 };
        }
        acc[category].total += parseFloat(expense.amount);
        acc[category].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
      
      res.json(categoryTotals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
