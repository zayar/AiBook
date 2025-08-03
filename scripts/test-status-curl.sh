#!/bin/bash

echo "🧪 Testing Invoice Status Flow with CURL"
echo "========================================"

API_URL="http://localhost:3000/api/v1"
TENANT_ID="default"

# Step 1: Create DRAFT invoice
echo ""
echo "📝 Step 1: Creating DRAFT invoice..."

INVOICE_DATA='{
  "customerId": "cmdv4q95m0007smchi5s2potk",
  "issueDate": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
  "dueDate": "'$(date -u -v+30d +%Y-%m-%dT%H:%M:%S.000Z)'",
  "currency": "MMK",
  "items": [{
    "description": "Test Product",
    "quantity": 1,
    "unitPrice": 1000,
    "accountCode": "4000"
  }]
}'

# Create invoice
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/invoices" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d "$INVOICE_DATA")

echo "Create Response: $CREATE_RESPONSE"

# Extract invoice ID and number
INVOICE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.invoice.id // empty')
INVOICE_NUMBER=$(echo "$CREATE_RESPONSE" | jq -r '.invoice.invoiceNumber // empty')
INVOICE_STATUS=$(echo "$CREATE_RESPONSE" | jq -r '.invoice.status // empty')

if [ -z "$INVOICE_ID" ]; then
  echo "❌ Failed to create invoice"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo "✅ Created invoice: $INVOICE_NUMBER"
echo "   Status: $INVOICE_STATUS"
echo "   ID: $INVOICE_ID"

# Step 2: Check journal entries for DRAFT (should be 0)
echo ""
echo "🔍 Checking journal entries for DRAFT invoice..."

DRAFT_ENTRIES=$(curl -s "$API_URL/invoices/$INVOICE_ID/journal-entries" \
  -H "X-Tenant-ID: $TENANT_ID" | jq '.entries | length')

echo "   Journal entries for DRAFT: $DRAFT_ENTRIES (expected: 0)"

if [ "$DRAFT_ENTRIES" != "0" ]; then
  echo "❌ ERROR: DRAFT invoice should not have journal entries!"
  exit 1
fi

# Step 3: Send the invoice (DRAFT → SENT)
echo ""
echo "📤 Step 2: Sending invoice (DRAFT → SENT)..."

SEND_RESPONSE=$(curl -s -X POST "$API_URL/invoices/$INVOICE_ID/send" \
  -H "X-Tenant-ID: $TENANT_ID")

echo "Send Response: $SEND_RESPONSE"

SENT_STATUS=$(echo "$SEND_RESPONSE" | jq -r '.invoice.status // empty')

if [ "$SENT_STATUS" != "SENT" ]; then
  echo "❌ Failed to send invoice"
  echo "Response: $SEND_RESPONSE"
  exit 1
fi

echo "✅ Invoice sent successfully"
echo "   New Status: $SENT_STATUS"

# Step 4: Check journal entries for SENT (should be 2-3)
echo ""
echo "🔍 Checking journal entries for SENT invoice..."

SENT_ENTRIES_RESPONSE=$(curl -s "$API_URL/invoices/$INVOICE_ID/journal-entries" \
  -H "X-Tenant-ID: $TENANT_ID")

SENT_ENTRIES_COUNT=$(echo "$SENT_ENTRIES_RESPONSE" | jq '.entries | length')
echo "   Journal entries for SENT: $SENT_ENTRIES_COUNT (expected: 2-3)"

if [ "$SENT_ENTRIES_COUNT" = "0" ]; then
  echo "❌ ERROR: SENT invoice should have journal entries!"
  exit 1
fi

# Show entry details
echo "   Entry Details:"
echo "$SENT_ENTRIES_RESPONSE" | jq -r '.entries[] | "     \(.type): \(.account.name) (\(.account.code)) - \(.amount)"'

# Check if entries are balanced
TOTAL_DEBITS=$(echo "$SENT_ENTRIES_RESPONSE" | jq '[.entries[] | select(.type == "DEBIT") | .amount | tonumber] | add // 0')
TOTAL_CREDITS=$(echo "$SENT_ENTRIES_RESPONSE" | jq '[.entries[] | select(.type == "CREDIT") | .amount | tonumber] | add // 0')

echo "   Totals: Debits $TOTAL_DEBITS, Credits $TOTAL_CREDITS"

# Check if balanced (allowing for small floating point differences)
BALANCE_DIFF=$(echo "$TOTAL_DEBITS - $TOTAL_CREDITS" | bc -l)
BALANCE_DIFF_ABS=$(echo "$BALANCE_DIFF" | bc -l | sed 's/-//')

if (( $(echo "$BALANCE_DIFF_ABS < 0.01" | bc -l) )); then
  echo "   Balanced: ✅"
else
  echo "   Balanced: ❌"
  echo "❌ ERROR: Journal entries are not balanced!"
  exit 1
fi

echo ""
echo "🎉 Test Completed Successfully!"
echo "✅ DRAFT invoice created without journal entries"
echo "✅ SENT invoice created proper journal entries"
echo "✅ Journal entries are balanced"
echo "✅ Status transitions work correctly"