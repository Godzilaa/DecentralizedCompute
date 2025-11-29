/**
 * MOCK DATA & TYPES
 */

export const MOCK_JOBS = [
    { id: 'job-x92-alpha', name: 'Llama-3-70b-FineTune', status: 'running', type: 'Training', gpu: '8x H100', duration: '4h 12m', cost: '12.42 PHOTON' },
    { id: 'job-b21-delta', name: 'Stable-Diffusion-XL-Inference', status: 'completed', type: 'Inference', gpu: '1x A100', duration: '45m', cost: '0.85 PHOTON' },
    { id: 'job-c55-gamma', name: 'Protein-Folding-Sim-V2', status: 'queued', type: 'Simulation', gpu: '4x A6000', duration: '-', cost: 'Est. 4.20 PHOTON' },
    { id: 'job-f11-omega', name: 'RAG-Vector-Embeddings', status: 'failed', type: 'Data Proc', gpu: '2x T4', duration: '12m', cost: '0.02 PHOTON' },
];

export const MOCK_NODES = [
    { id: 'node-us-east-01', region: 'US-VA', status: 'online', uptime: '99.98%', load: 84 },
    { id: 'node-eu-west-04', region: 'EU-DE', status: 'online', uptime: '99.95%', load: 62 },
    { id: 'node-asia-ne-02', region: 'JP-TY', status: 'maintenance', uptime: '98.50%', load: 0 },
];

export const LOG_STREAM_SOURCE = [
    "[INFO] Initializing distributed process group...",
    "[INFO] Rank 0: CUDA device detected: NVIDIA H100 80GB HBM3",
    "[INFO] Loading checkpoint shards: 100%|██████████| 32/32 [00:14<00:00, 2.15it/s]",
    "[INFO] Model config: Hidden size=8192, Layers=80, Heads=64",
    "[WARN] Gradient checkpointing enabled to save memory",
    "[SYSTEM] Ep 1 | Step 0 | Loss: 12.452 | LR: 1.5e-5",
    "[SYSTEM] Ep 1 | Step 10 | Loss: 11.201 | LR: 2.1e-5",
    "[SYSTEM] Ep 1 | Step 20 | Loss: 9.842 | LR: 3.4e-5",
    "[SYSTEM] Ep 1 | Step 30 | Loss: 8.115 | LR: 4.8e-5",
    "[INFO] Verifying PoC (Proof of Compute) hash on-chain...",
    "[CHAIN] Tx verified: 0x7f...3a2b (Block 192841)",
    "[SYSTEM] Ep 1 | Step 40 | Loss: 6.231 | LR: 5.2e-5",
    "[SYSTEM] Ep 1 | Step 50 | Loss: 4.882 | LR: 5.2e-5",
    "[INFO] Saving intermediate checkpoint to localized storage...",
];
