'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  CreditCard, 
  Banknote, 
  AlertCircle,
  CheckCircle,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface Bank {
  id?: string;
  name: string;
  type: string;
  accountNumber?: string;
  routingNumber?: string;
  bankName?: string;
  bankIdentifierCode?: string;
  currency: string;
  branch?: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
}

interface AddBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bank: Bank) => void;
  editingBank?: Bank | null;
}

const currencies = [
  { code: 'MMK', name: 'Myanmar Kyat' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'THB', name: 'Thai Baht' }
];

const branches = [
  'Head Office',
  'Yangon Branch',
  'Mandalay Branch',
  'Naypyidaw Branch',
  'Taunggyi Branch',
  'Mawlamyine Branch',
  'Pathein Branch',
  'Monywa Branch',
  'Meiktila Branch',
  'Myitkyina Branch'
];

const AddBankModal: React.FC<AddBankModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBank
}) => {
  const [formData, setFormData] = useState<Bank>({
    name: '',
    type: 'bank_transfer',
    accountNumber: '',
    routingNumber: '',
    bankName: '',
    bankIdentifierCode: '',
    currency: 'MMK',
    branch: '',
    description: '',
    isDefault: false,
    isActive: true
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  useEffect(() => {
    if (editingBank) {
      setFormData(editingBank);
    } else {
      setFormData({
        name: '',
        type: 'bank_transfer',
        accountNumber: '',
        routingNumber: '',
        bankName: '',
        bankIdentifierCode: '',
        currency: 'MMK',
        branch: '',
        description: '',
        isDefault: false,
        isActive: true
      });
    }
    setErrors({});
  }, [editingBank, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }

    if (formData.accountNumber && formData.accountNumber.trim() && formData.accountNumber.length < 4) {
      newErrors.accountNumber = 'Account number must be at least 4 characters';
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }

    if ((formData.type === 'bank_transfer' || formData.type === 'bank') && !formData.branch) {
      newErrors.branch = 'Branch is required for bank accounts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving bank account:', error);
      setErrors({ submit: 'Failed to save bank account. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Bank, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return 'xxxx' + accountNumber.slice(-4);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {formData.type === 'credit_card' ? (
                <CreditCard className="h-6 w-6 text-blue-600" />
              ) : (
                <Building2 className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBank ? 'Edit' : 'Add'} {formData.type === 'credit_card' ? 'Credit Card' : 'Bank Account'}
              </h2>
              <p className="text-sm text-gray-500">
                {editingBank ? 'Update bank account details' : 'Add a new bank account or credit card'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Account Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Account Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                formData.type === 'bank' 
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="bank_transfer"
                  checked={formData.type === 'bank_transfer'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">Bank Account</span>
                    <span className="block text-sm text-gray-500">Checking or savings account</span>
                  </div>
                </div>
                {formData.type === 'bank_transfer' && (
                  <CheckCircle className="absolute top-4 right-4 h-5 w-5 text-blue-600" />
                )}
              </label>

              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                formData.type === 'credit_card' 
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="credit_card"
                  checked={formData.type === 'credit_card'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">Credit Card</span>
                    <span className="block text-sm text-gray-500">Credit or debit card</span>
                  </div>
                </div>
                {formData.type === 'credit_card' && (
                  <CheckCircle className="absolute top-4 right-4 h-5 w-5 text-blue-600" />
                )}
              </label>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., A Bank Main Account"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showAccountNumber ? "text" : "password"}
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter account number"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showAccountNumber ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.accountNumber && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.accountNumber}
                </p>
              )}
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.type === 'credit_card' ? 'Card Issuer' : 'Bank Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bankName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={formData.type === 'credit_card' ? 'e.g., CB Bank' : 'e.g., A Bank'}
              />
              {errors.bankName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.bankName}
                </p>
              )}
            </div>

            {/* Bank Identifier Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.type === 'credit_card' ? 'Card Type' : 'Bank Identifier Code'}
              </label>
              <input
                type="text"
                value={formData.bankIdentifierCode || ''}
                onChange={(e) => handleInputChange('bankIdentifierCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={formData.type === 'credit_card' ? 'e.g., Visa, MasterCard' : 'e.g., SWIFT/IBAN code'}
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.currency ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              {errors.currency && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.currency}
                </p>
              )}
            </div>

            {/* Branch (only for bank accounts) */}
            {(formData.type === 'bank_transfer' || formData.type === 'bank') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.branch || ''}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.branch ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                {errors.branch && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.branch}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Note: Users can create transactions through this bank account only for the branches you select here.
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Max. 500 characters"
            />
            <p className="mt-1 text-xs text-gray-500">
              {(formData.description || '').length}/500 characters
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                Make this primary account
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active account
              </label>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-700">{errors.submit}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingBank ? 'Update' : 'Save'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBankModal; 