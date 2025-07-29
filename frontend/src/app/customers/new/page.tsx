'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { CustomerFormData as APICustomerFormData, CustomerAPI } from '@/lib/customer-api';

interface CustomerFormData {
  customerType: 'Business' | 'Individual';
  salutation: string;
  firstName: string;
  lastName: string;
  companyName: string;
  displayName: string;
  email: string;
  workPhone: string;
  mobile: string;
  
  // Address
  billingAttention: string;
  billingCountry: string;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingZipCode: string;
  
  shippingAttention: string;
  shippingCountry: string;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  
  // Other Details
  taxRate: string;
  companyId: string;
  currency: string;
  openingBalance: string;
  openingBalanceType: string;
  paymentTerms: string;
  enablePortal: boolean;
  portalLanguage: string;
  
  // Documents
  documents: File[];
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');
  const [copyBillingAddress, setCopyBillingAddress] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    customerType: 'Business',
    salutation: '',
    firstName: '',
    lastName: '',
    companyName: '',
    displayName: '',
    email: '',
    workPhone: '',
    mobile: '',
    
    billingAttention: '',
    billingCountry: '',
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingState: '',
    billingZipCode: '',
    
    shippingAttention: '',
    shippingCountry: '',
    shippingAddress1: '',
    shippingAddress2: '',
    shippingCity: '',
    shippingState: '',
    shippingZipCode: '',
    
    taxRate: '',
    companyId: '',
    currency: 'MMK',
    openingBalance: '',
    openingBalanceType: 'Head Office',
    paymentTerms: 'Due on Receipt',
    enablePortal: false,
    portalLanguage: 'English',
    
    documents: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const handleInputChange = (field: keyof CustomerFormData, value: string | boolean | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCopyBillingAddress = (checked: boolean) => {
    setCopyBillingAddress(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        shippingAttention: prev.billingAttention,
        shippingCountry: prev.billingCountry,
        shippingAddress1: prev.billingAddress1,
        shippingAddress2: prev.billingAddress2,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingZipCode: prev.billingZipCode
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    // Email validation (optional but if provided, must be valid)
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Business customer validation
    if (formData.customerType === 'Business' && !formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required for business customers';
    }

    // Phone validation (optional but if provided, should be reasonable)
    if (formData.workPhone.trim() && formData.workPhone.length < 5) {
      newErrors.workPhone = 'Phone number should be at least 5 characters';
    }

    if (formData.mobile.trim() && formData.mobile.length < 5) {
      newErrors.mobile = 'Mobile number should be at least 5 characters';
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
    setSubmitError('');

    try {
      // Convert local form data to API format
      const apiData: APICustomerFormData = {
        customerType: formData.customerType,
        salutation: formData.salutation,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        displayName: formData.displayName,
        email: formData.email,
        workPhone: formData.workPhone,
        mobile: formData.mobile,
        billingAttention: formData.billingAttention,
        billingCountry: formData.billingCountry,
        billingAddress1: formData.billingAddress1,
        billingAddress2: formData.billingAddress2,
        billingCity: formData.billingCity,
        billingState: formData.billingState,
        billingZipCode: formData.billingZipCode,
        shippingAttention: formData.shippingAttention,
        shippingCountry: formData.shippingCountry,
        shippingAddress1: formData.shippingAddress1,
        shippingAddress2: formData.shippingAddress2,
        shippingCity: formData.shippingCity,
        shippingState: formData.shippingState,
        shippingZipCode: formData.shippingZipCode,
        taxRate: formData.taxRate,
        companyId: formData.companyId,
        currency: formData.currency,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        openingBalanceType: formData.openingBalanceType,
        paymentTerms: formData.paymentTerms,
        enablePortal: formData.enablePortal,
        portalLanguage: formData.portalLanguage
      };

      await CustomerAPI.createCustomer(apiData);
      console.log('✅ Customer created successfully');
      router.push('/customers');
    } catch (error: any) {
      console.error('❌ Failed to create customer:', error);
      
      // Set error message for user
      if (error.response?.data?.error) {
        setSubmitError(error.response.data.error);
      } else if (error.response?.data?.details) {
        setSubmitError(error.response.data.details);
      } else {
        setSubmitError('Failed to create customer. Please check your input and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...newFiles]
      }));
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6 p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">New Customer</h1>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{submitError}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center text-gray-900">
                  <input
                    type="radio"
                    value="Business"
                    checked={formData.customerType === 'Business'}
                    onChange={(e) => handleInputChange('customerType', e.target.value as 'Business' | 'Individual')}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  Business
                </label>
                <label className="flex items-center text-gray-900">
                  <input
                    type="radio"
                    value="Individual"
                    checked={formData.customerType === 'Individual'}
                    onChange={(e) => handleInputChange('customerType', e.target.value as 'Business' | 'Individual')}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  Individual
                </label>
              </div>
            </div>

            {/* Primary Contact */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Primary Contact</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={formData.salutation}
                  onChange={(e) => handleInputChange('salutation', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Salutation</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Dr.">Dr.</option>
                </select>
                <input
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500 ${
                  errors.companyName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter company name"
              />
              {errors.companyName && (
                <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Display Name <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                  errors.displayName ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select or type to add</option>
                {formData.companyName && <option value={formData.companyName}>{formData.companyName}</option>}
                {formData.firstName && formData.lastName && (
                  <option value={`${formData.firstName} ${formData.lastName}`}>
                    {formData.firstName} {formData.lastName}
                  </option>
                )}
              </select>
              {errors.displayName && (
                <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Phone</label>
                <input
                  type="tel"
                  placeholder="Work Phone"
                  value={formData.workPhone}
                  onChange={(e) => handleInputChange('workPhone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">&nbsp;</label>
                <input
                  type="tel"
                  placeholder="Mobile"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'details', label: 'Other Details' },
                { id: 'address', label: 'Address' },
                { id: 'contact', label: 'Contact Persons' },
                { id: 'custom', label: 'Custom Fields' },
                { id: 'reporting', label: 'Reporting Tags' },
                { id: 'remarks', label: 'Remarks' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Other Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Rate</label>
                    <select
                      value={formData.taxRate}
                      onChange={(e) => handleInputChange('taxRate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">Select a Tax</option>
                      <option value="standard">Standard Rate (5%)</option>
                      <option value="reduced">Reduced Rate (0%)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      To associate more than one tax, you need to create a tax group in Settings.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Company ID</label>
                    <input
                      type="text"
                      value={formData.companyId}
                      onChange={(e) => handleInputChange('companyId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="Enter company ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="MMK">MMK - Burmese Kyat</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Opening Balance</label>
                    <div className="flex space-x-2">
                      <select
                        value={formData.openingBalanceType}
                        onChange={(e) => handleInputChange('openingBalanceType', e.target.value)}
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      >
                        <option value="Head Office">Head Office</option>
                        <option value="Branch">Branch</option>
                      </select>
                      <input
                        type="number"
                        value={formData.openingBalance}
                        onChange={(e) => handleInputChange('openingBalance', e.target.value)}
                        placeholder="MMK"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Terms</label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Portal Language</label>
                    <select
                      value={formData.portalLanguage}
                      onChange={(e) => handleInputChange('portalLanguage', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="English">English</option>
                      <option value="Myanmar">Myanmar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enablePortal}
                      onChange={(e) => handleInputChange('enablePortal', e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">Allow portal access for this customer</span>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Documents</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 mb-2">
                      <label className="cursor-pointer text-blue-600 hover:text-blue-800">
                        Upload File
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      You can upload a maximum of 10 files, 10MB each
                    </p>
                  </div>
                  
                  {formData.documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.documents.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Billing Address */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Attention</label>
                        <input
                          type="text"
                          value={formData.billingAttention}
                          onChange={(e) => handleInputChange('billingAttention', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Country/Region</label>
                        <select
                          value={formData.billingCountry}
                          onChange={(e) => handleInputChange('billingCountry', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select or type to add</option>
                          <option value="Myanmar">Myanmar</option>
                          <option value="Thailand">Thailand</option>
                          <option value="Singapore">Singapore</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
                        <textarea
                          placeholder="Street 1"
                          value={formData.billingAddress1}
                          onChange={(e) => handleInputChange('billingAddress1', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                        <textarea
                          placeholder="Street 2"
                          value={formData.billingAddress2}
                          onChange={(e) => handleInputChange('billingAddress2', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
                          <input
                            type="text"
                            value={formData.billingCity}
                            onChange={(e) => handleInputChange('billingCity', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">State</label>
                          <select
                            value={formData.billingState}
                            onChange={(e) => handleInputChange('billingState', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select or type to add</option>
                            <option value="Yangon">Yangon</option>
                            <option value="Mandalay">Mandalay</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">ZIP Code</label>
                        <input
                          type="text"
                          value={formData.billingZipCode}
                          onChange={(e) => handleInputChange('billingZipCode', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Shipping Address</h3>
                      <label className="flex items-center text-blue-600 text-sm">
                        <input
                          type="checkbox"
                          checked={copyBillingAddress}
                          onChange={(e) => handleCopyBillingAddress(e.target.checked)}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Copy billing address
                      </label>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Attention</label>
                        <input
                          type="text"
                          value={formData.shippingAttention}
                          onChange={(e) => handleInputChange('shippingAttention', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Country/Region</label>
                        <select
                          value={formData.shippingCountry}
                          onChange={(e) => handleInputChange('shippingCountry', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select or type to add</option>
                          <option value="Myanmar">Myanmar</option>
                          <option value="Thailand">Thailand</option>
                          <option value="Singapore">Singapore</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
                        <textarea
                          placeholder="Street 1"
                          value={formData.shippingAddress1}
                          onChange={(e) => handleInputChange('shippingAddress1', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                        <textarea
                          placeholder="Street 2"
                          value={formData.shippingAddress2}
                          onChange={(e) => handleInputChange('shippingAddress2', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
                          <input
                            type="text"
                            value={formData.shippingCity}
                            onChange={(e) => handleInputChange('shippingCity', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">State</label>
                          <select
                            value={formData.shippingState}
                            onChange={(e) => handleInputChange('shippingState', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select or type to add</option>
                            <option value="Yangon">Yangon</option>
                            <option value="Mandalay">Mandalay</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">ZIP Code</label>
                        <input
                          type="text"
                          value={formData.shippingZipCode}
                          onChange={(e) => handleInputChange('shippingZipCode', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs placeholder */}
            {['contact', 'custom', 'reporting', 'remarks'].includes(activeTab) && (
              <div className="text-center py-12 text-gray-500">
                <p>{activeTab === 'contact' && 'Contact Persons management coming soon'}
                {activeTab === 'custom' && 'Custom Fields coming soon'}
                {activeTab === 'reporting' && 'Reporting Tags coming soon'}
                {activeTab === 'remarks' && 'Remarks section coming soon'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isSubmitting 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
} 