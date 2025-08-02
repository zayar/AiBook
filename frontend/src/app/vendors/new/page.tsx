'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  User,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  Plus,
  Trash2,
  Copy,
  Upload,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { vendorApi, CreateVendorData, VendorContactPerson, VendorAddress } from '../../../lib/vendor-api';

interface FormErrors {
  [key: string]: string;
}

export default function NewVendorPage() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<CreateVendorData>({
    name: '',
    displayName: '',
    email: '',
    phone: '',
    website: '',
    primaryContact: {
      salutation: '',
      firstName: '',
      lastName: '',
      workPhone: '',
      mobile: '',
    },
    companyId: '',
    taxRate: '',
    currency: 'MMK',
    paymentTerms: 'DUE_ON_RECEIPT',
    openingBalance: 0,
    enablePortal: false,
    portalLanguage: 'English',
    billingAddress: {
      attention: '',
      country: '',
      address: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      fax: '',
    },
    shippingAddress: {
      attention: '',
      country: '',
      address: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      fax: '',
    },
    taxId: '',
    contactPersons: [],
    remarks: '',
  });

  // UI state
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const [copyBillingToShipping, setCopyBillingToShipping] = useState(false);

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle nested object changes
  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof CreateVendorData] as any,
        [field]: value,
      },
    }));
  };

  // Handle contact persons
  const addContactPerson = () => {
    const newContact: Omit<VendorContactPerson, 'id'> = {
      salutation: '',
      firstName: '',
      lastName: '',
      email: '',
      workPhone: '',
      mobile: '',
      department: '',
      designation: '',
      isPrimary: false,
    };
    
    setFormData(prev => ({
      ...prev,
      contactPersons: [...(prev.contactPersons || []), newContact],
    }));
  };

  const updateContactPerson = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contactPersons: prev.contactPersons?.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      ) || [],
    }));
  };

  const removeContactPerson = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactPersons: prev.contactPersons?.filter((_, i) => i !== index) || [],
    }));
  };

  // Copy billing address to shipping address
  const handleCopyBillingToShipping = () => {
    if (copyBillingToShipping) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: { ...prev.billingAddress },
      }));
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Vendor name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., user@domain.com)';
    }

    if (formData.website && formData.website !== '' && !formData.website.startsWith('http')) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    // Validate contact person emails
    if (formData.contactPersons) {
      formData.contactPersons.forEach((contact, index) => {
        if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email)) {
          newErrors[`contactPersons.${index}.email`] = 'Please enter a valid email address (e.g., user@domain.com)';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});


      await vendorApi.createVendor(formData);
      setSuccess(true);
      
      // Redirect to vendors list after success
      setTimeout(() => {
        router.push('/vendors');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vendor';
      
      // Parse validation errors and set field-specific errors
      if (errorMessage.includes('Validation failed:')) {
        const validationErrors: FormErrors = {};
        const errorDetails = errorMessage.replace('Validation failed: ', '');
        const errors = errorDetails.split(', ');
        
        errors.forEach(error => {
          const [field, message] = error.split(': ');
          if (field && message) {
            // Map field names to form fields
            const fieldMap: { [key: string]: string } = {
              'name': 'name',
              'email': 'email',
              'phone': 'phone',
              'website': 'website',
              'primaryContact.firstName': 'primaryContact.firstName',
              'primaryContact.lastName': 'primaryContact.lastName',
              'primaryContact.email': 'primaryContact.email',
              'contactPersons.0.firstName': 'contactPersons.0.firstName',
              'contactPersons.0.lastName': 'contactPersons.0.lastName',
              'contactPersons.0.email': 'contactPersons.0.email',
            };
            
            const mappedField = fieldMap[field] || field;
            validationErrors[mappedField] = message;
          }
        });
        
        setErrors(validationErrors);
      } else {
        setErrors({
          submit: errorMessage
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'details', label: 'Other Details', icon: Building },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'contacts', label: 'Contact Persons', icon: User },
    { id: 'remarks', label: 'Remarks', icon: FileText },
  ];

  const salutations = ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];
  const countries = ['Myanmar', 'United States', 'United Kingdom', 'Singapore', 'Thailand'];
  const currencies = ['MMK', 'USD', 'EUR', 'GBP', 'SGD', 'THB'];
  const paymentTermsOptions = [
    { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
    { value: 'NET_15', label: 'Net 15 Days' },
    { value: 'NET_30', label: 'Net 30 Days' },
    { value: 'NET_45', label: 'Net 45 Days' },
    { value: 'NET_60', label: 'Net 60 Days' },
    { value: 'NET_90', label: 'Net 90 Days' },
    { value: 'ADVANCE_PAYMENT', label: 'Advance Payment' },
    { value: 'CUSTOM', label: 'Custom Terms' },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-auto"
        >
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Created!</h2>
          <p className="text-gray-600 mb-4">
            The vendor has been successfully created and added to your system.
          </p>
          <p className="text-sm text-gray-500">Redirecting to vendors list...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">New Vendor</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Add a new vendor to your system
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/vendors')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Form Header with Required Fields Info */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Primary Contact</h3>
              <div className="text-sm text-gray-600">
                <span className="text-red-500">*</span> Required fields
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please provide the vendor's basic information. Only the Company Name is required.
            </p>
          </div>
          
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salutation
                </label>
                <select
                  value={formData.primaryContact?.salutation || ''}
                  onChange={(e) => handleNestedChange('primaryContact', 'salutation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {salutations.map(salutation => (
                    <option key={salutation} value={salutation}>{salutation}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.primaryContact?.firstName || ''}
                  onChange={(e) => handleNestedChange('primaryContact', 'firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.primaryContact?.lastName || ''}
                  onChange={(e) => handleNestedChange('primaryContact', 'lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName || ''}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Optional display name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="Work Phone"
                      value={formData.primaryContact?.workPhone || ''}
                      onChange={(e) => handleNestedChange('primaryContact', 'workPhone', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="Mobile"
                      value={formData.primaryContact?.mobile || ''}
                      onChange={(e) => handleNestedChange('primaryContact', 'mobile', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'details' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate
                    </label>
                    <select
                      value={formData.taxRate || ''}
                      onChange={(e) => handleInputChange('taxRate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a Tax</option>
                      <option value="5">5% VAT</option>
                      <option value="10">10% Service Tax</option>
                      <option value="15">15% Standard Tax</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company ID
                    </label>
                    <input
                      type="text"
                      value={formData.companyId || ''}
                      onChange={(e) => handleInputChange('companyId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opening Balance
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1">
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Head Office</option>
                          <option>Branch Office</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <input
                            type="number"
                            value={formData.openingBalance || ''}
                            onChange={(e) => handleInputChange('openingBalance', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            {formData.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {paymentTermsOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enablePortal"
                      checked={formData.enablePortal}
                      onChange={(e) => handleInputChange('enablePortal', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enablePortal" className="ml-2 text-sm text-gray-700">
                      Allow portal access for this vendor
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Portal Language
                    </label>
                    <select
                      value={formData.portalLanguage}
                      onChange={(e) => handleInputChange('portalLanguage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="English">English</option>
                      <option value="Myanmar">Myanmar</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Thai">Thai</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documents
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload File</p>
                    <p className="text-xs text-gray-500">You can upload a maximum of 10 files, 10MB each</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'address' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Billing Address */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Attention
                      </label>
                      <input
                        type="text"
                        value={formData.billingAddress?.attention || ''}
                        onChange={(e) => handleNestedChange('billingAddress', 'attention', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country/Region
                      </label>
                      <select
                        value={formData.billingAddress?.country || ''}
                        onChange={(e) => handleNestedChange('billingAddress', 'country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select or type to add</option>
                        {countries.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        value={formData.billingAddress?.address || ''}
                        onChange={(e) => handleNestedChange('billingAddress', 'address', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Street 1"
                      />
                      <input
                        type="text"
                        value={formData.billingAddress?.street2 || ''}
                        onChange={(e) => handleNestedChange('billingAddress', 'street2', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                        placeholder="Street 2"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.billingAddress?.city || ''}
                          onChange={(e) => handleNestedChange('billingAddress', 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <select
                          value={formData.billingAddress?.state || ''}
                          onChange={(e) => handleNestedChange('billingAddress', 'state', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select or type to add</option>
                          <option value="Yangon">Yangon</option>
                          <option value="Mandalay">Mandalay</option>
                          <option value="Naypyidaw">Naypyidaw</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={formData.billingAddress?.zipCode || ''}
                          onChange={(e) => handleNestedChange('billingAddress', 'zipCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.billingAddress?.phone || ''}
                          onChange={(e) => handleNestedChange('billingAddress', 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fax Number
                        </label>
                        <input
                          type="tel"
                          value={formData.billingAddress?.fax || ''}
                          onChange={(e) => handleNestedChange('billingAddress', 'fax', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Shipping Address</h4>
                    <button
                      onClick={() => {
                        setCopyBillingToShipping(!copyBillingToShipping);
                        if (!copyBillingToShipping) {
                          handleCopyBillingToShipping();
                        }
                      }}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy billing address
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Attention
                      </label>
                      <input
                        type="text"
                        value={formData.shippingAddress?.attention || ''}
                        onChange={(e) => handleNestedChange('shippingAddress', 'attention', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country/Region
                      </label>
                      <select
                        value={formData.shippingAddress?.country || ''}
                        onChange={(e) => handleNestedChange('shippingAddress', 'country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select or type to add</option>
                        {countries.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        value={formData.shippingAddress?.address || ''}
                        onChange={(e) => handleNestedChange('shippingAddress', 'address', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Street 1"
                      />
                      <input
                        type="text"
                        value={formData.shippingAddress?.street2 || ''}
                        onChange={(e) => handleNestedChange('shippingAddress', 'street2', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                        placeholder="Street 2"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.shippingAddress?.city || ''}
                          onChange={(e) => handleNestedChange('shippingAddress', 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <select
                          value={formData.shippingAddress?.state || ''}
                          onChange={(e) => handleNestedChange('shippingAddress', 'state', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select or type to add</option>
                          <option value="Yangon">Yangon</option>
                          <option value="Mandalay">Mandalay</option>
                          <option value="Naypyidaw">Naypyidaw</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={formData.shippingAddress?.zipCode || ''}
                          onChange={(e) => handleNestedChange('shippingAddress', 'zipCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.shippingAddress?.phone || ''}
                          onChange={(e) => handleNestedChange('shippingAddress', 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fax Number
                        </label>
                        <input
                          type="tel"
                          value={formData.shippingAddress?.fax || ''}
                          onChange={(e) => handleNestedChange('shippingAddress', 'fax', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'contacts' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Contact Persons</h4>
                  <button
                    onClick={addContactPerson}
                    className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Contact Person
                  </button>
                </div>

                {formData.contactPersons && formData.contactPersons.length > 0 ? (
                  <div className="space-y-4">
                    {formData.contactPersons.map((contact, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium text-gray-900">Contact Person {index + 1}</h5>
                          <button
                            onClick={() => removeContactPerson(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Salutation
                            </label>
                            <select
                              value={contact.salutation || ''}
                              onChange={(e) => updateContactPerson(index, 'salutation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value=""></option>
                              {salutations.map(salutation => (
                                <option key={salutation} value={salutation}>{salutation}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              First Name
                            </label>
                            <input
                              type="text"
                              value={contact.firstName}
                              onChange={(e) => updateContactPerson(index, 'firstName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={contact.lastName}
                              onChange={(e) => updateContactPerson(index, 'lastName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={contact.email || ''}
                              onChange={(e) => updateContactPerson(index, 'email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Work Phone
                            </label>
                            <input
                              type="tel"
                              value={contact.workPhone || ''}
                              onChange={(e) => updateContactPerson(index, 'workPhone', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mobile
                            </label>
                            <input
                              type="tel"
                              value={contact.mobile || ''}
                              onChange={(e) => updateContactPerson(index, 'mobile', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Department
                            </label>
                            <input
                              type="text"
                              value={contact.department || ''}
                              onChange={(e) => updateContactPerson(index, 'department', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Designation
                            </label>
                            <input
                              type="text"
                              value={contact.designation || ''}
                              onChange={(e) => updateContactPerson(index, 'designation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`primary-${index}`}
                              checked={contact.isPrimary}
                              onChange={(e) => updateContactPerson(index, 'isPrimary', e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`primary-${index}`} className="ml-2 text-sm text-gray-700">
                              Primary Contact
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No contact persons added yet</p>
                    <p className="text-sm">Click "Add Contact Person" to get started</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'remarks' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks (For Internal Use)
                  </label>
                  <textarea
                    value={formData.remarks || ''}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter any internal notes about this vendor..."
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}