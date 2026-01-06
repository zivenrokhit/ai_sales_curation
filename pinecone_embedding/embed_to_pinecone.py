# Script to embed enriched company data into Pinecone vector database

import os
import json
import pinecone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

# Initialize Pinecone
pinecone.init(api_key=PINECONE_API_KEY, environment="us-west1-gcp")
index_name = "yc-companies"

if index_name not in pinecone.list_indexes():
    pinecone.create_index(index_name, dimension=1536)  # Adjust dimension as needed
index = pinecone.Index(index_name)

# Load enriched data
with open("../company-email-enrichment/output/final_enriched_company_data.json", "r", encoding="utf-8") as f:
    companies = json.load(f)

# Example embedding function (replace with your model)
def embed_company(company):
    # For demo, just use company name as dummy vector
    # Replace with actual embedding logic
    import numpy as np
    return np.random.rand(1536).tolist()

# Upsert to Pinecone
for company in companies:
    vector = embed_company(company)
    meta = {
        "company_id": company.get("company_id"),
        "company_name": company.get("company_name"),
        "batch": company.get("batch"),
        "website": company.get("website"),
    }
    index.upsert([(str(company.get("company_id")), vector, meta)])

print("Embedding complete!")
