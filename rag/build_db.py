from pathlib import Path
import chromadb
import pymysql
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
CHROMA_PATH = BASE_DIR.parent / "chroma_db"


# 1. 連接 MySQL
conn = pymysql.connect(
    host="localhost",
    user="root",
    password="A230736409",          # XAMPP 預設通常是空字串
    database="sop_database",
    charset="utf8mb4"
)

cursor = conn.cursor(pymysql.cursors.DictCursor)

# 2. 讀取 SOP 資料
cursor.execute("SELECT id, title, content, category FROM sop_documents")
rows = cursor.fetchall()

#檢查程式
print("======== MySQL 讀到的資料 ========")

for row in rows:
    print(row)
#檢查程式

chunks = []
ids = []
metadatas = []

for row in rows:
    chunk = f"標題：{row['title']}\n分類：{row['category']}\n內容：{row['content']}"
    chunks.append(chunk)
    ids.append(f"sop_{row['id']}")
    metadatas.append({
        "mysql_id": row["id"],
        "title": row["title"],
        "category": row["category"] or ""
    })

cursor.close()
conn.close()

# 3. 載入中文 Embedding 模型
model = SentenceTransformer("BAAI/bge-small-zh-v1.5")

# 4. 建立向量
embeddings = model.encode(chunks).tolist()

# 5. 連接 ChromaDB
client = chromadb.PersistentClient(path=str(CHROMA_PATH))

print("ChromaDB 路徑：", CHROMA_PATH)

try:
    client.delete_collection(name="sop_collection")
    print("舊 Collection 已刪除")
except Exception as e:
    print("第一次建立或刪除失敗：", e)

collection = client.get_or_create_collection(name="sop_collection")

collection.add(
    documents=chunks,
    embeddings=embeddings,
    ids=ids,
    metadatas=metadatas
)

print("MySQL SOP 已同步到 ChromaDB！")
print(f"已寫入 {len(chunks)} 筆 SOP 資料")

#檢查程式
print("======== Chroma 實際內容 ========")

check = collection.get()

for doc in check["documents"]:
    print(doc)
    print("------")
#檢查程式

print("Chroma 實際筆數：", collection.count())

