import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class JournalController {
  // Get journal entries for an invoice
  static async getInvoiceJournalEntries(req: Request, res: Response): Promise<void> {
    try {
      const { id: invoiceId } = req.params;
      const tenantId = req.tenant?.tenantId;
      
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Get invoice to get the invoice number
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId }
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Get journal entries for this invoice from database
      const journalEntries = await prisma.entry.findMany({
        where: {
          tenantId,
          reference: invoice.invoiceNumber
        },
        include: {
          account: {
            select: {
              code: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        message: 'Journal entries retrieved successfully',
        journalEntries,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount
        }
      });
    } catch (error) {
      console.error('Error retrieving journal entries:', error);
      res.status(500).json({ error: 'Failed to retrieve journal entries' });
    }
  }
}

export default JournalController;