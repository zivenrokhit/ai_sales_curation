#!/usr/bin/env python3
"""
Orchestrates the full enrichment pipeline to generate final_enriched_company_data.json
"""
import subprocess
import shutil
import os
from pathlib import Path

ROOT = Path(__file__).parent
SCRAPY_DIR = ROOT / "scrapy-project"
ENRICHMENT_SCRIPTS_DIR = ROOT / "company-email-enrichment" / "scripts"


def check_output_json():
    output_json = SCRAPY_DIR / "output.json"
    if not output_json.exists():
        raise FileNotFoundError(
            "output.json not found. Please run the Scrapy spider with:"
            "\n  cd scrapy-project && scrapy crawl YCombinatorScraper -o output.json --overwrite"
            "\nThis will generate output.json directly as a JSON array."
        )
    print("[Step] output.json exists.")


# 2. Run emails.py to produce companies_step1_enriched.json directly
def run_emails_py():
    print("[Step] Running enrich_and_verify_emails.py (Enrichment) ...")
    subprocess.run(["python3", str(ENRICHMENT_SCRIPTS_DIR / "enrich_and_verify_emails.py")], check=True, cwd=ENRICHMENT_SCRIPTS_DIR)
    final_file = ROOT / "company-email-enrichment" / "output" / "final_enriched_company_data.json"
    if not final_file.exists():
        raise FileNotFoundError("company-email-enrichment/output/final_enriched_company_data.json not found after running enrich_and_verify_emails.py.")
    print(f"  Found {final_file}")

# 3. Run generic-email-finder.py to produce final_enriched_company_data.json
def run_generic_email_finder():
    print("[Step] Running generic_email_scraper.py (Generic Email Scraping) ...")
    subprocess.run(["python3", str(ENRICHMENT_SCRIPTS_DIR / "generic_email_scraper.py")], check=True, cwd=ENRICHMENT_SCRIPTS_DIR)
    final_file = ROOT / "company-email-enrichment" / "output" / "final_enriched_company_data.json"
    if not final_file.exists():
        raise FileNotFoundError("company-email-enrichment/output/final_enriched_company_data.json not found after running generic_email_scraper.py.")
    print(f"  Final output: {final_file}")

if __name__ == "__main__":
    check_output_json()
    run_emails_py()
    run_generic_email_finder()
    print("\n[Pipeline Complete] final_enriched_company_data.json is ready.")
