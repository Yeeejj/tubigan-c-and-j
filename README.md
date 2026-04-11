# CJ Water Management App

A comprehensive water station management and delivery application built with React Native and Expo. Manage water production, orders, inventory, deliveries, sales, and staff operations — all from one platform.

## Tech Stack

- **Frontend:** React Native 0.81 · Expo 54 · TypeScript · React 19
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State Management:** TanStack React Query · React Hook Form · Zod
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Native:** Expo Camera · Expo Location · Expo Notifications · Expo Secure Store

## Features

- **Dashboard** — Quick stats overview, pending orders, active deliveries, low stock alerts, and revenue summary
- **Orders Management** — Create, track, and update orders with full status workflow (pending → processing → out for delivery → delivered → completed)
- **Delivery Tracking** — GPS location stamping, photo confirmation, failure documentation, and assigned staff tracking
- **Production Batches** — Multi-step water production process tracking (intake → filtration → RO → UV → filling → capping → QC → dispatch)
- **Inventory Management** — Stock levels, reorder thresholds, low/critical stock alerts, and transaction history
- **Sales & Revenue** — Daily sales summaries, revenue reporting, and payment method tracking (Cash, GCash, Bank Transfer)
- **Staff Management** — User profiles, activity logging, and role-based access control
- **Offline Support** — Queue operations when offline with automatic sync when back online
- **Real-time Updates** — WebSocket subscriptions for live order and delivery updates

## Role-Based Access

| Role | Access |
|------|--------|
| Owner | All modules |
| Admin | All modules |
| In-Shop Staff | Dashboard, Orders, Process, Inventory |
| Delivery Staff | Delivery, Inventory (limited) |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Supabase project

### Installation

```bash
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Database migrations are located in `/supabase/migrations/`.

### Run the App

```bash
# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

## Project Structure

```
app/                    Expo Router pages (file-based routing)
  (app)/                Main authenticated app screens
  (auth)/               Authentication screens
components/             Reusable UI components
services/               Supabase API service layer
hooks/                  TanStack Query hooks
context/                React context providers
constants/              Status and role definitions
types/                  TypeScript type definitions
utils/                  Utility functions
schemas/                Zod validation schemas
supabase/               Configuration and migrations
```
