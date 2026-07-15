import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface AmazonConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sellerId: string;      // merchant id
  region: 'na' | 'eu' | 'fe'; // default 'na'
  marketplaceId?: string; // optional marketplace ID, defaults based on region
  accessToken?: string;
  accessTokenExpiry?: number;
}

export class AmazonClient {
  private config: AmazonConfig;
  private http: AxiosInstance;
  private tokenEndpoint: string;
  private apiEndpoint: string;

  private static readonly MARKETPLACE_IDS: Record<string, string> = {
    na: 'ATVPDKIKX0DER',
    eu: 'A1V9NK253MH1J8',
    fe: 'A19VAU5U5O7RUS',
  };

  constructor(config: AmazonConfig) {
    this.config = config;
    this.tokenEndpoint = 'https://api.amazon.com/auth/o2/token';
    const regions = {
      na: 'https://sellingpartnerapi-na.amazon.com',
      eu: 'https://sellingpartnerapi-eu.amazon.com',
      fe: 'https://sellingpartnerapi-fe.amazon.com',
    };
    this.apiEndpoint = regions[config.region] || regions.na;
    this.http = axios.create({ baseURL: this.apiEndpoint });
  }

  private get marketplaceId(): string {
    return this.config.marketplaceId || AmazonClient.MARKETPLACE_IDS[this.config.region] || AmazonClient.MARKETPLACE_IDS.na;
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
    const response = await axios.post(this.tokenEndpoint, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = response.data;
    this.config.accessToken = data.access_token;
    this.config.accessTokenExpiry = Date.now() + (data.expires_in * 1000);
  }

  private async request<T>(method: 'GET' | 'POST', path: string, data?: any): Promise<T> {
    await this.ensureAccessToken();
    const headers = {
      'x-amz-access-token': this.config.accessToken,
      'Content-Type': 'application/json',
    };
    const response = await this.http.request({ method, url: path, headers, data });
    if (response.data.errors) throw new Error(response.data.errors[0]?.message || 'Amazon API error');
    return response.data;
  }

  async getProducts(page = 1, pageSize = 100) {
    // SP-API uses nextToken pagination
    const result = await this.request<any>('GET', `/catalog/2022-04-01/items?marketplaceIds=${this.marketplaceId}&pageSize=${pageSize}&pageNumber=${page}`);
    return result.items || [];
  }

  async getOrders(sinceDate?: Date, page = 1, pageSize = 100) {
    let path = `/orders/v0/orders?MarketplaceIds=${this.marketplaceId}&PageSize=${pageSize}&PageNumber=${page}`;
    if (sinceDate) {
      path += `&CreatedAfter=${sinceDate.toISOString()}`;
    }
    const result = await this.request<any>('GET', path);
    return result.payload.Orders || [];
  }

  async getCustomers() {
    // Amazon Customer API is limited; derive customers from order buyer info
    return [];
  }
}
