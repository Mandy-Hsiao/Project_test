#query要寫try except，避免ChromaDB query失敗導致整個服務崩潰，測試不穩定的問題
from pathlib import Path

import chromadb
import requests
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent
CHROMA_PATH = BASE_DIR.parent / "chroma_db"
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "qwen2.5:3b"

# Django 啟動後只載入一次，避免每次提問都重新載入模型
embed_model = SentenceTransformer("BAAI/bge-small-zh-v1.5")


def get_rag_answer(question: str) -> str:
    """從 ChromaDB 檢索 SOP，交給本機 Qwen 產生回答。"""

    question = question.strip()

    if not question:
        return "請輸入問題。"

    try:
        client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        collection = client.get_collection(name="sop_collection")
    except Exception as exc:
        return f"無法開啟 SOP 向量資料庫：{exc}"

    query_embedding = embed_model.encode([question]).tolist()[0]
#query要寫try except，避免ChromaDB query失敗導致整個服務崩潰，測試不穩定的問題
    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=3
    )

    documents = result.get("documents", [[]])[0]

    if not documents:
        return "目前 SOP 文件中沒有相關資訊。"

    context = "\n\n".join(documents)

    prompt = f"""
你是資訊部 SOP AI 解答助教。
請嚴格根據提供的 SOP 內容回答。
若 SOP 沒有答案，請回答：「目前 SOP 文件中沒有相關資訊」。
請使用繁體中文，回答清楚、簡潔、正式。
請完整保留 SOP 中所有的資訊，切勿修改。

【SOP 內容】
{context}

【使用者問題】
{question}
""".strip()

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

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        print("Ollama 回傳資料：", data)  # Debugging line to print the response from Ollama
        return data["message"]["content"].strip()

    except requests.RequestException as exc:
        return f"無法連接 Ollama：{exc}"

    except (KeyError, ValueError) as exc:
        return f"Ollama 回傳格式錯誤：{exc}"


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("請輸入問題。")
    else:
        print(get_rag_answer(sys.argv[1]))