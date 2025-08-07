// Simple Payment Mode API - just name and description
export interface SimplePaymentMode {
  id: string;
  name: string;
  description?: string;
}

export class SimplePaymentModeAPI {
  /**
   * Get all payment modes (static data for now)
   */
  static async getPaymentModes(): Promise<SimplePaymentMode[]> {
    try {
      // Return static data - will make dynamic later
      return [
        { id: '1', name: 'Cash', description: 'Cash payments' },
        { id: '2', name: 'Bank Transfer', description: 'Bank transfer payments' },
        { id: '3', name: 'Credit Card', description: 'Credit card payments' },
        { id: '4', name: 'Check', description: 'Check payments' },
        { id: '5', name: 'Mobile Payment', description: 'Mobile wallet payments' }
      ];
    } catch (error) {
      console.error('Error fetching payment modes:', error);
      throw error;
    }
  }

  /**
   * Create a new payment mode
   */
  static async createPaymentMode(data: { name: string; description?: string }): Promise<SimplePaymentMode> {
    try {
      // Simulate API call - will make real later
      const newMode: SimplePaymentMode = {
        id: `new_${Date.now()}`,
        name: data.name,
        description: data.description
      };
      return newMode;
    } catch (error) {
      console.error('Error creating payment mode:', error);
      throw error;
    }
  }

  /**
   * Update an existing payment mode
   */
  static async updatePaymentMode(id: string, data: { name?: string; description?: string }): Promise<SimplePaymentMode> {
    try {
      // Simulate API call - will make real later
      const updatedMode: SimplePaymentMode = {
        id,
        name: data.name || 'Updated Mode',
        description: data.description
      };
      return updatedMode;
    } catch (error) {
      console.error('Error updating payment mode:', error);
      throw error;
    }
  }

  /**
   * Delete a payment mode
   */
  static async deletePaymentMode(id: string): Promise<{ message: string }> {
    try {
      // Simulate API call - will make real later
      return { message: 'Payment mode deleted successfully' };
    } catch (error) {
      console.error('Error deleting payment mode:', error);
      throw error;
    }
  }
}

export default SimplePaymentModeAPI;
