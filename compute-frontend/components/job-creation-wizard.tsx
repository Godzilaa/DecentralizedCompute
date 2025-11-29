'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Code, 
  Server, 
  Settings, 
  Play, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  X,
  Upload,
  FileText,
  Coins,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useNodes, api, type JobCreateRequest } from '@/lib/api';
import NodesPage from '@/app/(views)/nodes/page';
import ScriptEditor from './script-editor';
import EscrowManager from './escrow-manager';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface JobCreationWizardProps {
  onClose: () => void;
  onJobCreated?: (jobId: string) => void;
}

type WizardStep = 'details' | 'nodes' | 'script' | 'payment' | 'review' | 'creating';

/**
 * Enhanced Job Creation Wizard with Node Selection and Script Editor
 */
export default function JobCreationWizard({ onClose, onJobCreated }: JobCreationWizardProps) {
  const { account } = useWallet();
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<JobCreateRequest>({
    datasetName: '',
    datasetUrl: '',
    runtimeMinutesEstimate: 10,
    meta: { type: 'Training' }
  });
  const [script, setScript] = useState('');
  const [requirements, setRequirements] = useState('');
  const [entrypoint, setEntrypoint] = useState('train.py');
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrowStatus, setEscrowStatus] = useState<'none' | 'deposited' | 'released' | 'refunded'>('none');
  const [estimatedCost, setEstimatedCost] = useState(5.0); // Default 5 APT

  const { nodes, loading: nodesLoading, error: nodesError } = useNodes();

  // Debug logging
  useEffect(() => {
    console.log('Job Creation Wizard - Nodes:', nodes);
    console.log('Job Creation Wizard - Nodes Loading:', nodesLoading);
    console.log('Job Creation Wizard - Nodes Error:', nodesError);
    console.log('Job Creation Wizard - Selected Node:', selectedNode);
  }, [nodes, nodesLoading, nodesError, selectedNode]);

  // Track selectedNode changes specifically
  useEffect(() => {
    console.log('JobCreationWizard - selectedNode state changed to:', selectedNode);
    console.log('JobCreationWizard - has selected node:', !!selectedNode);
    console.log('JobCreationWizard - canProceed() returns:', canProceed());
  }, [selectedNode]);

  const steps = [
    { id: 'details', name: 'Job Details', icon: Settings },
    { id: 'nodes', name: 'Select Nodes', icon: Server },
    { id: 'script', name: 'Training Script', icon: Code },
    { id: 'payment', name: 'Payment & Escrow', icon: Coins },
    { id: 'review', name: 'Review & Create', icon: CheckCircle }
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 'details':
        const detailsValid = jobDetails.datasetName.trim().length > 0;
        console.log('canProceed - details:', detailsValid, 'datasetName:', jobDetails.datasetName);
        return detailsValid;
      case 'nodes':
        const nodesValid = !!selectedNode;
        console.log('canProceed - nodes:', nodesValid, 'selectedNode:', selectedNode);
        return nodesValid;
      case 'script':
        const scriptValid = script.trim().length > 0;
        console.log('canProceed - script:', scriptValid, 'script length:', script.trim().length);
        return scriptValid;
      case 'review':
        console.log('canProceed - review: true');
        return true;
      default:
        console.log('canProceed - default: false, currentStep:', currentStep);
        return false;
    }
  };

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['details', 'nodes', 'script', 'payment', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const stepOrder: WizardStep[] = ['details', 'nodes', 'script', 'payment', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleCreateJob = async () => {
    setCreating(true);
    setError(null);
    
    try {
      // Create the job
      const result = await api.createJob({
        ...jobDetails,
        meta: {
          ...jobDetails.meta,
          selectedNode,
          hasCustomScript: script.length > 0
        }
      });
      
      // Upload script if provided
      if (script.trim()) {
        await api.uploadScript({
          jobId: result.jobId,
          script,
          requirements,
          entrypoint
        });
      }
      
      onJobCreated?.(result.jobId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-zinc-200 mb-4">Job Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Job Name *
                  </label>
                  <input
                    type="text"
                    value={jobDetails.datasetName}
                    onChange={(e) => setJobDetails(prev => ({ ...prev, datasetName: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                    placeholder="my-training-job"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Job Type
                  </label>
                  <select
                    value={jobDetails.meta?.type}
                    onChange={(e) => setJobDetails(prev => ({ 
                      ...prev, 
                      meta: { ...prev.meta, type: e.target.value }
                    }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                  >
                    <option value="Training">Training</option>
                    <option value="Inference">Inference</option>
                    <option value="Fine-tuning">Fine-tuning</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Dataset URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={jobDetails.datasetUrl}
                    onChange={(e) => setJobDetails(prev => ({ ...prev, datasetUrl: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                    placeholder="https://huggingface.co/datasets/..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Runtime Estimate (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={jobDetails.runtimeMinutesEstimate}
                    onChange={(e) => setJobDetails(prev => ({ 
                      ...prev, 
                      runtimeMinutesEstimate: parseInt(e.target.value) 
                    }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'nodes':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-zinc-200 mb-2">Select Compute Node</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Choose which node will execute your job. Select one node from the available options.
              </p>
              <div className="text-xs text-zinc-500 mb-2">
                Debug: {nodes.length} nodes available, {selectedNode ? '1' : '0'} selected
                {nodesLoading && " (Loading...)"}
                {nodesError && ` (Error: ${nodesError})`}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <NodesPage 
                onSelectNodes={(nodeIds) => {
                  console.log('JobCreationWizard - Callback received:', nodeIds);
                  console.log('JobCreationWizard - Current selectedNode before update:', selectedNode);
                  // For single selection, take the first node or null if empty
                  const newSelectedNode = nodeIds.length > 0 ? nodeIds[0] : null;
                  setSelectedNode(newSelectedNode);
                  console.log('JobCreationWizard - setSelectedNode called with:', newSelectedNode);
                  setTimeout(() => {
                    console.log('JobCreationWizard - selectedNode should now be:', newSelectedNode);
                  }, 100);
                }}
                jobCreationMode={true}
                singleSelection={true}
              />
            </div>
          </div>
        );
        
      case 'script':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-zinc-200 mb-4">Training Script</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Provide your training script or use one of our templates to get started quickly.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScriptEditor(true)}
                  className="gap-2"
                >
                  <Code className="w-4 h-4" />
                  {script ? 'Edit Script' : 'Write Script'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.py';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setScript(e.target?.result as string || '');
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </Button>
              </div>
              
              {script && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-zinc-200">Script Ready</span>
                    <Badge variant="secondary" className="ml-auto">
                      {script.split('\n').length} lines
                    </Badge>
                  </div>
                  <div className="bg-zinc-950 rounded-md p-3 font-mono text-xs text-zinc-400 max-h-32 overflow-y-auto">
                    {script.split('\n').slice(0, 10).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                    {script.split('\n').length > 10 && (
                      <div className="text-zinc-600">... {script.split('\n').length - 10} more lines</div>
                    )}
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-zinc-500">
                    <span>Entrypoint: {entrypoint}</span>
                    <span>Requirements: {requirements ? requirements.split('\n').length + ' packages' : 'None'}</span>
                  </div>
                </Card>
              )}
              
              {!script && (
                <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center">
                  <Code className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">No Script Provided</h4>
                  <p className="text-xs text-zinc-500 mb-4">
                    Your job will run with default training logic. Add a custom script for specific behavior.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowScriptEditor(true)}
                  >
                    Add Script
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-zinc-200 mb-4">Payment & Escrow</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Set up secure escrow payment for your compute job. Funds will be held in escrow until job completion.
              </p>
            </div>

            {/* Cost Estimation */}
            <Card className="p-4">
              <h4 className="font-medium text-zinc-200 mb-3">Cost Estimation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Runtime Estimate:</span>
                  <span className="text-zinc-200">{jobDetails.runtimeMinutesEstimate} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Rate per minute:</span>
                  <span className="text-zinc-200">0.05 APT</span>
                </div>
                <div className="border-t border-zinc-700 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-zinc-300">Estimated Cost:</span>
                    <span className="text-zinc-200">{(jobDetails.runtimeMinutesEstimate * 0.05).toFixed(2)} APT</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Escrow Manager */}
            <EscrowManager
              jobId={jobDetails.datasetName || 'temp-job-id'}
              providerAddress={account?.address || '0x0000000000000000000000000000000000000000000000000000000000000001'} // Use your own address as provider for testing
              estimatedCost={jobDetails.runtimeMinutesEstimate * 0.05}
              onEscrowStatusChange={setEscrowStatus}
            />

            {/* Payment Info */}
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h5 className="text-sm font-medium text-blue-400">Secure Escrow Payment</h5>
                  <p className="text-xs text-blue-300">
                    Your payment is secured by smart contract escrow. Funds are only released when the job completes successfully, 
                    or you can refund if there are issues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-zinc-200 mb-4">Review Job Configuration</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Please review your job settings before creating. You can go back to make changes if needed.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Job Details */}
              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <h4 className="font-medium text-zinc-200">Job Details</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Name:</span>
                    <span className="text-zinc-200">{jobDetails.datasetName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Type:</span>
                    <span className="text-zinc-200">{jobDetails.meta?.type}</span>
                  </div>
                  {jobDetails.datasetUrl && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Dataset:</span>
                      <span className="text-zinc-200 truncate ml-2" title={jobDetails.datasetUrl}>
                        {jobDetails.datasetUrl}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Runtime:</span>
                    <span className="text-zinc-200">{jobDetails.runtimeMinutesEstimate} minutes</span>
                  </div>
                </div>
              </Card>
              
              {/* Selected Node */}
              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-4 h-4 text-zinc-400" />
                  <h4 className="font-medium text-zinc-200">Selected Node</h4>
                  <Badge variant="secondary">{selectedNode ? '1' : '0'}</Badge>
                </div>
                <div className="space-y-1">
                  {selectedNode ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="font-mono text-zinc-300">{selectedNode.slice(0, 12)}...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">No node selected</div>
                  )}
                </div>
              </Card>
              
              {/* Script Configuration */}
              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <Code className="w-4 h-4 text-zinc-400" />
                  <h4 className="font-medium text-zinc-200">Script Configuration</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Custom Script:</span>
                    <span className={`text-zinc-200 ${script ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {script ? 'Yes' : 'No (will use default)'}
                    </span>
                  </div>
                  {script && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Lines:</span>
                        <span className="text-zinc-200">{script.split('\n').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Entrypoint:</span>
                        <span className="text-zinc-200">{entrypoint}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Dependencies:</span>
                        <span className="text-zinc-200">
                          {requirements ? requirements.split('\n').filter(l => l.trim()).length : 0} packages
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
            
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-500/20 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">Failed to create job</p>
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-zinc-400" />
              <div>
                <h2 className="text-xl font-medium text-zinc-200">Create Training Job</h2>
                <p className="text-sm text-zinc-500">Set up a new distributed training job</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={creating}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                      isActive ? 'bg-emerald-500/20 text-emerald-400' :
                      isCompleted ? 'bg-zinc-700 text-zinc-300' :
                      'text-zinc-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{step.name}</span>
                      {isCompleted && <CheckCircle className="w-3 h-3" />}
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-zinc-800 bg-zinc-900 sticky bottom-0">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 'details' || creating}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentStep === 'review' ? (
                <Button 
                  onClick={handleCreateJob}
                  disabled={creating}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Create Job
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Script Editor Modal */}
      {showScriptEditor && (
        <ScriptEditor
          jobId={jobDetails.datasetName}
          initialScript={script}
          initialRequirements={requirements}
          initialEntrypoint={entrypoint}
          onSave={async (newScript, newRequirements, newEntrypoint) => {
            setScript(newScript);
            setRequirements(newRequirements);
            setEntrypoint(newEntrypoint);
          }}
          onClose={() => setShowScriptEditor(false)}
        />
      )}
    </>
  );
}