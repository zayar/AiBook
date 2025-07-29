'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SalesOrderItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfilledQty: number;
  status: 'pending' | 'partial' | 'fulfilled';
}

interface Customer {
  id: string;
  name: string;
  email: string;
  paymentTerms: number;
}

interface SalesOrderFormData {
  customerId: string;
  orderDate: string;
  deliveryDate: string;
  currency: string;
  notes: string;
  items: SalesOrderItem[];
}

interface FulfillmentPrediction {
  estimatedDays: number;
  confidence: number;
  factors: string[];
}

interface AIEnhancement {
  inventoryCheck: boolean;
  fulfillmentPrediction: boolean;
  smartSuggestions: boolean;
}

export default function SalesOrderForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<SalesOrderFormData>({
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    currency: 'USD',
    notes: '',
    items: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        fulfilledQty: 0,
        status: 'pending'
      }
    ]
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiEnhancements, setAiEnhancements] = useState<AIEnhancement>({
    inventoryCheck: true,
    fulfillmentPrediction: true,
    smartSuggestions: true
  });
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [fulfillmentPrediction, setFulfillmentPrediction] = useState<FulfillmentPrediction | null>(null);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Calculate totals when items change
  useEffect(() => {
    calculateTotals();
  }, [formData.items]);

  // Predict fulfillment when customer or items change
  useEffect(() => {
    if (formData.customerId && formData.items.some(item => item.description) && aiEnhancements.fulfillmentPrediction) {
      predictFulfillment();
    }
  }, [formData.customerId, formData.items, aiEnhancements.fulfillmentPrediction]);

  const loadCustomers = async () => {
    try {
      // Mock data - would fetch from API
      setCustomers([
        { id: '1', name: 'Acme Corporation', email: 'orders@acme.com', paymentTerms: 30 },
        { id: '2', name: 'Tech Solutions Inc', email: 'purchasing@techsolutions.com', paymentTerms: 15 },
        { id: '3', name: 'Global Industries', email: 'procurement@global.com', paymentTerms: 45 }
      ]);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const calculateTotals = () => {
    const sub = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = sub * 0.085; // 8.5% tax rate
    
    setSubtotal(sub);
    setTaxAmount(tax);
    setTotal(sub + tax);
  };

  const predictFulfillment = async () => {
    if (!aiEnhancements.fulfillmentPrediction) return;

    try {
      // Mock AI prediction - would call actual AI service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const customer = customers.find(c => c.id === formData.customerId);
      const complexity = formData.items.filter(item => item.description).length;
      
      let estimatedDays = 5;
      let confidence = 0.85;
      const factors = ['Historical fulfillment time for similar orders: 4-6 days'];
      
      // Adjust based on customer
      if (customer?.paymentTerms === 15) {
        estimatedDays -= 1;
        factors.push('Priority customer with fast payment terms');
      }
      
      // Adjust based on complexity
      if (complexity > 5) {
        estimatedDays += 2;
        confidence -= 0.1;
        factors.push('High complexity order with many items');
      } else {
        factors.push('Standard complexity order');
      }
      
      factors.push('Current inventory levels: High');
      factors.push('Seasonal demand: Normal');
      
      setFulfillmentPrediction({
        estimatedDays,
        confidence,
        factors
      });
    } catch (error) {
      console.warn('Fulfillment prediction failed:', error);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          fulfilledQty: 0,
          status: 'pending'
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: keyof SalesOrderItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total price for this item
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
      }
      
      return { ...prev, items: newItems };
    });
  };

  // AI Enhancement: Inventory check and suggestions
  const handleDescriptionChange = async (index: number, description: string) => {
    updateItem(index, 'description', description);
    
    if (aiEnhancements.inventoryCheck && description.length > 3) {
      try {
        // Simulate inventory check and price suggestion
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock inventory and pricing data
        const mockInventory = {
          'laptop': { available: 25, suggestedPrice: 999.99 },
          'mouse': { available: 100, suggestedPrice: 29.99 },
          'keyboard': { available: 50, suggestedPrice: 79.99 }
        };
        
        const lowerDesc = description.toLowerCase();
        const match = Object.keys(mockInventory).find(key => lowerDesc.includes(key));
        
        if (match) {
          const item = mockInventory[match as keyof typeof mockInventory];
          updateItem(index, 'unitPrice', item.suggestedPrice);
          
          // Show inventory availability
          console.log(`✅ ${match}: ${item.available} units available`);
        }
      } catch (error) {
        console.warn('Inventory check failed:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/sales-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || ''
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedOrderId(result.salesOrder.id);
        
        // Show success message with AI enhancements info
        alert(`✅ Sales Order ${result.salesOrder.orderNumber} created successfully!\n\n🤖 AI Enhancements Applied:\n${JSON.stringify(result.aiEnhancements, null, 2)}`);
        
        // Redirect to sales order detail page
        router.push(`/sales-orders/${result.salesOrder.id}`);
      } else {
        const error = await response.json();
        alert(`❌ Error creating sales order: ${error.error}`);
      }
    } catch (error) {
      console.error('Sales order creation error:', error);
      alert('❌ Failed to create sales order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillOrder = async (fulfillmentData: { itemId: string; fulfilledQuantity: number }[]) => {
    if (!selectedOrderId) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/sales-orders/${selectedOrderId}/fulfill`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || ''
        },
        body: JSON.stringify({ items: fulfillmentData })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Order fulfillment updated!\nStatus: ${result.salesOrder.status}\nNext steps: ${result.nextSteps.join(', ')}`);
        setShowFulfillmentModal(false);
      } else {
        const error = await response.json();
        alert(`❌ Fulfillment error: ${error.error}`);
      }
    } catch (error) {
      console.error('Fulfillment error:', error);
      alert('❌ Failed to update fulfillment.');
    } finally {
      setLoading(false);
    }
  };

  const convertToInvoice = async () => {
    if (!selectedOrderId) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/sales-orders/${selectedOrderId}/convert-to-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || ''
        },
        body: JSON.stringify({ includeUnfulfilled: false })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Create actual invoice using the preview data
        const invoiceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': localStorage.getItem('tenantId') || ''
          },
          body: JSON.stringify(result.invoicePreview)
        });

        if (invoiceResponse.ok) {
          const invoiceResult = await invoiceResponse.json();
          alert(`✅ Invoice ${invoiceResult.invoice.invoiceNumber} created from sales order!`);
          router.push(`/invoices/${invoiceResult.invoice.id}`);
        }
      } else {
        const error = await response.json();
        alert(`❌ Conversion error: ${error.error}`);
      }
    } catch (error) {
      console.error('Invoice conversion error:', error);
      alert('❌ Failed to convert to invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Sales Order</h1>
        <p className="text-gray-600">Manage sales orders with AI-powered fulfillment tracking</p>
      </div>

      {/* AI Enhancement Toggle */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🤖 AI Enhancements</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={aiEnhancements.inventoryCheck}
              onChange={(e) => setAiEnhancements(prev => ({ ...prev, inventoryCheck: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Inventory Check</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={aiEnhancements.fulfillmentPrediction}
              onChange={(e) => setAiEnhancements(prev => ({ ...prev, fulfillmentPrediction: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Fulfillment Prediction</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={aiEnhancements.smartSuggestions}
              onChange={(e) => setAiEnhancements(prev => ({ ...prev, smartSuggestions: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Smart Suggestions</span>
          </label>
        </div>
      </div>

      {/* Fulfillment Prediction */}
      {fulfillmentPrediction && aiEnhancements.fulfillmentPrediction && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-2">📅 AI Fulfillment Prediction</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-green-700">
                <span className="font-semibold">Estimated Fulfillment: </span>
                {fulfillmentPrediction.estimatedDays} days
              </p>
              <p className="text-sm text-green-700">
                <span className="font-semibold">Confidence: </span>
                {(fulfillmentPrediction.confidence * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600 mb-1">Prediction Factors:</p>
              <ul className="text-xs text-green-600 list-disc list-inside">
                {fulfillmentPrediction.factors.slice(0, 2).map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer and Basic Info */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.paymentTerms} days
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
            <input
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Order Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Product description"
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {aiEnhancements.inventoryCheck && item.description && (
                    <p className="text-xs text-green-600 mt-1">🤖 Inventory verified</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Unit Price"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium">${item.totalPrice.toFixed(2)}</span>
                </div>
                
                <div className="col-span-1 flex items-center">
                  <span className="text-xs text-gray-500">{item.status}</span>
                </div>
                
                <div className="col-span-1 flex items-center">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-end space-y-2">
            <div className="text-right space-y-1">
              <div className="flex justify-between min-w-[200px]">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8.5%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-1">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Order Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Special instructions, delivery requirements, etc."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div className="space-x-3">
            {selectedOrderId && (
              <>
                <button
                  type="button"
                  onClick={() => setShowFulfillmentModal(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Track Fulfillment
                </button>
                <button
                  type="button"
                  onClick={convertToInvoice}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Convert to Invoice
                </button>
              </>
            )}
          </div>
          
          <div className="space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? '🤖 Creating Order...' : 'Create Sales Order'}
            </button>
          </div>
        </div>
      </form>

      {/* Fulfillment Modal */}
      {showFulfillmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Update Fulfillment</h3>
              <button
                onClick={() => setShowFulfillmentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border rounded p-3">
                  <p className="font-medium">{item.description || `Item ${index + 1}`}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-gray-600">Ordered: {item.quantity}</label>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Fulfilled:</label>
                      <input
                        type="number"
                        max={item.quantity}
                        min={0}
                        defaultValue={item.fulfilledQty}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => {
                  // Mock fulfillment data
                  const fulfillmentData = formData.items.map((item, index) => ({
                    itemId: `item-${index}`,
                    fulfilledQuantity: item.quantity
                  }));
                  handleFulfillOrder(fulfillmentData);
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Update Fulfillment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 