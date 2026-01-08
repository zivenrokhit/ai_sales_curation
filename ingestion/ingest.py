import os
import json
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document

load_dotenv()
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

INDEX_NAME = "ai-leads-project"
DIMENSION = 384

def setup_index(pc, index_name, dimension):
    existing_indexes = [index.name for index in pc.list_indexes()]

    if index_name not in existing_indexes:
        print(f"Index '{index_name}' not found. Creating it now...")
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        while not pc.describe_index(index_name).status['ready']:
            time.sleep(1)
        print("Index created and ready.")
    else:
        print(f"Index '{index_name}' already exists.")

def load_and_process_data(filepath):
    """Loads JSON and transforms it into LangChain Documents."""
    print("Loading JSON data...")
    with open(filepath, 'r') as file:
        raw_company_data = json.load(file)

    documents = []
    print(f"Preparing {len(raw_company_data)} records for ingestion...")

    for item in raw_company_data:
        tags_list = item.get('tags') or [] 
        tags_str = ", ".join(tags_list)
        
        founders_list = item.get('founder_details') or []
        founder_bios = " ".join([f.get('bio') or '' for f in founders_list])
        
        text_to_embed = f"""
        Company: {item.get('company_name')}
        Tagline: {item.get('short_description')}
        Description: {item.get('long_description')}
        Tags: {tags_str}
        Founders: {founder_bios}
        """

        metadata = {}
        for key, value in item.items():
            if value is None: continue
            
            if isinstance(value, (dict, list)):
                if isinstance(value, list) and all(isinstance(x, str) for x in value):
                    metadata[key] = value
                else:
                    metadata[key] = json.dumps(value)
            else:
                metadata[key] = value
                
        founder_emails = [f.get('verified_email') for f in founders_list if f.get('verified_email')]
        metadata["primary_email"] = founder_emails[0] if founder_emails else "" 

        doc = Document(page_content=text_to_embed, metadata=metadata)
        documents.append(doc)
    
    return documents

def main():
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    setup_index(pc, INDEX_NAME, DIMENSION)
    
    documents = load_and_process_data('../final_enriched_company_data.json')

    print(f"Starting upload to Pinecone index: {INDEX_NAME}...")
    print("Loading local embedding model (all-MiniLM-L6-v2)...")
    
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    PineconeVectorStore.from_documents(
        documents=documents,
        embedding=embeddings,
        index_name=INDEX_NAME
    )

    print(f"Success! {len(documents)} companies have been embedded and stored.")

if __name__ == "__main__":
    main()