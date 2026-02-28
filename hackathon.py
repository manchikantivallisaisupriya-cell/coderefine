"""CodeRefine – FastAPI backend."""

from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from analyzer import analyze_code, SUPPORTED_LANGUAGES, PROVIDERS

load_dotenv()

BASE_DIR   = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="CodeRefine API")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class AnalyzeRequest(BaseModel):
    code:     str
    language: str = "Python"
    provider: str = "groq"


class AnalyzeResponse(BaseModel):
    summary:        str
    score:          int
    bugs:           list
    optimizations:  list
    security:       list
    optimized_code: str
    metrics:        dict
    provider:       str
    language:       str


@app.get("/", include_in_schema=False)
async def frontend():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/meta")
async def meta():
    return {"languages": SUPPORTED_LANGUAGES, "providers": PROVIDERS}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    if req.provider.lower() not in PROVIDERS:
        raise HTTPException(400, f"Invalid provider '{req.provider}'")
    try:
        result = analyze_code(req.code, req.language, req.provider)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")
    return AnalyzeResponse(**result, provider=PROVIDERS[req.provider.lower()], language=req.language)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
