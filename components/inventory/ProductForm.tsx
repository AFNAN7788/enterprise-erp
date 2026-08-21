"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import type { Product } from "@/types";
import { createProductAction, updateProductAction } from "@/app/actions/products";
import { toast } from "sonner";

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  sku: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required."),
  quantity: z.string().min(1, "Quantity is required."),
  unit: z.string().optional().or(z.literal("")),
  reorderLevel: z.string().min(1, "Reorder level is required."),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (action: "created" | "updated") => void;
  product?: Product | null;
  categories: string[];
}

export default function ProductForm({ isOpen, onClose, onSuccess, product, categories }: Props) {
  const isEditMode = !!product;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      category: "",
      quantity: "0",
      unit: "",
      reorderLevel: "0",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (product) {
        reset({
          name: product.name || "",
          sku: product.sku || "",
          description: product.description || "",
          category: product.category || "",
          quantity: String(product.quantity),
          unit: product.unit || "",
          reorderLevel: String(product.reorderLevel),
        });
      } else {
        reset({
          name: "",
          sku: "",
          description: "",
          category: "",
          quantity: "0",
          unit: "",
          reorderLevel: "0",
        });
      }
    }
  }, [isOpen, product, reset]);

  if (!isOpen) return null;

  async function onSubmit(data: ProductFormData) {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        category: data.category,
        quantity: parseFloat(data.quantity),
        unit: data.unit || null,
        reorderLevel: parseFloat(data.reorderLevel),
      };
      const result = isEditMode && product
        ? await updateProductAction(product.id, payload)
        : await createProductAction(payload);

      if (result.success) {
        onClose();
        onSuccess?.(isEditMode ? "updated" : "created");
      } else {
        toast.error(result.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 id="product-form-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {isEditMode ? "Edit Product" : "Add Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Product Name *
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="Wireless Mouse"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="sku" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                SKU
              </label>
              <input
                id="sku"
                type="text"
                {...register("sku")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="WM-001"
              />
            </div>

            <div>
              <label htmlFor="category" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Category *
              </label>
              <input
                id="category"
                type="text"
                list="category-options"
                {...register("category")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="Electronics"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
            </div>

            <div>
              <label htmlFor="unit" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Unit
              </label>
              <input
                id="unit"
                type="text"
                {...register("unit")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="pcs, kg, boxes"
              />
            </div>

            <div>
              <label htmlFor="quantity" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Quantity *
              </label>
              <input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                {...register("quantity")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
            </div>

            <div>
              <label htmlFor="reorderLevel" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Reorder Level *
              </label>
              <input
                id="reorderLevel"
                type="number"
                min="0"
                step="0.01"
                {...register("reorderLevel")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              {errors.reorderLevel && <p className="mt-1 text-xs text-red-600">{errors.reorderLevel.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              id="description"
              rows={2}
              {...register("description")}
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="Optional product details..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}