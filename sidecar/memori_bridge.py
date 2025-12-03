from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

# Minimal FastAPI app; endpoints will be wired to Memori engine in future iterations.
app = FastAPI(
    title="Memori Sidecar",
    version="0.2.0",
    description="FastAPI wrapper around Memori for StoryNexus integration.",
)


@dataclass
class MemoryEntry:
    memory_id: str
    story_id: str
    content: str
    category: Optional[str] = None
    session_id: Optional[str] = None


class MemoryStore:
    """In-memory placeholder store; will be replaced by Memori-backed storage."""

    def __init__(self) -> None:
        self._memories: Dict[str, List[MemoryEntry]] = {}

    def add(
        self,
        story_id: str,
        content: str,
        category: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> MemoryEntry:
        memory_id = str(uuid.uuid4())
        entry = MemoryEntry(
            memory_id=memory_id,
            story_id=story_id,
            content=content,
            category=category,
            session_id=session_id,
        )
        self._memories.setdefault(story_id, []).append(entry)
        return entry

    def search(self, story_id: str, query: str, limit: int) -> List[MemoryEntry]:
        items = self._memories.get(story_id, [])
        q_lower = query.lower()
        results = [entry for entry in items if q_lower in entry.content.lower()]
        return results[:limit]

    def recent(self, story_id: str, limit: int) -> List[MemoryEntry]:
        items = self._memories.get(story_id, [])
        if limit <= 0:
            return []
        # Return newest-first
        return list(reversed(items))[:limit]

    def clear_story(self, story_id: str) -> int:
        removed = len(self._memories.get(story_id, []))
        self._memories.pop(story_id, None)
        return removed

    def clear_all(self) -> None:
        self._memories.clear()


class CompletionRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    story_id: str
    session_id: Optional[str] = None
    inject_limit: int = Field(default=3, ge=0, le=50)
    model: Optional[str] = None
    max_tokens: Optional[int] = Field(default=None, ge=1, le=8192)


class CompletionResponse(BaseModel):
    completion: str
    story_id: str
    session_id: str
    injected_memories: List[str]


class SearchRequest(BaseModel):
    story_id: str
    query: str
    limit: int = Field(default=10, ge=1, le=50)


class MemoryResult(BaseModel):
    memory_id: str
    content: str
    category: Optional[str] = None
    session_id: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[MemoryResult]


class ContextRequest(BaseModel):
    story_id: str
    limit: int = Field(default=5, ge=0, le=50)


class ContextResponse(BaseModel):
    memories: List[MemoryResult]


class SessionNewRequest(BaseModel):
    story_id: str


class SessionNewResponse(BaseModel):
    story_id: str
    session_id: str


class MemoryAddRequest(BaseModel):
    story_id: str
    content: str = Field(..., min_length=1)
    category: Optional[str] = None
    session_id: Optional[str] = None


class MemoryAddResponse(BaseModel):
    memory_id: str
    story_id: str


store = MemoryStore()
app.state.memory_store = store


def get_store() -> MemoryStore:
    return app.state.memory_store


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    """Lightweight health probe for the sidecar."""
    return {"status": "ok"}


@app.post("/session/new", tags=["session"], response_model=SessionNewResponse)
async def session_new(payload: SessionNewRequest) -> SessionNewResponse:
    session_id = str(uuid.uuid4())
    return SessionNewResponse(story_id=payload.story_id, session_id=session_id)


@app.post("/memory/add", tags=["memory"], response_model=MemoryAddResponse)
async def memory_add(payload: MemoryAddRequest) -> MemoryAddResponse:
    entry = get_store().add(
        story_id=payload.story_id,
        content=payload.content,
        category=payload.category,
        session_id=payload.session_id,
    )
    return MemoryAddResponse(memory_id=entry.memory_id, story_id=entry.story_id)


@app.delete("/memory/{story_id}", tags=["memory"])
async def clear_memory(story_id: str) -> dict[str, int | str]:
    cleared = get_store().clear_story(story_id)
    return {"story_id": story_id, "cleared": cleared}


@app.post("/search", tags=["memory"], response_model=SearchResponse)
async def search(payload: SearchRequest) -> SearchResponse:
    results = get_store().search(
        story_id=payload.story_id, query=payload.query, limit=payload.limit
    )
    return SearchResponse(
        results=[
            MemoryResult(
                memory_id=entry.memory_id,
                content=entry.content,
                category=entry.category,
                session_id=entry.session_id,
            )
            for entry in results
        ]
    )


@app.post("/context", tags=["memory"], response_model=ContextResponse)
async def context(payload: ContextRequest) -> ContextResponse:
    memories = get_store().recent(story_id=payload.story_id, limit=payload.limit)
    return ContextResponse(
        memories=[
            MemoryResult(
                memory_id=entry.memory_id,
                content=entry.content,
                category=entry.category,
                session_id=entry.session_id,
            )
            for entry in memories
        ]
    )


@app.post("/completion", tags=["memory"], response_model=CompletionResponse)
async def completion(payload: CompletionRequest) -> CompletionResponse:
    session_id = payload.session_id or str(uuid.uuid4())
    injected = [
        entry.content
        for entry in get_store().recent(
            story_id=payload.story_id, limit=payload.inject_limit
        )
    ]
    # Placeholder completion text until Memori + LLM wiring lands.
    completion_text = (
        f"[stub] completion for story '{payload.story_id}' with prompt: {payload.prompt}"
    )
    return CompletionResponse(
        completion=completion_text,
        story_id=payload.story_id,
        session_id=session_id,
        injected_memories=injected,
    )
