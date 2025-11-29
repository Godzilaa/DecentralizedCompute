/**
 * API Service Layer for ShelbyCompute Backend
 * Connects to FastAPI backend at http://127.0.0.1:8000
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export interface Job {
  jobId: string;
  status: 'pending' | 'assigned' | 'running' | 'finished' | 'failed';
  payload?: {
    jobId: string;
    datasetName: string;
    datasetUrl?: string;
    datasetHash?: string;
    meta?: Record<string, any>;
    createdAt: number;
  };
  assigned?: string;
  startedAt?: string;
  finishedAt?: string;
  result?: {
    modelHash?: string;
    meta?: Record<string, any>;
  };
}

export interface Node {
  nodeId: string;
  status: 'online' | 'offline' | 'maintenance';
  specs: {
    cpuUsage: number;
    ramUsage: number;
    totalRAM_GB: number;
    os: string;
    platform: string;
    processor: string;
  };
  lastSeen: string;
  uptime?: string;
  region?: string;
}

export interface LogEntry {
  jobId: string;
  line: string;
  ts: number;
}

export interface JobCreateRequest {
  jobId?: string;
  datasetName: string;
  datasetUrl?: string;
  datasetHash?: string;
  runtimeMinutesEstimate?: number;
  meta?: Record<string, any>;
}

export interface JobScriptUpload {
  jobId: string;
  script: string;
  requirements?: string;
  entrypoint?: string;
}

export interface NodeStats {
  total: number;
  online: number;
  offline: number;
  totalGpus: number;
  activeJobs: number;
}

class ApiService {
  private async fetch(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // If we can't parse the error response, use the default message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Jobs API
  async getJobs(): Promise<Job[]> {
    return this.fetch('/api/debug/jobs');
  }

  async createJob(job: JobCreateRequest): Promise<{ status: string; jobId: string }> {
    return this.fetch('/api/jobs/create', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  async uploadScript(script: JobScriptUpload): Promise<{ status: string; message: string }> {
    return this.fetch('/api/jobs/upload-script', {
      method: 'POST',
      body: JSON.stringify(script),
    });
  }

  async getJobScript(jobId: string): Promise<{ script: string; requirements: string; entrypoint: string }> {
    return this.fetch(`/api/jobs/fetch-script?jobId=${jobId}`);
  }

  // Nodes API  
  async getNodes(): Promise<{ nodes: Node[]; count: number }> {
    return this.fetch('/api/frontend/nodes');
  }

  async getNodeStats(): Promise<NodeStats> {
    return this.fetch('/api/frontend/node-stats');
  }

  async deleteNode(nodeId: string): Promise<{ status: string; message: string; nodeId: string }> {
    return this.fetch(`/api/frontend/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }

  // Logs API
  async getLogs(jobId?: string, limit: number = 100): Promise<LogEntry[]> {
    const params = new URLSearchParams();
    if (jobId) params.append('jobId', jobId);
    params.append('limit', limit.toString());
    
    return this.fetch(`/api/frontend/logs?${params}`);
  }

  async streamLogs(jobId: string, onLog: (log: LogEntry) => void): Promise<EventSource> {
    const eventSource = new EventSource(`${API_BASE_URL}/api/frontend/stream-logs/${jobId}`);
    
    eventSource.onmessage = (event) => {
      const log: LogEntry = JSON.parse(event.data);
      onLog(log);
    };

    return eventSource;
  }

  // System API
  async getSystemStats(): Promise<{
    activeJobs: number;
    totalJobs: number;
    gpuUtilization: number;
    networkIO: number;
    creditsSpent: number;
    creditsPerHour: number;
  }> {
    return this.fetch('/api/frontend/system-stats');
  }

  async getJobMetrics(jobId: string): Promise<{
    duration: number;
    gpuUsage: number[];
    cpuUsage: number[];
    memoryUsage: number[];
    timestamps: number[];
  }> {
    return this.fetch(`/api/frontend/job-metrics/${jobId}`);
  }

  // Earnings API
  async getEarningsByPublicKey(aptosPublicKey: string): Promise<{
    totalEarned: number;
    todayEarned: number;
    weeklyEarned: number;
    monthlyEarned: number;
    totalJobs: number;
    activeNodes: number;
    averageJobDuration: number;
    estimatedMonthly: number;
  }> {
    return this.fetch(`/api/frontend/earnings/${aptosPublicKey}`);
  }

  async getPaymentsByPublicKey(aptosPublicKey: string, limit: number = 50): Promise<{
    payments: Array<{
      id: string;
      jobId: string;
      nodeId: string;
      amount: number;
      currency: string;
      timestamp: number;
      status: string;
      txHash?: string;
      jobType: string;
      duration: number;
    }>;
    count: number;
  }> {
    return this.fetch(`/api/frontend/payments/${aptosPublicKey}?limit=${limit}`);
  }
}

export const api = new ApiService();

// React hooks for easy data fetching
import { useState, useEffect } from 'react';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getJobs()
      .then(setJobs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { jobs, loading, error, refetch: () => api.getJobs().then(setJobs) };
}

export function useNodes() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getNodes()
      .then(result => setNodes(result.nodes))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { nodes, loading, error, refetch: () => api.getNodes().then(result => setNodes(result.nodes)) };
}

export function useLogs(jobId?: string, limit: number = 100) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getLogs(jobId, limit)
      .then(setLogs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [jobId, limit]);

  return { logs, loading, error };
}

export function useSystemStats() {
  const [stats, setStats] = useState<{
    activeJobs: number;
    totalJobs: number;
    gpuUtilization: number;
    networkIO: number;
    creditsSpent: number;
    creditsPerHour: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSystemStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}