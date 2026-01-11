# YC Companies Intelligence Stack

Welcome! This repo now delivers two complementary workflows:

1. **Scrape & enrich Y Combinator data** – collect structured company metadata plus verified emails.
2. **Explore leads in a Next.js app** – query the Pinecone vector index, view AI-generated match rationales (via Groq), and scan rich contact cards with founder emails/LinkedIns.

## 🚀 Quick Start

### 1. Scrape YC Company Data

- Go to the `scrapy-project` directory:
  ```sh
  cd scrapy-project
  ```
- Run the Scrapy spider to fetch company info:
  ```sh
  scrapy crawl YCombinatorScraper -o output.json --overwrite
  ```
- This creates `output.json` with all the raw company data.

### 2. Enrich with Founder Emails

- Return to the repo root:
  ```sh
  cd ..
  ```
- Run the global enrichment pipeline:
  ```sh
  python3 run_full_enrichment.py
  ```
- This will:
  1. Use the scraped `output.json` as input
  2. Run all enrichment scripts (email verification, generic scraping)
  3. Output the final enriched data to `company-email-enrichment/output/final_enriched_company_data.json`

### 3. Run the Lead Generation Web App

The `lead-generation-app` folder contains a Next.js UI that sits on top of the enriched data.

1. Set the required environment variables (for example in `.env.local`):

```sh
PINECONE_API_KEY=...       # for vector search
GROQ_API_KEY=...           # for Llama 3.3 reasoning callouts
PINECONE_INDEX=ai-leads-project (optional override)
```

2. Install dependencies (uses npm):

```sh
cd lead-generation-app
npm install
```

3. Start the dev server:

```sh
npm run dev
```

4. Visit `http://localhost:3000` and describe your ideal customers.

Each response card now includes:

- **AI explanation** of why the company matches your query (Groq-powered).
- **Company + founder contact intel** (emails, LinkedIns, bios when available).
- **YC metadata** (batch, tags, location, team size) pulled straight from Pinecone metadata.

## 🧩 How It Works

- **Scrapy Project**: Gathers all YC company info (name, description, founders, etc.)
- **Enrichment Pipeline**: Adds verified founder emails and scrapes for generic company emails if needed
- **Lead Generation App**: Embeds user intent with Hugging Face, queries Pinecone, and uses Groq to explain why each match matters before rendering interactive info cards
- **Result**: A single, deeply enriched JSON file powering a searchable UI for sales teams

## 📂 Key Folders

- `scrapy-project/` — The web scraper
- `company-email-enrichment/` — All enrichment scripts, data, and output
- `lead-generation-app/` — Next.js UI + `/api/leads` endpoint with Pinecone + Groq integrations
- `run_full_enrichment.py` — Orchestrates the full pipeline

---

**Happy scraping & enriching!** 🚀
