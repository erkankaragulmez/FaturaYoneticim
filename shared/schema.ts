import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status", { enum: ["unpaid", "partial", "paid"] }).default("unpaid"),
  description: text("description"),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
}).extend({
  number: z.string().optional(),
  amount: z.string().min(1, "Tutar gereklidir"),
  paidAmount: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().min(1, "Tutar gereklidir"),
  date: z.string().optional(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().min(1, "Tutar gereklidir"),
  date: z.string().optional(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type User = {
  id: string;
  username: string;
  password: string;
};

export type InsertUser = {
  username: string;
  password: string;
};
