import { apiClient } from "./api-client";

export interface CompanySettings {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxCode?: string;
  website?: string;
}

export interface GeneralSettings {
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
}

export interface NotificationSettings {
  lowStockAlert: boolean;
  newOrderAlert: boolean;
  paymentAlert: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
}

export interface AppearanceSettings {
  theme: string;
  primaryColor: string;
}

export interface TenantSettings {
  company: CompanySettings;
  general: GeneralSettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
}

export const settingsApi = {
  getTenantSettings: () => apiClient.get<TenantSettings>("/settings/tenant").then((r) => r.data),
  updateTenantSettings: (data: Partial<TenantSettings>) =>
    apiClient.patch<TenantSettings>("/settings/tenant", data).then((r) => r.data),
};
