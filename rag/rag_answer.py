#query要寫try except，避免ChromaDB query失敗導致整個服務崩潰，測試不穩定的問題
import requests
from pinecone import Pinecone

# =========================
# Pinecone
# =========================

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX")
NAMESPACE = os.getenv("PINECONE_NAMESPACE")

OLLAMA_URL = os.getenv("OLLAMA_URL")
MODEL_NAME = os.getenv("OLLAMA_MODEL")

pc = Pinecone(
    api_key=PINECONE_API_KEY
)

index = pc.Index(INDEX_NAME)


# =========================
# Ollama
# =========================

OLLAMA_URL = "http://localhost:11434/api/chat"

MODEL_NAME = "qwen2.5:3b"


# =========================
# RAG
# =========================

def get_rag_answer(question):

    question = question.strip()

    if question == "":
        return "請輸入問題。"

    # =========================
    # Pinecone 搜尋
    # =========================

    result = index.search(

        namespace=NAMESPACE,

        query={

            "inputs": {
                "text": question
            },

            "top_k": 3

        }

    )

    hits = result.result.hits

    if len(hits) == 0:

        return "目前 SOP 文件中沒有相關資訊。"

    # =========================
    # 組 Context
    # =========================

    context = ""

    for hit in hits:

        context += hit.fields["text"]

        context += "\n\n"

    # =========================
    # Prompt
    # =========================

    prompt = f"""
你是兆豐證券資訊部 SOP AI 助教。

請嚴格依據提供的 SOP 回答。

如果 SOP 沒有答案，

請回答：

「目前 SOP 文件中沒有相關資訊。」

========================

SOP：

{context}

========================

問題：

{question}

========================

請直接回答。
"""

    payload = {

        "model": MODEL_NAME,

        "messages": [

            {

                "role": "user",

                "content": prompt

            }

        ],

        "stream": False,

        "options": {

            "temperature": 0,

            "top_p": 0.1,

            "seed": 42

        }

    }

    response = requests.post(

        OLLAMA_URL,

        json=payload,

        timeout=120

    )

    response.raise_for_status()

    return response.json()["message"]["content"].strip()