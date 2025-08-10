const API_URL = '/api/v1'; // Use frontend proxy for consistent authentication

export interface VendorAddress {
  attention?: string;
  country?: string;
  address?: string;
  street2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  fax?: string;
}

export interface VendorPrimaryContact {
  salutation?: string;
  firstName?: string;
  lastName?: string;
  workPhone?: string;
  mobile?: string;
}

export interface VendorContactPerson {
  id?: string;
  salutation?: string;
  firstName: string;
  lastName: string;
  email?: string;
  workPhone?: string;
  mobile?: string;
  department?: string;
  designation?: string;
  isPrimary: boolean;
}

export interface VendorDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  uploadedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  website?: string;
  primaryContact?: VendorPrimaryContact;
  companyId?: string;
  taxRate?: string;
  currency: string;
  paymentTerms: string;
  openingBalance?: number;
  enablePortal: boolean;
  portalLanguage: string;
  billingAddress?: VendorAddress;
  shippingAddress?: VendorAddress;
  taxId?: string;
  remarks?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contactPersons?: VendorContactPerson[];
  documents?: VendorDocument[];
  _count?: {
    bills: number;
    purchases: number;
    contactPersons: number;
  };
  bills?: any[];
  purchases?: any[];
}

export interface VendorFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  currency?: string;
  paymentTerms?: string;
}

export interface VendorListResponse {
  vendors: Vendor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: VendorFilters;
}

export interface CreateVendorData {
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  website?: string;
  primaryContact?: VendorPrimaryContact;
  companyId?: string;
  taxRate?: string;
  currency?: string;
  paymentTerms?: string;
  openingBalance?: number;
  enablePortal?: boolean;
  portalLanguage?: string;
  billingAddress?: VendorAddress;
  shippingAddress?: VendorAddress;
  taxId?: string;
  contactPersons?: Omit<VendorContactPerson, 'id'>[];
  remarks?: string;
}

export interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  totalBills: number;
  totalPurchases: number;
  topVendors: Array<{
    id: string;
    name: string;
    email?: string;
    billsCount: number;
    purchasesCount: number;
  }>;
}

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'default',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const vendorApi = {
  // Get all vendors with filtering and pagination
  async getVendors(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    currency?: string;
    paymentTerms?: string;
  } = {}): Promise<VendorListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.currency) searchParams.set('currency', params.currency);
    if (params.paymentTerms) searchParams.set('paymentTerms', params.paymentTerms);

    const response = await fetch(`${API_URL}/vendors?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vendors: ${response.statusText}`);
    }

    return response.json();
  },

  // Get vendor by ID
  async getVendor(id: string): Promise<{ vendor: Vendor }> {
    const response = await fetch(`${API_URL}/vendors/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vendor: ${response.statusText}`);
    }

    return response.json();
  },

  // Create new vendor
  async createVendor(data: CreateVendorData): Promise<{ vendor: Vendor; message: string }> {
    // Clean up the data - convert empty strings to null for optional fields
    const cleanedData = {
      ...data,
      displayName: data.displayName || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      companyId: data.companyId || null,
      taxRate: data.taxRate || null,
      taxId: data.taxId || null,
      openingBalance: data.openingBalance || null,
      remarks: data.remarks || null,
      primaryContact: data.primaryContact ? {
        salutation: data.primaryContact.salutation || null,
        firstName: data.primaryContact.firstName || null,
        lastName: data.primaryContact.lastName || null,
        workPhone: data.primaryContact.workPhone || null,
        mobile: data.primaryContact.mobile || null,
      } : null,
      billingAddress: data.billingAddress ? {
        attention: data.billingAddress.attention || null,
        country: data.billingAddress.country || null,
        address: data.billingAddress.address || null,
        street2: data.billingAddress.street2 || null,
        city: data.billingAddress.city || null,
        state: data.billingAddress.state || null,
        zipCode: data.billingAddress.zipCode || null,
        phone: data.billingAddress.phone || null,
        fax: data.billingAddress.fax || null,
      } : null,
      shippingAddress: data.shippingAddress ? {
        attention: data.shippingAddress.attention || null,
        country: data.shippingAddress.country || null,
        address: data.shippingAddress.address || null,
        street2: data.shippingAddress.street2 || null,
        city: data.shippingAddress.city || null,
        state: data.shippingAddress.state || null,
        zipCode: data.shippingAddress.zipCode || null,
        phone: data.shippingAddress.phone || null,
        fax: data.shippingAddress.fax || null,
      } : null,
    };

    const response = await fetch(`${API_URL}/vendors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cleanedData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle validation errors with detailed field information
      if (errorData.error === 'Validation failed' && errorData.details) {
        const validationErrors = errorData.details.map((detail: any) => {
          const field = detail.path?.join('.') || 'unknown';
          return `${field}: ${detail.message}`;
        }).join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }
      
      throw new Error(errorData.error || `Failed to create vendor: ${response.statusText}`);
    }

    return response.json();
  },

  // Update vendor
  async updateVendor(id: string, data: Partial<CreateVendorData>): Promise<{ vendor: Vendor; message: string }> {
    const response = await fetch(`${API_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update vendor: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete vendor
  async deleteVendor(id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/vendors/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete vendor: ${response.statusText}`);
    }

    return response.json();
  },

  // Toggle vendor status
  async toggleVendorStatus(id: string): Promise<{ vendor: Vendor; message: string }> {
    const response = await fetch(`${API_URL}/vendors/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to toggle vendor status: ${response.statusText}`);
    }

    return response.json();
  },

  // Get vendor statistics
  async getVendorStats(): Promise<{ stats: VendorStats }> {
    const response = await fetch(`${API_URL}/vendors/stats`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vendor stats: ${response.statusText}`);
    }

    return response.json();
  },

  // Contact person management
  async addContactPerson(vendorId: string, data: Omit<VendorContactPerson, 'id'>): Promise<{ contactPerson: VendorContactPerson; message: string }> {
    const response = await fetch(`${API_URL}/vendors/${vendorId}/contact-persons`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to add contact person: ${response.statusText}`);
    }

    return response.json();
  },

  async updateContactPerson(vendorId: string, contactId: string, data: Partial<Omit<VendorContactPerson, 'id'>>): Promise<{ contactPerson: VendorContactPerson; message: string }> {
    const response = await fetch(`${API_URL}/vendors/${vendorId}/contact-persons/${contactId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update contact person: ${response.statusText}`);
    }

    return response.json();
  },

  async deleteContactPerson(vendorId: string, contactId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/vendors/${vendorId}/contact-persons/${contactId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete contact person: ${response.statusText}`);
    }

    return response.json();
  },

  // Utility function to copy billing address to shipping address
  copyBillingToShipping(vendor: Partial<CreateVendorData>): Partial<CreateVendorData> {
    return {
      ...vendor,
      shippingAddress: vendor.billingAddress,
    };
  },

  // Format display name
  formatDisplayName(vendor: Vendor): string {
    return vendor.displayName || vendor.name;
  },

  // Format contact name
  formatContactName(contact: VendorContactPerson | VendorPrimaryContact): string {
    const { firstName = '', lastName = '' } = contact;
    return `${firstName} ${lastName}`.trim();
  },

  // Get payment terms display text
  getPaymentTermsDisplay(paymentTerms: string): string {
    const terms: Record<string, string> = {
      'DUE_ON_RECEIPT': 'Due on Receipt',
      'NET_15': 'Net 15 Days',
      'NET_30': 'Net 30 Days',
      'NET_45': 'Net 45 Days',
      'NET_60': 'Net 60 Days',
      'NET_90': 'Net 90 Days',
      'ADVANCE_PAYMENT': 'Advance Payment',
      'CUSTOM': 'Custom Terms',
    };
    return terms[paymentTerms] || paymentTerms;
  },

  // Get currency symbol
  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      'MMK': 'MMK',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'THB': '฿',
    };
    return symbols[currency] || currency;
  },
};