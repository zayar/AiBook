'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, AlertTriangle } from 'lucide-react';
import { ChartOfAccountsAPI, CreateAccountData, Account } from '@/lib/chart-of-accounts-api';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CreateAccountFormProps {
  onSubmit: (data: CreateAccountData) => Promise<void>;
  onCancel: () => void;
  formId?: string;
}

export default function CreateAccountForm({ onSubmit, onCancel, formId }: CreateAccountFormProps) {
  const { baseCurrency } = useCurrency();
  
  const [formData, setFormData] = useState<CreateAccountData>({
    code: '',
    name: '',
    type: 'OTHER_ASSET',
    description: '',
    isActive: true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.code.trim()) {
      newErrors.code = 'Account code is required';
    } else if (formData.code.length > 10) {
      newErrors.code = 'Account code must be 10 characters or less';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Account name must be 100 characters or less';
    }

    if (!formData.type) {
      newErrors.type = 'Account type is required';
    }

    // Code format validation (simple alphanumeric check)
    if (formData.code && !/^[A-Za-z0-9-_]+$/.test(formData.code)) {
      newErrors.code = 'Account code can only contain letters, numbers, hyphens, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating account:', error);
      // Handle specific API errors
      if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to create account. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit when form is valid and user presses Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (validateForm()) {
        handleSubmit(e as any);
      }
    }
  };

  const handleChange = (field: keyof CreateAccountData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const accountTypeHierarchy = [
    {
      category: 'ASSET',
      label: 'Asset',
      icon: '💰',
      disabled: true,
      children: [
        { value: 'OTHER_ASSET', label: 'Other Asset' },
        { value: 'OTHER_CURRENT_ASSET', label: 'Other Current Asset' },
        { value: 'CASH', label: 'Cash' },
        { value: 'BANK', label: 'Bank' },
        { value: 'FIXED_ASSET', label: 'Fixed Asset' },
        { value: 'ACCOUNTS_RECEIVABLE', label: 'Accounts Receivable' },
        { value: 'STOCK', label: 'Stock' },
        { value: 'PAYMENT_CLEARING_ACCOUNT', label: 'Payment Clearing Account' },
        { value: 'INPUT_TAX', label: 'Input Tax' },
        { value: 'INTANGIBLE_ASSET', label: 'Intangible Asset' },
        { value: 'NON_CURRENT_ASSET', label: 'Non Current Asset' },
        { value: 'DEFERRED_TAX_ASSET', label: 'Deferred Tax Asset' },
      ]
    },
    {
      category: 'LIABILITY',
      label: 'Liability',
      icon: '📋',
      disabled: true,
      children: [
        { value: 'OTHER_CURRENT_LIABILITY', label: 'Other Current Liability' },
        { value: 'CREDIT_CARD', label: 'Credit Card' },
        { value: 'NON_CURRENT_LIABILITY', label: 'Non Current Liability' },
        { value: 'OTHER_LIABILITY', label: 'Other Liability' },
        { value: 'ACCOUNTS_PAYABLE', label: 'Accounts Payable' },
        { value: 'OVERSEAS_TAX_PAYABLE', label: 'Overseas Tax Payable' },
        { value: 'OUTPUT_TAX', label: 'Output Tax' },
        { value: 'DEFERRED_TAX_LIABILITY', label: 'Deferred Tax Liability' },
      ]
    },
    {
      category: 'EQUITY',
      label: 'Equity',
      icon: '🏛️',
      disabled: true,
      children: [
        { value: 'EQUITY', label: 'Equity' },
      ]
    },
    {
      category: 'INCOME',
      label: 'Income',
      icon: '📈',
      disabled: true,
      children: [
        { value: 'INCOME', label: 'Income' },
        { value: 'OTHER_INCOME', label: 'Other Income' },
      ]
    },
    {
      category: 'EXPENSE',
      label: 'Expense',
      icon: '📊',
      disabled: true,
      children: [
        { value: 'EXPENSE', label: 'Expense' },
        { value: 'COST_OF_GOODS_SOLD', label: 'Cost Of Goods Sold' },
        { value: 'OTHER_EXPENSE', label: 'Other Expense' },
      ]
    }
  ];

  return (
    <form id={formId} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 text-sm">{errors.general}</span>
        </div>
      )}

      {/* Account Code */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
          Account Code *
        </label>
        <input
          type="text"
          id="code"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.code ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          placeholder="e.g., 1000, CASH, SALES"
          maxLength={10}
        />
        {errors.code && (
          <p className="mt-1 text-sm text-red-600">{errors.code}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Unique identifier for the account (max 10 characters)
        </p>
      </div>

      {/* Account Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Account Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          placeholder="e.g., Cash on Hand, Accounts Receivable, Sales Revenue"
          maxLength={100}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Account Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Account Type *
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value as CreateAccountData['type'])}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.type ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        >
          <option value="">Select Account Type</option>
          {accountTypeHierarchy.map((category) => (
            <optgroup key={category.category} label={`${category.icon} ${category.label}`}>
              {category.children.map((subType) => (
                <option key={subType.value} value={subType.value}>
                  {subType.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type}</p>
        )}
      </div>



      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe the purpose of this account..."
          maxLength={500}
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Account is active</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Inactive accounts won't appear in dropdowns for new transactions
        </p>
      </div>


    </form>
  );
}