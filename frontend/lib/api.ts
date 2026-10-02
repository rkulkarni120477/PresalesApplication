import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to all requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      console.log('Request interceptor - checking token:', { url: config.url, hasToken: !!token });
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('Authorization header set for', config.url);
      } else {
        console.warn('No token found in localStorage for request:', config.url);
      }
      return config;
    });
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', { email, password });
    return response.data;
  }

  // Users
  async getCurrentUser() {
    const response = await this.client.get('/api/users/me');
    return response.data;
  }

  async getUsers() {
    const response = await this.client.get('/api/users');
    return response.data;
  }

  // Opportunities
  async getOpportunities(skip = 0, limit = 50, filters?: any) {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.user_id) params.append('user_id', String(filters.user_id));

    const response = await this.client.get(`/api/opportunities?${params}`);
    return response.data;
  }

  async assignOpportunity(opportunityId: number, userId: number) {
    const response = await this.client.post(
      `/api/opportunities/${opportunityId}/assign`,
      { assigned_to_user_id: userId }
    );
    return response.data;
  }

  async getOpportunity(id: number) {
    const response = await this.client.get(`/api/opportunities/${id}`);
    return response.data;
  }

  async createOpportunity(data: any) {
    const response = await this.client.post('/api/opportunities', data);
    return response.data;
  }

  async updateOpportunity(id: number, data: any) {
    const response = await this.client.put(`/api/opportunities/${id}`, data);
    return response.data;
  }

  // Artifacts
  async getArtifacts(skip = 0, limit = 50, filters?: any) {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (filters?.artifact_type) params.append('artifact_type', filters.artifact_type);
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.search) params.append('search', filters.search);

    const response = await this.client.get(`/api/artifacts?${params}`);
    return response.data;
  }

  async getArtifact(id: number) {
    const response = await this.client.get(`/api/artifacts/${id}`);
    return response.data;
  }

  async createArtifact(data: any) {
    const response = await this.client.post('/api/artifacts', data);
    return response.data;
  }

  async createArtifactWithFile(formData: FormData) {
    const response = await this.client.post('/api/artifacts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async searchArtifacts(query: string, limit: number = 5) {
    const params = new URLSearchParams({ query, limit: String(limit) });
    const response = await this.client.get(`/api/artifacts/search/vector?${params}`);
    return response.data;
  }

  async updateArtifact(id: number, data: any) {
    const response = await this.client.put(`/api/artifacts/${id}`, data);
    return response.data;
  }

  // Mappings
  async getOpportunityArtifacts(opportunityId: number) {
    const response = await this.client.get(`/api/opportunities/${opportunityId}/artifacts`);
    return response.data;
  }

  async mapArtifact(opportunityId: number, artifactId: number, purpose?: string) {
    const response = await this.client.post(
      `/api/opportunities/${opportunityId}/artifacts/${artifactId}`,
      { purpose }
    );
    return response.data;
  }

  async unmapArtifact(opportunityId: number, artifactId: number) {
    const response = await this.client.delete(
      `/api/opportunities/${opportunityId}/artifacts/${artifactId}`
    );
    return response.data;
  }

  // AI Features
  async generateOpportunitySummary(opportunityId: number) {
    const response = await this.client.post('/api/ai/opportunity-summary', { opp_id: opportunityId });
    return response.data;
  }

  async generateArtifactSummary(artifactId: number) {
    const response = await this.client.post('/api/ai/artifact-summary', { art_id: artifactId });
    return response.data;
  }

  async recommendArtifacts(opportunityId: number) {
    const response = await this.client.post('/api/ai/recommend-artifacts', { opp_id: opportunityId });
    return response.data;
  }

  async analyzeOpportunity(opportunityId: number) {
    const response = await this.client.post('/api/ai/analyze-opportunity', { opp_id: opportunityId });
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(skip = 0, limit = 50) {
    const response = await this.client.get(`/api/audit-logs?skip=${skip}&limit=${limit}`);
    return response.data;
  }

  // Health
  async getHealth() {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  async getAIHealth() {
    const response = await this.client.get('/api/health/ai');
    return response.data;
  }
}

export const apiClient = new APIClient();
