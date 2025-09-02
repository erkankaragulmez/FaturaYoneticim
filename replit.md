# Overview

This is a mobile-first invoice management application ("FaturaYoneticim") built as a full-stack web application. The system allows users to manage customers, create and track invoices, record expenses, and generate financial reports with profit/loss analysis. It features a responsive design optimized for mobile devices with a Turkish language interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation schemas
- **Mobile-First Design**: Responsive layout with bottom navigation and slide-out side menu

## Backend Architecture
- **Runtime**: Node.js with Express.js REST API server
- **Development**: Hot module replacement with Vite middleware integration
- **Storage Layer**: Pluggable storage interface with in-memory implementation (MemStorage)
- **Data Validation**: Zod schemas shared between client and server
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)

## Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Four main entities - customers, invoices, expenses, and payments
- **Relationships**: Foreign key relationships between invoices and customers, payments and invoices
- **Migrations**: Drizzle Kit for schema migrations and management

## API Structure
- **RESTful Endpoints**: CRUD operations for all entities (/api/customers, /api/invoices, /api/expenses, /api/payments)
- **Analytics Endpoints**: Dashboard metrics and expense category analytics
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Request Logging**: Custom middleware for API request/response logging

## Development Workflow
- **Build Process**: Separate client (Vite) and server (esbuild) build pipelines
- **Development Server**: Vite dev server with Express API proxy
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Hot Reloading**: Vite HMR for client-side changes, nodemon equivalent for server

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: Neon Database serverless driver for PostgreSQL connections
- **drizzle-orm** & **drizzle-kit**: Type-safe SQL query builder and migration toolkit
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React routing library

## UI and Styling
- **@radix-ui/react-***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

## Form Handling and Validation
- **react-hook-form**: Performant form library
- **@hookform/resolvers**: Form validation resolvers
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation

## Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution environment
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **esbuild**: Fast JavaScript bundler for server builds

## Session and Storage
- **express-session**: Session middleware for Express
- **connect-pg-simple**: PostgreSQL session store
- **nanoid**: URL-safe unique ID generator