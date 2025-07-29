import request from 'supertest'
import app from '../../src/index'

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status')
      expect(response.body.status).toBe('ok')
    })
  })

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe(userData.email)
    })

    it('should generate test token in development', async () => {
      const tokenData = {
        uid: 'test-user-123',
        tenantId: 'default',
        role: 'USER'
      }

      const response = await request(app)
        .post('/api/v1/auth/generate-test-token')
        .send(tokenData)
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
    })
  })

  describe('Tenant Management', () => {
    it('should get current tenant', async () => {
      const response = await request(app)
        .get('/api/v1/tenants/current')
        .set('x-tenant-id', 'default')
        .expect(200)

      expect(response.body).toHaveProperty('tenant')
      expect(response.body.tenant.tenantId).toBe('default')
    })

    it('should get tenant statistics', async () => {
      const response = await request(app)
        .get('/api/v1/tenants/stats')
        .set('x-tenant-id', 'default')
        .expect(200)

      expect(response.body).toHaveProperty('stats')
      expect(response.body.stats).toHaveProperty('totalUsers')
      expect(response.body.stats).toHaveProperty('totalTransactions')
    })
  })

  describe('Accounting', () => {
    it('should get chart of accounts', async () => {
      const response = await request(app)
        .get('/api/v1/accounts')
        .set('x-tenant-id', 'default')
        .expect(200)

      expect(response.body).toHaveProperty('accounts')
      expect(Array.isArray(response.body.accounts)).toBe(true)
    })

    it('should create journal entry', async () => {
      const journalEntry = {
        memo: 'Test journal entry',
        reference: 'TEST-001',
        entries: [
          {
            accountCode: '1111',
            amount: 1000,
            type: 'DEBIT'
          },
          {
            accountCode: '3100',
            amount: 1000,
            type: 'CREDIT'
          }
        ]
      }

      const response = await request(app)
        .post('/api/v1/transactions/journal-entries')
        .set('x-tenant-id', 'default')
        .send(journalEntry)
        .expect(201)

      expect(response.body).toHaveProperty('journalEntry')
      expect(response.body.journalEntry.memo).toBe(journalEntry.memo)
    })

    it('should reject unbalanced journal entry', async () => {
      const unbalancedEntry = {
        memo: 'Unbalanced entry',
        reference: 'TEST-002',
        entries: [
          {
            accountCode: '1111',
            amount: 1000,
            type: 'DEBIT'
          },
          {
            accountCode: '3100',
            amount: 500, // Unbalanced
            type: 'CREDIT'
          }
        ]
      }

      const response = await request(app)
        .post('/api/v1/transactions/journal-entries')
        .set('x-tenant-id', 'default')
        .send(unbalancedEntry)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('balance')
    })

    it('should get trial balance', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/trial-balance')
        .set('x-tenant-id', 'default')
        .expect(200)

      expect(response.body).toHaveProperty('trialBalance')
      expect(response.body.trialBalance).toHaveProperty('accounts')
      expect(response.body.trialBalance).toHaveProperty('totalDebits')
      expect(response.body.trialBalance).toHaveProperty('totalCredits')
    })
  })

  describe('AI Services', () => {
    it('should categorize transaction', async () => {
      const transaction = {
        description: 'STAPLES OFFICE SUPPLIES',
        amount: 45.99,
        merchant: 'Staples',
        date: '2024-01-15'
      }

      const response = await request(app)
        .post('/api/v1/ai/categorize-transaction')
        .set('x-tenant-id', 'default')
        .send(transaction)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('category')
      expect(response.body.data).toHaveProperty('confidence')
    })

    it('should get AI insights', async () => {
      const response = await request(app)
        .get('/api/v1/ai/insights?period=3m')
        .set('x-tenant-id', 'default')
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('insights')
      expect(Array.isArray(response.body.data.insights)).toBe(true)
    })

    it('should forecast cash flow', async () => {
      const response = await request(app)
        .get('/api/v1/ai/forecast-cashflow?periods=6')
        .set('x-tenant-id', 'default')
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('forecast')
      expect(response.body.data.forecast).toHaveProperty('periods')
    })

    it('should process natural language query', async () => {
      const query = {
        query: 'How is my cash flow this month?'
      }

      const response = await request(app)
        .post('/api/v1/ai/query')
        .set('x-tenant-id', 'default')
        .send(query)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('answer')
      expect(response.body.data).toHaveProperty('confidence')
    })
  })

  describe('Multi-tenancy', () => {
    it('should isolate data between tenants', async () => {
      // Create entry for tenant-1
      const entry1 = {
        memo: 'Tenant 1 entry',
        reference: 'T1-001',
        entries: [
          { accountCode: '1111', amount: 100, type: 'DEBIT' },
          { accountCode: '3100', amount: 100, type: 'CREDIT' }
        ]
      }

      await request(app)
        .post('/api/v1/transactions/journal-entries')
        .set('x-tenant-id', 'tenant-1')
        .send(entry1)
        .expect(201)

      // Create entry for tenant-2
      const entry2 = {
        memo: 'Tenant 2 entry',
        reference: 'T2-001',
        entries: [
          { accountCode: '1111', amount: 200, type: 'DEBIT' },
          { accountCode: '3100', amount: 200, type: 'CREDIT' }
        ]
      }

      await request(app)
        .post('/api/v1/transactions/journal-entries')
        .set('x-tenant-id', 'tenant-2')
        .send(entry2)
        .expect(201)

      // Verify tenant-1 only sees their data
      const response1 = await request(app)
        .get('/api/v1/transactions/trial-balance')
        .set('x-tenant-id', 'tenant-1')
        .expect(200)

      expect(response1.body.trialBalance.totalDebits).toBe(100)

      // Verify tenant-2 only sees their data
      const response2 = await request(app)
        .get('/api/v1/transactions/trial-balance')
        .set('x-tenant-id', 'tenant-2')
        .expect(200)

      expect(response2.body.trialBalance.totalDebits).toBe(200)
    })

    it('should reject requests without tenant ID', async () => {
      const response = await request(app)
        .get('/api/v1/accounts')
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('tenant')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/api/v1/invalid-route')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/transactions/journal-entries')
        .set('x-tenant-id', 'default')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })
}) 