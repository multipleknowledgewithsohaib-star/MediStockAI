# MediStock RBAC Setup

This project now uses credential-based authentication with role-based access control for two roles:

- `ADMIN`
- `POS`

`ADMIN` can access the full inventory dashboard flow. `POS` is restricted to billing and invoice history.

## Environment

Required environment variables:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

Optional seed variables for the initial accounts:

```env
SEED_ADMIN_PASSWORD="Admin@123"
SEED_POS1_PASSWORD="PosUser1@123"
SEED_POS2_PASSWORD="PosUser2@123"
SEED_ADMIN_BRANCH_ID=""
SEED_POS1_BRANCH_ID=""
SEED_POS2_BRANCH_ID=""
```

If the optional password variables are omitted, the default passwords shown above are used.

## Local Setup

Run these commands after pulling the RBAC changes:

```bash
npx prisma generate
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260415153000_add_role_based_auth/migration.sql
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260415170000_add_product_discount_snapshots/migration.sql
npx prisma db seed
npm run dev -- --webpack
```

## Seeded Accounts

The safe seed creates or updates these users:

- `admin@medistock.local`
- `pos1@medistock.local`
- `pos2@medistock.local`

Default passwords:

- Admin: `Admin@123`
- POS 1: `PosUser1@123`
- POS 2: `PosUser2@123`

Change these passwords after the first deployment if this project is used outside local development.

## What Changed

- NextAuth credentials login now authenticates against Prisma `User` records.
- Roles are stored as `ADMIN` and `POS`.
- `User` records now include `password`, `isActive`, and `updatedAt`.
- `Sale` records now store `createdById` so each invoice/sale is linked to the logged-in user.
- Route protection is enforced in `proxy.ts` for both pages and APIs.
- Admin and POS users now see different sidebar menus.
- POS users are redirected to `/sales` after login and blocked from admin routes and admin APIs.
- Admin product pricing now supports a saved `discountPercent` and `isDiscountActive` flag per product.
- POS billing now reads the saved admin discount and shows discount only in rupees.
- Sale items now store rate, discount percent, discount amount, and net amount at sale time so old invoices stay correct.

## Testing Guide

### 1. Test Admin Login

1. Open `/login`.
2. Sign in with `admin@medistock.local`.
3. Confirm you land on `/`.
4. Confirm the sidebar shows admin sections like Dashboard, Products, Purchases, Stock, Finance, Reports, Suppliers, Sales, and Invoices.

### 2. Test POS Login

1. Sign out.
2. Sign in with `pos1@medistock.local` or `pos2@medistock.local`.
3. Confirm you land on `/sales`.
4. Confirm the sidebar only shows billing-related entries.

### 3. Test Route Protection

1. While logged in as POS, open `/products`.
2. You should be redirected back to `/sales`.
3. While logged in as Admin, open `/products`.
4. The page should load normally.

### 4. Test API Protection

1. While logged in as POS, try a `POST` to `/api/products`.
2. The API should return `403`.
3. While logged in as POS, `GET /api/invoices` should still return data you are allowed to see.
4. While logged in as Admin, `GET /api/products` should return the full product list.

### 5. Test `createdBy` Tracking

1. Log in as a POS user.
2. Create a sale from `/sales`.
3. Open `/invoices`.
4. Confirm the invoice appears with the `Created By` column showing that POS user.
5. Log in as Admin.
6. Open `/invoices`.
7. Confirm Admin can see the same invoice and who created it.

### 6. Test Admin Discount Setup

1. Log in as Admin.
2. Open `/products`.
3. Add or edit a product and set:
   - `sale price`
   - `discount percent`
   - `active discount`
4. Save the product.
5. Confirm the product card shows the active discount badge.

### 7. Test POS Auto Discount

1. Log in as a POS user.
2. Open `/sales`.
3. Add the discounted product to the bill.
4. Confirm POS can see:
   - product
   - quantity
   - rate
   - discount in rupees
   - line total
5. Confirm POS cannot edit any discount field because none is shown in the billing form.

### 8. Test Backend Discount Protection

1. Log in as POS.
2. Try posting to `/api/sales` with custom fields like `discountPercent`, `discountAmount`, or `manualPrice`.
3. Confirm the API rejects the request.
4. Submit a normal sale payload.
5. Confirm the backend stores the sale using the product's saved pricing snapshot.

### 9. Test Invoice Discount Snapshot

1. Create a sale for a discounted product.
2. Change that product's price or discount in `/products`.
3. Open the old invoice in `/invoices`.
4. Confirm the old invoice still shows the original rupee discount and line totals from sale time.
5. Reprint the invoice and confirm the print shows rupee discount only, not percentage.

## Notes

- The current inventory database has many products without batch rows, so the sale API creates a fallback `SYSTEM-<productId>` batch when needed to preserve compatibility with the existing schema.
- The current stock model still behaves like pack-level integer stock. If you later need precise loose-tablet stock accounting for multi-unit packs, plan a separate stock-model migration.
