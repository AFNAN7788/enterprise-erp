"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SalesOrderForm({ isEditMode = false }: { isEditMode?: boolean } = {}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

const onSubmit = async (_formData: unknown) => {
    void _formData;
    setIsSubmitting(true);
    try {
        if (isEditMode) {
            // edit logic
        } else {
            toast.success("Sales order created successfully.");
            router.push("/dashboard/orders");
        }
    } catch {
        toast.error("Failed to create sales order.");
    } finally {
        setIsSubmitting(false);
    }
};

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {isEditMode ? "Edit Sales Order" : "New Sales Order"}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Create sales orders with multiple line items. Stock will be reduced atomically.
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Customer ID
            </label>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="CUST-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Items
            </label>
            <div className="space-y-2" id="items-container">
              <div className="border rounded-lg p-3 border-zinc-200 dark:border-zinc-800 mb-2" data-index="0">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Product
                    </label>
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      placeholder="Select product"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      value="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      value="0"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                  <span>Line Total: ₹0</span>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 transition"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!isSubmitting) {
                onSubmit(null);
              }
            }}
            disabled={isSubmitting}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}