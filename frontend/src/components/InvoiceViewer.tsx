'use client';

import React from 'react';
import { InvoiceTemplateSettings, getTemplateSettings } from '@/lib/invoice-template';

type Item = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  totalPrice: number;
  inventoryItem?: {
    id: string;
    name: string;
    sku: string;
  };
};

type Customer = {
  name: string;
  email?: string;
  phone?: string;
  address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
};

export type InvoiceViewerProps = {
  visible?: boolean; // optional for embedded usage
  onClose?: () => void;
  embedded?: boolean; // when true renders as inline frame, not modal
  className?: string; // additional CSS classes
  invoice: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount?: number; // make optional for public view
    customer: Customer;
    items: Item[];
    status?: string; // add status for public view
    payments?: Array<{ // add payments for public view
      id: string;
      amount: number;
      paymentDate: string;
      method: string;
      reference?: string;
    }>;
  };
};

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export default function InvoiceViewer({ visible = true, onClose, embedded = false, className = '', invoice }: InvoiceViewerProps) {
  const settings: InvoiceTemplateSettings = getTemplateSettings();
  if (!visible) return null;

  const FrameWrapper = ({ children }: { children: React.ReactNode }) => (
    embedded ? (
      <div className={`bg-white w-full rounded-xl shadow border overflow-hidden ${className}`}>
        {children}
      </div>
    ) : (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className={`bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden ${className}`}>
          {children}
        </div>
      </div>
    )
  );

  return (
    <FrameWrapper>
        {/* Header */}
        <div className="p-6 flex items-center justify-between" style={{ background: settings.headerColor }}>
          <div className="flex items-center space-x-3">
            {settings.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoDataUrl} alt="logo" className="h-10 w-10 object-contain rounded" />
            ) : (
              <div className="h-10 w-10 rounded bg-white/20 flex items-center justify-center text-white font-bold">AI</div>
            )}
            <div className="text-white">
              <div className="text-2xl font-bold">Invoice</div>
              <div className="opacity-90 text-sm">#{invoice.invoiceNumber}</div>
            </div>
          </div>
          {!embedded && (
            <button onClick={onClose} className="text-white/90 hover:text-white text-sm px-3 py-1 rounded border border-white/30">Close</button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Bill To</div>
              <div className="font-semibold text-gray-900">{invoice.customer.name}</div>
              {invoice.customer.email && <div className="text-sm text-gray-600">{invoice.customer.email}</div>}
              {invoice.customer.phone && <div className="text-sm text-gray-600">{invoice.customer.phone}</div>}
              {invoice.customer.address && (
                <div className="text-sm text-gray-600">
                  {invoice.customer.address.street}
                  <div>
                    {invoice.customer.address.city}{invoice.customer.address.state ? `, ${invoice.customer.address.state}` : ''} {invoice.customer.address.zipCode}
                  </div>
                  <div>{invoice.customer.address.country}</div>
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Invoice Details</div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-gray-600">Issue Date</div>
                <div className="font-medium">{new Date(invoice.issueDate).toLocaleDateString()}</div>
                <div className="text-gray-600">Due Date</div>
                <div className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                <div className="text-gray-600">Currency</div>
                <div className="font-medium">{invoice.currency}</div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead style={{ background: settings.tableHeaderBg, color: settings.tableHeaderText }}>
                <tr>
                  <th className="text-left p-3">Item & Description</th>
                  <th className="text-center p-3">Qty</th>
                  <th className="text-right p-3">Unit Price</th>
                  <th className="text-right p-3">Tax</th>
                  <th className="text-right p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3 text-gray-900">{it.description}</td>
                    <td className="p-3 text-center text-gray-700">{it.quantity}</td>
                    <td className="p-3 text-right text-gray-700">{formatMoney(it.unitPrice, invoice.currency)}</td>
                    <td className="p-3 text-right text-gray-700">{it.taxRate || 0}%</td>
                    <td className="p-3 text-right font-medium text-gray-900">{formatMoney(it.totalPrice, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Additional info + Totals side-by-side */}
          <div className={`${(settings.additionalInfo && settings.additionalInfo.trim().length>0) ? 'mt-6 flex justify-between gap-8' : 'mt-6 flex justify-end'}`}>
            {settings.additionalInfo && settings.additionalInfo.trim().length > 0 && (
              <div className="flex-1 text-xs text-gray-700 whitespace-pre-wrap border rounded-md p-3 bg-white">
                {settings.additionalInfo}
              </div>
            )}
            <div className="min-w-[280px] space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatMoney(invoice.subtotal, invoice.currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Tax</span><span className="font-medium">{formatMoney(invoice.taxAmount, invoice.currency)}</span></div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2" style={{ color: settings.accentColor }}>
                <span>Total</span><span>{formatMoney(invoice.totalAmount, invoice.currency)}</span>
              </div>
              {(invoice.paidAmount && invoice.paidAmount > 0) && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span><span>-{formatMoney(invoice.paidAmount, invoice.currency)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 text-xs text-gray-600">
          {settings.footerText}
        </div>
    </FrameWrapper>
  );
}


