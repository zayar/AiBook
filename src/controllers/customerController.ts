import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CustomerCreateRequest {
  customerType: 'Business' | 'Individual';
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  displayName: string;
  email: string;
  workPhone?: string;
  mobile?: string;
  
  // Address
  billingAttention?: string;
  billingCountry?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  
  shippingAttention?: string;
  shippingCountry?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  
  // Other Details
  taxRate?: string;
  companyId?: string;
  currency?: string;
  openingBalance?: number;
  openingBalanceType?: string;
  paymentTerms?: string;
  enablePortal?: boolean;
  portalLanguage?: string;
}

/**
 * 📋 GET ALL CUSTOMERS
 * Retrieve all customers with filtering and search
 */
export async function getAllCustomers(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const { search, type, status, page = 1, limit = 50 } = req.query;

    // Build filter conditions
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { companyName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (type && type !== 'All Customers') {
      if (type === 'Business' || type === 'Individual') {
        where.customerType = type;
      }
      if (type === 'Active' || type === 'Inactive') {
        where.status = type;
      }
    }

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          taxId: true,
          paymentTerms: true,
          creditLimit: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.customer.count({ where })
    ]);

    // Calculate receivables for each customer
    const customersWithReceivables = customers.map(customer => ({
      ...customer,
      companyName: customer.name, // Assuming name is company name for business customers
      workPhone: customer.phone,
      receivables: customer.creditLimit ? parseFloat(customer.creditLimit.toString()) : 0,
      customerType: 'Business', // Default to Business since we don't have this field
      status: customer.isActive ? 'Active' : 'Inactive' // Derive status from isActive
    }));

    res.json({
      customers: customersWithReceivables,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customers',
      details: error.message 
    });
  }
}

/**
 * 👤 GET CUSTOMER BY ID
 * Retrieve a specific customer with full details
 */
export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { 
        id,
        tenantId 
      }
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({ customer });

  } catch (error: any) {
    console.error('❌ Error fetching customer:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customer',
      details: error.message 
    });
  }
}

/**
 * ➕ CREATE NEW CUSTOMER
 * Create a new customer with comprehensive data
 */
export async function createCustomer(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const customerData: CustomerCreateRequest = req.body;

    // Validation
    if (!customerData.displayName?.trim()) {
      res.status(400).json({ error: 'Display name is required' });
      return;
    }

    if (!customerData.email?.trim()) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if email already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { 
        email: customerData.email,
        tenantId 
      }
    });

    if (existingCustomer) {
      res.status(409).json({ error: 'Customer with this email already exists' });
      return;
    }

    // Prepare address data
    const addressData = {
      billing: {
        attention: customerData.billingAttention,
        country: customerData.billingCountry,
        address1: customerData.billingAddress1,
        address2: customerData.billingAddress2,
        city: customerData.billingCity,
        state: customerData.billingState,
        zipCode: customerData.billingZipCode
      },
      shipping: {
        attention: customerData.shippingAttention,
        country: customerData.shippingCountry,
        address1: customerData.shippingAddress1,
        address2: customerData.shippingAddress2,
        city: customerData.shippingCity,
        state: customerData.shippingState,
        zipCode: customerData.shippingZipCode
      }
    };


    
    // Map payment terms to integer
    const paymentTermsValue = customerData.paymentTerms ? 
      (customerData.paymentTerms === 'Due on Receipt' ? 0 : 
       customerData.paymentTerms === 'Net 15' ? 15 :
       customerData.paymentTerms === 'Net 30' ? 30 :
       customerData.paymentTerms === 'Net 45' ? 45 :
       customerData.paymentTerms === 'Net 60' ? 60 :
       (typeof customerData.paymentTerms === 'string' ? parseInt(customerData.paymentTerms) : customerData.paymentTerms) || 30) : 30;

    console.log('📝 Payment terms value:', paymentTermsValue);

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name: customerData.displayName,
        email: customerData.email,
        phone: customerData.workPhone || customerData.mobile || '',
        address: JSON.stringify(addressData),
        taxId: customerData.taxRate || 'standard',
        paymentTerms: paymentTermsValue,
        creditLimit: customerData.openingBalance ? parseFloat(customerData.openingBalance.toString()) : null,
        isActive: true,
        tenant: {
          connect: {
            id: tenantId
          }
        }
      }
    });

    console.log('✅ Created customer:', customer.name);

    res.status(201).json({
      message: 'Customer created successfully',
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        customerType: 'Business', // Default since we don't have this field
        status: customer.isActive ? 'Active' : 'Inactive' // Derive from isActive
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating customer:', error);
    res.status(500).json({ 
      error: 'Failed to create customer',
      details: error.message 
    });
  }
}

/**
 * ✏️ UPDATE CUSTOMER
 * Update existing customer information
 */
export async function updateCustomer(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const customerData: Partial<CustomerCreateRequest> = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { 
        id,
        tenantId 
      }
    });

    if (!existingCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Prepare update data
    const updateData: any = {};

    if (customerData.displayName) updateData.name = customerData.displayName;
    if (customerData.email) updateData.email = customerData.email;
    if (customerData.workPhone || customerData.mobile) {
      updateData.phone = customerData.workPhone || customerData.mobile;
    }
    if (customerData.taxRate) updateData.taxId = customerData.taxRate;
    if (customerData.paymentTerms) updateData.paymentTerms = parseInt(customerData.paymentTerms);
    if (customerData.openingBalance !== undefined) updateData.creditLimit = parseFloat(customerData.openingBalance.toString());

    // Update address if provided
    if (customerData.billingAddress1 || customerData.shippingAddress1) {
      const currentAddress = existingCustomer.address ? JSON.parse(existingCustomer.address as string) : {};
      
      const addressData = {
        ...currentAddress,
        billing: {
          ...currentAddress.billing,
          attention: customerData.billingAttention,
          country: customerData.billingCountry,
          address1: customerData.billingAddress1,
          address2: customerData.billingAddress2,
          city: customerData.billingCity,
          state: customerData.billingState,
          zipCode: customerData.billingZipCode
        },
        shipping: {
          ...currentAddress.shipping,
          attention: customerData.shippingAttention,
          country: customerData.shippingCountry,
          address1: customerData.shippingAddress1,
          address2: customerData.shippingAddress2,
          city: customerData.shippingCity,
          state: customerData.shippingState,
          zipCode: customerData.shippingZipCode
        }
      };

      updateData.address = JSON.stringify(addressData);
    }

    // Store additional data in address field if needed
    if (customerData.salutation || customerData.firstName || customerData.lastName || customerData.companyName || customerData.mobile || customerData.workPhone || customerData.openingBalanceType) {
      const currentAddress = existingCustomer.address ? JSON.parse(existingCustomer.address as string) : {};
      const additionalData = {
        ...currentAddress,
        additionalInfo: {
          salutation: customerData.salutation,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          companyName: customerData.companyName,
          mobile: customerData.mobile,
          workPhone: customerData.workPhone,
          openingBalanceType: customerData.openingBalanceType
        }
      };
      updateData.address = JSON.stringify(additionalData);
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData
    });

    console.log('✅ Updated customer:', updatedCustomer.name);

    res.json({
      message: 'Customer updated successfully',
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        customerType: 'Business', // Default since we don't have this field
        status: updatedCustomer.isActive ? 'Active' : 'Inactive' // Derive from isActive
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating customer:', error);
    res.status(500).json({ 
      error: 'Failed to update customer',
      details: error.message 
    });
  }
}

/**
 * 🗑️ DELETE CUSTOMER
 * Soft delete a customer
 */
export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { 
        id,
        tenantId 
      }
    });

    if (!existingCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Check if customer has any transactions (you might want to prevent deletion)
    // const hasTransactions = await prisma.invoice.count({
    //   where: { customerId: id }
    // });

    // if (hasTransactions > 0) {
    //   res.status(409).json({ 
    //     error: 'Cannot delete customer with existing transactions',
    //     suggestion: 'Consider deactivating the customer instead'
    //   });
    //   return;
    // }

    // For now, just delete the customer
    await prisma.customer.delete({
      where: { id }
    });

    console.log('✅ Deleted customer:', existingCustomer.name);

    res.json({
      message: 'Customer deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting customer:', error);
    res.status(500).json({ 
      error: 'Failed to delete customer',
      details: error.message 
    });
  }
}

/**
 * 🔄 TOGGLE CUSTOMER STATUS
 * Activate or deactivate a customer
 */
export async function toggleCustomerStatus(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant?.tenantId;
    const { id } = req.params;
    const { status } = req.body;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    if (!['Active', 'Inactive'].includes(status)) {
      res.status(400).json({ error: 'Status must be Active or Inactive' });
      return;
    }

    const isActive = status === 'Active';
    const customer = await prisma.customer.update({
      where: { 
        id,
        tenantId 
      },
      data: { isActive }
    });

    console.log(`✅ Customer ${customer.name} status changed to ${status}`);

    res.json({
      message: `Customer ${status.toLowerCase()} successfully`,
      customer: {
        id: customer.id,
        name: customer.name,
        status: customer.isActive ? 'Active' : 'Inactive'
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating customer status:', error);
    res.status(500).json({ 
      error: 'Failed to update customer status',
      details: error.message 
    });
  }
}
