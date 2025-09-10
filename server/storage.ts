import { type Customer, type InsertCustomer, type Invoice, type InsertInvoice, type Expense, type InsertExpense, type Payment, type InsertPayment, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  signInUser(username: string): Promise<User | undefined>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<boolean>;
  hasCustomerInvoices(customerId: string): Promise<boolean>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByCustomer(customerId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<boolean>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<boolean>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
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
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = { 
      ...insertCustomer, 
      id, 
      createdAt: new Date(),
      company: insertCustomer.company || null,
      phone: insertCustomer.phone || null,
      email: insertCustomer.email || null,
      address: insertCustomer.address || null
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updateData: Partial<InsertCustomer>): Promise<Customer> {
    const customer = this.customers.get(id);
    if (!customer) throw new Error("Customer not found");
    
    const updated = { ...customer, ...updateData };
    this.customers.set(id, updated);
    return updated;
  }

  async hasCustomerInvoices(customerId: string): Promise<boolean> {
    const customerInvoices = await this.getInvoicesByCustomer(customerId);
    return customerInvoices.length > 0;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    // Müşterinin faturası varsa silmeye izin verme
    const hasInvoices = await this.hasCustomerInvoices(id);
    if (hasInvoices) {
      throw new Error("Bu müşteriyi silemezsiniz çünkü sistemde faturası bulunmaktadır");
    }
    return this.customers.delete(id);
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).sort((a, b) => 
      new Date(b.issueDate!).getTime() - new Date(a.issueDate!).getTime()
    );
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.customerId === customerId)
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

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const invoiceNumber = insertInvoice.number || this.generateInvoiceNumber();
    
    const invoice: Invoice = { 
      ...insertInvoice,
      id,
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

  async updateInvoice(id: string, updateData: Partial<InsertInvoice>): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice) throw new Error("Invoice not found");
    
    const updated = { 
      ...invoice, 
      ...updateData,
      issueDate: updateData.issueDate ? new Date(updateData.issueDate) : invoice.issueDate,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : invoice.dueDate,
    };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    // Get all payments for this invoice and delete them first
    const relatedPayments = await this.getPaymentsByInvoice(id);
    relatedPayments.forEach(payment => {
      this.payments.delete(payment.id);
    });
    
    // Then delete the invoice
    return this.invoices.delete(id);
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values()).sort((a, b) => 
      new Date(b.date!).getTime() - new Date(a.date!).getTime()
    );
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = { 
      ...insertExpense,
      id,
      description: insertExpense.description || null,
      date: insertExpense.date ? new Date(insertExpense.date) : new Date(),
      createdAt: new Date()
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, updateData: Partial<InsertExpense>): Promise<Expense> {
    const expense = this.expenses.get(id);
    if (!expense) throw new Error("Expense not found");
    
    const updated = { 
      ...expense, 
      ...updateData,
      date: updateData.date ? new Date(updateData.date) : expense.date,
    };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values()).sort((a, b) => 
      new Date(b.date!).getTime() - new Date(a.date!).getTime()
    );
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.invoiceId === invoiceId)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
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
