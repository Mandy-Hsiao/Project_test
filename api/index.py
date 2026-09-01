from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "SOP RAG API is running"
    }




'''

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from rag.rag_answer import get_rag_answer


app = FastAPI(
    title="SOP RAG API",
    version="1.0.0",
)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    answer: str


@app.get("/api")
def health_check():
    return {
        "status": "ok",
        "message": "SOP RAG API is running",
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="請輸入問題。",
        )

    try:
        answer = get_rag_answer(question)

        return ChatResponse(answer=answer)

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="系統暫時無法處理問題。",
        )
        
        '''