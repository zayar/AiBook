import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prismaWithTenant';
import aiService from '../services/aiService';

// Validation schemas
const ItemCreateSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  unitOfMeasure: z.string().default('each'),
  unitCost: z.number().min(0, 'Unit cost must be positive'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  quantityOnHand: z.number().default(0),
  reorderLevel: z.number().optional(),
  reorderQuantity: z.number().optional(),
  assetAccountId: z.string().min(1, 'Asset account is required'),
  cogsAccountId: z.string().min(1, 'COGS account is required'),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

const ItemUpdateSchema = ItemCreateSchema.partial().omit({ sku: true });

const ItemListSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  sortBy: z.enum(['name', 'sku', 'category', 'unitPrice', 'quantityOnHand', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * 📝 LIST ITEMS WITH SEARCH AND FILTERING
 * Advanced item listing with AI-powered search capabilities
 */
export const listItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    // Parse query parameters
    const query = ItemListSchema.parse(req.query);
    
    // Build where clause
    const where: any = { 
      tenantId,
      ...(query.category && { category: query.category }),
    };
    
    // Handle isActive filter - only apply if explicitly provided
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    // If no isActive filter is specified, show all items (both active and inactive)
    
    // AI-powered semantic search if search term provided
    if (query.search) {
      // Use AI to enhance search - extract relevant terms and concepts
      try {
        const searchAnalysis = await aiService.processNaturalLanguageQuery(
          `Analyze this search query for inventory items and extract key search terms, categories, and concepts: "${query.search}". Return as JSON with arrays: exactTerms, categories, concepts, priceRange (if mentioned).`,
          tenantId
        );

        const analysis = JSON.parse(searchAnalysis.answer || '{}');
        
        where.OR = [
          { name: { contains: query.search } },
          { description: { contains: query.search } },
          { sku: { contains: query.search } },
          { category: { contains: query.search } },
          // Add AI-enhanced search terms
          ...(analysis.exactTerms || []).map((term: string) => ({
            OR: [
              { name: { contains: term } },
              { description: { contains: term } },
            ]
          })),
        ];

        // Apply AI-suggested category filters
        if (analysis.categories?.length > 0) {
          where.category = { in: analysis.categories };
        }

        // Apply price range if AI detected it
        if (analysis.priceRange) {
          if (analysis.priceRange.min) where.unitPrice = { ...where.unitPrice, gte: analysis.priceRange.min };
          if (analysis.priceRange.max) where.unitPrice = { ...where.unitPrice, lte: analysis.priceRange.max };
        }

      } catch (aiError) {
        // Fallback to basic search if AI fails
        where.OR = [
          { name: { contains: query.search } },
          { description: { contains: query.search } },
          { sku: { contains: query.search } },
          { category: { contains: query.search } },
        ];
      }
    }

    // Get total count
    const total = await prisma.inventoryItem.count({ where });

    // Get items with pagination
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        assetAccount: { select: { id: true, name: true, code: true } },
        cogsAccount: { select: { id: true, name: true, code: true } },
      },
    });

    // AI-powered item insights for the current view
    const itemInsights = await generateItemListInsights(items, tenantId);

    res.json({
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
      insights: itemInsights,
    });

  } catch (error) {
    console.error('❌ Error listing items:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  }
};

/**
 * 📄 GET SINGLE ITEM WITH AI INSIGHTS
 * Retrieve item details with AI-powered market analysis and recommendations
 */
export const getItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    // Use the imported prisma client (already tenant-aware)

    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        assetAccount: true,
        cogsAccount: true,
        adjustments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // Generate AI insights for this specific item
    const itemInsights = await generateSingleItemInsights(item, tenantId);

    res.json({
      ...item,
      insights: itemInsights,
    });

  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

/**
 * ➕ CREATE NEW ITEM WITH AI ASSISTANCE
 * Create item with AI-powered SKU generation, category detection, and pricing suggestions
 */
export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    console.log('📝 Incoming item data:', req.body);

    // AI enhancement for item creation
    const enhancedData = await enhanceItemWithAI(req.body, tenantId);
    console.log('🔍 About to validate data...');
    const validatedData = ItemCreateSchema.parse(req.body);
    console.log('✅ Data validated successfully:', validatedData);

    // Use the imported prisma client (already tenant-aware)

    // Check for duplicate SKU
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { tenantId, sku: validatedData.sku },
    });

    if (existingItem) {
      res.status(400).json({ error: 'SKU already exists' });
      return;
    }

    // Create item
    const item = await prisma.inventoryItem.create({
      data: {
        ...validatedData,
        tenantId,
        unitCost: validatedData.unitCost,
        unitPrice: validatedData.unitPrice,
        quantityOnHand: validatedData.quantityOnHand,
        isActive: true, // Explicitly ensure the item is active
      },
      include: {
        assetAccount: true,
        cogsAccount: true,
      },
    });

    console.log('✅ Created item:', item.name);
    res.status(201).json(item);

  } catch (error) {
    console.error('❌ Error creating item:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid item data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create item' });
    }
  }
};

/**
 * ✏️ UPDATE ITEM WITH AI SUGGESTIONS
 * Update item with AI-powered change recommendations
 */
export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const validatedData = ItemUpdateSchema.parse(req.body);
    // Use the imported prisma client (already tenant-aware)

    // Check if item exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // AI-Enhanced Update Analysis
    const updateAnalysis = await analyzeItemUpdate(existingItem, validatedData, tenantId);

    // Update item
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.unitCost !== undefined && { unitCost: validatedData.unitCost }),
        ...(validatedData.unitPrice !== undefined && { unitPrice: validatedData.unitPrice }),
        ...(validatedData.quantityOnHand !== undefined && { quantityOnHand: validatedData.quantityOnHand }),
        updatedAt: new Date(),
      },
      include: {
        assetAccount: true,
        cogsAccount: true,
      },
    });

    res.json({
      ...item,
      updateAnalysis,
    });

  } catch (error) {
    console.error('❌ Error updating item:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid item data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update item' });
    }
  }
};

/**
 * 🗑️ DELETE ITEM
 * Soft delete item with dependency checking
 */
export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    // Use the imported prisma client (already tenant-aware)

    // Check if item exists and has dependencies
    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        adjustments: { take: 1 },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // Check for dependencies (adjustments, invoices, etc.)
    if (item.adjustments.length > 0) {
      // Soft delete - just mark as inactive
      await prisma.inventoryItem.update({
        where: { id },
        data: { isActive: false },
      });
      
      res.json({ 
        message: 'Item deactivated (has transaction history)',
        deactivated: true 
      });
    } else {
      // Hard delete if no dependencies
      await prisma.inventoryItem.delete({
        where: { id },
      });
      
      res.json({ 
        message: 'Item deleted successfully',
        deleted: true 
      });
    }

  } catch (error) {
    console.error('❌ Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

/**
 * 🤖 AI ITEM ASSISTANCE
 * Various AI-powered item management features
 */
export const aiItemAssistance = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const { action, data } = req.body;

    switch (action) {
      case 'generate_sku':
        const skuSuggestion = await generateSmartSKU(data, tenantId);
        res.json({ sku: skuSuggestion });
        break;

      case 'suggest_category':
        const categorySuggestion = await suggestItemCategory(data, tenantId);
        res.json({ category: categorySuggestion });
        break;

      case 'suggest_pricing':
        const pricingSuggestion = await suggestOptimalPricing(data, tenantId);
        res.json(pricingSuggestion);
        break;

      case 'market_analysis':
        const marketAnalysis = await performMarketAnalysis(data, tenantId);
        res.json(marketAnalysis);
        break;

      case 'reorder_optimization':
        const reorderSuggestion = await optimizeReorderLevels(data, tenantId);
        res.json(reorderSuggestion);
        break;

      default:
        res.status(400).json({ error: 'Unknown AI action' });
    }

  } catch (error) {
    console.error('❌ AI assistance error:', error);
    res.status(500).json({ error: 'AI assistance failed' });
  }
};

/**
 * 🎯 AI-POWERED ITEM ENHANCEMENT
 * Enhance item data with AI suggestions before creation
 */
async function enhanceItemWithAI(itemData: any, tenantId: string): Promise<any> {
  try {
    const enhancement = await aiService.processNaturalLanguageQuery(
      `Analyze this product/item data and enhance it with smart suggestions:
      Name: ${itemData.name}
      Description: ${itemData.description || 'Not provided'}
      Category: ${itemData.category || 'Not specified'}
      
      Please suggest:
      1. Optimal SKU format (if not provided: ${itemData.sku || 'generate one'})
      2. Best category classification
      3. Appropriate unit of measure
      4. Market-competitive pricing range
      5. Relevant metadata/tags
      
      Return as JSON: { suggestedSku, suggestedCategory, suggestedUom, pricingRange: {min, max}, metadata }`,
      tenantId
    );

    const suggestions = JSON.parse(enhancement.answer || '{}');
    
    return {
      ...itemData,
      sku: itemData.sku || suggestions.suggestedSku || generateFallbackSKU(itemData.name),
      category: itemData.category || suggestions.suggestedCategory || 'General',
      unitOfMeasure: itemData.unitOfMeasure || suggestions.suggestedUom || 'each',
      metadata: {
        ...itemData.metadata,
        aiSuggestions: suggestions,
        enhancedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('AI enhancement failed, using fallback:', error);
    return {
      ...itemData,
      sku: itemData.sku || generateFallbackSKU(itemData.name),
      category: itemData.category || 'General',
      unitOfMeasure: itemData.unitOfMeasure || 'each',
    };
  }
}

/**
 * 📊 GENERATE ITEM LIST INSIGHTS
 * AI analysis of current item list for business insights
 */
async function generateItemListInsights(items: any[], tenantId: string): Promise<any> {
  try {
    const analysis = await aiService.processNaturalLanguageQuery(
      `Analyze this inventory item list and provide business insights:
      Total items: ${items.length}
      Categories: ${[...new Set(items.map(i => i.category))].join(', ')}
      Price range: $${Math.min(...items.map(i => Number(i.unitPrice)))} - $${Math.max(...items.map(i => Number(i.unitPrice)))}
      Low stock items: ${items.filter(i => Number(i.quantityOnHand) < 10).length}
      
      Provide insights on:
      1. Inventory health
      2. Pricing opportunities
      3. Stock level concerns
      4. Category performance
      5. Recommendations
      
      Return as JSON with insights array.`,
      tenantId
    );

    return JSON.parse(analysis.answer || '{"insights": []}');
  } catch (error) {
    return { insights: ['Analysis temporarily unavailable'] };
  }
}

/**
 * 🔍 GENERATE SINGLE ITEM INSIGHTS
 * AI analysis for individual item performance and optimization
 */
async function generateSingleItemInsights(item: any, tenantId: string): Promise<any> {
  try {
    const analysis = await aiService.processNaturalLanguageQuery(
      `Analyze this inventory item and provide detailed insights:
      Name: ${item.name}
      Category: ${item.category}
      Current Price: $${item.unitPrice}
      Cost: $${item.unitCost}
      Stock: ${item.quantityOnHand}
      Margin: ${((Number(item.unitPrice) - Number(item.unitCost)) / Number(item.unitPrice) * 100).toFixed(2)}%
      
      Provide specific recommendations for:
      1. Pricing optimization
      2. Stock management
      3. Cost reduction opportunities
      4. Market positioning
      5. Profitability improvement
      
      Return as JSON with detailed analysis.`,
      tenantId
    );

    return JSON.parse(analysis.answer || '{"analysis": "Not available"}');
  } catch (error) {
    return { analysis: 'Analysis temporarily unavailable' };
  }
}

/**
 * 🏷️ GENERATE SMART SKU
 * AI-powered SKU generation based on item properties
 */
async function generateSmartSKU(data: any, tenantId: string): Promise<string> {
  try {
    const skuAnalysis = await aiService.processNaturalLanguageQuery(
      `Generate a short SKU code for this product:
      Name: ${data.name}
      Category: ${data.category || 'General'}
      
      Guidelines:
      - 6-12 characters maximum
      - Use category abbreviation (e.g., ELEC, OFF, TECH)
      - Include product identifiers
      - No special characters except dashes
      - Must be readable
      
      Return ONLY the SKU code, nothing else.`,
      tenantId
    );

    // Extract just the SKU from the response, handling various formats
    const rawSku = skuAnalysis.answer?.trim() || '';
    let cleanSku = rawSku;
    
    // Try to extract SKU from various response formats
    // Look for SKU patterns in order of preference
    
         // First try to find "SKU: XXXX" pattern
     const skuLabelMatch = rawSku.match(/SKU:\s*([A-Z0-9-]{3,20})/i);
     if (skuLabelMatch) {
       cleanSku = skuLabelMatch[1].toUpperCase().substring(0, 12); // Trim to 12 chars max
    } else {
             // Try to find hyphenated codes like ELEC-WLHPHNS or ELEC-WLHB-001
       const hyphenatedMatch = rawSku.match(/([A-Z]{2,6}[-_][A-Z0-9-]{3,20})/i);
       if (hyphenatedMatch) {
         cleanSku = hyphenatedMatch[1].toUpperCase().substring(0, 12); // Trim to 12 chars max
      } else {
        // Fallback to any uppercase code that looks like a SKU
        const allCapsMatch = rawSku.match(/\b([A-Z]{4,12})\b/);
        if (allCapsMatch) {
          cleanSku = allCapsMatch[1].toUpperCase();
        }
      }
    }
    
    // If still no clean SKU, use fallback
    if (cleanSku === rawSku || cleanSku.length < 3 || cleanSku.length > 12) {
      cleanSku = generateFallbackSKU(data.name);
    }
    
    return cleanSku;
  } catch (error) {
    return generateFallbackSKU(data.name);
  }
}

/**
 * 🏷️ SUGGEST ITEM CATEGORY
 * AI-powered category classification
 */
async function suggestItemCategory(data: any, tenantId: string): Promise<string> {
  try {
    const categoryAnalysis = await aiService.processNaturalLanguageQuery(
      `Classify this product into the most appropriate business category:
      Name: ${data.name}
      Description: ${data.description || 'No description'}
      
      Choose from common business categories like:
      - Office Supplies, Technology, Services, Consulting, Software, Hardware, etc.
      
      Return just the category name.`,
      tenantId
    );

    return categoryAnalysis.answer?.trim() || 'General';
  } catch (error) {
    return 'General';
  }
}

/**
 * 💰 SUGGEST OPTIMAL PRICING
 * AI-powered pricing recommendations
 */
async function suggestOptimalPricing(data: any, tenantId: string): Promise<any> {
  try {
    const pricingAnalysis = await aiService.processNaturalLanguageQuery(
      `Suggest optimal pricing for this product:
      Name: ${data.name}
      Category: ${data.category}
      Cost: $${data.unitCost || 'Not provided'}
      Current Price: $${data.unitPrice || 'Not set'}
      
      Consider:
      - Industry standards
      - Reasonable profit margins (20-50%)
      - Market competitiveness
      - Value positioning
      
      Return as JSON: { suggestedPrice, minPrice, maxPrice, margin, reasoning }`,
      tenantId
    );

    return JSON.parse(pricingAnalysis.answer || '{"suggestedPrice": 0, "reasoning": "Analysis unavailable"}');
  } catch (error) {
    return { suggestedPrice: 0, reasoning: 'Pricing analysis temporarily unavailable' };
  }
}

/**
 * 📈 PERFORM MARKET ANALYSIS
 * AI market research and competitive analysis
 */
async function performMarketAnalysis(data: any, tenantId: string): Promise<any> {
  try {
    const marketAnalysis = await aiService.processNaturalLanguageQuery(
      `Perform market analysis for this product:
      Name: ${data.name}
      Category: ${data.category}
      Price: $${data.unitPrice}
      
      Analyze:
      1. Market demand trends
      2. Competitive landscape
      3. Pricing positioning
      4. Growth opportunities
      5. Risk factors
      
      Return as JSON with detailed market insights.`,
      tenantId
    );

    return JSON.parse(marketAnalysis.answer || '{"analysis": "Market analysis unavailable"}');
  } catch (error) {
    return { analysis: 'Market analysis temporarily unavailable' };
  }
}

/**
 * 📦 OPTIMIZE REORDER LEVELS
 * AI-powered inventory optimization
 */
async function optimizeReorderLevels(data: any, tenantId: string): Promise<any> {
  try {
    const optimizationAnalysis = await aiService.processNaturalLanguageQuery(
      `Optimize reorder levels for this inventory item:
      Current Stock: ${data.quantityOnHand}
      Current Reorder Level: ${data.reorderLevel || 'Not set'}
      Current Reorder Quantity: ${data.reorderQuantity || 'Not set'}
      
      Consider typical business patterns:
      - Lead times (assume 1-2 weeks)
      - Seasonal variations
      - Economic order quantities
      - Storage costs vs stockout costs
      
      Return as JSON: { suggestedReorderLevel, suggestedReorderQuantity, reasoning }`,
      tenantId
    );

    return JSON.parse(optimizationAnalysis.answer || '{"reasoning": "Optimization unavailable"}');
  } catch (error) {
    return { reasoning: 'Reorder optimization temporarily unavailable' };
  }
}

/**
 * 🔄 ANALYZE ITEM UPDATE
 * AI analysis of item changes and their business impact
 */
async function analyzeItemUpdate(existingItem: any, updateData: any, tenantId: string): Promise<any> {
  try {
    const updateAnalysis = await aiService.processNaturalLanguageQuery(
      `Analyze the business impact of these item changes:
      
      Previous state:
      - Price: $${existingItem.unitPrice}
      - Cost: $${existingItem.unitCost}
      - Stock: ${existingItem.quantityOnHand}
      
      Proposed changes:
      - Price: $${updateData.unitPrice || existingItem.unitPrice}
      - Cost: $${updateData.unitCost || existingItem.unitCost}
      - Stock: ${updateData.quantityOnHand || existingItem.quantityOnHand}
      
      Analyze impact on:
      1. Profit margins
      2. Competitive positioning
      3. Cash flow
      4. Inventory valuation
      5. Recommendations
      
      Return as JSON with impact analysis.`,
      tenantId
    );

    return JSON.parse(updateAnalysis.answer || '{"impact": "Analysis unavailable"}');
  } catch (error) {
    return { impact: 'Update analysis temporarily unavailable' };
  }
}

/**
 * 🔧 UTILITY: Generate fallback SKU
 * Simple fallback SKU generation when AI fails
 */
function generateFallbackSKU(name: string): string {
  const words = name.toUpperCase().split(' ').filter(w => w.length > 2);
  const prefix = words.slice(0, 2).map(w => w.substring(0, 3)).join('');
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${timestamp}`;
} 