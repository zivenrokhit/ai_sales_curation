# YC Companies Scraper & Enrichment Pipeline

Welcome! This repo lets you scrape Y Combinator company data and enrich it with founder emails all in a few simple steps!

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

## 🧩 How It Works

- **Scrapy Project**: Gathers all YC company info (name, description, founders, etc.)
- **Enrichment Pipeline**: Adds verified founder emails and scrapes for generic company emails if needed
- **Result**: A single, deeply enriched JSON file ready for your next project!

## 📂 Key Folders

- `scrapy-project/` — The web scraper
- `company-email-enrichment/` — All enrichment scripts, data, and output
- `run_full_enrichment.py` — Orchestrates the full pipeline

---

**Happy scraping & enriching!** 🚀
