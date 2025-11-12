# Smart Invoice & Payment Tracker

AI-powered invoice and payment tracking system built with Next.js 14, Supabase, TanStack Query, and Ant Design.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Ant Design, Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe
- **AI**: Google Gemini API (for OCR and extraction)
- **Charts**: Recharts

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   └── invoices/          # Invoice pages
├── components/            # React components
│   └── layout/           # Layout components
├── hooks/                 # Custom React hooks (TanStack Query)
├── lib/                   # Utility libraries
│   ├── api/              # API client
│   ├── backend/          # Backend functions
│   ├── supabase/         # Supabase clients
│   └── query-client.tsx  # TanStack Query provider
├── types/                 # TypeScript type definitions
└── supabase/             # Database migrations
    └── migrations/
```

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file with:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   STRIPE_SECRET_KEY=your_stripe_secret
   GEMINI_API_KEY=your_gemini_key
   ```

3. **Database Setup**
   Run the migration file in Supabase SQL Editor:

   ```bash
   # Copy contents of supabase/migrations/001_initial_schema.sql
   # and run in Supabase Dashboard > SQL Editor
   ```

4. **Run Development Server**

   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:3000`

## Key Features (POC)

### ✅ Implemented

- Authentication (Sign Up, Sign In, Sign Out)
- Workspace management structure
- Invoice CRUD operations
- Payment tracking and matching
- Vendor management
- Dashboard with KPIs
- Responsive layout with Ant Design
- TanStack Query for data fetching
- API routes with backend functions

### 🚧 Coming Soon

- Invoice upload and OCR (Gemini integration)
- Stripe webhook integration
- Payment auto-matching
- Cash flow forecasting
- Alerts system
- AI Assistant
- Reports and exports

## API Structure

All API routes follow the pattern:

- `GET /api/{resource}` - List resources
- `POST /api/{resource}` - Create resource
- `GET /api/{resource}/[id]` - Get single resource
- `PATCH /api/{resource}/[id]` - Update resource
- `DELETE /api/{resource}/[id]` - Delete resource

Backend functions are in `lib/backend/` and are called from API routes.

## Custom Hooks

All data fetching uses TanStack Query hooks:

- `useAuth()` - Authentication state
- `useWorkspaces()` - Workspace management
- `useInvoices()` - Invoice operations
- `usePayments()` - Payment operations
- `useVendors()` - Vendor management

## Database Schema

Key tables:

- `workspaces` - Tenant workspaces
- `workspace_members` - User-workspace relationships
- `vendors` - Vendor directory
- `invoices` - Invoice records
- `invoice_lines` - Invoice line items
- `payments` - Payment records
- `payment_matches` - Invoice-payment matching
- `categories` - Category taxonomy
- `alerts` - Alert scheduling
- `audit_logs` - Audit trail

## Security

- All API routes require authentication
- Workspace isolation via `workspace_id` filtering
- Supabase service role used only server-side
- JWT tokens passed via Authorization header

## Next Steps

1. Implement Gemini OCR integration for invoice parsing
2. Set up Stripe webhook endpoints
3. Build payment matching algorithm
4. Create cash flow forecasting logic
5. Add alert scheduling system
6. Implement AI Assistant with RAG

## License

MIT
