'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { InvoiceAPI } from '@/lib/invoice-api';

export default function PublicInvoiceView() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await InvoiceAPI.getInvoiceByToken(token);
        setData(res.invoice);
      } catch (e: any) {
        setError('Invalid or expired link');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8">Invoice not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Invoice {data.invoiceNumber}</h1>
          <div className="text-sm text-gray-600">Status: {data.status}</div>
        </div>
        <div className="mb-4 text-sm text-gray-700">Customer: {data.customer?.name}</div>
        <div className="border-t pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Description</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{it.unitPrice}</td>
                  <td className="py-2 text-right">{it.totalPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-right">
          <div>Subtotal: {data.subtotal}</div>
          <div>Tax: {data.taxAmount}</div>
          <div className="font-semibold">Total: {data.totalAmount}</div>
        </div>
      </div>
    </div>
  );
}


