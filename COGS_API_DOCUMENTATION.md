# 🏭 Cost of Goods Sold (COGS) API Documentation

## Overview

The COGS (Cost of Goods Sold) module implements FIFO (First In, First Out) cost methodology for accurate inventory valuation and cost tracking. It integrates seamlessly with the ALE (Accounting Ledger Engine) framework to provide proper double-entry bookkeeping for all inventory transactions.

## Features

- **FIFO Cost Tracking**: Automatically tracks inventory cost layers using First In, First Out methodology
- **Automated COGS Calculation**: Calculates COGS when inventory items are sold
- **Cost Layer Management**: Manages individual cost layers for each inventory purchase
- **Inventory Returns**: Handles returns and reverses COGS calculations appropriately
- **Journal Entry Integration**: Creates proper double-entry journal entries for all COGS transactions
- **Comprehensive Reporting**: Provides detailed COGS reports and analytics

## Authentication

All endpoints require tenant authentication via the `x-tenant-id` header.

```
Headers:
x-tenant-id: your-tenant-id
Content-Type: application/json
```

## Base URL

```
/api/v1/cogs
```

---

## 📊 Inventory Cost Summary

### GET `/inventory/{inventoryItemId}/cost-summary`

Returns detailed cost summary for a specific inventory item including current cost layers.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inventoryItemId` | string | Yes | Unique identifier of the inventory item |

#### Response

```json
{
  "inventoryItem": {
    "id": "item_123",
    "sku": "WIDGET-001",
    "name": "Premium Widget",
    "description": "High-quality widget",
    "category": "Electronics",
    "unitOfMeasure": "each",
    "currentUnitCost": 12.50,
    "currentUnitPrice": 25.00,
    "quantityOnHand": 150,
    "assetAccount": {
      "id": "acc_456",
      "code": "1200",
      "name": "Inventory Assets"
    },
    "cogsAccount": {
      "id": "acc_789",
      "code": "5000",
      "name": "Cost of Goods Sold"
    }
  },
  "costSummary": {
    "totalQuantityOnHand": 150,
    "totalValue": 1875.00,
    "averageCost": 12.50,
    "costLayers": [
      {
        "id": "layer_001",
        "purchaseDate": "2024-01-01T00:00:00.000Z",
        "unitCost": 10.00,
        "originalQuantity": 100,
        "remainingQuantity": 50,
        "isFullyConsumed": false,
        "reference": "BILL-001-item123"
      },
      {
        "id": "layer_002",
        "purchaseDate": "2024-01-15T00:00:00.000Z",
        "unitCost": 15.00,
        "originalQuantity": 100,
        "remainingQuantity": 100,
        "isFullyConsumed": false,
        "reference": "BILL-002-item456"
      }
    ],
    "oldestLayerDate": "2024-01-01T00:00:00.000Z",
    "newestLayerDate": "2024-01-15T00:00:00.000Z"
  }
}
```

---

## 📋 COGS Calculations

### GET `/calculations`

Retrieves COGS calculations with optional filtering.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inventoryItemId` | string | No | Filter by specific inventory item |
| `fromDate` | string | No | Start date (YYYY-MM-DD) |
| `toDate` | string | No | End date (YYYY-MM-DD) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

#### Response

```json
{
  "calculations": [
    {
      "id": "cogs_123",
      "invoiceItemId": "inv_item_456",
      "inventoryItemId": "item_789",
      "quantitySold": 25,
      "totalCOGS": 312.50,
      "averageCostPerUnit": 12.50,
      "calculationDate": "2024-02-01T10:30:00.000Z",
      "journalEntryId": "je_001",
      "invoiceItem": {
        "invoice": {
          "invoiceNumber": "INV-001",
          "issueDate": "2024-02-01T00:00:00.000Z",
          "customerId": "cust_123"
        }
      },
      "inventoryItem": {
        "sku": "WIDGET-001",
        "name": "Premium Widget",
        "category": "Electronics"
      },
      "layerConsumptions": [
        {
          "id": "consumption_001",
          "costLayerId": "layer_001",
          "quantityConsumed": 25,
          "unitCost": 12.50,
          "totalCost": 312.50,
          "costLayer": {
            "purchaseDate": "2024-01-01T00:00:00.000Z",
            "unitCost": 12.50
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  },
  "summary": {
    "totalCalculations": 50,
    "totalCOGS": 12750.00,
    "totalQuantitySold": 1000,
    "averageCostPerUnit": 12.75
  }
}
```

### GET `/calculations/{id}`

Retrieves detailed information about a specific COGS calculation.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier of the COGS calculation |

#### Response

```json
{
  "calculation": {
    "id": "cogs_123",
    "invoiceItemId": "inv_item_456",
    "inventoryItemId": "item_789",
    "quantitySold": 25,
    "totalCOGS": 312.50,
    "averageCostPerUnit": 12.50,
    "calculationDate": "2024-02-01T10:30:00.000Z",
    "journalEntryId": "je_001"
  },
  "invoiceItem": {
    "id": "inv_item_456",
    "description": "Premium Widget Sale",
    "quantity": 25,
    "unitPrice": 25.00,
    "totalPrice": 625.00,
    "invoice": {
      "invoiceNumber": "INV-001",
      "issueDate": "2024-02-01T00:00:00.000Z",
      "totalAmount": 625.00,
      "customer": {
        "id": "cust_123",
        "name": "ABC Company",
        "email": "contact@abc.com"
      }
    }
  },
  "inventoryItem": {
    "id": "item_789",
    "sku": "WIDGET-001",
    "name": "Premium Widget",
    "description": "High-quality widget",
    "category": "Electronics",
    "assetAccount": {
      "code": "1200",
      "name": "Inventory Assets"
    },
    "cogsAccount": {
      "code": "5000",
      "name": "Cost of Goods Sold"
    }
  },
  "layerConsumptions": [
    {
      "id": "consumption_001",
      "quantityConsumed": 25,
      "unitCost": 12.50,
      "totalCost": 312.50,
      "costLayer": {
        "id": "layer_001",
        "purchaseDate": "2024-01-01T00:00:00.000Z",
        "unitCost": 12.50,
        "originalQuantity": 100,
        "remainingQuantity": 75,
        "reference": "BILL-001",
        "billItem": {
          "id": "bill_item_001",
          "description": "Widget Purchase",
          "bill": {
            "billNumber": "BILL-001",
            "billDate": "2024-01-01T00:00:00.000Z",
            "vendor": {
              "id": "vendor_123",
              "name": "Widget Supplier Inc"
            }
          }
        }
      }
    }
  ]
}
```

---

## 📦 Cost Layers

### GET `/cost-layers`

Retrieves inventory cost layers with filtering options.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inventoryItemId` | string | No | Filter by specific inventory item |
| `fromDate` | string | No | Start date for purchase date filter |
| `toDate` | string | No | End date for purchase date filter |
| `isFullyConsumed` | boolean | No | Filter by consumption status |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

#### Response

```json
{
  "costLayers": [
    {
      "id": "layer_001",
      "inventoryItemId": "item_789",
      "purchaseDate": "2024-01-01T00:00:00.000Z",
      "unitCost": 12.50,
      "originalQuantity": 100,
      "remainingQuantity": 75,
      "isFullyConsumed": false,
      "reference": "BILL-001-item789",
      "billItemId": "bill_item_001",
      "inventoryItem": {
        "sku": "WIDGET-001",
        "name": "Premium Widget",
        "category": "Electronics"
      },
      "billItem": {
        "id": "bill_item_001",
        "description": "Widget Purchase",
        "bill": {
          "billNumber": "BILL-001",
          "billDate": "2024-01-01T00:00:00.000Z",
          "vendor": {
            "id": "vendor_123",
            "name": "Widget Supplier Inc"
          }
        }
      },
      "consumptions": [
        {
          "id": "consumption_001",
          "quantityConsumed": 25,
          "unitCost": 12.50,
          "totalCost": 312.50,
          "cogsCalculation": {
            "invoiceItem": {
              "invoice": {
                "invoiceNumber": "INV-001",
                "issueDate": "2024-02-01T00:00:00.000Z"
              }
            }
          }
        }
      ],
      "totalValue": 937.50
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  },
  "summary": {
    "totalLayers": 25,
    "totalOriginalQuantity": 2500,
    "totalRemainingQuantity": 1500,
    "utilizationRate": 40.0
  }
}
```

---

## 🔄 Inventory Returns

### POST `/returns`

Processes inventory returns and reverses COGS calculations.

#### Request Body

```json
{
  "originalInvoiceItemId": "inv_item_456",
  "returnQuantity": 5,
  "returnDate": "2024-02-15",
  "reference": "RET-001",
  "notes": "Customer return - defective items"
}
```

#### Validation

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `originalInvoiceItemId` | string | Yes | Must be valid invoice item ID |
| `returnQuantity` | number | Yes | Must be positive, cannot exceed original quantity |
| `returnDate` | string | No | ISO date string (defaults to current date) |
| `reference` | string | No | Return reference number |
| `notes` | string | No | Additional notes |

#### Response

```json
{
  "message": "Inventory return processed successfully",
  "return": {
    "originalInvoiceItemId": "inv_item_456",
    "originalInvoiceNumber": "INV-001",
    "inventoryItemId": "item_789",
    "inventoryItemName": "Premium Widget",
    "returnQuantity": 5,
    "returnDate": "2024-02-15T00:00:00.000Z",
    "reference": "RET-001",
    "notes": "Customer return - defective items"
  },
  "updatedInventory": {
    "id": "item_789",
    "sku": "WIDGET-001",
    "name": "Premium Widget",
    "quantityOnHand": 155,
    "availableCostLayers": 3
  }
}
```

---

## 📊 COGS Reports

### GET `/reports`

Generates comprehensive COGS reports with various grouping options.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fromDate` | string | Yes | Start date (YYYY-MM-DD) |
| `toDate` | string | Yes | End date (YYYY-MM-DD) |
| `inventoryItemId` | string | No | Filter by specific inventory item |
| `groupBy` | enum | No | Group by: `item`, `category`, `month`, `day` (default: `item`) |
| `includeDetails` | boolean | No | Include detailed calculations (default: false) |

#### Response

```json
{
  "reportMetadata": {
    "fromDate": "2024-01-01T00:00:00.000Z",
    "toDate": "2024-12-31T23:59:59.999Z",
    "inventoryItemId": null,
    "groupBy": "item",
    "includeDetails": false,
    "generatedAt": "2024-02-20T10:30:00.000Z"
  },
  "overallTotals": {
    "totalCOGS": 45750.00,
    "totalQuantitySold": 3500,
    "totalCalculations": 150,
    "averageCostPerUnit": 13.07
  },
  "groupedData": [
    {
      "groupKey": "WIDGET-001 - Premium Widget",
      "totalCOGS": 25000.00,
      "totalQuantitySold": 2000,
      "averageCostPerUnit": 12.50,
      "calculationCount": 75,
      "calculations": [
        // Only included if includeDetails=true
        {
          "id": "cogs_123",
          "calculationDate": "2024-02-01T10:30:00.000Z",
          "quantitySold": 25,
          "totalCOGS": 312.50,
          "averageCostPerUnit": 12.50,
          "invoiceNumber": "INV-001",
          "layerConsumptions": [
            {
              "quantityConsumed": 25,
              "unitCost": 12.50,
              "totalCost": 312.50,
              "purchaseDate": "2024-01-01T00:00:00.000Z"
            }
          ]
        }
      ]
    },
    {
      "groupKey": "GADGET-002 - Super Gadget",
      "totalCOGS": 20750.00,
      "totalQuantitySold": 1500,
      "averageCostPerUnit": 13.83,
      "calculationCount": 75
    }
  ]
}
```

---

## Error Responses

All endpoints return standard HTTP status codes and error responses:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "returnQuantity",
      "message": "Return quantity cannot exceed original quantity"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Inventory item not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to calculate COGS",
  "details": "Insufficient inventory for FIFO calculation"
}
```

---

## Integration with Purchase Flow

When creating bills with inventory items, include the `inventoryItemId` in bill items:

```json
{
  "vendorId": "vendor_123",
  "billDate": "2024-01-01",
  "dueDate": "2024-01-31",
  "items": [
    {
      "description": "Widget Purchase",
      "quantity": 100,
      "unitPrice": 12.50,
      "inventoryItemId": "item_789"  // This triggers cost layer creation
    }
  ]
}
```

## Integration with Sales Flow

When creating invoices with inventory items and status "SENT", COGS is automatically calculated:

```json
{
  "customerId": "customer_123",
  "status": "SENT",  // This triggers COGS calculation
  "items": [
    {
      "inventoryItemId": "item_789",  // Links to inventory for COGS
      "description": "Widget Sale",
      "quantity": 25,
      "unitPrice": 25.00
    }
  ]
}
```

---

## Journal Entry Integration

All COGS transactions automatically create double-entry journal entries:

### Purchase (Cost Layer Creation)
No automatic journal entry for cost layer creation - handled by bill accounting.

### Sale (COGS Recognition)
```
DR: Cost of Goods Sold (Expense)    $312.50
CR: Inventory Assets (Asset)         $312.50
```

### Return (COGS Reversal)
```
DR: Inventory Assets (Asset)         $62.50
CR: Cost of Goods Sold (Expense)     $62.50
```

---

## Testing

Use the provided test script to validate the COGS flow:

```bash
# Run comprehensive COGS testing
node scripts/test-cogs-flow.js
```

The test script will:
1. Create sample inventory items
2. Process purchases to establish cost layers
3. Process sales to calculate COGS
4. Test inventory returns
5. Generate reports and validate FIFO logic
6. Verify journal entry accuracy

---

## Best Practices

1. **Always use inventory items**: Ensure bills and invoices reference `inventoryItemId` for proper COGS tracking
2. **FIFO compliance**: The system automatically handles FIFO logic - oldest cost layers are consumed first
3. **Return processing**: Always use the returns endpoint for inventory returns to properly reverse COGS
4. **Regular reporting**: Use the reporting endpoints to monitor cost accuracy and inventory utilization
5. **Cost layer monitoring**: Monitor cost layers to understand inventory aging and cost trends