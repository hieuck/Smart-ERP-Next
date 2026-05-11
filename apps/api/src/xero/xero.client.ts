import axios from 'axios';

export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId: string;
  accessToken?: string;
  accessTokenExpiry?: number;
  organisationId?: string;
}

export class XeroClient {
  private config: XeroConfig;
  private tokenUrl = 'https://identity.xero.com/connect/token';
  private apiBase = 'https://api.xero.com';

  constructor(config: XeroConfig) {
    this.config = config;
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.config.accessToken && this.config.accessTokenExpiry && Date.now() < this.config.accessTokenExpiry) {
      return;
    }
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', this.config.refreshToken);
    params.append('client_id', this.config.clientId);
    params.append('client_secret', this.config.clientSecret);
    const response = await axios.post(this.tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = response.data;
    this.config.accessToken = data.access_token;
    this.config.accessTokenExpiry = Date.now() + data.expires_in * 1000;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, data?: any): Promise<T> {
    await this.ensureAccessToken();
    const headers = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Xero-tenant-id': this.config.tenantId,
      'Content-Type': 'application/json',
    };
    const response = await axios.request({ method, url: `${this.apiBase}${path}`, headers, data });
    return response.data;
  }

  async getOrganisations(): Promise<any> {
    const res = await this.request('GET', '/api.xro/2.0/Organisation');
    return res.Organisations?.[0] || null;
  }

  async getCustomers(page = 1, pageSize = 100) {
    const res = await this.request('GET', `/api.xro/2.0/Contacts?page=${page}&pageSize=${pageSize}`);
    return res.Contacts || [];
  }

  async getInvoices(modifiedSince?: Date, page = 1, pageSize = 100) {
    let url = `/api.xro/2.0/Invoices?page=${page}&pageSize=${pageSize}`;
    if (modifiedSince) {
      url += `&modifiedAfter=${modifiedSince.toISOString()}`;
    }
    const res = await this.request('GET', url);
    return res.Invoices || [];
  }

  async getPayments(modifiedSince?: Date, page = 1, pageSize = 100) {
    let url = `/api.xro/2.0/Payments?page=${page}&pageSize=${pageSize}`;
    if (modifiedSince) {
      url += `&modifiedAfter=${modifiedSince.toISOString()}`;
    }
    const res = await this.request('GET', url);
    return res.Payments || [];
  }
}
