import os
import time
import json

print("Starting demo training job...")
print("Job ID: test-script-job")

# Simulate some training work
for i in range(5):
    print(f"Training epoch {i+1}/5...")
    time.sleep(1)  # Reduced for faster testing

# Create output directory and save a demo model
os.makedirs("output", exist_ok=True)
model_data = f"demo-model-test-script-job-{int(time.time())}"

with open("output/model.bin", "w") as f:
    f.write(model_data)

print("Training completed! Model saved to output/model.bin")
print(f"Model data: {model_data}")