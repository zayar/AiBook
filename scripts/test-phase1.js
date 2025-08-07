const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Phase 1 Testing Script
 * Test the AI-enhanced schema and functionality
 */
async function testPhase1() {
  console.log('🧪 Starting Phase 1 AI-enhanced system tests...');
  
  try {
    // 1. Test enhanced schema exists
    await testEnhancedSchema();
    
    // 2. Test business context creation
    await testBusinessContext();
    
    // 3. Test business insights
    await testBusinessInsights();
    
    // 4. Test financial KPIs
    await testFinancialKPIs();
    
    // 5. Test AI model performance tracking
    await testAIModelPerformance();
    
    console.log('✅ All Phase 1 tests passed!');
  } catch (error) {
    console.error('❌ Phase 1 tests failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testEnhancedSchema() {
  console.log('📋 Testing enhanced schema...');
  
  // Get the tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error('No tenant found for testing');
  }
  
  console.log(`Found tenant: ${tenant.name} (${tenant.id})`);
  
  // Create a book for testing
  const book = await prisma.book.create({
    data: {
      name: 'Test Book',
      currency: 'USD',
      tenantId: tenant.id
    }
  });
  
  // Create an account for testing
  const account = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Test Cash Account',
      type: 'ASSET',
      tenantId: tenant.id,
      bookId: book.id
    }
  });
  
  // Test enhanced entry creation with AI fields
  const entry = await prisma.entry.create({
    data: {
      accountId: account.id,
      bookId: book.id,
      tenantId: tenant.id,
      amount: 1000.00,
      type: 'DEBIT',
      memo: 'Test transaction with AI fields',
      journalId: `journal_${Date.now()}`,
      
      // Enhanced AI fields
      aiInsights: {
        category: 'test_transaction',
        confidence: 0.95,
        reasoning: ['Automated test entry']
      },
      confidence: 0.95,
      automationLevel: 'AI_SUGGESTED',
      impactScore: 0.7,
      riskScore: 0.2,
      semanticCategories: {
        amount_range: 'medium',
        transaction_type: 'business_expense'
      },
      predictiveFactors: {
        day_of_week: new Date().getDay(),
        hour_of_day: new Date().getHours()
      }
    }
  });
  
  console.log(`✅ Created enhanced entry with ID: ${entry.id}`);
}

async function testBusinessContext() {
  console.log('🏢 Testing business context creation...');
  
  const tenant = await prisma.tenant.findFirst();
  
  const businessContext = await prisma.businessContext.create({
    data: {
      tenantId: tenant.id,
      businessUnit: 'Sales',
      project: 'Q1 Marketing Campaign',
      entitySegment: 'enterprise',
      entityTier: 'gold',
      lifetimeValue: 25000.00,
      riskProfile: 'low',
      relationshipLength: 180,
      paymentHistory: {
        averagePaymentDays: 15,
        onTimePayments: 95,
        totalTransactions: 24
      },
      marketConditions: {
        industry: 'Technology',
        economicIndicator: 'stable',
        competitivePosition: 'strong'
      },
      userDecisionPatterns: {
        preferredCategories: ['Software', 'Consulting'],
        approvalSpeed: 'fast'
      }
    }
  });
  
  console.log(`✅ Created business context with ID: ${businessContext.id}`);
}

async function testBusinessInsights() {
  console.log('💡 Testing business insights creation...');
  
  const tenant = await prisma.tenant.findFirst();
  
  const insight = await prisma.businessInsight.create({
    data: {
      tenantId: tenant.id,
      type: 'OPPORTUNITY',
      category: 'Revenue',
      priority: 'HIGH',
      confidence: 0.87,
      title: 'Revenue Growth Opportunity Detected',
      description: 'AI analysis indicates potential for 20% revenue increase through customer upselling based on historical patterns.',
      actionable: true,
      recommendations: {
        primaryActions: [
          'Implement customer success program',
          'Create targeted upselling campaigns',
          'Analyze customer usage patterns'
        ],
        timeline: '30-45 days',
        estimatedEffort: 'Medium',
        expectedROI: '15-25%'
      },
      potentialImpact: 15000.00,
      timeframe: 'Q2 2024',
      effort: 'Medium',
      dataPoints: {
        analysisMethod: 'AI Pattern Recognition',
        dataSource: 'Historical Revenue Data',
        sampleSize: 150,
        confidenceInterval: '85-90%'
      },
      relatedEntities: {
        customers: ['enterprise_segment'],
        products: ['premium_plans'],
        timeframe: 'last_6_months'
      }
    }
  });
  
  console.log(`✅ Created business insight with ID: ${insight.id}`);
}

async function testFinancialKPIs() {
  console.log('📊 Testing financial KPIs creation...');
  
  const tenant = await prisma.tenant.findFirst();
  
  const kpi = await prisma.financialKPI.create({
    data: {
      tenantId: tenant.id,
      name: 'Monthly Recurring Revenue',
      category: 'Revenue',
      calculation: {
        formula: 'SUM(recurring_revenue) WHERE period = current_month',
        dataSource: 'subscription_invoices',
        updateFrequency: 'daily'
      },
      currentValue: 45000.00,
      previousValue: 42000.00,
      targetValue: 50000.00,
      benchmarkValue: 47500.00,
      trend: 'UP',
      changePercent: 7.14,
      predictedValue: 48000.00,
      predictionConfidence: 0.82,
      period: new Date()
    }
  });
  
  console.log(`✅ Created financial KPI with ID: ${kpi.id}`);
}

async function testAIModelPerformance() {
  console.log('🤖 Testing AI model performance tracking...');
  
  const tenant = await prisma.tenant.findFirst();
  
  const performance = await prisma.aIModelPerformance.create({
    data: {
      tenantId: tenant.id,
      modelType: 'transaction_categorization',
      accuracy: 0.92,
      precision: 0.89,
      recall: 0.94,
      f1Score: 0.915,
      timesSaved: 120, // minutes
      errorsDetected: 8,
      revenueImpact: 5000.00,
      trainingDataPoints: 1500,
      lastTrainingDate: new Date(),
      improvementRate: 0.05,
      period: new Date()
    }
  });
  
  console.log(`✅ Created AI model performance record with ID: ${performance.id}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPhase1()
    .then(() => {
      console.log('🎉 Phase 1 testing completed successfully!');
      console.log('🚀 AI-enhanced schema is ready for use.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Phase 1 testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testPhase1 };