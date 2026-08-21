# ERP — Enterprise Resource Planning & Business Management System

## Overview

A full-stack, role-based ERP system built with Next.js 16, Firebase Auth, Firestore, and Tailwind CSS v4. Designed for mid-size enterprises to manage HR, Finance, Projects, Inventory, Sales, CRM, and Operations from a single dashboard.

## Features

### Dashboard

- Role-specific dashboards (Admin, HR, Manager, Employee) with real-time KPIs
- Company-wide overview with key metrics and charts

### HR Management

- Employee records with profile management
- Attendance tracking with check-in/out functionality
- Leave request submission and approval workflow
- Payroll processing and salary management

### Finance & Accounting

- Expense submission, approval, and rejection workflow
- Payroll run management
- Budget tracking and financial summaries

### Projects

- Project management with Kanban task boards
- Drag-and-drop task organization
- Team assignments and task tracking

### Inventory

- Product catalog management
- Stock level tracking
- Stock movement logs and history

### Sales & Orders

- Sales order creation and management
- Purchase order processing
- Order status tracking and updates

### CRM

- Customer records and contact management
- Interaction tracking and history
- Follow-up reminders and scheduling

### Documents

- Document management with file uploads
- Categorized storage (HR, Finance, Projects, Legal)
- Document access control by role

### Reports

- Real-time analytics across employees, finances, attendance, and projects
- Exportable reports and data visualization

### Recruitment

- Job posting management
- Applicant tracking and status updates

### Performance

- KPI tracking for employees and teams
- Team performance scoring and analytics

### User Management

- Admin user management with role assignment
- User activation and deactivation controls

### Settings

- Theme customization (light/dark mode)
- Notification preferences
- Security settings
- Company profile configuration

### Team Overview

- Organization-wide team directory
- Team structure visualization

## Tech Stack

- **Frontend:** Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes, Server Actions
- **Database:** Cloud Firestore (real-time, security rules)
- **Auth:** Firebase Authentication (email/password + session cookies)
- **Admin SDK:** Firebase Admin SDK v12+ (modular API)
- **UI Components:** Custom component library (Card, Button, etc.)
- **Icons:** Lucide React
- **Notifications:** Sonner (toast notifications)
- **Drag & Drop:** @dnd-kit/core (Kanban task boards)

## Architecture

- Role-based access control: admin, hr, manager, employee
- Firestore security rules enforce data access per role
- Server Actions for all write operations
- REST API for stats and authentication


```

## Getting Started

Open terminal and clone repository:
git clone https://github.com/AFNAN7788/enterprise-erp.git


### Prerequisites

- Node.js 18+
- Firebase project (Firestore, Authentication enabled)

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Seed Database

Populate the database with sample data:

```bash
node seed.js
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```


## Security

- Firebase Authentication for user identity management
- HttpOnly session cookies for secure session handling
- Firestore security rules enforcing role-based data access
- Server-side token verification on all protected routes
- CSRF protection via session cookies


## License

This project is licensed under the MIT License
