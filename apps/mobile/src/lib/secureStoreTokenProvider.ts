/**
 * SecureStore-based TokenProvider for mobile.
 * Pass this to SyncService constructor on mobile.
 */
import * as SecureStore from 'expo-secure-store';
import type { TokenProvider } from '@smart-erp/sync';

export class SecureStoreTokenProvider implements TokenProvider {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync('access_token');
  }

  async getTenantId(): Promise<string | null> {
    return SecureStore.getItemAsync('tenant_id');
  }

  async getDeviceId(): Promise<string> {
    let id = await SecureStore.getItemAsync('device_id');
    if (!id) {
      id = `mobile_${Math.random().toString(36).slice(2, 10)}`;
      await SecureStore.setItemAsync('device_id', id);
    }
    return id;
  }
}
