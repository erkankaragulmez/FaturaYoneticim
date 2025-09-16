import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  number: text("number").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status", { enum: ["unpaid", "partial", "paid"] }).default("unpaid"),
  description: text("description"),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userInvoiceNumber: unique("user_invoice_number").on(table.userId, table.number),
}));

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  birthDay: integer("birth_day").notNull(), // 1-31
  birthMonth: integer("birth_month").notNull(), // 1-12  
  birthYear: integer("birth_year").notNull(), // yyyy
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  userId: true, // Will be added from session
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  userId: true, // Will be added from session
  createdAt: true,
}).extend({
  number: z.string().optional(),
  customerId: z.string().min(1, "Müşteri seçimi zorunludur"),
  amount: z.string().min(1, "Tutar gereklidir").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Pozitif bir değer girmeniz gerekiyor"),
  paidAmount: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  userId: true, // Will be added from session
  createdAt: true,
}).extend({
  amount: z.string().min(1, "Tutar gereklidir").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Pozitif bir değer girmeniz gerekiyor"),
  date: z.string().optional(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  invoiceId: z.string().min(1, "Fatura seçimi zorunludur"),
  amount: z.string().min(1, "Tutar gereklidir").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Pozitif bir değer girmeniz gerekiyor"),
  date: z.string().optional(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  username: true, // Generated automatically
  password: true, // Generated automatically
}).extend({
  firstName: z.string().min(1, "İsim gereklidir"),
  lastName: z.string().min(1, "Soyisim gereklidir"),
  phone: z.string().min(10, "Geçerli telefon numarası giriniz"),
  birthDay: z.number().min(1).max(31),
  birthMonth: z.number().min(1).max(12),
  birthYear: z.number().min(1900).max(new Date().getFullYear()),
});


export const signInSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gereklidir"),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SignInUser = z.infer<typeof signInSchema>;
