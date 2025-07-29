/**
 * 👁️ OCR ENGINE
 * 
 * Computer Vision and Optical Character Recognition for:
 * - Receipt processing and data extraction
 * - Invoice digitization and parsing
 * - Document classification and routing
 * - Handwriting recognition
 * - Form field extraction
 */

export interface OCRDocument {
  id: string;
  type: DocumentType;
  content: string;
  confidence: number;
  extractedData: ExtractedData;
  metadata: DocumentMetadata;
  processingTime: number;
  tenantId: string;
  createdAt: Date;
}

export type DocumentType = 
  | 'RECEIPT'
  | 'INVOICE'
  | 'BANK_STATEMENT'
  | 'CREDIT_CARD_STATEMENT'
  | 'EXPENSE_REPORT'
  | 'CONTRACT'
  | 'GENERAL';

export interface ExtractedData {
  vendor?: string;
  date?: Date;
  totalAmount?: number;
  taxAmount?: number;
  items?: ExtractedItem[];
  invoiceNumber?: string;
  accountNumber?: string;
  routingNumber?: string;
  checkNumber?: string;
  memo?: string;
  category?: string;
}

export interface ExtractedItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  category?: string;
}

export interface DocumentMetadata {
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  pageCount: number;
  language: string;
  quality: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface OCRProcessingOptions {
  language?: string;
  confidenceThreshold?: number;
  extractTables?: boolean;
  extractImages?: boolean;
  preserveFormatting?: boolean;
  customFields?: string[];
}

export interface OCRResult {
  success: boolean;
  document: OCRDocument;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export class OCREngine {
  private tenantId: string;
  private supportedLanguages: string[] = ['en', 'es', 'fr', 'de'];
  private documentTypes: Map<string, DocumentType> = new Map();

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.initializeDocumentTypes();
  }

  /**
   * 📄 DOCUMENT PROCESSING
   */

  /**
   * Process a document image and extract text/data
   */
  async processDocument(
    imageBuffer: Buffer,
    filename: string,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    console.log(`👁️ Processing document: ${filename}`);
    
    try {
      // Step 1: Classify document type
      const documentType = await this.classifyDocument(imageBuffer, filename);
      
      // Step 2: Extract text content
      const textContent = await this.extractText(imageBuffer, options);
      
      // Step 3: Extract structured data based on document type
      const extractedData = await this.extractStructuredData(textContent, documentType);
      
      // Step 4: Validate and enhance extracted data
      const enhancedData = await this.validateAndEnhanceData(extractedData, documentType);
      
      const processingTime = Date.now() - startTime;
      
      const document: OCRDocument = {
        id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: documentType,
        content: textContent,
        confidence: this.calculateOverallConfidence(enhancedData),
        extractedData: enhancedData,
        metadata: await this.extractMetadata(imageBuffer, filename),
        processingTime,
        tenantId: this.tenantId,
        createdAt: new Date()
      };

      const result: OCRResult = {
        success: true,
        document,
        suggestions: await this.generateSuggestions(document)
      };

      console.log(`✅ Document processed successfully: ${documentType}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to process document ${filename}:`, error);
      return {
        success: false,
        document: {} as OCRDocument,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Process multiple documents in batch
   */
  async processBatch(
    documents: Array<{ buffer: Buffer; filename: string }>,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult[]> {
    console.log(`📦 Processing batch of ${documents.length} documents`);
    
    const results: OCRResult[] = [];
    
    for (const doc of documents) {
      try {
        const result = await this.processDocument(doc.buffer, doc.filename, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process document ${doc.filename} in batch:`, error);
        results.push({
          success: false,
          document: {} as OCRDocument,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }
    
    return results;
  }

  /**
   * 🔍 DOCUMENT CLASSIFICATION
   */

  /**
   * Classify document type based on visual and text features
   */
  private async classifyDocument(imageBuffer: Buffer, filename: string): Promise<DocumentType> {
    // Extract visual features
    const visualFeatures = await this.extractVisualFeatures(imageBuffer);
    
    // Extract text features
    const textFeatures = await this.extractTextFeatures(imageBuffer);
    
    // Combine features for classification
    const features = { ...visualFeatures, ...textFeatures };
    
    // Use ML model for classification (mock implementation)
    const classification = await this.runDocumentClassificationModel(features);
    
    // Apply filename-based heuristics
    const filenameType = this.classifyByFilename(filename);
    
    // Combine ML and heuristic results
    return this.combineClassificationResults(classification, filenameType);
  }

  /**
   * 📝 TEXT EXTRACTION
   */

  /**
   * Extract text content from document image
   */
  private async extractText(imageBuffer: Buffer, options: OCRProcessingOptions): Promise<string> {
    // Mock OCR text extraction
    // In production, this would use Google Cloud Vision API, AWS Textract, or similar
    
    const mockTexts = {
      'RECEIPT': `STARBUCKS COFFEE
123 MAIN STREET
SAN FRANCISCO, CA 94102

Date: 01/15/2024
Time: 14:30:25
Receipt #: 12345

Venti Latte                    $5.95
Blueberry Muffin               $3.50
Tax                           $0.75
Total                        $10.20

Thank you for your purchase!`,
      
      'INVOICE': `ACME CORPORATION
456 BUSINESS AVE
NEW YORK, NY 10001

INVOICE #: INV-2024-001
Date: January 15, 2024
Due Date: February 14, 2024

Bill To:
Tech Solutions Inc.
789 Tech Street
San Francisco, CA 94105

Description                    Qty    Rate    Amount
Web Development Services        40    $150    $6,000.00
Consulting Hours               10    $200    $2,000.00
Subtotal                                    $8,000.00
Tax (8.5%)                                   $680.00
Total                                         $8,680.00`,
      
      'BANK_STATEMENT': `BANK OF AMERICA
Monthly Statement
Account: ****1234
Period: January 2024

Date        Description                    Debit    Credit    Balance
01/02/2024  Opening Balance                                    $5,000.00
01/05/2024  Direct Deposit - Salary                $3,500.00   $8,500.00
01/10/2024  ATM Withdrawal              $200.00               $8,300.00
01/15/2024  Check #1234                 $500.00               $7,800.00
01/20/2024  Online Payment              $150.00               $7,650.00
01/31/2024  Closing Balance                                    $7,650.00`
    };
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Return mock text based on document type (would be determined by classification)
    const documentType = this.classifyByFilename('mock.pdf');
    return mockTexts[documentType as keyof typeof mockTexts] || mockTexts['RECEIPT'];
  }

  /**
   * 📊 STRUCTURED DATA EXTRACTION
   */

  /**
   * Extract structured data from text content
   */
  private async extractStructuredData(content: string, documentType: DocumentType): Promise<ExtractedData> {
    const extractedData: ExtractedData = {};
    
    switch (documentType) {
      case 'RECEIPT':
        return await this.extractReceiptData(content);
      
      case 'INVOICE':
        return await this.extractInvoiceData(content);
      
      case 'BANK_STATEMENT':
        return await this.extractBankStatementData(content);
      
      default:
        return await this.extractGeneralData(content);
    }
  }

  private async extractReceiptData(content: string): Promise<ExtractedData> {
    const data: ExtractedData = {};
    
    // Extract vendor
    const vendorMatch = content.match(/^([A-Z\s]+)/m);
    if (vendorMatch) {
      data.vendor = vendorMatch[1].trim();
    }
    
    // Extract date
    const dateMatch = content.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      data.date = new Date(dateMatch[1]);
    }
    
    // Extract total amount
    const totalMatch = content.match(/Total\s+\$?([\d,]+\.\d{2})/);
    if (totalMatch) {
      data.totalAmount = parseFloat(totalMatch[1].replace(',', ''));
    }
    
    // Extract tax amount
    const taxMatch = content.match(/Tax\s+\$?([\d,]+\.\d{2})/);
    if (taxMatch) {
      data.taxAmount = parseFloat(taxMatch[1].replace(',', ''));
    }
    
    // Extract items
    data.items = this.extractReceiptItems(content);
    
    return data;
  }

  private async extractInvoiceData(content: string): Promise<ExtractedData> {
    const data: ExtractedData = {};
    
    // Extract vendor
    const vendorMatch = content.match(/^([A-Z\s]+)/m);
    if (vendorMatch) {
      data.vendor = vendorMatch[1].trim();
    }
    
    // Extract invoice number
    const invoiceMatch = content.match(/INVOICE\s*#:\s*([A-Z0-9-]+)/);
    if (invoiceMatch) {
      data.invoiceNumber = invoiceMatch[1];
    }
    
    // Extract date
    const dateMatch = content.match(/Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
    if (dateMatch) {
      data.date = new Date(dateMatch[1]);
    }
    
    // Extract total amount
    const totalMatch = content.match(/Total\s+\$?([\d,]+\.\d{2})/);
    if (totalMatch) {
      data.totalAmount = parseFloat(totalMatch[1].replace(',', ''));
    }
    
    // Extract items
    data.items = this.extractInvoiceItems(content);
    
    return data;
  }

  private async extractBankStatementData(content: string): Promise<ExtractedData> {
    const data: ExtractedData = {};
    
    // Extract account number
    const accountMatch = content.match(/Account:\s*\*+(\d+)/);
    if (accountMatch) {
      data.accountNumber = accountMatch[1];
    }
    
    // Extract vendor (bank name)
    const bankMatch = content.match(/^([A-Z\s]+)/m);
    if (bankMatch) {
      data.vendor = bankMatch[1].trim();
    }
    
    // Extract date range
    const periodMatch = content.match(/Period:\s*([A-Za-z]+\s+\d{4})/);
    if (periodMatch) {
      // Set to first day of the month
      const [month, year] = periodMatch[1].split(' ');
      data.date = new Date(`${month} 1, ${year}`);
    }
    
    return data;
  }

  private async extractGeneralData(content: string): Promise<ExtractedData> {
    const data: ExtractedData = {};
    
    // Extract any amounts
    const amountMatches = content.match(/\$?([\d,]+\.\d{2})/g);
    if (amountMatches && amountMatches.length > 0) {
      const amounts = amountMatches.map(match => parseFloat(match.replace(/[$,]/g, '')));
      data.totalAmount = Math.max(...amounts);
    }
    
    // Extract dates
    const dateMatches = content.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g);
    if (dateMatches && dateMatches.length > 0) {
      data.date = new Date(dateMatches[0]);
    }
    
    return data;
  }

  /**
   * 🔧 HELPER METHODS
   */

  private extractReceiptItems(content: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Look for lines with amounts at the end
      const itemMatch = line.match(/^(.+?)\s+\$?([\d,]+\.\d{2})$/);
      if (itemMatch && !line.includes('Tax') && !line.includes('Total')) {
        items.push({
          description: itemMatch[1].trim(),
          totalPrice: parseFloat(itemMatch[2].replace(',', ''))
        });
      }
    }
    
    return items;
  }

  private extractInvoiceItems(content: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Look for lines with quantity, rate, and amount
      const itemMatch = line.match(/^(.+?)\s+(\d+)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})$/);
      if (itemMatch) {
        items.push({
          description: itemMatch[1].trim(),
          quantity: parseInt(itemMatch[2]),
          unitPrice: parseFloat(itemMatch[3].replace(',', '')),
          totalPrice: parseFloat(itemMatch[4].replace(',', ''))
        });
      }
    }
    
    return items;
  }

  private async extractVisualFeatures(imageBuffer: Buffer): Promise<Record<string, any>> {
    // Mock visual feature extraction
    return {
      aspectRatio: 1.4,
      dominantColors: ['#FFFFFF', '#000000'],
      hasLogo: true,
      hasTable: true,
      hasSignature: false,
      imageQuality: 'HIGH'
    };
  }

  private async extractTextFeatures(imageBuffer: Buffer): Promise<Record<string, any>> {
    // Mock text feature extraction
    return {
      textDensity: 0.15,
      averageLineLength: 45,
      hasNumbers: true,
      hasCurrency: true,
      hasDates: true,
      language: 'en'
    };
  }

  private async runDocumentClassificationModel(features: Record<string, any>): Promise<{
    type: DocumentType;
    confidence: number;
  }> {
    // Mock ML classification
    const types: DocumentType[] = ['RECEIPT', 'INVOICE', 'BANK_STATEMENT'];
    const type = types[Math.floor(Math.random() * types.length)];
    const confidence = 0.7 + Math.random() * 0.3;
    
    return { type, confidence };
  }

  private classifyByFilename(filename: string): DocumentType {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('receipt')) return 'RECEIPT';
    if (lowerFilename.includes('invoice')) return 'INVOICE';
    if (lowerFilename.includes('statement')) return 'BANK_STATEMENT';
    if (lowerFilename.includes('expense')) return 'EXPENSE_REPORT';
    
    return 'GENERAL';
  }

  private combineClassificationResults(
    mlResult: { type: DocumentType; confidence: number },
    filenameResult: DocumentType
  ): DocumentType {
    // If ML confidence is high, use ML result
    if (mlResult.confidence > 0.8) {
      return mlResult.type;
    }
    
    // Otherwise, prefer filename classification for known types
    if (filenameResult !== 'GENERAL') {
      return filenameResult;
    }
    
    return mlResult.type;
  }

  private async validateAndEnhanceData(data: ExtractedData, documentType: DocumentType): Promise<ExtractedData> {
    const enhanced = { ...data };
    
    // Validate amounts
    if (enhanced.totalAmount && enhanced.totalAmount < 0) {
      enhanced.totalAmount = Math.abs(enhanced.totalAmount);
    }
    
    // Enhance vendor names
    if (enhanced.vendor) {
      enhanced.vendor = this.standardizeVendorName(enhanced.vendor);
    }
    
    // Add category based on vendor
    if (enhanced.vendor && !enhanced.category) {
      enhanced.category = this.categorizeByVendor(enhanced.vendor);
    }
    
    return enhanced;
  }

  private standardizeVendorName(vendor: string): string {
    // Standardize common vendor names
    const standardizations: Record<string, string> = {
      'starbucks coffee': 'Starbucks',
      'amazon.com': 'Amazon',
      'uber': 'Uber',
      'lyft': 'Lyft'
    };
    
    const lowerVendor = vendor.toLowerCase();
    return standardizations[lowerVendor] || vendor;
  }

  private categorizeByVendor(vendor: string): string {
    const vendorCategories: Record<string, string> = {
      'starbucks': 'Meals',
      'amazon': 'Office Supplies',
      'uber': 'Travel',
      'lyft': 'Travel'
    };
    
    const lowerVendor = vendor.toLowerCase();
    return vendorCategories[lowerVendor] || 'Other';
  }

  private calculateOverallConfidence(data: ExtractedData): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for each successfully extracted field
    if (data.vendor) confidence += 0.1;
    if (data.date) confidence += 0.1;
    if (data.totalAmount) confidence += 0.15;
    if (data.items && data.items.length > 0) confidence += 0.1;
    if (data.invoiceNumber) confidence += 0.05;
    
    return Math.min(confidence, 0.95);
  }

  private async extractMetadata(imageBuffer: Buffer, filename: string): Promise<DocumentMetadata> {
    return {
      originalFilename: filename,
      fileSize: imageBuffer.length,
      mimeType: 'image/jpeg',
      dimensions: { width: 800, height: 1200 },
      pageCount: 1,
      language: 'en',
      quality: 'HIGH'
    };
  }

  private async generateSuggestions(document: OCRDocument): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (document.confidence < 0.8) {
      suggestions.push('Consider manual review due to low confidence');
    }
    
    if (!document.extractedData.vendor) {
      suggestions.push('Vendor information could not be extracted');
    }
    
    if (!document.extractedData.date) {
      suggestions.push('Date information could not be extracted');
    }
    
    if (document.extractedData.items && document.extractedData.items.length === 0) {
      suggestions.push('No line items were extracted');
    }
    
    return suggestions;
  }

  private initializeDocumentTypes(): void {
    this.documentTypes.set('receipt', 'RECEIPT');
    this.documentTypes.set('invoice', 'INVOICE');
    this.documentTypes.set('statement', 'BANK_STATEMENT');
    this.documentTypes.set('expense', 'EXPENSE_REPORT');
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalDocuments: number;
    averageConfidence: number;
    averageProcessingTime: number;
  } {
    // Mock statistics
    return {
      totalDocuments: 150,
      averageConfidence: 0.85,
      averageProcessingTime: 2500
    };
  }
} 