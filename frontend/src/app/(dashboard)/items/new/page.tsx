'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, X, Lightbulb, Wand2, TrendingUp, 
  Brain, AlertCircle, Package, DollarSign, BarChart3, 
  Target, Sparkles, Calculator, Zap 
} from 'lucide-react';

// Types
interface ItemFormData {
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  unitCost: number;
  unitPrice: number;
  quantityOnHand: number;
  reorderLevel: number;
  reorderQuantity: number;
  assetAccountId: string;
  cogsAccountId: string;
  isActive: boolean;
}

interface Account {
  id: string;
  name: string;
  code: string;
}

interface AISuggestion {
  type: 'sku' | 'category' | 'pricing' | 'optimization';
  suggestion: any;
  confidence: number;
  reasoning: string;
}

const NewItemPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<ItemFormData>({
    sku: '',
    name: '',
    description: '',
    category: '',
    unitOfMeasure: 'each',
    unitCost: 0,
    unitPrice: 0,
    quantityOnHand: 0,
    reorderLevel: 10,
    reorderQuantity: 50,
    assetAccountId: '',
    cogsAccountId: '',
    isActive: true,
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiAssistActive, setAiAssistActive] = useState(true);
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());

  // Common categories
  const commonCategories = [
    'Office Supplies', 'Technology', 'Software', 'Hardware', 'Services',
    'Consulting', 'Marketing', 'Equipment', 'Furniture', 'Inventory',
    'Raw Materials', 'Finished Goods', 'Maintenance', 'Utilities'
  ];

  // Common units of measure
  const unitOfMeasureOptions = [
    'each', 'piece', 'unit', 'box', 'case', 'pack', 'bottle', 'bag',
    'kg', 'gram', 'pound', 'ounce', 'liter', 'gallon', 'meter', 'foot',
    'hour', 'day', 'month', 'year', 'license', 'subscription'
  ];

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Auto-generate SKU when name changes (if AI assist is active)
  useEffect(() => {
    if (aiAssistActive && formData.name && !formData.sku) {
      generateSmartSKU();
    }
  }, [formData.name, aiAssistActive]);

  // Auto-suggest category when name/description changes
  useEffect(() => {
    if (aiAssistActive && formData.name && !formData.category) {
      suggestCategory();
    }
  }, [formData.name, formData.description, aiAssistActive]);

  // Auto-suggest pricing when cost is entered (only if price is still 0 and not user-edited)
  useEffect(() => {
    if (aiAssistActive && formData.unitCost > 0 && formData.unitPrice === 0 && !userEditedFields.has('unitPrice')) {
      // Add a small delay to prevent conflicts with user input
      const timer = setTimeout(() => {
        if (formData.unitPrice === 0 && !userEditedFields.has('unitPrice')) { // Check again after delay
          suggestPricing();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.unitCost, aiAssistActive, userEditedFields]);

  const loadAccounts = async () => {
    try {
      const tenantId = (typeof window !== 'undefined' && (localStorage.getItem('tenantId') || 'default')) || 'default';
      const token = (typeof window !== 'undefined' && (localStorage.getItem('authToken') || localStorage.getItem('token'))) || undefined;
      const response = await fetch(`/api/v1/accounts`, {
        headers: {
          'x-tenant-id': tenantId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const accountsList = data.accounts || [];
        setAccounts(accountsList);
        
        // Auto-select default accounts if available
        const assetAccount = accountsList.find((acc: Account) => 
          acc.name.toLowerCase().includes('inventory') || 
          acc.name.toLowerCase().includes('asset')
        );
        const cogsAccount = accountsList.find((acc: Account) => 
          acc.name.toLowerCase().includes('cogs') || 
          acc.name.toLowerCase().includes('cost of goods')
        );
        
        if (assetAccount) {
          setFormData(prev => ({ ...prev, assetAccountId: assetAccount.id }));
        }
        if (cogsAccount) {
          setFormData(prev => ({ ...prev, cogsAccountId: cogsAccount.id }));
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  // AI Assistant Functions
  const handleAIAssist = async (action: string, data: any) => {
    try {
      setAiLoading(true);
      const tenantId = (typeof window !== 'undefined' && (localStorage.getItem('tenantId') || 'default')) || 'default';
      const token = (typeof window !== 'undefined' && (localStorage.getItem('authToken') || localStorage.getItem('token'))) || undefined;
      const response = await fetch(`/api/v1/items/ai-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, data }),
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error('AI assistance error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const generateSmartSKU = async () => {
    // Don't override if user has manually edited the SKU
    if (userEditedFields.has('sku')) {
      return;
    }
    
    const result = await handleAIAssist('generate_sku', {
      name: formData.name,
      category: formData.category,
    });
    
    if (result?.sku && !userEditedFields.has('sku')) {
      setFormData(prev => ({ ...prev, sku: result.sku }));
      addAISuggestion({
        type: 'sku',
        suggestion: result.sku,
        confidence: 85,
        reasoning: 'AI-generated SKU based on product name and category'
      });
    }
  };

  const suggestCategory = async () => {
    // Don't override if user has manually edited the category
    if (userEditedFields.has('category')) {
      return;
    }
    
    const result = await handleAIAssist('suggest_category', {
      name: formData.name,
      description: formData.description,
    });
    
    if (result?.category && !userEditedFields.has('category')) {
      setFormData(prev => ({ ...prev, category: result.category }));
      addAISuggestion({
        type: 'category',
        suggestion: result.category,
        confidence: 90,
        reasoning: 'AI-suggested category based on product details'
      });
    }
  };

  const suggestPricing = async () => {
    // Don't suggest pricing if user has manually edited the price
    if (userEditedFields.has('unitPrice') || formData.unitPrice > 0) {
      return;
    }
    
    const result = await handleAIAssist('suggest_pricing', {
      name: formData.name,
      category: formData.category,
      unitCost: formData.unitCost,
    });
    
    if (result?.suggestedPrice && !userEditedFields.has('unitPrice') && formData.unitPrice === 0) {
      setFormData(prev => ({ ...prev, unitPrice: result.suggestedPrice }));
      addAISuggestion({
        type: 'pricing',
        suggestion: result,
        confidence: 75,
        reasoning: result.reasoning || 'AI-optimized pricing based on cost and market data'
      });
    }
  };

  const optimizeReorderLevels = async () => {
    const result = await handleAIAssist('reorder_optimization', formData);
    
    if (result?.suggestedReorderLevel) {
      setFormData(prev => ({
        ...prev,
        reorderLevel: result.suggestedReorderLevel,
        reorderQuantity: result.suggestedReorderQuantity || prev.reorderQuantity,
      }));
      addAISuggestion({
        type: 'optimization',
        suggestion: result,
        confidence: 80,
        reasoning: result.reasoning || 'AI-optimized reorder levels for inventory management'
      });
    }
  };

  const addAISuggestion = (suggestion: AISuggestion) => {
    setAiSuggestions(prev => [suggestion, ...prev.slice(0, 4)]); // Keep last 5 suggestions
  };

  // Form handling
  const handleInputChange = (field: keyof ItemFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark this field as user-edited to prevent AI from overriding it
    setUserEditedFields(prev => new Set(prev).add(field));
    
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (formData.unitCost < 0) newErrors.unitCost = 'Unit cost must be positive';
    if (formData.unitPrice < 0) newErrors.unitPrice = 'Unit price must be positive';
    if (formData.quantityOnHand < 0) newErrors.quantityOnHand = 'Quantity must be positive';
    if (!formData.assetAccountId) newErrors.assetAccountId = 'Asset account is required';
    if (!formData.cogsAccountId) newErrors.cogsAccountId = 'COGS account is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const tenantId = (typeof window !== 'undefined' && (localStorage.getItem('tenantId') || 'default')) || 'default';
      const token = (typeof window !== 'undefined' && (localStorage.getItem('authToken') || localStorage.getItem('token'))) || undefined;
      const response = await fetch(`/api/v1/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const item = await response.json();
        // Redirect to items list instead of view page
        router.push('/items');
      } else {
        const error = await response.json();
        console.error('Error creating item:', error);
        setErrors({ general: error.error || 'Failed to create item' });
      }
    } catch (error) {
      console.error('Error creating item:', error);
      setErrors({ general: 'Failed to create item' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate profit margin
  const profitMargin = formData.unitPrice > 0 ? 
    ((formData.unitPrice - formData.unitCost) / formData.unitPrice * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/items"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Add New Item</h1>
                <p className="text-gray-600">Create a new inventory item with AI assistance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* AI Assist Toggle */}
              <button
                onClick={() => setAiAssistActive(!aiAssistActive)}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center ${
                  aiAssistActive 
                    ? 'bg-purple-50 border-purple-200 text-purple-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Assist {aiAssistActive ? 'ON' : 'OFF'}
              </button>

              {/* AI Panel Toggle */}
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                AI Insights
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Form */}
        <div className={`flex-1 p-6 ${showAIPanel ? 'pr-80' : ''}`}>
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              
              {/* General Error */}
              {errors.general && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-red-700">{errors.general}</span>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-8">
                
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 text-blue-600 mr-2" />
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* Item Name */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter item name"
                      />
                      {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SKU *
                        {aiAssistActive && (
                          <button
                            type="button"
                            onClick={generateSmartSKU}
                            className="ml-2 text-purple-600 hover:text-purple-700"
                            disabled={aiLoading}
                          >
                            <Wand2 className="h-4 w-4 inline" />
                          </button>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => handleInputChange('sku', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.sku ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter SKU"
                      />
                      {errors.sku && <p className="text-red-600 text-sm mt-1">{errors.sku}</p>}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                        {aiAssistActive && (
                          <button
                            type="button"
                            onClick={suggestCategory}
                            className="ml-2 text-purple-600 hover:text-purple-700"
                            disabled={aiLoading}
                          >
                            <Sparkles className="h-4 w-4 inline" />
                          </button>
                        )}
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.category ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select category</option>
                        {commonCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter item description"
                      />
                    </div>

                    {/* Unit of Measure */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit of Measure
                      </label>
                      <select
                        value={formData.unitOfMeasure}
                        onChange={(e) => handleInputChange('unitOfMeasure', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {unitOfMeasureOptions.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                    Pricing Information
                    {aiAssistActive && (
                      <button
                        type="button"
                        onClick={suggestPricing}
                        className="ml-2 text-purple-600 hover:text-purple-700"
                        disabled={aiLoading}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </button>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-6">
                    {/* Unit Cost */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Cost *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.unitCost.toString()}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleInputChange('unitCost', isNaN(value) ? 0 : value);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.unitCost ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.unitCost && <p className="text-red-600 text-sm mt-1">{errors.unitCost}</p>}
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.unitPrice.toString()}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleInputChange('unitPrice', isNaN(value) ? 0 : value);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.unitPrice ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.unitPrice && <p className="text-red-600 text-sm mt-1">{errors.unitPrice}</p>}
                    </div>

                    {/* Profit Margin */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profit Margin
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                        <span className={`font-medium ${
                          profitMargin >= 30 ? 'text-green-600' : 
                          profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Management */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
                    Inventory Management
                    {aiAssistActive && (
                      <button
                        type="button"
                        onClick={optimizeReorderLevels}
                        className="ml-2 text-purple-600 hover:text-purple-700"
                        disabled={aiLoading}
                      >
                        <Target className="h-4 w-4" />
                      </button>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-6">
                    {/* Quantity on Hand */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity on Hand
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.quantityOnHand.toString()}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          handleInputChange('quantityOnHand', isNaN(value) ? 0 : value);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.quantityOnHand ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                      {errors.quantityOnHand && <p className="text-red-600 text-sm mt-1">{errors.quantityOnHand}</p>}
                    </div>

                    {/* Reorder Level */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reorder Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.reorderLevel}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          handleInputChange('reorderLevel', isNaN(value) ? 0 : value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>

                    {/* Reorder Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reorder Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.reorderQuantity}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          handleInputChange('reorderQuantity', isNaN(value) ? 0 : value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Accounting Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                    Accounting Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* Asset Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Asset Account *
                      </label>
                      <select
                        value={formData.assetAccountId}
                        onChange={(e) => handleInputChange('assetAccountId', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.assetAccountId ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select asset account</option>
                        {accounts && accounts.length > 0 ? accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        )) : (
                          <option value="" disabled>Loading accounts...</option>
                        )}
                      </select>
                      {errors.assetAccountId && <p className="text-red-600 text-sm mt-1">{errors.assetAccountId}</p>}
                    </div>

                    {/* COGS Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        COGS Account *
                      </label>
                      <select
                        value={formData.cogsAccountId}
                        onChange={(e) => handleInputChange('cogsAccountId', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.cogsAccountId ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select COGS account</option>
                        {accounts && accounts.length > 0 ? accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        )) : (
                          <option value="" disabled>Loading accounts...</option>
                        )}
                      </select>
                      {errors.cogsAccountId && <p className="text-red-600 text-sm mt-1">{errors.cogsAccountId}</p>}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Item is active</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <Link
                  href="/items"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Link>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* AI Insights Panel */}
        {showAIPanel && (
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Brain className="h-5 w-5 text-purple-600 mr-2" />
                  AI Insights
                </h3>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* AI Suggestions */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                  Recent Suggestions
                </h4>
                
                {aiSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {aiSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800 capitalize">
                            {suggestion.type}
                          </span>
                          <span className="text-xs text-blue-600">
                            {suggestion.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-blue-700">{suggestion.reasoning}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Zap className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      AI suggestions will appear here as you fill out the form
                    </p>
                  </div>
                )}

                {/* Quick AI Actions */}
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Quick Actions</h5>
                  <div className="space-y-2">
                    <button
                      onClick={generateSmartSKU}
                      disabled={aiLoading}
                      className="w-full px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Wand2 className="h-4 w-4 inline mr-2 text-purple-600" />
                      Generate Smart SKU
                    </button>
                    
                    <button
                      onClick={suggestCategory}
                      disabled={aiLoading}
                      className="w-full px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4 inline mr-2 text-blue-600" />
                      Suggest Category
                    </button>
                    
                    <button
                      onClick={suggestPricing}
                      disabled={aiLoading}
                      className="w-full px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <TrendingUp className="h-4 w-4 inline mr-2 text-green-600" />
                      Optimize Pricing
                    </button>
                    
                    <button
                      onClick={optimizeReorderLevels}
                      disabled={aiLoading}
                      className="w-full px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Target className="h-4 w-4 inline mr-2 text-orange-600" />
                      Optimize Inventory
                    </button>
                  </div>
                </div>

                {/* Form Statistics */}
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Form Progress</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completion:</span>
                      <span className="font-medium">
                        {Math.round(
                          (Object.values(formData).filter(v => v !== '' && v !== 0).length / 
                           Object.keys(formData).length) * 100
                        )}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profit Margin:</span>
                      <span className={`font-medium ${
                        profitMargin >= 30 ? 'text-green-600' : 
                        profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewItemPage; 