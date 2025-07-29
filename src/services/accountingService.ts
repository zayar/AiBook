// This file is deprecated. Use the new accounting module instead.
// Import the new AccountingService from the accounting module

import { AccountingService as NewAccountingService } from '../accounting/AccountingService';

/**
 * @deprecated Use AccountingService from '../accounting/AccountingService' instead
 */
export class AccountingService extends NewAccountingService {
  constructor(options: { tenantId: string }) {
    super(options);
    console.warn('This AccountingService is deprecated. Use the one from ../accounting/AccountingService');
  }
}

// Also export the new service as default export for backward compatibility
export { AccountingService as default } from '../accounting/AccountingService'; 