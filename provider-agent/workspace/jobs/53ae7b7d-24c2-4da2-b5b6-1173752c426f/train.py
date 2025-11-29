import time, json, os
out = "output/model.bin"
os.makedirs("output", exist_ok=True)
with open(out, "wb") as f:
    f.write(b"demo-model-" + b"53ae7b7d-24c2-4da2-b5b6-1173752c426f".replace(b"-", b""))
print("Fallback training: wrote demo model to", out)
