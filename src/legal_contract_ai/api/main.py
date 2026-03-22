from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from src.legal_contract_ai.api.routes import router
from src.legal_contract_ai.api.security import require_api_key, validate_security_config
from dotenv import load_dotenv
import uvicorn
import sys
import io

load_dotenv()

# Force UTF-8 on Windows for proper emoji/symbol logging
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

app = FastAPI(title="Legal Contract AI API", version="1.0.0")

@app.on_event("startup")
async def startup_validate_security() -> None:
    validate_security_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1", dependencies=[Depends(require_api_key)])

@app.get("/")
async def root():
    return {"message": "Legal Contract AI API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
