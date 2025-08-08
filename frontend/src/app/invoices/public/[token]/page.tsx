'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import InvoiceViewer from '@/components/InvoiceViewer';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import { Download, FileText, AlertTriangle } from 'lucide-react';

// Types
interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: any;
  };
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate?: number;
    inventoryItem?: {
      id: string;
      name: string;
      sku: string;
    };
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
    reference?: string;
  }>;
}

export default function PublicInvoicePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchPublicInvoice();
    }
  }, [token]);

  const fetchPublicInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3000/api/v1/invoices/public/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Invoice not found or link has expired');
        } else if (response.status === 410) {
          throw new Error('Share link has expired');
        } else {
          throw new Error('Failed to load invoice');
        }
      }

      const data = await response.json();
      const invoiceData = data.invoice;
      
      // Calculate paidAmount from payments if available
      const paidAmount = invoiceData.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;
      
      // Map the data to match InvoiceViewer expectations
      setInvoice({
        ...invoiceData,
        paidAmount
      });
    } catch (err: any) {
      console.error('Error fetching public invoice:', err);
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Invoice</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="text-sm text-gray-500">
            <p>This link may have expired or been disabled.</p>
            <p className="mt-2">Please contact the sender for a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">The requested invoice could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Invoice {invoice.invoiceNumber}
                </h1>
                <p className="text-sm text-gray-500">
                  Powered by Cashflow Copilot
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Print</span>
              </button>
              
              <button
                onClick={handleDownload}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none">
          <InvoiceViewer 
            invoice={invoice} 
            embedded={false}
            className="print:p-0"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 print:hidden">
        <p className="text-sm text-gray-500 mb-2">
          This is a shared invoice view. For questions, please contact the sender directly.
        </p>
        <p className="text-xs text-gray-400">
          Powered by <span className="text-blue-600 font-medium">Cashflow Copilot</span> - AI-First Bookkeeping SaaS
        </p>
      </div>
      
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .max-w-4xl {
            max-width: 100% !important;
          }
          
          .p-4, .sm\\:p-6, .lg\\:p-8 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}