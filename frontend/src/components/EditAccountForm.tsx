'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, AlertTriangle } from 'lucide-react';
import { ChartOfAccountsAPI, UpdateAccountData, Account } from '@/lib/chart-of-accounts-api';

interface EditAccountFormProps {
  account: Account;
  onSubmit: (data: UpdateAccountData) => Promise<void>;
  onCancel: () => void;
  formId?: string;
}

export default function EditAccountForm({ account, onSubmit, onCancel, formId }: EditAccountFormProps) {
  const [formData, setFormData] = useState<UpdateAccountData>({
    name: account.name,
    type: account.type,
    currency: account.currency,
    parentId: account.parentId,
    description: account.description,
    isActive: account.isActive,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<Account[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed = 
      formData.name !== account.name ||
      formData.type !== account.type ||
      formData.currency !== account.currency ||
      formData.parentId !== account.parentId ||
      formData.description !== account.description ||
      formData.isActive !== account.isActive;
    
    setHasChanges(changed);
  }, [formData, account]);

  // Load parent accounts when type changes
  useEffect(() => {
    if (formData.type) {
      loadParentAccounts();
    }
  }, [formData.type]);

  const loadParentAccounts = async () => {
    try {
      setIsLoadingParents(true);
      const response = await ChartOfAccountsAPI.getAccountsByType(formData.type!);
      // Filter out the current account and its children to prevent circular references
      const availableParents = response.accounts.filter(acc => 
        acc.id !== account.id && 
        !acc.parentId?.startsWith(account.id) // Basic check for descendants
      );
      setParentAccounts(availableParents);
    } catch (error) {
      console.error('Error loading parent accounts:', error);
    } finally {
      setIsLoadingParents(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Account name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Account name must be 100 characters or less';
    }

    if (!formData.type) {
      newErrors.type = 'Account type is required';
    }

    // Prevent circular parent reference
    if (formData.parentId === account.id) {
      newErrors.parentId = 'An account cannot be its own parent';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!hasChanges) {
      onCancel();
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error updating account:', error);
      // Handle specific API errors
      if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to update account. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit when form is valid and user presses Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (validateForm() && hasChanges) {
        handleSubmit(e as any);
      }
    }
  };

  const handleChange = (field: keyof UpdateAccountData, value: any) => {
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

      {/* Account Code (Read-only) */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
          Account Code
        </label>
        <input
          type="text"
          id="code"
          value={account.code}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
        />
        <p className="mt-1 text-xs text-gray-500">
          Account codes cannot be changed after creation
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
          value={formData.name || ''}
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
          value={formData.type || ''}
          onChange={(e) => handleChange('type', e.target.value as UpdateAccountData['type'])}
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
        {account.entriesCount && account.entriesCount > 0 && (
          <p className="mt-1 text-xs text-orange-600">
            ⚠️ This account has {account.entriesCount} transactions. Changing the type may affect reports.
          </p>
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
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.parentId ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          disabled={isLoadingParents}
        >
          <option value="">No Parent (Top Level Account)</option>
          {parentAccounts.map((parentAccount) => (
            <option key={parentAccount.id} value={parentAccount.id}>
              {parentAccount.code} - {parentAccount.name}
            </option>
          ))}
        </select>
        {errors.parentId && (
          <p className="mt-1 text-sm text-red-600">{errors.parentId}</p>
        )}
        {isLoadingParents && (
          <p className="mt-1 text-xs text-gray-500">Loading parent accounts...</p>
        )}
        {account.childrenCount && account.childrenCount > 0 && (
          <p className="mt-1 text-xs text-blue-600">
            ℹ️ This account has {account.childrenCount} sub-accounts
          </p>
        )}
      </div>

      {/* Currency */}
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
          Currency
        </label>
        <select
          id="currency"
          value={formData.currency || ''}
          onChange={(e) => handleChange('currency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="MMK">MMK - Myanmar Kyat</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="SGD">SGD - Singapore Dollar</option>
          <option value="THB">THB - Thai Baht</option>
        </select>
        {account.entriesCount && account.entriesCount > 0 && (
          <p className="mt-1 text-xs text-orange-600">
            ⚠️ Changing currency may affect existing transaction amounts
          </p>
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
            checked={formData.isActive ?? true}
            onChange={(e) => handleChange('isActive', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Account is active</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Inactive accounts won't appear in dropdowns for new transactions
        </p>
        {account.entriesCount && account.entriesCount > 0 && !formData.isActive && (
          <p className="mt-1 text-xs text-orange-600">
            ⚠️ Deactivating this account may affect {account.entriesCount} existing transactions
          </p>
        )}
      </div>

      {/* Current Balance Info */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Account Status</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Balance:</span>
            <span className="ml-2 font-medium">{ChartOfAccountsAPI.formatBalance(account.balance, account.currency)}</span>
          </div>
          <div>
            <span className="text-gray-500">Transactions:</span>
            <span className="ml-2 font-medium">{account.entriesCount || 0}</span>
          </div>
        </div>
      </div>


    </form>
  );
}