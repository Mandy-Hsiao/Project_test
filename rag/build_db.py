import pymysql
from pinecone import Pinecone
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX")
NAMESPACE = os.getenv("PINECONE_NAMESPACE")

MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE")


pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

print("成功連線 Pinecone！")

# 連 MySQL
conn = pymysql.connect(
    host="localhost",
    user="root",
    password="A230736409",
    database="sop_database",
    charset="utf8mb4"
)

cursor = conn.cursor(pymysql.cursors.DictCursor)

cursor.execute(
    "SELECT id, title, content, category "
    "FROM sop_documents"
)

rows = cursor.fetchall()

records = []

for row in rows:
    text = (
        f"標題：{row['title']}\n"
        f"分類：{row['category'] or ''}\n"
        f"內容：{row['content']}"
    )

    records.append({
        "_id": f"sop_{row['id']}",
        "text": text,
        "title": row["title"],
        "category": row["category"] or "",
        "mysql_id": row["id"]
    })

cursor.close()
conn.close()

index.upsert_records(
    namespace=NAMESPACE,
    records=records
)

print(f"已上傳 {len(records)} 筆資料到 Pinecone")

