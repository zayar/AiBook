import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { UserRole } from '@/types';

interface FirebaseConfig {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
}

interface CustomClaims {
  tenantId?: string;
  role?: string;
  permissions?: string[];
}

export class FirebaseService {
  private static instance: FirebaseService;
  private app: App | null = null;
  private auth: Auth | null = null;
  private initialized = false;
  private developmentMode = false;

  private constructor() {}

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      // Use service account key file for authentication
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json';
      
      const config: FirebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID || 'aiaccount-1c845',
      };

      if (!config.projectId) {
        console.warn('⚠️ Firebase project ID not configured');
        if (process.env.NODE_ENV === 'development') {
          console.log('📱 Running in development mode without Firebase');
          this.developmentMode = true;
          this.initialized = true;
          return true;
        }
        return false;
      }

      // Check if Firebase is already initialized
      if (getApps().length === 0) {
        try {
          // Use service account key file
          const fs = require('fs');
          const path = require('path');
          const fullPath = path.resolve(serviceAccountPath);
          if (fs.existsSync(fullPath)) {
            const serviceAccount = require(fullPath);
            this.app = initializeApp({
              credential: cert(serviceAccount),
              projectId: config.projectId,
            });
            console.log('✅ Firebase Admin SDK initialized with service account key file');
          } else {
            // Fallback: Use project ID only
            this.app = initializeApp({
              projectId: config.projectId,
            });
            console.log('✅ Firebase Admin SDK initialized with project ID only');
          }
        } catch (error) {
          console.warn('⚠️ Firebase initialization failed, falling back to development mode');
          console.error('Firebase error:', error);
          this.developmentMode = true;
          this.initialized = true;
          return true;
        }
      } else {
        this.app = getApps()[0];
        console.log('✅ Firebase Admin SDK already initialized');
      }

      if (this.app) {
        this.auth = getAuth(this.app);
      }
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error);
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Falling back to development mode');
        this.developmentMode = true;
        this.initialized = true;
        return true;
      }
      return false;
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
    if (this.developmentMode) {
      // Mock token verification for development
      console.log('📱 Mock token verification in development mode');
      return {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        aud: 'test',
        auth_time: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        iss: 'test',
        sub: 'dev-user-123',
        firebase: {
          identities: {},
          sign_in_provider: 'custom',
        },
      } as any;
    }

    if (!this.auth) {
      await this.initialize();
    }

    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Create a new user in Firebase
   */
  async createUser(email: string, password: string, displayName?: string): Promise<string> {
    if (this.developmentMode) {
      // Mock user creation for development
      console.log('📱 Mock user creation in development mode');
      return `dev-${Date.now()}`;
    }

    if (!this.auth) {
      await this.initialize();
    }

    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const userRecord = await this.auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

      return userRecord.uid;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Set custom claims for a user (tenant, role, permissions)
   */
  async setCustomClaims(uid: string, claims: CustomClaims): Promise<void> {
    if (this.developmentMode) {
      console.log(`📱 Mock set custom claims for user ${uid}:`, claims);
      return;
    }

    if (!this.auth) {
      await this.initialize();
    }

    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      await this.auth.setCustomUserClaims(uid, claims);
      console.log(`✅ Custom claims set for user ${uid}:`, claims);
    } catch (error) {
      console.error('Failed to set custom claims:', error);
      throw error;
    }
  }

  /**
   * Get user by UID
   */
  async getUser(uid: string) {
    if (this.developmentMode) {
      return {
        uid,
        email: 'dev@example.com',
        displayName: 'Development User',
        disabled: false,
      } as any;
    }

    if (!this.auth) {
      await this.initialize();
    }

    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      return await this.auth.getUser(uid);
    } catch (error) {
      console.error('Failed to get user:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(uid: string, properties: {
    email?: string;
    displayName?: string;
    disabled?: boolean;
  }) {
    if (this.developmentMode) {
      console.log(`📱 Mock update user ${uid}:`, properties);
      return { uid, ...properties } as any;
    }

    if (!this.auth) {
      await this.initialize();
    }

    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      return await this.auth.updateUser(uid, properties);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(uid: string): Promise<void> {
    if (this.developmentMode) {
      console.log(`📱 Mock delete user ${uid}`);
      return;
    }

    if (!this.auth) {
      await this.initialize();
    }

    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      await this.auth.deleteUser(uid);
      console.log(`✅ User ${uid} deleted from Firebase`);
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Sync Firebase user with database user
   */
  async syncUserWithDatabase(firebaseUser: DecodedIdToken, tenantId?: string): Promise<any> {
    try {
      // Check if user exists in database
      let dbUser = await prisma.user.findUnique({
        where: { firebaseUid: firebaseUser.uid },
      });

      if (!dbUser) {
        // Create new user in database
        const role = firebaseUser.admin ? UserRole.SUPER_ADMIN : UserRole.USER;
        
        dbUser = await prisma.user.create({
          data: {
            email: firebaseUser.email!,
            firebaseUid: firebaseUser.uid,
            name: firebaseUser.name || firebaseUser.email!.split('@')[0],
            role,
            tenantId: tenantId || firebaseUser.tenantId,
            isActive: true,
          },
        });

        console.log(`✅ Created database user for ${firebaseUser.email}`);
      }

      // Update custom claims if needed (only if not in development mode)
      if (!this.developmentMode) {
        const customClaims: CustomClaims = {
          tenantId: dbUser.tenantId || undefined,
          role: dbUser.role,
          permissions: this.getRolePermissions(dbUser.role as UserRole),
        };

        // Only update claims if they differ
        const currentClaims = firebaseUser;
        if (
          currentClaims.tenantId !== customClaims.tenantId ||
          currentClaims.role !== customClaims.role
        ) {
          await this.setCustomClaims(firebaseUser.uid, customClaims);
        }
      }

      return dbUser;
    } catch (error) {
      console.error('Failed to sync user with database:', error);
      throw error;
    }
  }

  /**
   * Get permissions based on user role
   */
  private getRolePermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: [
        'tenant:create',
        'tenant:update',
        'tenant:delete',
        'tenant:list',
        'user:create',
        'user:update',
        'user:delete',
        'account:create',
        'account:update',
        'account:delete',
        'transaction:create',
        'transaction:update',
        'transaction:delete',
      ],
      [UserRole.ADMIN]: [
        'tenant:update',
        'user:create',
        'user:update',
        'account:create',
        'account:update',
        'transaction:create',
        'transaction:update',
        'transaction:delete',
      ],
      [UserRole.USER]: [
        'account:read',
        'transaction:create',
        'transaction:read',
        'transaction:update',
      ],
      [UserRole.VIEWER]: [
        'account:read',
        'transaction:read',
      ],
    };

    return permissions[role] || permissions[UserRole.VIEWER];
  }

  /**
   * Generate custom token for a user (useful for testing)
   */
  async generateCustomToken(uid: string, claims?: CustomClaims): Promise<string> {
    if (this.developmentMode) {
      return `dev-token-${uid}-${Date.now()}`;
    }

    if (!this.auth) {
      await this.initialize();
    }

    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      return await this.auth.createCustomToken(uid, claims);
    } catch (error) {
      console.error('Failed to generate custom token:', error);
      throw error;
    }
  }

  /**
   * Check if Firebase is properly initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if running in development mode
   */
  isDevelopmentMode(): boolean {
    return this.developmentMode;
  }
}

export default FirebaseService.getInstance(); 