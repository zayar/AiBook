'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Download, 
  Printer, 
  Copy,
  CreditCard,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  FileText,
  Building,
  Phone,
  MapPin,
  Brain,
  TrendingUp,
  Users,
  Target,
  Zap
} from 'lucide-react';
import PaymentRecordModal from '@/components/PaymentRecordModal';

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
  paidAmount: number;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  currency: string;
  notes?: string;
  termsConditions?: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    totalPrice: number;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    reference?: string;
  }>;
}

interface AIAnalysis {
  riskScore: number;
  paymentPrediction: {
    probability: number;
    expectedDate: string;
    confidence: number;
  };
  recommendations: string[];
  insights: {
    customerBehavior: string;
    marketTrends: string;
    actionItems: string[];
  };
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      
      // Mock data for demo
      const mockInvoice: Invoice = {
        id: invoiceId,
        invoiceNumber: 'INV-001234',
        customer: {
          id: '1',
          name: 'Acme Corporation',
          email: 'contact@acme.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Business St',
            city: 'Business City',
            state: 'BC',
            zipCode: '12345',
            country: 'Myanmar'
          }
        },
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 1500000,
        taxAmount: 150000,
        totalAmount: 1650000,
        paidAmount: 0,
        status: 'SENT',
        currency: 'MMK',
        notes: 'Thank you for your business!',
        termsConditions: 'Payment due within 30 days. Late fees may apply after due date.',
        items: [
          {
            id: '1',
            description: 'Web Development Services - E-commerce Platform',
            quantity: 1,
            unitPrice: 1200000,
            taxRate: 10,
            totalPrice: 1200000
          },
          {
            id: '2',
            description: 'SEO Optimization Package',
            quantity: 1,
            unitPrice: 300000,
            taxRate: 10,
            totalPrice: 300000
          }
        ],
        payments: []
      };

      const mockAIAnalysis: AIAnalysis = {
        riskScore: 15,
        paymentPrediction: {
          probability: 0.92,
          expectedDate: '2024-02-10',
          confidence: 0.88
        },
        recommendations: [
          'Send payment reminder 5 days before due date',
          'Offer early payment discount to improve cash flow',
          'Consider automated payment setup for future invoices'
        ],
        insights: {
          customerBehavior: 'Customer typically pays within 25 days with 95% reliability',
          marketTrends: 'Similar businesses in this sector are experiencing 10% faster payment cycles',
          actionItems: [
            'Set up automated reminder for Feb 10th',
            'Prepare follow-up email template',
            'Review credit terms for future transactions'
          ]
        }
      };

      setInvoice(mockInvoice);
      setAiAnalysis(mockAIAnalysis);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRecorded = () => {
    // Refresh invoice data after payment is recorded
    fetchInvoiceDetails();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-50 border-green-200';
      case 'PARTIALLY_PAID': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'SENT': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'OVERDUE': return 'text-red-600 bg-red-50 border-red-200';
      case 'DRAFT': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MMK') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice not found</h3>
          <p className="text-gray-600 mb-6">The invoice you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/invoices')}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Invoices</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
                <span className="text-sm text-gray-600">
                  Due {formatDate(invoice.dueDate)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
            
            <button className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <Mail className="h-4 w-4" />
              <span>Send</span>
            </button>
            
            <button className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
            
            {invoice.status !== 'PAID' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <CreditCard className="h-4 w-4" />
                <span>Record Payment</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Invoice Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* AI Analysis Panel */}
            {aiAnalysis && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Payment Analysis</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">
                    LIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">Payment Probability</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {Math.round(aiAnalysis.paymentPrediction.probability * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      Expected: {formatDate(aiAnalysis.paymentPrediction.expectedDate)}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-900">Risk Score</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {aiAnalysis.riskScore}%
                    </div>
                    <div className="text-xs text-gray-500">
                      Low Risk
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900">Confidence</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {Math.round(aiAnalysis.paymentPrediction.confidence * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      High Confidence
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-gray-900 mb-2">AI Recommendations</h4>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Invoice Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Bill To */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{invoice.customer.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{invoice.customer.email}</span>
                    </div>
                    {invoice.customer.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{invoice.customer.phone}</span>
                      </div>
                    )}
                    {invoice.customer.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="text-gray-600">
                          <div>{invoice.customer.address.street}</div>
                          <div>{invoice.customer.address.city}, {invoice.customer.address.state} {invoice.customer.address.zipCode}</div>
                          <div>{invoice.customer.address.country}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Date:</span>
                      <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency:</span>
                      <span className="font-medium">{invoice.currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-sm font-medium text-gray-600">Description</th>
                        <th className="text-center py-3 text-sm font-medium text-gray-600">Qty</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-600">Unit Price</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-600">Tax</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoice.items.map(item => (
                        <tr key={item.id}>
                          <td className="py-4 text-sm text-gray-900">{item.description}</td>
                          <td className="py-4 text-sm text-gray-600 text-center">{item.quantity}</td>
                          <td className="py-4 text-sm text-gray-600 text-right">
                            {formatCurrency(item.unitPrice, invoice.currency)}
                          </td>
                          <td className="py-4 text-sm text-gray-600 text-right">{item.taxRate}%</td>
                          <td className="py-4 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(item.totalPrice, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <div className="space-y-2 max-w-xs ml-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                    </div>
                    {invoice.paidAmount > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Paid:</span>
                          <span className="font-medium">-{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Balance Due:</span>
                          <span className="text-orange-600">
                            {formatCurrency(invoice.totalAmount - invoice.paidAmount, invoice.currency)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              {(invoice.notes || invoice.termsConditions) && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  {invoice.notes && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-gray-600 text-sm">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.termsConditions && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions</h4>
                      <p className="text-gray-600 text-sm">{invoice.termsConditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(invoice.paidAmount, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-3">
                  <span>Balance Due:</span>
                  <span className="text-orange-600">
                    {formatCurrency(invoice.totalAmount - invoice.paidAmount, invoice.currency)}
                  </span>
                </div>
              </div>

              {invoice.status !== 'PAID' && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 mb-2">Payment Progress</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(invoice.paidAmount / invoice.totalAmount) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {Math.round((invoice.paidAmount / invoice.totalAmount) * 100)}% paid
                  </div>
                </div>
              )}
            </div>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                
                <div className="space-y-3">
                  {invoice.payments.map(payment => (
                    <div key={payment.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(payment.amount, invoice.currency)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(payment.paymentDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.paymentMethod}
                        </div>
                      </div>
                      {payment.reference && (
                        <div className="text-xs text-gray-500">
                          Ref: {payment.reference}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Copy className="h-4 w-4" />
                  <span>Duplicate Invoice</span>
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Printer className="h-4 w-4" />
                  <span>Print Invoice</span>
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Mail className="h-4 w-4" />
                  <span>Send Reminder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Payment Record Modal */}
      {invoice && (
        <PaymentRecordModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentRecorded={handlePaymentRecorded}
          invoice={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount,
            currency: invoice.currency,
            customer: {
              name: invoice.customer.name
            }
          }}
        />
      )}
    </div>
  );
} 