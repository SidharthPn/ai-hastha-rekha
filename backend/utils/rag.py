import os
import glob
import chromadb
from chromadb.config import Settings

KNOWLEDGE_DIRS = [
    "data/zodiac",
    "data/horoscope",
    "data/palmistry",
    "data/remedies",
    "data/spirituality"
]

CHROMA_DB_PATH = "data/chroma_db"
COLLECTION_NAME = "guru_knowledge"

def setup_knowledge_base():
    """Ensure directories exist and optionally load dummy data if empty."""
    for d in KNOWLEDGE_DIRS:
        os.makedirs(d, exist_ok=True)
        # Create a dummy file if empty so RAG has something to work with initially
        if not os.listdir(d):
            topic = d.split('/')[-1]
            with open(os.path.join(d, f"{topic}_basics.txt"), "w", encoding="utf-8") as f:
                f.write(f"This is the core knowledge base for {topic}. The AI Guru uses this to give accurate advice regarding {topic}.")

def get_chroma_collection():
    client = chromadb.PersistentClient(
        path=CHROMA_DB_PATH,
        settings=Settings(anonymized_telemetry=False)
    )
    return client.get_or_create_collection(name=COLLECTION_NAME)

def index_documents():
    """Reads all text documents in knowledge directories and indexes them."""
    setup_knowledge_base()
    collection = get_chroma_collection()
    
    documents = []
    metadatas = []
    ids = []
    
    doc_id = 0
    for d in KNOWLEDGE_DIRS:
        topic = d.split('/')[-1]
        for filepath in glob.glob(f"{d}/*.txt") + glob.glob(f"{d}/*.md"):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        # Simple chunking (e.g., split by double newline)
                        chunks = content.split('\n\n')
                        for i, chunk in enumerate(chunks):
                            if len(chunk.strip()) > 10:
                                documents.append(chunk.strip())
                                metadatas.append({"source": filepath, "topic": topic})
                                ids.append(f"doc_{doc_id}_{i}")
                doc_id += 1
            except Exception as e:
                print(f"Error reading {filepath}: {e}")
                
    if documents:
        # Upsert into Chroma (overwrites if ID exists)
        collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Indexed {len(documents)} document chunks into RAG.")

def retrieve(query: str, n_results: int = 2) -> str:
    """Retrieve relevant documents for a query and format as a context string."""
    try:
        collection = get_chroma_collection()
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        if not results['documents'] or not results['documents'][0]:
            return ""
            
        context_str = "Relevant Astrology Knowledge:\n"
        for idx, doc in enumerate(results['documents'][0]):
            context_str += f"- {doc}\n"
        return context_str.strip()
    except Exception as e:
        print(f"RAG Retrieval Error: {e}")
        return ""

if __name__ == "__main__":
    index_documents()
