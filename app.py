"""
REST API for the crop recommendation model.

    uvicorn api:app --reload --port 8000
    Docs: http://localhost:8000/docs
"""
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from predict import recommend

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "frontend"
app = FastAPI(title="Crop Recommendation", version="1.0.0")
app.mount("/assets", StaticFiles(directory=WEB_DIR), name="assets")


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(WEB_DIR / "index.html")


class CropRequest(BaseModel):
    N: float = Field(..., ge=0, le=300, description="Nitrogen in soil (kg/ha)")
    P: float = Field(..., ge=0, le=300, description="Phosphorus in soil (kg/ha)")
    K: float = Field(..., ge=0, le=300, description="Potassium in soil (kg/ha)")
    temperature: float = Field(..., ge=0, le=55, description="Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity %")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")
    rainfall: float = Field(..., ge=0, le=500, description="Rainfall in mm")


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/model-info")
def model_info():
    path = ROOT / "models" / "metrics.json"
    if not path.exists():
        path = ROOT / "metrics.json"
    if not path.exists():
        raise HTTPException(404, "Model not trained yet")
    return json.loads(path.read_text())


@app.post("/v1/recommend")
def recommend_crop(req: CropRequest):
    try:
        return recommend(req.model_dump())
    except FileNotFoundError as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(422, str(e))
