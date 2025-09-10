import { type Customer, type InsertCustomer, type Invoice, type InsertInvoice, type Expense, type InsertExpense, type Payment, type InsertPayment, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  signInUser(username: string): Promise<User | undefined>;

  // Customers
  getCustomers(userId: string): Promise<Customer[]>;
  getCustomer(id: string, userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer, userId: string): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>, userId: string): Promise<Customer>;
  deleteCustomer(id: string, userId: string): Promise<boolean>;
  hasCustomerInvoices(customerId: string, userId: string): Promise<boolean>;

  // Invoices
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: string, userId: string): Promise<Invoice | undefined>;
  getInvoicesByCustomer(customerId: string, userId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice, userId: string): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>, userId: string): Promise<Invoice>;
  deleteInvoice(id: string, userId: string): Promise<boolean>;

  // Expenses
  getExpenses(userId: string): Promise<Expense[]>;
  getExpense(id: string, userId: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense, userId: string): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>, userId: string): Promise<Expense>;
  deleteExpense(id: string, userId: string): Promise<boolean>;

  // Payments
  getPayments(userId: string): Promise<Payment[]>;
  getPaymentsByInvoice(invoiceId: string, userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment, userId: string): Promise<Payment>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private customers: Map<string, Customer>;
  private invoices: Map<string, Invoice>;
  private expenses: Map<string, Expense>;
  private payments: Map<string, Payment>;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.invoices = new Map();
    this.expenses = new Map();
    this.payments = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    // Generate username: firstName + first 3 letters of lastName
    const username = insertUser.firstName + insertUser.lastName.substring(0, 3);
    
    const user: User = { 
      ...insertUser, 
      id,
      username,
      password: "", // Not used anymore
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async signInUser(username: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
    return user;
  }

  // Customers
  async getCustomers(userId: string): Promise<Customer[]> {
    return Array.from(this.customers.values())
      .filter(customer => customer.userId === userId)
      .sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );
  }

  async getCustomer(id: string, userId: string): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    return customer && customer.userId === userId ? customer : undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer, userId: string): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = { 
      ...insertCustomer, 
      id,
      userId,
      createdAt: new Date(),
      company: insertCustomer.company || null,
      phone: insertCustomer.phone || null,
      email: insertCustomer.email || null,
      address: insertCustomer.address || null
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updateData: Partial<InsertCustomer>, userId: string): Promise<Customer> {
    const customer = this.customers.get(id);
    if (!customer || customer.userId !== userId) throw new Error("Customer not found");
    
    const updated = { ...customer, ...updateData };
    this.customers.set(id, updated);
    return updated;
  }

  async hasCustomerInvoices(customerId: string, userId: string): Promise<boolean> {
    const customerInvoices = await this.getInvoicesByCustomer(customerId, userId);
    return customerInvoices.length > 0;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    const customer = this.customers.get(id);
    if (!customer || customer.userId !== userId) throw new Error("Customer not found");
    
    // Müşterinin faturası varsa silmeye izin verme
    const hasInvoices = await this.hasCustomerInvoices(id, userId);
    if (hasInvoices) {
      throw new Error("Bu müşteriyi silemezsiniz çünkü sistemde faturası bulunmaktadır");
    }
    return this.customers.delete(id);
  }

  // Invoices
  async getInvoices(userId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.userId === userId)
      .sort((a, b) => 
        new Date(b.issueDate!).getTime() - new Date(a.issueDate!).getTime()
      );
  }

  async getInvoice(id: string, userId: string): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    return invoice && invoice.userId === userId ? invoice : undefined;
  }

  async getInvoicesByCustomer(customerId: string, userId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.customerId === customerId && invoice.userId === userId)
      .sort((a, b) => new Date(b.issueDate!).getTime() - new Date(a.issueDate!).getTime());
  }

  generateInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `FT-${currentYear}-`;
    
    // Find existing invoices for the current year
    const currentYearInvoices = Array.from(this.invoices.values())
      .filter(invoice => invoice.number?.startsWith(yearPrefix))
      .map(invoice => {
        const numberPart = invoice.number?.split('-')[2];
        return numberPart ? parseInt(numberPart, 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    // Get the next number
    const nextNumber = currentYearInvoices.length > 0 ? Math.max(...currentYearInvoices) + 1 : 1;
    
    // Format with leading zeros (3 digits)
    return `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  async createInvoice(insertInvoice: InsertInvoice, userId: string): Promise<Invoice> {
    const id = randomUUID();
    const invoiceNumber = insertInvoice.number || this.generateInvoiceNumber();
    
    const invoice: Invoice = { 
      ...insertInvoice,
      id,
      userId,
      number: invoiceNumber,
      amount: insertInvoice.amount,
      paidAmount: insertInvoice.paidAmount || "0",
      status: insertInvoice.status || "unpaid",
      description: insertInvoice.description || null,
      customerId: insertInvoice.customerId || null,
      issueDate: insertInvoice.issueDate ? new Date(insertInvoice.issueDate) : new Date(),
      dueDate: insertInvoice.dueDate ? new Date(insertInvoice.dueDate) : null,
      createdAt: new Date()
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: string, updateData: Partial<InsertInvoice>, userId: string): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.userId !== userId) throw new Error("Invoice not found");
    
    const updated = { 
      ...invoice, 
      ...updateData,
      issueDate: updateData.issueDate ? new Date(updateData.issueDate) : invoice.issueDate,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : invoice.dueDate,
    };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string, userId: string): Promise<boolean> {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.userId !== userId) throw new Error("Invoice not found");
    
    // Get all payments for this invoice and delete them first
    const relatedPayments = await this.getPaymentsByInvoice(id, userId);
    relatedPayments.forEach(payment => {
      this.payments.delete(payment.id);
    });
    
    // Then delete the invoice
    return this.invoices.delete(id);
  }

  // Expenses
  async getExpenses(userId: string): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.userId === userId)
      .sort((a, b) => 
        new Date(b.date!).getTime() - new Date(a.date!).getTime()
      );
  }

  async getExpense(id: string, userId: string): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    return expense && expense.userId === userId ? expense : undefined;
  }

  async createExpense(insertExpense: InsertExpense, userId: string): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = { 
      ...insertExpense,
      id,
      userId,
      description: insertExpense.description || null,
      date: insertExpense.date ? new Date(insertExpense.date) : new Date(),
      createdAt: new Date()
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, updateData: Partial<InsertExpense>, userId: string): Promise<Expense> {
    const expense = this.expenses.get(id);
    if (!expense || expense.userId !== userId) throw new Error("Expense not found");
    
    const updated = { 
      ...expense, 
      ...updateData,
      date: updateData.date ? new Date(updateData.date) : expense.date,
    };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const expense = this.expenses.get(id);
    if (!expense || expense.userId !== userId) throw new Error("Expense not found");
    return this.expenses.delete(id);
  }

  // Payments
  async getPayments(userId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => {
        // Find the invoice this payment belongs to and check if it belongs to the user
        const invoice = this.invoices.get(payment.invoiceId!);
        return invoice && invoice.userId === userId;
      })
      .sort((a, b) => 
        new Date(b.date!).getTime() - new Date(a.date!).getTime()
      );
  }

  async getPaymentsByInvoice(invoiceId: string, userId: string): Promise<Payment[]> {
    // Verify the invoice belongs to the user
    const invoice = this.invoices.get(invoiceId);
    if (!invoice || invoice.userId !== userId) return [];
    
    return Array.from(this.payments.values())
      .filter(payment => payment.invoiceId === invoiceId)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
  }

  async createPayment(insertPayment: InsertPayment, userId: string): Promise<Payment> {
    // Verify the invoice belongs to the user
    const invoice = this.invoices.get(insertPayment.invoiceId!);
    if (!invoice || invoice.userId !== userId) {
      throw new Error("Invoice not found or access denied");
    }
    
    const id = randomUUID();
    const payment: Payment = { 
      ...insertPayment,
      id,
      invoiceId: insertPayment.invoiceId || null,
      date: insertPayment.date ? new Date(insertPayment.date) : new Date(),
      createdAt: new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }
}

export const storage = new MemStorage();
