import chromadb
from sentence_transformers import SentenceTransformer

# 1. 載入 embedding 模型
model = SentenceTransformer("BAAI/bge-small-zh-v1.5")

# 2. 連接 ChromaDB
client = chromadb.PersistentClient(path="../chroma_db")
collection = client.get_collection(name="sop_collection")

# 3. 使用者問題
question = "VPN不能登入怎麼辦？"

# 4. 問題轉向量
query_embedding = model.encode([question]).tolist()[0]

# 5. 搜尋最相關 SOP
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=2
)

print("問題：", question)
print("\n找到的 SOP：")
for doc in results["documents"][0]:
    print("----")
    print(doc)