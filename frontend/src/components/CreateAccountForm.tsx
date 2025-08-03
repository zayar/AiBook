'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, AlertTriangle } from 'lucide-react';
import { ChartOfAccountsAPI, CreateAccountData, Account } from '@/lib/chart-of-accounts-api';

interface CreateAccountFormProps {
  onSubmit: (data: CreateAccountData) => Promise<void>;
  onCancel: () => void;
  formId?: string;
}

export default function CreateAccountForm({ onSubmit, onCancel, formId }: CreateAccountFormProps) {
  const [formData, setFormData] = useState<CreateAccountData>({
    code: '',
    name: '',
    type: 'ASSET',
    currency: 'MMK',
    description: '',
    isActive: true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<Account[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);

  // Load parent accounts when type changes
  useEffect(() => {
    loadParentAccounts();
  }, [formData.type]);

  const loadParentAccounts = async () => {
    try {
      setIsLoadingParents(true);
      const response = await ChartOfAccountsAPI.getAccountsByType(formData.type);
      setParentAccounts(response.accounts);
    } catch (error) {
      console.error('Error loading parent accounts:', error);
    } finally {
      setIsLoadingParents(false);
    }
  };

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

  const accountTypes = [
    { value: 'ASSET', label: 'Asset', icon: '💰', description: 'Resources owned by the company' },
    { value: 'LIABILITY', label: 'Liability', icon: '📋', description: 'Debts and obligations' },
    { value: 'EQUITY', label: 'Equity', icon: '🏛️', description: 'Owner\'s equity and capital' },
    { value: 'REVENUE', label: 'Revenue', icon: '📈', description: 'Income and sales' },
    { value: 'EXPENSE', label: 'Expense', icon: '📊', description: 'Costs and expenses' },
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
          {accountTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label} - {type.description}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type}</p>
        )}
      </div>

      {/* Parent Account */}
      <div>
        <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-2">
          Parent Account (Optional)
        </label>
        <select
          id="parentId"
          value={formData.parentId || ''}
          onChange={(e) => handleChange('parentId', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoadingParents}
        >
          <option value="">No Parent (Top Level Account)</option>
          {parentAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
        {isLoadingParents && (
          <p className="mt-1 text-xs text-gray-500">Loading parent accounts...</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Create sub-accounts by selecting a parent account of the same type
        </p>
      </div>

      {/* Currency */}
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
          Currency
        </label>
        <select
          id="currency"
          value={formData.currency}
          onChange={(e) => handleChange('currency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="MMK">MMK - Myanmar Kyat</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="SGD">SGD - Singapore Dollar</option>
          <option value="THB">THB - Thai Baht</option>
        </select>
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