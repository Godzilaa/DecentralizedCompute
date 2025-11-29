"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

// Mock WebSocket URL
const PHOTON_WS_URL = 'wss://localhost:4000';

// Message types
export type PhotonMessageType = 
  | 'log'
  | 'metric'
  | 'status'
  | 'heartbeat'
  | 'subscribe'
  | 'unsubscribe'
  | 'error';

export interface PhotonMessage {
  type: PhotonMessageType;
  payload: unknown;
  timestamp: number;
  jobId?: string;
}

export interface LogMessage {
  level: 'info' | 'warn' | 'error' | 'system' | 'chain' | 'metric';
  message: string;
  timestamp: number;
  jobId: string;
}

export interface MetricMessage {
  gpuUtil: number;
  gpuTemp: number;
  memUsage: number;
  loss?: number;
  step?: number;
  epoch?: number;
  jobId: string;
}

export type PhotonStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UsePhotonOptions {
  autoConnect?: boolean;
  heartbeatInterval?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UsePhotonReturn {
  status: PhotonStatus;
  error: string | null;
  lastMessage: PhotonMessage | null;
  connect: () => void;
  disconnect: () => void;
  send: (type: PhotonMessageType, payload: unknown) => void;
  subscribeToLogs: (jobId: string) => void;
  unsubscribeFromLogs: (jobId: string) => void;
}

export function usePhoton(options: UsePhotonOptions = {}): UsePhotonReturn {
  const {
    autoConnect = false,
    heartbeatInterval = 30000,
    reconnectAttempts = 3,
    reconnectDelay = 2000,
  } = options;

  const [status, setStatus] = useState<PhotonStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<PhotonMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const subscribedJobsRef = useRef<Set<string>>(new Set());
  const messageHandlersRef = useRef<Map<string, (msg: PhotonMessage) => void>>(new Map());

  /**
   * Clear heartbeat interval
   */
  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  /**
   * Start heartbeat ping to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const heartbeatMsg: PhotonMessage = {
          type: 'heartbeat',
          payload: { ping: Date.now() },
          timestamp: Date.now(),
        };
        wsRef.current.send(JSON.stringify(heartbeatMsg));
        console.log('[Photon] Heartbeat sent');
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, clearHeartbeat]);

  /**
   * Handle incoming WebSocket messages
   */
  const onMessage = useCallback((event: MessageEvent) => {
    try {
      const message: PhotonMessage = JSON.parse(event.data);
      setLastMessage(message);

      // Handle heartbeat response
      if (message.type === 'heartbeat') {
        console.log('[Photon] Heartbeat acknowledged');
        return;
      }

      // Dispatch to job-specific handlers
      if (message.jobId && messageHandlersRef.current.has(message.jobId)) {
        const handler = messageHandlersRef.current.get(message.jobId);
        handler?.(message);
      }

      console.log('[Photon] Message received:', message.type, message.payload);
    } catch (err) {
      console.error('[Photon] Failed to parse message:', err);
    }
  }, []);

  /**
   * Connect to Photon WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Photon] Already connected');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      console.log('[Photon] Connecting to', PHOTON_WS_URL);
      const ws = new WebSocket(PHOTON_WS_URL);

      ws.onopen = () => {
        console.log('[Photon] Connected');
        setStatus('connected');
        setError(null);
        reconnectCountRef.current = 0;
        startHeartbeat();

        // Re-subscribe to any previously subscribed jobs
        subscribedJobsRef.current.forEach((jobId) => {
          const subMsg: PhotonMessage = {
            type: 'subscribe',
            payload: { jobId },
            timestamp: Date.now(),
            jobId,
          };
          ws.send(JSON.stringify(subMsg));
        });
      };

      ws.onmessage = onMessage;

      ws.onerror = (event) => {
        console.error('[Photon] WebSocket error:', event);
        setError('Connection error occurred');
        setStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[Photon] Disconnected:', event.code, event.reason);
        setStatus('disconnected');
        clearHeartbeat();

        // Attempt reconnect if not a clean close
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          console.log(`[Photon] Reconnecting... (attempt ${reconnectCountRef.current}/${reconnectAttempts})`);
          setTimeout(connect, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[Photon] Failed to connect:', err);
      setError('Failed to establish connection');
      setStatus('error');
    }
  }, [onMessage, startHeartbeat, clearHeartbeat, reconnectAttempts, reconnectDelay]);

  /**
   * Disconnect from Photon WebSocket server
   */
  const disconnect = useCallback(() => {
    clearHeartbeat();
    reconnectCountRef.current = reconnectAttempts; // Prevent auto-reconnect

    if (wsRef.current) {
      console.log('[Photon] Disconnecting...');
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setStatus('disconnected');
    subscribedJobsRef.current.clear();
    messageHandlersRef.current.clear();
  }, [clearHeartbeat, reconnectAttempts]);

  /**
   * Send a message through WebSocket
   */
  const send = useCallback((type: PhotonMessageType, payload: unknown) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[Photon] Cannot send - not connected');
      return;
    }

    const message: PhotonMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    wsRef.current.send(JSON.stringify(message));
    console.log('[Photon] Sent:', type, payload);
  }, []);

  /**
   * Subscribe to log stream for a specific job
   */
  const subscribeToLogs = useCallback((jobId: string, handler?: (msg: PhotonMessage) => void) => {
    subscribedJobsRef.current.add(jobId);

    if (handler) {
      messageHandlersRef.current.set(jobId, handler);
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const subMsg: PhotonMessage = {
        type: 'subscribe',
        payload: { jobId, channels: ['logs', 'metrics', 'status'] },
        timestamp: Date.now(),
        jobId,
      };
      wsRef.current.send(JSON.stringify(subMsg));
      console.log('[Photon] Subscribed to logs for job:', jobId);
    } else {
      console.log('[Photon] Will subscribe to', jobId, 'when connected');
    }
  }, []);

  /**
   * Unsubscribe from log stream for a specific job
   */
  const unsubscribeFromLogs = useCallback((jobId: string) => {
    subscribedJobsRef.current.delete(jobId);
    messageHandlersRef.current.delete(jobId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const unsubMsg: PhotonMessage = {
        type: 'unsubscribe',
        payload: { jobId },
        timestamp: Date.now(),
        jobId,
      };
      wsRef.current.send(JSON.stringify(unsubMsg));
      console.log('[Photon] Unsubscribed from logs for job:', jobId);
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    error,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribeToLogs,
    unsubscribeFromLogs,
  };
}

export default usePhoton;
