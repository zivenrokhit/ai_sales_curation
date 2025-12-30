import json
import smtplib
import dns.resolver
import socket
from urllib.parse import urlparse
import time
import unicodedata
import os

# --- HELPER FUNCTIONS (Copied from your script) ---

def normalize_text(text):
    """Converts unicode text into a plain ASCII representation."""
    if text is None:
        return None
    nfkd_form = unicodedata.normalize('NFKD', str(text))
    return nfkd_form.encode('ascii', 'ignore').decode('ascii')

def generate_permutations(first, last, domain):
    """Generates a list of common email permutations."""
    first = first.lower()
    last = last.lower()
    
    f_initial = first[0] if first else ''
    l_initial = last[0] if last else ''
    
    permutations = [
        f"{first}@{domain}",
        f"{last}@{domain}",
        f"{first}.{last}@{domain}",
        f"{first}{last}@{domain}",
    ]
    
    if f_initial:
        permutations.append(f"{f_initial}{last}@{domain}")
        permutations.append(f"{f_initial}.{last}@{domain}")
        
    if l_initial:
        permutations.append(f"{first}{l_initial}@{domain}")
        permutations.append(f"{first}.{l_initial}@{domain}")

    if f_initial and l_initial:
        permutations.append(f"{f_initial}{l_initial}@{domain}")
        
    return list(dict.fromkeys(permutations))


def find_verified_email(first_name, last_name, domain):
    """
    Attempts to find a valid email for a person at a given domain.
    Returns:
    - "email@domain.com" (if verified)
    - "catch-all" (if server is a catch-all)
    - None (if not found or error)
    """
    
    if not first_name or not last_name:
        return None
    permutations = generate_permutations(first_name, last_name, domain)
    
    try:
        records = dns.resolver.resolve(domain, 'MX')
        mx_record = str(records[0].exchange)

        server = smtplib.SMTP(timeout=10)
        server.connect(mx_record)
        server.helo(server.local_hostname) 
        server.mail('test@example.com')

        fake_email = f"xyz987asdf123jkl@{domain}"
        catch_all_code, _ = server.rcpt(fake_email)
        
        if catch_all_code == 250:
            server.quit()
            return "catch-all"

        for email in permutations:
            code, _ = server.rcpt(email)
            if code == 250:
                server.quit()
                return email # We found a valid email!
            time.sleep(0.1)

        server.quit()
        return None

    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers, dns.exception.Timeout) as e:
        print(f"  [Skipping domain: {domain} (DNS Error: {type(e).__name__})]")
        return None
    except (smtplib.SMTPException, socket.error, socket.timeout) as e:
        print(f"  [Error connecting to {domain}: {type(e).__name__}]")
        return None
    except Exception as e:
        print(f"  [An unexpected error occurred for {domain}: {e}]")
        return None

# --- NEW MAIN FUNCTION ---

def main():
    """
    Reads company data, enriches it with email verification,
    and saves the modified data.
    """
    
    input_file = '../../scrapy-project/output.json'
    output_file = 'enriched_company_data.json'
    
    companies_data = []
    
    # --- Resumability Logic ---
    # Try to load the *output* file first. If it exists, we are resuming.
    # If not, load the *input* file to start from scratch.
    if os.path.exists(output_file):
        print(f"--- Resuming from '{output_file}' ---")
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                companies_data = json.load(f)
        except json.JSONDecodeError:
            print(f"Warning: '{output_file}' is corrupt. Starting from scratch.")
            companies_data = [] # Force reload from input
    
    if not companies_data:
        print(f"--- Starting new run from '{input_file}' ---")
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                companies_data = json.load(f)
        except FileNotFoundError:
            print(f"ERROR: Input file not found: {input_file}")
            return
        except json.JSONDecodeError:
            print(f"ERROR: Could not read {input_file}. Is it valid JSON?")
            return

    save_counter = 0

    # Loop over each company in the loaded data
    for company in companies_data:
        company_name = company.get('company_name', 'Unknown Company')
        website = company.get('website')
        
        # This flag will be set if *any* founder needs a generic scrape
        needs_generic_scrape = False

        if not website:
            continue
        
        try:
            domain = urlparse(website).netloc
            if domain.startswith('www.'):
                domain = domain[4:]
            if not domain:
                continue
        except Exception:
            continue
            
        print(f"\n--- Processing {company_name} ({domain}) ---")

        # Loop over each founder *object* in the founder_details list
        for founder in company.get('founder_details', []):
            full_name = founder.get('name')
            
            # --- Skip-Logic ---
            # If we already processed this founder, skip them
            if 'email_status' in founder:
                print(f"  - Skipping {full_name} (already processed)")
                # But we still need to check if they triggered the company flag
                if founder['email_status'] != 'verified':
                    needs_generic_scrape = True
                continue

            # --- Process New Founder ---
            if not full_name:
                continue

            name_parts = full_name.split()
            if len(name_parts) < 1:
                continue
                
            first_name = name_parts[0]
            last_name = name_parts[-1] if len(name_parts) > 1 else first_name

            first_name = normalize_text(first_name)
            last_name = normalize_text(last_name)
            
            if not first_name or not last_name:
                print(f"  - Skipping {full_name} (name invalid after normalizing).")
                continue

            print(f"  - Verifying: {full_name}...")
            
            # This returns the email, "catch-all", or None
            verification_result = find_verified_email(first_name, last_name, domain)
            
            # --- Add new keys IN-PLACE to the founder object ---
            if verification_result == "catch-all":
                print("  - Result: catch-all")
                founder['verified_email'] = None
                founder['email_status'] = "catch-all"
                needs_generic_scrape = True
                
            elif verification_result is None:
                print("  - Result: not_found")
                founder['verified_email'] = None
                founder['email_status'] = "not_found"
                needs_generic_scrape = True
                
            else: # We found an email!
                print(f"  - Result: Verified! -> {verification_result}")
                founder['verified_email'] = verification_result
                founder['email_status'] = "verified"
                # Note: needs_generic_scrape stays False (unless set by another founder)

        # After checking all founders, update the PARENT company object
        if needs_generic_scrape:
            company['scrape_status'] = "pending_generic_scrape"
        else:
            # Only set to 'complete' if it wasn't already pending.
            if 'scrape_status' not in company:
                company['scrape_status'] = "complete"

        # --- Save progress after every 5 companies ---
        save_counter += 1
        if save_counter % 5 == 0:
            print(f"...Saving progress to {output_file}...")
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(companies_data, f, indent=2)
            except IOError as e:
                print(f"  [CRITICAL: Failed to write to {output_file}: {e}]")

    # --- Final save at the very end ---
    print("\n--- All companies processed. Final save. ---")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(companies_data, f, indent=2)
    except IOError as e:
        print(f"  [CRITICAL: Failed to write to {output_file}: {e}]")

    print(f"\n========================================================")
    print(f"Enrichment Step 1 complete.")
    print(f"Results saved to {output_file}")
    print(f"========================================================")


if __name__ == "__main__":
    main()
