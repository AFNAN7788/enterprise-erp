"use client";

import OrderList from "@/components/orders/OrderList";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Orders
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          View and manage all sales and purchase orders.
        </p>
      </div>

      <OrderList />
    </div>
  );
}
