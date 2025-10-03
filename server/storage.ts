import { type Customer, type InsertCustomer, type Invoice, type InsertInvoice, type Expense, type InsertExpense, type Payment, type InsertPayment, type User, type InsertUser, customers, invoices, expenses, payments, users } from "@shared/schema";
import { randomUUID, createHash, pbkdf2Sync } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, sql } from "drizzle-orm";

// Password hashing utilities
function hashPassword(password: string): string {
  const salt = randomUUID();
  const hashedPassword = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hashedPassword}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split(':');
  const testHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return storedHash === testHash;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  signInUser(username: string, password: string): Promise<User | undefined>;

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
    const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase().replace(/\s+/g, '') === normalizedUsername,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    // Generate username: firstName + first 3 letters of lastName (lowercase, no spaces)
    const username = (insertUser.firstName + insertUser.lastName.substring(0, 3)).toLowerCase().replace(/\s+/g, '');
    
    // Hash the password
    const hashedPassword = hashPassword(insertUser.password);
    
    const user: User = { 
      ...insertUser, 
      id,
      username,
      password: hashedPassword,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async signInUser(username: string, password: string): Promise<User | undefined> {
    const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
    const user = Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase().replace(/\s+/g, '') === normalizedUsername,
    );
    
    if (!user || !verifyPassword(password, user.password)) {
      return undefined;
    }
    
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

  generateInvoiceNumber(userId: string): string {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `FT-${currentYear}-`;
    
    // Find existing invoices for the current year and user
    const currentYearInvoices = Array.from(this.invoices.values())
      .filter(invoice => invoice.userId === userId && invoice.number?.startsWith(yearPrefix))
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
    const invoiceNumber = insertInvoice.number || this.generateInvoiceNumber(userId);
    
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

export class PostgreSQLStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
    const result = await this.db
      .select()
      .from(users)
      .where(sql`LOWER(REPLACE(${users.username}, ' ', '')) = ${normalizedUsername}`)
      .limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate username: firstName + first 3 letters of lastName (lowercase, no spaces)
    const username = (insertUser.firstName + insertUser.lastName.substring(0, 3))
      .toLowerCase()
      .replace(/\s+/g, '');
    
    // Hash the password
    const hashedPassword = hashPassword(insertUser.password);
    
    const result = await this.db
      .insert(users)
      .values({
        ...insertUser,
        username,
        password: hashedPassword,
      })
      .returning();
    
    return result[0];
  }

  async signInUser(username: string, password: string): Promise<User | undefined> {
    const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
    const result = await this.db
      .select()
      .from(users)
      .where(sql`LOWER(REPLACE(${users.username}, ' ', '')) = ${normalizedUsername}`)
      .limit(1);
    
    const user = result[0];
    if (!user || !verifyPassword(password, user.password)) {
      return undefined;
    }
    
    return user;
  }

  // Customers
  async getCustomers(userId: string): Promise<Customer[]> {
    return await this.db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string, userId: string): Promise<Customer | undefined> {
    const result = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createCustomer(insertCustomer: InsertCustomer, userId: string): Promise<Customer> {
    const result = await this.db
      .insert(customers)
      .values({
        ...insertCustomer,
        userId,
      })
      .returning();
    
    return result[0];
  }

  async updateCustomer(id: string, updateData: Partial<InsertCustomer>, userId: string): Promise<Customer> {
    const result = await this.db
      .update(customers)
      .set(updateData)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Customer not found");
    }
    
    return result[0];
  }

  async hasCustomerInvoices(customerId: string, userId: string): Promise<boolean> {
    const customerInvoices = await this.getInvoicesByCustomer(customerId, userId);
    return customerInvoices.length > 0;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    // Check if customer has invoices
    const hasInvoices = await this.hasCustomerInvoices(id, userId);
    if (hasInvoices) {
      throw new Error("Bu müşteriyi silemezsiniz çünkü sistemde faturası bulunmaktadır");
    }

    const result = await this.db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  // Invoices
  async getInvoices(userId: string): Promise<Invoice[]> {
    return await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.issueDate));
  }

  async getInvoice(id: string, userId: string): Promise<Invoice | undefined> {
    const result = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getInvoicesByCustomer(customerId: string, userId: string): Promise<Invoice[]> {
    return await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.customerId, customerId), eq(invoices.userId, userId)))
      .orderBy(desc(invoices.issueDate));
  }

  generateInvoiceNumber(userId: string): string {
    // This will be replaced by a database query in the createInvoice method
    const currentYear = new Date().getFullYear();
    return `FT-${currentYear}-001`;
  }

  async createInvoice(insertInvoice: InsertInvoice, userId: string): Promise<Invoice> {
    // Validate customer exists and belongs to user
    if (insertInvoice.customerId) {
      const customer = await this.getCustomer(insertInvoice.customerId, userId);
      if (!customer) {
        throw new Error("Seçilen müşteri bulunamadı");
      }
    }

    // If invoice number is provided, use it directly
    if (insertInvoice.number) {
      const result = await this.db
        .insert(invoices)
        .values({
          ...insertInvoice,
          userId,
          number: insertInvoice.number,
          paidAmount: insertInvoice.paidAmount || "0",
          status: insertInvoice.status || "unpaid",
          issueDate: insertInvoice.issueDate ? new Date(insertInvoice.issueDate) : new Date(),
          dueDate: insertInvoice.dueDate ? new Date(insertInvoice.dueDate) : null,
        })
        .returning();
      
      return result[0];
    }

    // Validate customer exists and belongs to user (once before attempting generation)
    if (insertInvoice.customerId) {
      const customer = await this.getCustomer(insertInvoice.customerId, userId);
      if (!customer) {
        throw new Error("Seçilen müşteri bulunamadı");
      }
    }

    // Generate sequential invoice numbers with retry mechanism to handle race conditions
    const currentYear = new Date().getFullYear();
    const yearPrefix = `FT-${currentYear}-`;
    const maxRetries = 10;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get current max number for this user and year
        const latestInvoice = await this.db
          .select({ number: invoices.number })
          .from(invoices)
          .where(
            and(
              eq(invoices.userId, userId),
              sql`${invoices.number} LIKE ${yearPrefix + '%'}`
            )
          )
          .orderBy(sql`CAST(SUBSTRING(${invoices.number}, 9) AS INTEGER) DESC`)
          .limit(1);
        
        // Calculate next number
        let nextNumber = 1;
        if (latestInvoice.length > 0) {
          const latestNumber = latestInvoice[0].number;
          const numberPart = latestNumber?.split('-')[2];
          const currentNumber = numberPart ? parseInt(numberPart, 10) : 0;
          nextNumber = currentNumber + 1;
        }
        
        const invoiceNumber = `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
        
        // Try to insert with this number
        const result = await this.db
          .insert(invoices)
          .values({
            ...insertInvoice,
            userId,
            number: invoiceNumber,
            paidAmount: insertInvoice.paidAmount || "0",
            status: insertInvoice.status || "unpaid",
            issueDate: insertInvoice.issueDate ? new Date(insertInvoice.issueDate) : new Date(),
            dueDate: insertInvoice.dueDate ? new Date(insertInvoice.dueDate) : null,
          })
          .returning();
        
        return result[0];
        
      } catch (error: any) {
        // If it's a unique constraint violation on our composite constraint, retry
        if (error?.code === '23505' && error?.detail?.includes('user_invoice_number')) {
          if (attempt === maxRetries - 1) {
            throw new Error('Unable to generate unique invoice number after multiple attempts');
          }
          // Wait a small random amount before retrying to reduce contention
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          continue;
        }
        // If it's any other error, rethrow
        throw error;
      }
    }
    
    throw new Error('Maximum retry attempts exceeded for invoice creation');
  }

  async updateInvoice(id: string, updateData: Partial<InsertInvoice>, userId: string): Promise<Invoice> {
    const updateValues: any = {
      ...updateData,
    };
    
    // Only add date fields if they are provided in updateData
    if (updateData.issueDate) {
      updateValues.issueDate = new Date(updateData.issueDate);
    }
    if (updateData.dueDate) {
      updateValues.dueDate = new Date(updateData.dueDate);
    }

    const result = await this.db
      .update(invoices)
      .set(updateValues)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Invoice not found");
    }
    
    return result[0];
  }

  async deleteInvoice(id: string, userId: string): Promise<boolean> {
    // First verify the invoice belongs to the user
    const invoice = await this.getInvoice(id, userId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Delete related payments first (now safe since we verified ownership)
    await this.db
      .delete(payments)
      .where(eq(payments.invoiceId, id));

    // Then delete the invoice
    const result = await this.db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  // Expenses
  async getExpenses(userId: string): Promise<Expense[]> {
    return await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date));
  }

  async getExpense(id: string, userId: string): Promise<Expense | undefined> {
    const result = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createExpense(insertExpense: InsertExpense, userId: string): Promise<Expense> {
    const result = await this.db
      .insert(expenses)
      .values({
        ...insertExpense,
        userId,
        date: insertExpense.date ? new Date(insertExpense.date) : new Date(),
      })
      .returning();
    
    return result[0];
  }

  async updateExpense(id: string, updateData: Partial<InsertExpense>, userId: string): Promise<Expense> {
    const updateValues = {
      ...updateData,
      date: updateData.date ? new Date(updateData.date) : undefined,
    };

    const result = await this.db
      .update(expenses)
      .set(updateValues)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Expense not found");
    }
    
    return result[0];
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  // Payments
  async getPayments(userId: string): Promise<Payment[]> {
    return await this.db
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        amount: payments.amount,
        date: payments.date,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(payments.date));
  }

  async getPaymentsByInvoice(invoiceId: string, userId: string): Promise<Payment[]> {
    // Verify the invoice belongs to the user
    const invoice = await this.getInvoice(invoiceId, userId);
    if (!invoice) return [];

    return await this.db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.date));
  }

  async createPayment(insertPayment: InsertPayment, userId: string): Promise<Payment> {
    // Verify invoiceId is provided and the invoice belongs to the user
    if (!insertPayment.invoiceId) {
      throw new Error("Invoice ID is required for payment creation");
    }
    
    const invoice = await this.getInvoice(insertPayment.invoiceId, userId);
    if (!invoice) {
      throw new Error("Invoice not found or access denied");
    }

    const result = await this.db
      .insert(payments)
      .values({
        ...insertPayment,
        date: insertPayment.date ? new Date(insertPayment.date) : new Date(),
      })
      .returning();
    
    return result[0];
  }

}

// Switch to PostgreSQL storage
export const storage = new PostgreSQLStorage();
