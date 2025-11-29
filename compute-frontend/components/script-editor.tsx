'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Code, 
  Play, 
  Save, 
  Download, 
  Upload, 
  FileText, 
  Settings, 
  X,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ScriptEditorProps {
  jobId?: string;
  onSave?: (script: string, requirements: string, entrypoint: string) => Promise<void>;
  onClose?: () => void;
  initialScript?: string;
  initialRequirements?: string;
  initialEntrypoint?: string;
  readonly?: boolean;
}

/**
 * Advanced Script Editor Component with syntax highlighting, templates, and validation
 */
export default function ScriptEditor({
  jobId,
  onSave,
  onClose,
  initialScript = '',
  initialRequirements = '',
  initialEntrypoint = 'train.py',
  readonly = false
}: ScriptEditorProps) {
  const [script, setScript] = useState(initialScript);
  const [requirements, setRequirements] = useState(initialRequirements);
  const [entrypoint, setEntrypoint] = useState(initialEntrypoint);
  const [activeTab, setActiveTab] = useState<'script' | 'requirements' | 'config'>('script');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Script templates
  const scriptTemplates = {
    ml_training: {
      name: 'ML Training (NumPy)',
      script: `import numpy as np
import os
import json
import time
import random

# Job configuration
JOB_ID = "${jobId || 'YOUR_JOB_ID'}"
OUTPUT_DIR = "/workspace/output"

def create_model():
    """Create a simple linear model using NumPy"""
    # Initialize weights and bias
    weights = np.random.randn(784, 128) * 0.1
    bias = np.zeros(128)
    return weights, bias

def train():
    print(f"Starting ML training job: {JOB_ID}")
    
    # Create model
    weights, bias = create_model()
    
    # Mock training loop
    num_epochs = 10
    for epoch in range(num_epochs):
        # Simulate training with random loss
        loss = random.uniform(0.8, 0.1)
        accuracy = 0.5 + (epoch / num_epochs) * 0.4  # Simulate improving accuracy
        
        print(f"Epoch {epoch+1}/{num_epochs}, Loss: {loss:.4f}, Accuracy: {accuracy:.3f}")
        time.sleep(0.8)  # Simulate training time
    
    # Save model
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model_path = os.path.join(OUTPUT_DIR, "model.npy")
    
    # Save weights as numpy array
    model_data = {
        'weights': weights.tolist(),
        'bias': bias.tolist(),
        'final_accuracy': accuracy
    }
    
    np.save(model_path, model_data)
    
    # Save metadata
    metadata = {
        "job_id": JOB_ID,
        "epochs": num_epochs,
        "model_path": model_path,
        "final_loss": loss,
        "final_accuracy": accuracy,
        "model_type": "linear_numpy"
    }
    
    with open(os.path.join(OUTPUT_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    
    print("Training completed successfully!")
    print(f"Model saved to: {model_path}")
    print(f"Final accuracy: {accuracy:.3f}")

if __name__ == "__main__":
    train()
`,
      requirements: `numpy>=1.21.0
`,
      entrypoint: 'train.py'
    },
    tensorflow: {
      name: 'TensorFlow Training',
      script: `import tensorflow as tf
import numpy as np
import os
import json
import time

# Job configuration
JOB_ID = "${jobId || 'YOUR_JOB_ID'}"
OUTPUT_DIR = "/workspace/output"

def create_model():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(128, activation='relu', input_shape=(784,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(10, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def train():
    print(f"Starting TensorFlow training job: {JOB_ID}")
    
    # Create model
    model = create_model()
    
    # Generate mock data for demo
    x_train = np.random.random((1000, 784))
    y_train = np.random.randint(0, 10, (1000,))
    
    # Train model
    history = model.fit(
        x_train, y_train,
        epochs=5,
        batch_size=32,
        validation_split=0.2,
        verbose=1
    )
    
    # Save model
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model_path = os.path.join(OUTPUT_DIR, "model.h5")
    model.save(model_path)
    
    # Save metadata
    metadata = {
        "job_id": JOB_ID,
        "epochs": 5,
        "model_path": model_path,
        "final_loss": float(history.history['loss'][-1]),
        "final_accuracy": float(history.history['accuracy'][-1])
    }
    
    with open(os.path.join(OUTPUT_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    
    print("Training completed successfully!")
    print(f"Model saved to: {model_path}")

if __name__ == "__main__":
    train()
`,
      requirements: `tensorflow>=2.12.0
numpy>=1.21.0
`,
      entrypoint: 'train.py'
    },
    custom: {
      name: 'Custom Training',
      script: `#!/usr/bin/env python3
import os
import json
import time
import sys

# Job configuration
JOB_ID = "${jobId || 'YOUR_JOB_ID'}"
OUTPUT_DIR = "/workspace/output"

def main():
    print(f"Starting custom training job: {JOB_ID}")
    
    # Your custom training logic here
    print("Initializing training...")
    time.sleep(1)
    
    print("Processing data...")
    time.sleep(2)
    
    print("Training model...")
    time.sleep(3)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Save model artifact (mock)
    model_data = f"trained_model_{JOB_ID}_{int(time.time())}"
    model_path = os.path.join(OUTPUT_DIR, "model.bin")
    
    with open(model_path, "w") as f:
        f.write(model_data)
    
    # Save metadata
    metadata = {
        "job_id": JOB_ID,
        "model_path": model_path,
        "training_time": "3 seconds",
        "status": "completed"
    }
    
    with open(os.path.join(OUTPUT_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    
    print("Training completed successfully!")
    print(f"Model saved to: {model_path}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
`,
      requirements: `# Add your dependencies here
# Example:
# numpy>=1.21.0
# requests>=2.25.0
# pandas>=1.3.0
`,
      entrypoint: 'train.py'
    }
  };

  const validateScript = useCallback(() => {
    const newErrors = [];
    
    if (!script.trim()) {
      newErrors.push('Script cannot be empty');
    }
    
    if (!entrypoint.trim()) {
      newErrors.push('Entrypoint cannot be empty');
    }
    
    if (entrypoint && !entrypoint.endsWith('.py')) {
      newErrors.push('Entrypoint must be a Python file (.py)');
    }
    
    // Basic Python syntax validation (very simple)
    if (script.includes('import ') && !script.includes('def ') && !script.includes('if __name__')) {
      newErrors.push('Script should contain function definitions or main execution block');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  }, [script, entrypoint]);

  const handleSave = async () => {
    if (!validateScript()) return;
    
    setSaving(true);
    try {
      await onSave?.(script, requirements, entrypoint);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save script:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = (template: keyof typeof scriptTemplates) => {
    const t = scriptTemplates[template];
    setScript(t.script);
    setRequirements(t.requirements);
    setEntrypoint(t.entrypoint);
  };

  const downloadScript = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entrypoint || 'script.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    validateScript();
  }, [validateScript]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-zinc-400" />
            <div>
              <h3 className="text-lg font-medium text-zinc-200">
                {readonly ? 'View Script' : 'Script Editor'}
              </h3>
              {jobId && (
                <p className="text-sm text-zinc-500">Job ID: {jobId}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readonly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadScript}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || errors.length > 0}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saved ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Templates Bar */}
        {!readonly && script === initialScript && (
          <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400">Templates:</span>
              {Object.entries(scriptTemplates).map(([key, template]) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  onClick={() => loadTemplate(key as keyof typeof scriptTemplates)}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'script'
                ? 'text-white border-b-2 border-emerald-500 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('script')}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Script
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'requirements'
                ? 'text-white border-b-2 border-emerald-500 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('requirements')}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Requirements
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'config'
                ? 'text-white border-b-2 border-emerald-500 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('config')}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Config
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'script' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 relative">
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  readOnly={readonly}
                  className="w-full h-full bg-zinc-950 text-zinc-100 font-mono text-sm p-4 resize-none outline-none"
                  placeholder="# Enter your training script here...
import numpy as np
import os
import json

def train():
    print('Starting training...')
    # Your training code here
    pass

if __name__ == '__main__':
    train()
"
                  spellCheck={false}
                />
                {/* Line numbers could be added here */}
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-zinc-800 bg-zinc-950">
                <p className="text-sm text-zinc-400">
                  Specify your Python dependencies. Each package should be on a new line.
                </p>
              </div>
              <div className="flex-1">
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  readOnly={readonly}
                  className="w-full h-full bg-zinc-950 text-zinc-100 font-mono text-sm p-4 resize-none outline-none"
                  placeholder="# Python package requirements
numpy>=1.21.0
pandas>=1.3.0
scikit-learn>=1.0.0
matplotlib>=3.5.0
requests>=2.25.0
"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="h-full p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Entrypoint Script
                </label>
                <input
                  type="text"
                  value={entrypoint}
                  onChange={(e) => setEntrypoint(e.target.value)}
                  readOnly={readonly}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                  placeholder="train.py"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  The main script file to execute when the job runs
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Runtime Environment
                </label>
                <select 
                  disabled={readonly}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                >
                  <option>python:3.9</option>
                  <option>python:3.10</option>
                  <option>python:3.11</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Resource Requirements
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">CPU Cores</label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      defaultValue="2"
                      disabled={readonly}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Memory (GB)</label>
                    <input
                      type="number"
                      min="1"
                      max="64"
                      defaultValue="4"
                      disabled={readonly}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-800 bg-red-950/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400 mb-1">Validation Errors:</p>
                <ul className="text-xs text-red-300 space-y-0.5">
                  {errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>Lines: {script.split('\n').length}</span>
            <span>Characters: {script.length}</span>
            <span>Language: Python</span>
          </div>
          <div className="flex items-center gap-2">
            {errors.length === 0 ? (
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3" />
                Valid
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-red-500/20 text-red-400">
                <AlertCircle className="w-3 h-3" />
                {errors.length} Error{errors.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}