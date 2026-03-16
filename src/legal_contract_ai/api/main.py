from fastapi import FastAPI
from src.legal_contract_ai.api.routes import router
import uvicorn
import sys
import io

# Force UTF-8 on Windows for proper emoji/symbol logging
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

app = FastAPI(title="Legal Contract AI API", version="1.0.0")

app.include_router(router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Legal Contract AI API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
