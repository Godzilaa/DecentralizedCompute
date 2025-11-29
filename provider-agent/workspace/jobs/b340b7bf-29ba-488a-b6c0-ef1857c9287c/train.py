import time, json, os
out = "output/model.bin"
os.makedirs("output", exist_ok=True)
with open(out, "wb") as f:
    f.write(b"demo-model-" + b"b340b7bf-29ba-488a-b6c0-ef1857c9287c".replace(b"-", b""))
print("Fallback training: wrote demo model to", out)
