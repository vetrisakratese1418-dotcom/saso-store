'use client';

import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Add product</h2>
      <ProductForm />
    </div>
  );
}
