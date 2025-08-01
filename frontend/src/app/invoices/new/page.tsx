'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CustomerAPI } from '@/lib/customer-api';
import { ItemAPI, InventoryItem } from '@/lib/item-api';
import { taxAPI, TaxRate } from '@/lib/tax-api';
import { salespersonAPI, Salesperson } from '@/lib/salesperson-api';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Calculator,
  Save,
  Send,
  Eye,
  Wand2,
  Sparkles,
  Search,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  FileText,
  Settings,
  Settings2,
  Clock,
  AlertCircle,
  RefreshCcw,
  Zap,
  Mic,
  MicOff,
  Lightbulb,
  TrendingUp,
  Brain,
  UserCheck
} from 'lucide-react';

// Types
interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: any;
}

interface InvoiceItem {
  id: string;
  inventoryItemId?: string; // Optional link to inventory item
  inventoryItem?: InventoryItem; // Populated inventory item data
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxRateId?: string; // Selected tax rate ID
  totalPrice: number;
  accountCode?: string;
}

interface InvoiceForm {
  customerId: string;
  customer?: Customer;
  salespersonId?: string;
  salesperson?: Salesperson;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: number;
  notes: string;
  termsConditions: string;
  items: InvoiceItem[];
  discountAmount: number;
  discountType: 'fixed' | 'percentage';
  shippingCharges: number;
  adjustment: number;
  taxType: 'inclusive' | 'exclusive';
}

interface AIAutofillSuggestion {
  field: string;
  value: any;
  confidence: number;
  reason: string;
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  
  const [formData, setFormData] = useState<InvoiceForm>({
    customerId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    currency: 'MMK',
    exchangeRate: 1,
    notes: '',
    termsConditions: '',
    items: [{
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
      totalPrice: 0
    }],
    discountAmount: 0,
    discountType: 'fixed',
    shippingCharges: 0,
    adjustment: 0,
    taxType: 'exclusive'
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AIAutofillSuggestion[]>([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Inventory Items state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [itemSearchTerms, setItemSearchTerms] = useState<{[key: string]: string}>({});
  const [itemDropdownVisible, setItemDropdownVisible] = useState<{[key: string]: boolean}>({});
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Invoice Number Configuration
  const [invoiceNumberSettings, setInvoiceNumberSettings] = useState({
    prefix: 'INV',
    separator: '-',
    includeDate: true,
    seriesStart: 1,
    seriesOffset: 0
  });
  const [showInvoiceNumberSettings, setShowInvoiceNumberSettings] = useState(false);
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState(false);

  const [aiAssistActive, setAiAssistActive] = useState(false);
  const [customerInsights, setCustomerInsights] = useState<any>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [salespersonSearch, setSalespersonSearch] = useState('');
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false);

  useEffect(() => {
    if (!manualInvoiceNumber) {
      generateInvoiceNumber();
    }
    fetchCustomers();
    loadInventoryItems();
    fetchAccounts();
    fetchTaxRates();
    fetchSalespeople();
    
    if (duplicateId) {
      loadInvoiceForDuplication(duplicateId);
    }
  }, [duplicateId, invoiceNumberSettings, manualInvoiceNumber]);

  // Close inventory dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.inventory-dropdown')) {
        setItemDropdownVisible({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const generateInvoiceNumber = async () => {
    try {
      const params = new URLSearchParams({
        prefix: invoiceNumberSettings.prefix,
        separator: invoiceNumberSettings.separator,
        includeDate: invoiceNumberSettings.includeDate.toString(),
        seriesStart: invoiceNumberSettings.seriesStart.toString(),
        seriesOffset: invoiceNumberSettings.seriesOffset.toString()
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/invoices/next-number?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, invoiceNumber: data.invoiceNumber }));
        console.log('✅ Generated invoice number:', data.invoiceNumber, 'with settings:', data.settings);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error generating invoice number:', error);
      // Fallback to timestamp-based number with date
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const year = today.getFullYear();
      const fallbackNumber = `${invoiceNumberSettings.prefix}${invoiceNumberSettings.separator}${month}/${day}/${year}${invoiceNumberSettings.separator}01`;
      setFormData(prev => ({ ...prev, invoiceNumber: fallbackNumber }));
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('🔍 Fetching customers from API...');
      const data = await CustomerAPI.getCustomers();
      console.log('✅ Fetched customers:', data);
      
      // Transform customer data to match expected format
      const transformedCustomers = data.customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || customer.workPhone
      }));
      
      setCustomers(transformedCustomers);
      console.log('✅ Set customers state:', transformedCustomers);
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setCustomers([]);
    }
  };

  // Load inventory items
  const loadInventoryItems = async () => {
    try {
      setLoadingItems(true);
      const data = await ItemAPI.getItems({ isActive: true, limit: 100 });
      setInventoryItems(data.items);
      console.log('✅ Loaded inventory items:', data.items);
    } catch (error) {
      console.error('❌ Error loading inventory items:', error);
      setInventoryItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Search inventory items
  const searchInventoryItems = async (query: string) => {
    if (query.length < 2) return [];
    try {
      const items = await ItemAPI.searchItems(query);
      return items;
    } catch (error) {
      console.error('❌ Error searching inventory items:', error);
      return [];
    }
  };

  // Fetch accounts for dropdown
  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  // Fetch tax rates for dropdown
  const fetchTaxRates = async () => {
    try {
      const response = await taxAPI.getTaxRates();
      setTaxRates(response.taxRates.filter(rate => rate.isActive) || []);
    } catch (error) {
      console.error('Error loading tax rates:', error);
    }
  };

  const fetchSalespeople = async () => {
    try {
      const response = await salespersonAPI.getSalespeople();
      setSalespeople(response.salespeople.filter(person => person.isActive) || []);
    } catch (error) {
      console.error('Error loading salespeople:', error);
    }
  };

  // Handle inventory item selection
  const handleInventoryItemSelect = (itemId: string, inventoryItem: InventoryItem) => {
    const newItems = formData.items.map(item => 
      item.id === itemId ? {
        ...item,
        inventoryItemId: inventoryItem.id,
        inventoryItem,
        description: inventoryItem.name,
        unitPrice: inventoryItem.unitPrice,
        totalPrice: item.quantity * inventoryItem.unitPrice
      } : item
    );
    
    setFormData(prev => ({ ...prev, items: newItems }));
    setItemDropdownVisible(prev => ({ ...prev, [itemId]: false }));
    setItemSearchTerms(prev => ({ ...prev, [itemId]: '' }));
  };

  const loadInvoiceForDuplication = async (invoiceId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        const invoice = data.invoice;
        
        setFormData(prev => ({
          ...prev,
          customerId: invoice.customerId,
          customer: invoice.customer,
          currency: invoice.currency,
          notes: invoice.notes,
          termsConditions: invoice.termsConditions,
          items: invoice.items.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            description: item.description,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            taxRate: parseFloat(item.taxRate),
            totalPrice: parseFloat(item.totalPrice)
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading invoice for duplication:', error);
    }
  };

  const requestAISuggestions = async () => {
    if (!formData.customerId || formData.items.some(item => !item.description)) {
      return;
    }

    setLoadingAI(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/invoices/ai-suggestions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default'
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          items: formData.items.filter(item => item.description)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions);
        setShowAISuggestions(true);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const applyAISuggestion = (suggestion: AIAutofillSuggestion) => {
    switch (suggestion.field) {
      case 'dueDate':
        setFormData(prev => ({ ...prev, dueDate: suggestion.value }));
        break;
      case 'terms':
        setFormData(prev => ({ ...prev, termsConditions: suggestion.value }));
        break;
      case 'unitPrice':
        // Apply to specific item
        break;
    }
    
    setAiSuggestions(prev => prev.filter(s => s.field !== suggestion.field));
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: (formData.items.length + 1).toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
      totalPrice: 0
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    }
  };

  const updateItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };
          // Recalculate total price
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customer
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const selectSalesperson = (salesperson: Salesperson) => {
    setFormData(prev => ({
      ...prev,
      salespersonId: salesperson.id,
      salesperson
    }));
    setSalespersonSearch(salesperson.name);
    setShowSalespersonDropdown(false);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateTotalTax = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (item.totalPrice * item.taxRate / 100);
    }, 0);
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTotalTax();
    const discount = formData.discountType === 'percentage' 
      ? subtotal * formData.discountAmount / 100 
      : formData.discountAmount;
    
    return subtotal + tax - discount + formData.shippingCharges + formData.adjustment;
  };

  const handleSubmit = async (action: 'draft' | 'send') => {
    if (!formData.customerId) {
      setSubmitError('Please select a customer');
      return;
    }

    if (formData.items.some(item => !item.description || item.quantity <= 0)) {
      setSubmitError('Please fill in all item details');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const invoiceData = {
        customerId: formData.customerId,
        salespersonId: formData.salespersonId,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        exchangeRate: Number(formData.exchangeRate),
        notes: formData.notes,
        termsConditions: formData.termsConditions,
        items: formData.items.map(item => ({
          inventoryItemId: item.inventoryItemId,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          accountCode: item.accountCode
        })),
        status: action === 'send' ? 'SENT' : 'DRAFT'
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/invoices`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default'
        },
        body: JSON.stringify(invoiceData)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Invoice created successfully:', data.invoice);
        if (action === 'send') {
          // Send the invoice
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/invoices/${data.invoice.id}/send`, {
            method: 'POST',
            headers: { 'X-Tenant-ID': 'default' }
          });
        }
        
        router.push('/invoices');
      } else {
        setSubmitError(data.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setSubmitError('Failed to create invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredSalespeople = salespeople.filter(salesperson =>
    salesperson.name.toLowerCase().includes(salespersonSearch.toLowerCase()) ||
    salesperson.email?.toLowerCase().includes(salespersonSearch.toLowerCase()) ||
    salesperson.position?.toLowerCase().includes(salespersonSearch.toLowerCase())
  );

  // AI Assist Functions
  const handleAiAssist = async (action: string, data: any) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/ai/invoice-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default'
        },
        body: JSON.stringify({ action, data })
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('AI Assist error:', error);
      return null;
    }
  };

  const handleSmartItemCompletion = async (description: string) => {
    if (description.length < 3) return;
    
    const result = await handleAiAssist('smart_item_completion', { description });
    if (result && result.answer) {
      try {
        // Parse AI response for item suggestions
        const suggestions = JSON.parse(result.answer);
        setAiSuggestions(suggestions.suggestions || []);
        setShowAISuggestions(true);
      } catch (e) {
        // Fallback: create suggestion from AI response text
        setAiSuggestions([{
          field: 'items',
          value: {
            description: description,
            unitPrice: 100,
            category: 'Service',
            taxRate: 0
          },
          confidence: 0.6,
          reason: result.answer || 'AI generated suggestion'
        }]);
        setShowAISuggestions(true);
      }
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    setFormData(prev => ({ ...prev, customerId }));
    
    // Get AI insights for selected customer if AI Assist is active
    if (aiAssistActive) {
      const insights = await handleAiAssist('customer_insights', { customerId });
      if (insights) {
        setCustomerInsights(insights);
      }
    }
  };

  const handleVoiceInput = async () => {
    if (voiceRecording) {
      setVoiceRecording(false);
      // Stop recording logic here
      return;
    }
    
    setVoiceRecording(true);
    
    // Simulate voice recognition (in real app, use Web Speech API)
    setTimeout(async () => {
      const mockVoiceText = "Add consulting service for 2 hours at 150 dollars per hour";
      const result = await handleAiAssist('voice_to_invoice', { audioText: mockVoiceText });
      
      if (result && result.voiceResult && result.voiceResult.answer) {
        try {
          const voiceData = JSON.parse(result.voiceResult.answer);
          if (voiceData.extractedData) {
            const newItem = {
              id: Date.now().toString(),
              description: voiceData.extractedData.description || '',
              quantity: voiceData.extractedData.quantity || 1,
              unitPrice: voiceData.extractedData.unitPrice || 0,
              taxRate: 0,
              totalPrice: (voiceData.extractedData.quantity || 1) * (voiceData.extractedData.unitPrice || 0)
            };
            
            setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
          }
        } catch (e) {
          console.error('Voice processing error:', e);
        }
      }
      
      setVoiceRecording(false);
    }, 3000);
  };

  const handleInvoiceReview = async () => {
    const invoiceData = {
      customer: customers.find(c => c.id === formData.customerId)?.name || '',
      total: calculateGrandTotal(),
      items: formData.items,
      dueDate: formData.dueDate
    };
    
    const review = await handleAiAssist('invoice_review', { invoice: invoiceData });
    if (review) {
      alert(`AI Review Score: ${review.review?.answer || 'Invoice looks good!'}`);
    }
  };

  // Add AI Assist Panel Component
  const renderAiAssistPanel = () => (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Assist</h3>
            <p className="text-sm text-gray-600">Smart invoice creation</p>
          </div>
        </div>
        <button
          onClick={() => {
            console.log('AI Assist button clicked, current state:', aiAssistActive);
            setAiAssistActive(!aiAssistActive);
          }}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            aiAssistActive 
              ? 'bg-purple-100 text-purple-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
          }`}
        >
          {aiAssistActive ? 'Active' : 'Activate'}
        </button>
      </div>

      {aiAssistActive && (
        <div className="space-y-4">
          {/* Voice Input */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleVoiceInput}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                voiceRecording 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {voiceRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span className="text-sm">
                {voiceRecording ? 'Stop Recording' : 'Voice to Invoice'}
              </span>
            </button>
          </div>

                     {/* Smart Suggestions - Link to existing AI suggestions */}
           {showAISuggestions && aiSuggestions.length > 0 && (
             <div className="bg-white rounded-lg p-4 border border-gray-200">
               <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                 <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                 AI Smart Suggestions
               </h4>
               <p className="text-sm text-gray-600 mb-2">
                 AI has generated {aiSuggestions.length} suggestions for your invoice items.
               </p>
               <button
                 onClick={() => setShowAISuggestions(false)}
                 className="text-sm text-purple-600 hover:text-purple-700"
               >
                 View suggestions in main form →
               </button>
             </div>
           )}

          {/* Customer Insights */}
          {customerInsights && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                Customer Insights
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Total Invoices: {customerInsights.customer?.totalInvoices || 0}</p>
                <p>Average Value: ${customerInsights.customer?.averageInvoiceValue?.toFixed(2) || '0.00'}</p>
                <p>AI Analysis: {customerInsights.aiInsights?.answer || 'Analyzing...'}</p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleInvoiceReview}
              className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 flex items-center justify-center space-x-1"
            >
              <Brain className="h-4 w-4" />
              <span>Review Invoice</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Update the item description input to trigger AI suggestions
  const handleItemDescriptionChange = (index: number, value: string) => {
    const updatedItems = [...formData.items];
    updatedItems[index].description = value;
    setFormData(prev => ({ ...prev, items: updatedItems }));
    
    // Trigger AI suggestions for item completion
    if (aiAssistActive && value.length > 5) {
      handleSmartItemCompletion(value);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {duplicateId ? 'Duplicate Invoice' : 'New Invoice'}
            </h1>
            <p className="text-gray-600 mt-1">Create a professional invoice with AI assistance</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={requestAISuggestions}
            disabled={loadingAI}
            className="inline-flex items-center space-x-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50"
          >
            {loadingAI ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            <span>AI Assist</span>
          </button>
          
          <button
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>Save Draft</span>
          </button>
          
          <button
            onClick={() => handleSubmit('send')}
            disabled={isSubmitting}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{isSubmitting ? 'Creating...' : 'Save & Send'}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{submitError}</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions Panel */}
      {showAISuggestions && aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Suggestions</h3>
            </div>
            <button
              onClick={() => setShowAISuggestions(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {suggestion.field.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                    <p className="text-lg font-semibold text-purple-600 mt-2">
                      {suggestion.value}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                    <button
                      onClick={() => applyAISuggestion(suggestion)}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="flex">
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => router.push('/customers/new')}
                      className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 text-gray-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {formData.customer && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">{formData.customer.name}</h4>
                        <div className="text-sm text-blue-700 space-y-1 mt-1">
                          {formData.customer.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="h-3 w-3" />
                              <span>{formData.customer.email}</span>
                            </div>
                          )}
                          {formData.customer.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-3 w-3" />
                              <span>{formData.customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Salesperson Selection */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Salesperson
                </label>
                <div className="relative">
                  <div className="flex">
                    <div className="relative flex-1">
                      <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Select or Add Salesperson"
                        value={salespersonSearch}
                        onChange={(e) => {
                          setSalespersonSearch(e.target.value);
                          setShowSalespersonDropdown(true);
                        }}
                        onFocus={() => setShowSalespersonDropdown(true)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/salespeople/new')}
                      className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 text-gray-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {showSalespersonDropdown && filteredSalespeople.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredSalespeople.map(salesperson => (
                        <button
                          key={salesperson.id}
                          onClick={() => selectSalesperson(salesperson)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{salesperson.name}</div>
                          <div className="text-sm text-gray-600">
                            {salesperson.position} {salesperson.department && `• ${salesperson.department}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {formData.salesperson && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start space-x-3">
                      <UserCheck className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900">{formData.salesperson.name}</h4>
                        <div className="text-sm text-green-700 space-y-1 mt-1">
                          {formData.salesperson.position && (
                            <div className="flex items-center space-x-2">
                              <span>{formData.salesperson.position}</span>
                            </div>
                          )}
                          {formData.salesperson.department && (
                            <div className="flex items-center space-x-2">
                              <Building className="h-3 w-3" />
                              <span>{formData.salesperson.department}</span>
                            </div>
                          )}
                          {formData.salesperson.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="h-3 w-3" />
                              <span>{formData.salesperson.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Number with Auto-Generation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Invoice Number
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowInvoiceNumberSettings(!showInvoiceNumberSettings)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Settings2 className="h-3 w-3" />
                      <span>Configure</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualInvoiceNumber(false);
                        generateInvoiceNumber();
                      }}
                      className="text-xs text-green-600 hover:text-green-700 flex items-center space-x-1"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }));
                      setManualInvoiceNumber(true);
                    }}
                    placeholder="INV-07/28/2025-01"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {!manualInvoiceNumber && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="flex items-center space-x-1 text-xs text-green-600">
                        <Zap className="h-3 w-3" />
                        <span>Auto</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice Number Configuration Panel */}
                {showInvoiceNumberSettings && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Invoice Number Settings
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Prefix */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Prefix
                        </label>
                        <input
                          type="text"
                          value={invoiceNumberSettings.prefix}
                          onChange={(e) => setInvoiceNumberSettings(prev => ({ 
                            ...prev, 
                            prefix: e.target.value 
                          }))}
                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="INV"
                        />
                      </div>

                      {/* Separator */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Separator
                        </label>
                        <select
                          value={invoiceNumberSettings.separator}
                          onChange={(e) => setInvoiceNumberSettings(prev => ({ 
                            ...prev, 
                            separator: e.target.value 
                          }))}
                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="-">Hyphen (-)</option>
                          <option value="_">Underscore (_)</option>
                          <option value="/">Slash (/)</option>
                          <option value="">None</option>
                        </select>
                      </div>

                      {/* Include Date */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Include Date
                        </label>
                        <select
                          value={invoiceNumberSettings.includeDate ? 'true' : 'false'}
                          onChange={(e) => setInvoiceNumberSettings(prev => ({ 
                            ...prev, 
                            includeDate: e.target.value === 'true' 
                          }))}
                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="true">Include</option>
                          <option value="false">Exclude</option>
                        </select>
                      </div>

                      {/* Series Start */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Series Start
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={invoiceNumberSettings.seriesStart}
                          onChange={(e) => setInvoiceNumberSettings(prev => ({ 
                            ...prev, 
                            seriesStart: parseInt(e.target.value) || 1 
                          }))}
                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Series Offset */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Series Offset
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={invoiceNumberSettings.seriesOffset}
                          onChange={(e) => setInvoiceNumberSettings(prev => ({ 
                            ...prev, 
                            seriesOffset: parseInt(e.target.value) || 0 
                          }))}
                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Preview: <span className="font-mono font-medium">{formData.invoiceNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setManualInvoiceNumber(false);
                          generateInvoiceNumber();
                        }}
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                      >
                        Apply & Generate
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Issue Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Due Date
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MMK">MMK - Myanmar Kyat</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="THB">THB - Thai Baht</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                Invoice Items
                <span className="ml-2 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {formData.items.length} item{formData.items.length !== 1 ? 's' : ''}
                </span>
              </h2>
              {/* Keep small add button for desktop convenience */}
              <button
                onClick={addItem}
                className="hidden lg:inline-flex items-center space-x-2 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Plus className="h-3 w-3" />
                <span>Quick Add</span>
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              {formData.items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items added yet</h3>
                  <p className="text-gray-600 mb-4">Start building your invoice by adding items below.</p>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Your First Item</span>
                  </button>
                </div>
              ) : (
                <>
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      {/* Item Header with Inventory Badge and Remove Button */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          {item.inventoryItem && (
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center">
                              <span className="mr-1">📦</span>
                              From Inventory
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={formData.items.length === 1}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Description and Account Selection */}
                        <div className="lg:col-span-6">
                          <div className="space-y-3">
                            {/* Description */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Description
                              </label>
                              <div className="relative">
                                {/* Option to select from inventory */}
                                {!item.inventoryItem && (
                                  <div className="mb-2">
                                    <button
                                      type="button"
                                      onClick={() => setItemDropdownVisible(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                      className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors flex items-center space-x-1 border border-blue-200"
                                    >
                                      <Search className="h-3 w-3" />
                                      <span>Select from Inventory</span>
                                    </button>
                                  </div>
                                )}
                                
                                {/* Inventory item search dropdown */}
                                {itemDropdownVisible[item.id] && (
                                  <div className="inventory-dropdown absolute z-20 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    <div className="p-2 border-b border-gray-200 bg-gray-50">
                                      <input
                                        type="text"
                                        placeholder="Search by name or SKU..."
                                        value={itemSearchTerms[item.id] || ''}
                                        onChange={async (e) => {
                                          const term = e.target.value;
                                          setItemSearchTerms(prev => ({ ...prev, [item.id]: term }));
                                          if (term.length >= 2) {
                                            const results = await searchInventoryItems(term);
                                            setInventoryItems(results);
                                          }
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto">
                                      {inventoryItems.length === 0 ? (
                                        <div className="p-3 text-center text-gray-500 text-sm">
                                          No items found. Try a different search term.
                                        </div>
                                      ) : (
                                        inventoryItems
                                          .filter(invItem => 
                                            !itemSearchTerms[item.id] || 
                                            invItem.name.toLowerCase().includes(itemSearchTerms[item.id].toLowerCase()) ||
                                            invItem.sku.toLowerCase().includes(itemSearchTerms[item.id].toLowerCase())
                                          )
                                          .map(invItem => (
                                            <div
                                              key={invItem.id}
                                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                              onClick={() => handleInventoryItemSelect(item.id, invItem)}
                                            >
                                              <div className="font-medium text-sm text-gray-900">{invItem.name}</div>
                                              <div className="text-xs text-gray-600 mt-1">
                                                SKU: {invItem.sku} • Price: {new Intl.NumberFormat('en-US', {
                                                  style: 'currency',
                                                  currency: formData.currency,
                                                  minimumFractionDigits: 0,
                                                  maximumFractionDigits: 2
                                                }).format(invItem.unitPrice)} • Stock: {invItem.quantityOnHand}
                                              </div>
                                            </div>
                                          ))
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Show selected inventory item info */}
                                {item.inventoryItem && (
                                  <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm text-green-800">{item.inventoryItem.name}</div>
                                        <div className="text-xs text-green-600 mt-1">
                                          SKU: {item.inventoryItem.sku} • Category: {item.inventoryItem.category}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newItems = formData.items.map(i => 
                                            i.id === item.id ? {
                                              ...i,
                                              inventoryItemId: undefined,
                                              inventoryItem: undefined,
                                              description: '',
                                              unitPrice: 0,
                                              totalPrice: 0
                                            } : i
                                          );
                                          setFormData(prev => ({ ...prev, items: newItems }));
                                        }}
                                        className="text-red-500 hover:text-red-700 ml-2 p-1"
                                        title="Remove from inventory"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                <textarea
                                  placeholder={item.inventoryItem ? "Additional description (optional)..." : "Item description..."}
                                  value={item.description}
                                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                            </div>

                            {/* Account Selection */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Account
                              </label>
                              <select
                                value={item.accountCode || ''}
                                onChange={(e) => updateItem(item.id, { accountCode: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">Select an account</option>
                                {accounts.length > 0 ? (
                                  accounts.map(account => (
                                    <option key={account.id} value={account.code}>
                                      {account.code} - {account.name}
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <optgroup label="Revenue Accounts">
                                      <option value="4000">4000 - Sales Revenue</option>
                                      <option value="4100">4100 - Service Revenue</option>
                                      <option value="4200">4200 - Other Revenue</option>
                                    </optgroup>
                                    <optgroup label="Asset Accounts">
                                      <option value="1000">1000 - Cash</option>
                                      <option value="1100">1100 - Accounts Receivable</option>
                                      <option value="1200">1200 - Inventory</option>
                                    </optgroup>
                                    <optgroup label="Expense Accounts">
                                      <option value="5000">5000 - Cost of Goods Sold</option>
                                      <option value="5100">5100 - Operating Expenses</option>
                                      <option value="5200">5200 - Administrative Expenses</option>
                                    </optgroup>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Quantity, Rate, Tax, Total */}
                        <div className="lg:col-span-6">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Quantity */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>

                            {/* Unit Price */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Rate
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>

                            {/* Tax Rate */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Tax
                              </label>
                              <select
                                value={item.taxRateId || ''}
                                onChange={(e) => {
                                  const selectedTaxRate = taxRates.find(rate => rate.id === e.target.value);
                                  updateItem(item.id, { 
                                    taxRateId: e.target.value,
                                    taxRate: selectedTaxRate ? selectedTaxRate.rate : 0 
                                  });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">No Tax</option>
                                {taxRates.map(taxRate => (
                                  <option key={taxRate.id} value={taxRate.id}>
                                    {taxRate.name} ({taxRate.rate}%)
                                  </option>
                                ))}
                              </select>
                              {item.taxRate > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Tax Amount: {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: formData.currency,
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2
                                  }).format(item.totalPrice * item.taxRate / 100)}
                                </div>
                              )}
                            </div>

                            {/* Total Price Display */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Amount
                              </label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: formData.currency,
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                }).format(item.totalPrice)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Item Button - Always at bottom */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={addItem}
                      className="w-full lg:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add Another Item</span>
                    </button>
                    
                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => {
                          // Add multiple items at once
                          for (let i = 0; i < 3; i++) {
                            addItem();
                          }
                        }}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        + Add 3 Items
                      </button>
                      <button
                        onClick={() => {
                          // Clear all items and add one fresh
                          setFormData(prev => ({
                            ...prev,
                            items: [{
                              id: Date.now().toString(),
                              description: '',
                              quantity: 1,
                              unitPrice: 0,
                              taxRate: 0,
                              totalPrice: 0
                            }]
                          }));
                        }}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        🗑️ Clear All
                      </button>
                      <button
                        onClick={() => {
                          // Duplicate last item
                          const lastItem = formData.items[formData.items.length - 1];
                          if (lastItem) {
                            const newItem = {
                              ...lastItem,
                              id: Date.now().toString(),
                              description: lastItem.description + ' (Copy)',
                              totalPrice: lastItem.quantity * lastItem.unitPrice * (1 + lastItem.taxRate / 100)
                            };
                            setFormData(prev => ({
                              ...prev,
                              items: [...prev.items, newItem]
                            }));
                          }
                        }}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        📋 Duplicate Last
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Floating Add Button for Mobile */}
            {formData.items.length > 0 && (
              <div className="lg:hidden fixed bottom-20 right-4 z-20">
                <button
                  onClick={addItem}
                  className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="Add Item"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Details</h2>
            
            <div className="space-y-6">
              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Notes
                </label>
                <textarea
                  placeholder="Internal notes (will not appear on invoice)..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Terms & Conditions
                </label>
                <textarea
                  placeholder="Payment terms and conditions..."
                  value={formData.termsConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, termsConditions: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: formData.currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  }).format(calculateSubtotal())}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: formData.currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  }).format(calculateTotalTax())}
                </span>
              </div>

              {formData.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-medium">
                    -{new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: formData.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    }).format(
                      formData.discountType === 'percentage' 
                        ? calculateSubtotal() * formData.discountAmount / 100 
                        : formData.discountAmount
                    )}
                  </span>
                </div>
              )}

              {formData.shippingCharges > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: formData.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    }).format(formData.shippingCharges)}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-blue-600">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: formData.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    }).format(calculateGrandTotal())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Assist */}
          {renderAiAssistPanel()}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                <Eye className="h-4 w-4" />
                <span>Preview Invoice</span>
              </button>
              
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                <Calculator className="h-4 w-4" />
                <span>Add Discount</span>
              </button>
              
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                <Settings className="h-4 w-4" />
                <span>More Options</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
} 