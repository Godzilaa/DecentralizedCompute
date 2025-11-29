FROM python:3.10-slim
WORKDIR /workspace
COPY . /workspace
# attempt to install requirements if present; ignore failures
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt || true; fi
CMD ["python", "train.py"]
