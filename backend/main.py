"""
OrbitLens AI -- FastAPI backend entry point.

Endpoints registered here:
  GET /health  -- liveness check

Additional routes are registered via the api/routes_*.py modules.

NOTE: this file imports from api.routes_* -- it will not run until backend/api/
is fully built. That's expected at this stage of the build.
"""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import routes_upload, routes_anomalies, routes_telemetry, routes_insights, routes_report

app = FastAPI(title="OrbitLens AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    print("[OrbitLens] Backend started. Session store ready.")


app.include_router(routes_upload.router)
app.include_router(routes_anomalies.router)
app.include_router(routes_telemetry.router)
app.include_router(routes_insights.router)
app.include_router(routes_report.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
