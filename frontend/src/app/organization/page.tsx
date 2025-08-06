'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Upload, Info, Settings, Building2, Globe, Calendar, DollarSign, FileText, Languages, Clock, CalendarDays, Hash } from 'lucide-react';

interface OrganizationProfile {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  location?: string;
  logo?: string;
  baseCurrency: string;
  fiscalYearStart: number;
  fiscalYearEnd: number;
  fiscalYearStartDay: number;
  reportBasis: 'ACCRUAL' | 'CASH';
  language: string;
  timezone: string;
  dateFormat: string;
  companyId?: string;
  canChangeCurrency: boolean;
  fiscalYearPeriod: string;
  fiscalYearPeriodDetail: string;
}

interface AvailableOptions {
  currencies: string[];
  reportBasis: string[];
  languages: string[];
  timezones: string[];
  dateFormats: string[];
  industries: string[];
  locations: string[];
}

export default function OrganizationProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [options, setOptions] = useState<AvailableOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    location: '',
    baseCurrency: 'MMK',
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    fiscalYearStartDay: 1,
    reportBasis: 'ACCRUAL' as 'ACCRUAL' | 'CASH',
    language: 'English',
    timezone: '(GMT 6:30) Myanmar Time (Asia/Rangoon)',
    dateFormat: 'dd MMM yyyy [05 Aug 2025]',
    companyId: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchOptions();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/v1/organization');
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
        setFormData({
          name: data.data.name || '',
          industry: data.data.industry || '',
          location: data.data.location || '',
          baseCurrency: data.data.baseCurrency || 'MMK',
          fiscalYearStart: data.data.fiscalYearStart || 1,
          fiscalYearEnd: data.data.fiscalYearEnd || 12,
          fiscalYearStartDay: data.data.fiscalYearStartDay || 1,
          reportBasis: data.data.reportBasis || 'ACCRUAL',
          language: data.data.language || 'English',
          timezone: data.data.timezone || '(GMT 6:30) Myanmar Time (Asia/Rangoon)',
          dateFormat: data.data.dateFormat || 'dd MMM yyyy [05 Aug 2025]',
          companyId: data.data.companyId || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const response = await fetch('/api/v1/organization/options');
      const data = await response.json();
      
      if (data.success) {
        setOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoDelete = async () => {
    try {
      const response = await fetch('/api/v1/organization/logo', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setLogoFile(null);
        setLogoPreview(null);
        if (profile) {
          setProfile({ ...profile, logo: undefined });
        }
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload logo first if there's a new one
      if (logoFile) {
        const logoResponse = await fetch('/api/v1/organization/logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ logo: logoPreview })
        });
        
        if (!logoResponse.ok) {
          throw new Error('Failed to upload logo');
        }
      }

      // Update profile
      const response = await fetch('/api/v1/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
        setLogoFile(null);
        alert('Organization profile updated successfully!');
      } else {
        alert(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Organization Profile</h1>
              {profile && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    ID: {profile.id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Information Banner */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Integration Notice</p>
              <p>You have the same organization in Zoho Billing, Zoho Inventory. Altering any information on this page will alter it there.</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            {/* Organization Logo Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Organization Logo
              </h2>
              
              <div className="flex items-start space-x-6">
                {/* Logo Display/Upload Area */}
                <div className="relative">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    {logoPreview || profile?.logo ? (
                      <div className="relative w-full h-full">
                        <img
                          src={logoPreview || profile?.logo}
                          alt="Organization Logo"
                          className="w-full h-full object-contain rounded-lg"
                        />
                        <button
                          onClick={handleLogoDelete}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Upload Logo</p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Logo Guidelines */}
                <div className="flex-1">
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>This logo will be displayed in transaction PDFs and email notifications.</p>
                    <p><strong>Preferred Image Dimensions:</strong> 240 × 240 pixels @ 72 DPI</p>
                    <p><strong>Supported Files:</strong> jpg, jpeg, png, gif, bmp</p>
                    <p><strong>Maximum File Size:</strong> 1MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Details Form */}
            <div className="space-y-6">
              {/* Organization Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter organization name"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    <option value="">Select Industry</option>
                    {options?.industries.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Organization Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Location</option>
                  {options?.locations.map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* Base Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Base Currency <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.baseCurrency}
                    onChange={(e) => handleInputChange('baseCurrency', e.target.value)}
                    disabled={!profile?.canChangeCurrency}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !profile?.canChangeCurrency ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  >
                    {options?.currencies.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Settings className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                {!profile?.canChangeCurrency && (
                  <p className="mt-1 text-sm text-gray-500">
                    You can't change the base currency as there are transactions recorded in your organization.
                  </p>
                )}
              </div>

              {/* Fiscal Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Fiscal Year
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Month</label>
                    <select
                      value={formData.fiscalYearStart}
                      onChange={(e) => handleInputChange('fiscalYearStart', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <select
                      value={formData.fiscalYearStartDay}
                      onChange={(e) => handleInputChange('fiscalYearStartDay', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Month</label>
                    <select
                      value={formData.fiscalYearEnd}
                      onChange={(e) => handleInputChange('fiscalYearEnd', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Period: {formData.fiscalYearStartDay} {new Date(2024, formData.fiscalYearStart - 1).toLocaleString('default', { month: 'long' })} - {new Date(2024, formData.fiscalYearEnd, 0).getDate()} {new Date(2024, formData.fiscalYearEnd - 1).toLocaleString('default', { month: 'long' })}
                </p>
              </div>

              {/* Report Basis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Basis
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reportBasis"
                      value="ACCRUAL"
                      checked={formData.reportBasis === 'ACCRUAL'}
                      onChange={(e) => handleInputChange('reportBasis', e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Accrual</div>
                      <div className="text-sm text-gray-500">You owe tax as of invoice date</div>
                    </div>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reportBasis"
                      value="CASH"
                      checked={formData.reportBasis === 'CASH'}
                      onChange={(e) => handleInputChange('reportBasis', e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Cash</div>
                      <div className="text-sm text-gray-500">You owe tax upon payment receipt</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Languages className="h-4 w-4 mr-1" />
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {options?.languages.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Language</p>
                      <p>Any change in the language will not be reflected in Chart of Accounts, Email Templates, Template Customizations, Payment Modes and Default tax Rates. These will still remain in the language selected during this organization's setup.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Time Zone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {options?.timezones.map((timezone) => (
                    <option key={timezone} value={timezone}>{timezone}</option>
                  ))}
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Date Format
                </label>
                <select
                  value={formData.dateFormat}
                  onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {options?.dateFormats.map((format) => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>

              {/* Company ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                  Company ID
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Company ID:</label>
                    <input
                      type="text"
                      value={formData.companyId}
                      onChange={(e) => handleInputChange('companyId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 4988/2016-2017(YGN)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 