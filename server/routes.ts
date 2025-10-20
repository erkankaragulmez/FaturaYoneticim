import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertInvoiceSchema, insertExpenseSchema, insertPaymentSchema, insertUserSchema, signInSchema } from "@shared/schema";
import { z } from "zod";

// Utility function to extract year and month from date values (timezone-safe)
function getYearMonth(dateValue: Date | string | null | undefined): { year: number; month: number } | null {
  if (!dateValue) return null;
  const dateStr = dateValue.toString();
  const date = new Date(dateStr);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  };
}

// Authentication middleware to extract userId from session
function requireAuth(req: any, res: any, next: any) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Giriş yapılmamış" });
  }
  req.userId = userId;
  next();
}



export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication API
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists (generated username = firstName + lastName, lowercase, no spaces)
      const existingUsername = (validatedData.firstName + validatedData.lastName).toLowerCase().replace(/\s+/g, '');
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
      console.error("Signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Geçersiz kullanıcı bilgileri", details: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı kaydı başarısız", details: (error as any)?.message || String(error) });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const validatedData = signInSchema.parse(req.body);
      const user = await storage.signInUser(validatedData.username, validatedData.password);
      
      if (!user) {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      }
      
      // Store user in session and save explicitly
      (req as any).session.userId = user.id;
      (req as any).session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Oturum hatası" });
        }
        
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
  app.get("/api/customers", requireAuth, async (req: any, res) => {
    try {
      const customers = await storage.getCustomers(req.userId);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req: any, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id, req.userId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData, req.userId);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, validatedData, req.userId);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id, req.userId);
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
  app.get("/api/invoices", requireAuth, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.userId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id, req.userId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", requireAuth, async (req: any, res) => {
    try {
      const { newCustomerName, ...invoiceData } = req.body;
      let customerId = invoiceData.customerId;
      
      // If new customer name is provided, create the customer first
      if (newCustomerName && typeof newCustomerName === 'string' && newCustomerName.trim()) {
        // Validate customer data
        const validatedCustomerData = insertCustomerSchema.parse({
          name: newCustomerName.trim()
        });
        const newCustomer = await storage.createCustomer(
          validatedCustomerData,
          req.userId
        );
        customerId = newCustomer.id;
      }
      
      // Validate and create invoice
      const validatedData = insertInvoiceSchema.parse({
        ...invoiceData,
        customerId
      });
      const invoice = await storage.createInvoice(validatedData, req.userId);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Geçersiz fatura verisi", details: error.errors });
      }
      
      // Enhanced error messages for specific database errors
      if (error instanceof Error) {
        if (error.message.includes('Unable to generate unique invoice number')) {
          return res.status(500).json({ error: "Fatura numarası oluşturulurken hata oluştu, lütfen tekrar deneyin" });
        }
        if (error.message.includes('Seçilen müşteri bulunamadı')) {
          return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('foreign key')) {
          return res.status(400).json({ error: "Seçilen müşteri bulunamadı" });
        }
        // Log detailed error but return generic message for security
        console.error("Detailed invoice creation error:", error.message);
        return res.status(500).json({ error: "Fatura oluşturulurken hata oluştu, lütfen tekrar deneyin" });
      }
      
      res.status(500).json({ error: "Fatura oluşturulurken beklenmeyen bir hata oluştu" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validatedData, req.userId);
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req: any, res) => {
    try {
      // Get the invoice before deletion to update related payments if needed
      const invoice = await storage.getInvoice(req.params.id, req.userId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      const deleted = await storage.deleteInvoice(req.params.id, req.userId);
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
  app.get("/api/expenses", requireAuth, async (req: any, res) => {
    try {
      const expenses = await storage.getExpenses(req.userId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req: any, res) => {
    try {
      const expense = await storage.getExpense(req.params.id, req.userId);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData, req.userId);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validatedData, req.userId);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id, req.userId);
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
  app.get("/api/payments", requireAuth, async (req: any, res) => {
    try {
      const payments = await storage.getPayments(req.userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/invoice/:invoiceId", requireAuth, async (req: any, res) => {
    try {
      const payments = await storage.getPaymentsByInvoice(req.params.invoiceId, req.userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData, req.userId);
      
      // Update invoice status based on payments
      if (payment.invoiceId) {
        const invoice = await storage.getInvoice(payment.invoiceId, req.userId);
        if (invoice) {
          const payments = await storage.getPaymentsByInvoice(payment.invoiceId, req.userId);
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
          }, req.userId);
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
  app.get("/api/analytics/dashboard", requireAuth, async (req: any, res) => {
    try {
      const { month, year } = req.query;
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const invoices = await storage.getInvoices(req.userId);
      const expenses = await storage.getExpenses(req.userId);
      const payments = await storage.getPayments(req.userId);
      
      // Monthly calculations
      const monthlyInvoices = invoices.filter(inv => {
        const ym = getYearMonth(inv.issueDate);
        return ym && ym.month === currentMonth && ym.year === currentYear;
      });
      
      const monthlyExpenses = expenses.filter(exp => {
        const ym = getYearMonth(exp.date);
        return ym && ym.month === currentMonth && ym.year === currentYear;
      });
      
      const monthlyPayments = payments.filter(pay => {
        const ym = getYearMonth(pay.date);
        return ym && ym.month === currentMonth && ym.year === currentYear;
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
        const ym = getYearMonth(inv.issueDate);
        return ym && ym.year === currentYear;
      });
      
      const yearlyExpenses = expenses.filter(exp => {
        const ym = getYearMonth(exp.date);
        return ym && ym.year === currentYear;
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

  app.get("/api/analytics/expenses-by-category", requireAuth, async (req: any, res) => {
    try {
      const { month, year } = req.query;
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const expenses = await storage.getExpenses(req.userId);
      const filteredExpenses = expenses.filter(exp => {
        const ym = getYearMonth(exp.date);
        return ym && ym.month === currentMonth && ym.year === currentYear;
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
