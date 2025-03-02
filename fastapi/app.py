from fastapi import FastAPI
import subprocess

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI Backend Running"}

@app.get("/run-ollama")
def run_ollama():
    result = subprocess.run(["python3", "../ollama/run_ollama.py"], capture_output=True, text=True)
    return {"ollama_output": result.stdout}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
