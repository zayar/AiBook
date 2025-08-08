const InvoiceController = require('./src/controllers/invoiceController.ts');
console.log('Available methods:', Object.getOwnPropertyNames(InvoiceController.default || InvoiceController));
console.log('Method exists:', typeof (InvoiceController.default || InvoiceController).createOrRefreshShareLink);
