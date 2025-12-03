from fastapi import FastAPI

# Minimal FastAPI app; more endpoints will be added as integration proceeds.
app = FastAPI(
    title="Memori Sidecar",
    version="0.1.0",
    description="FastAPI wrapper around Memori for StoryNexus integration.",
)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    """Lightweight health probe for the sidecar."""
    return {"status": "ok"}
