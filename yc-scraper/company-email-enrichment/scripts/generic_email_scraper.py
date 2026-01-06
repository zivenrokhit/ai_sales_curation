import re
import time
import random
from urllib.parse import urljoin, urlparse, unquote
import requests
import os
import json
from bs4 import BeautifulSoup

EMAIL_REGEX = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
}

def scrape_website_for_email(base_url):
    """
    Scrapes a company's website for the best available contact email.
    Now includes:
      1. Restriction to same-domain URLs.
      2. Mailto ranking heuristics (prefers info@, contact@, support@).
      3. Cleans scripts/styles before regex text search.
    """

    try:
        parsed = urlparse(base_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
    except Exception as e:
        print(f"  [Scraper Error] Invalid URL: {base_url}. Error: {e}")
        return None

    urls_to_check = {base_url}
    visited_urls = set()

    # --- Part 1: Gather potential subpages ---
    try:
        resp = requests.get(base_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')

        for link in soup.find_all('a', href=True):
            href = link['href']
            text = link.get_text().lower()

            if any(word in href.lower() or word in text for word in ['contact', 'about', 'team']):
                full_url = urljoin(base_url, href)

                # only same-domain pages
                if urlparse(full_url).netloc == urlparse(base_url).netloc:
                    urls_to_check.add(full_url)

    except requests.exceptions.RequestException:
        print(f"  [Scraper Error] Could not access homepage {base_url}")

    # Add common fallback paths
    for path in ['/contact', '/contact-us', '/about']:
        urls_to_check.add(urljoin(base_url, path))

    # --- Part 2: Scrape pages ---
    for url in urls_to_check:
        if url in visited_urls:
            continue
        visited_urls.add(url)

        try:
            print(f"  [Scraping] Checking page: {url}")
            resp = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')

            # --- Method A: Extract mailtos, rank them ---
            mailto_links = soup.select('a[href^="mailto:"]')
            if mailto_links:
                emails = []
                for a in mailto_links:
                    raw = a.get('href', '')
                    if not raw:
                        continue
                    email = raw.split('mailto:')[1].split('?')[0]
                    email = unquote(email).strip()
                    if re.fullmatch(EMAIL_REGEX, email):
                        emails.append(email)

                if emails:
                    # rank preferred types
                    def rank(e):
                        e_lower = e.lower()
                        if any(x in e_lower for x in ['info@', 'contact@']): return 0
                        if 'support@' in e_lower: return 1
                        return 2

                    chosen = sorted(emails, key=rank)[0]
                    print(f"  [Scraper Success] Found mailto -> {chosen}")
                    return chosen

            # --- Method B: Regex in visible text ---
            for tag in soup(['script', 'style', 'noscript']):
                tag.extract()

            text = soup.get_text(separator=' ')
            match = re.search(EMAIL_REGEX, text)
            if match:
                email = match.group(0)
                if not any(ext in email for ext in ['.png', '.jpg', 'example.com', 'wix.com']):
                    print(f"  [Scraper Success] Found text email -> {email}")
                    return email

        except requests.exceptions.RequestException as e:
            print(f"  [Scraper Error] Failed to check {url}: {type(e).__name__}")
            continue

        # polite delay between requests
        time.sleep(0.5 + random.random())

    print("  [Scraper Fail] No public email found after checking all pages.")
    return None

# --- MAIN EXECUTION ---

def main():
    """
    Reads the enriched data from Step 1, finds companies needing a generic
    scrape, and performs it, saving to a final file.
    """
    
    input_file = 'companies_step1_enriched.json'
    output_file = '../../../final_enriched_company_data.json'
    
    companies_data = []

    # --- Resumability Logic ---
    # Load the *final* file if it exists, otherwise load the *input* file.
    load_file = output_file if os.path.exists(output_file) else input_file
    
    print(f"--- Loading data from '{load_file}' ---")
    try:
        with open(load_file, 'r', encoding='utf-8') as f:
            companies_data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: Input file not found: {load_file}")
        return
    except json.JSONDecodeError:
        print(f"ERROR: Could not read {load_file}. Is it valid JSON?")
        return

    save_counter = 0

    # Loop over each company in the loaded data
    for company in companies_data:
        company_name = company.get('company_name', 'Unknown Company')
        
        # --- This is the new logic ---
        # We only run if the status is "pending_generic_scrape"
        if company.get('scrape_status') == 'pending_generic_scrape':
            website = company.get('website')
            if not website:
                print(f"\nSkipping {company_name} (no website).")
                company['scrape_status'] = "scrape_failed_no_website"
                continue
            
            print(f"\n--- Scraping {company_name} ({website}) ---")
            
            # Call the scraper
            found_email = scrape_website_for_email(website)
            
            # Add the new fields to the company object IN-PLACE
            if found_email:
                company['published_company_email'] = found_email
                company['scrape_status'] = "scrape_complete"
            else:
                company['published_company_email'] = None
                company['scrape_status'] = "scrape_failed_no_email"
            
            save_counter += 1
        
        # --- Save progress after every 5 *scrapes* ---
        if save_counter > 0 and save_counter % 5 == 0:
            print(f"...Saving progress to {output_file}...")
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(companies_data, f, indent=2)
            except IOError as e:
                print(f"  [CRITICAL: Failed to write to {output_file}: {e}]")
            save_counter = 0 # Reset counter after saving

    # --- Final save at the very end ---
    print("\n--- All companies processed. Final save. ---")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(companies_data, f, indent=2)
    except IOError as e:
        print(f"  [CRITICAL: Failed to write to {output_file}: {e}]")

    print(f"\n========================================================")
    print(f"Enrichment Step 2 complete.")
    print(f"Final results saved to {output_file}")
    print(f"========================================================")

if __name__ == "__main__":
    main()