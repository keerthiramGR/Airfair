import ssl
import urllib.request
import json
import os

ctx = ssl.create_default_context()
ctx.set_ciphers('DEFAULT@SECLEVEL=1')
ctx.options |= 0x4  # OP_LEGACY_SERVER_CONNECT

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://esankhyiki.mospi.gov.in',
    'Referer': 'https://esankhyiki.mospi.gov.in/'
}

# 1. Fetch metadata & filter lists
print("Fetching states and filters from MoSPI...")
filter_url = 'https://api.mospi.gov.in/api/cpi/getCpiFilterByLevelAndBaseYear?base_year=2024&year=2026&level=Group&series=Current'
req = urllib.request.Request(filter_url, headers=headers)
with urllib.request.urlopen(req, context=ctx, timeout=20) as res:
    filter_data = json.loads(res.read().decode('utf-8'))

states = filter_data['data'][0]['state']
print(f"Total states found: {len(states)}")

# Key aviation hub states mapping
target_states = {
    "All India": 1,
    "Delhi": next((s['state_code'] for s in states if 'Delhi' in s['state_name']), 10),
    "Maharashtra": next((s['state_code'] for s in states if 'Maharashtra' in s['state_name']), 27),
    "Karnataka": next((s['state_code'] for s in states if 'Karnataka' in s['state_name']), 29),
    "Tamil Nadu": next((s['state_code'] for s in states if 'Tamil' in s['state_name']), 33),
    "West Bengal": next((s['state_code'] for s in states if 'Bengal' in s['state_name']), 19),
    "Telangana": next((s['state_code'] for s in states if 'Telangana' in s['state_name']), 36)
}
print("Target Aviation Hub States:", target_states)

# Payload for 100% Transport
payload_transport = {
    "food": 0, "tobacco": 0, "clothing": 0, "housing": 0,
    "furnishings": 0, "health": 0, "transport": 100, "communication": 0,
    "recreation": 0, "education": 0, "restaurants": 0, "personal": 0
}

extracted_dataset = {
    "source": "Ministry of Statistics and Programme Implementation (MoSPI), Government of India",
    "portal": "https://esankhyiki.mospi.gov.in",
    "api_endpoint": "https://api.mospi.gov.in/api/cpi/getInflation",
    "base_year": "2024=100",
    "series": "Current (Base 2024)",
    "category": "Division 07: Transport & Airfare Passenger Travel",
    "national_transport_weight": 8.7961,
    "hub_states": {}
}

for state_name, state_code in target_states.items():
    print(f"Fetching Transport CPI for {state_name} (Code: {state_code})...")
    url = f"https://api.mospi.gov.in/api/cpi/getInflation?year=2026&state_code={state_code}&sector_code=3&month_code=7"
    try:
        req_st = urllib.request.Request(url, data=json.dumps(payload_transport).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req_st, context=ctx, timeout=20) as res:
            resp = json.loads(res.read().decode('utf-8'))
            extracted_dataset["hub_states"][state_name] = {
                "state_code": state_code,
                "transport_inflation_rate": resp.get("personal_inflation_rate"),
                "national_inflation_rate": resp.get("national_inflation_rate"),
                "series_2026": resp.get("personal_current_index", []),
                "series_2025": resp.get("personal_previous_index", [])
            }
            if state_name == "All India":
                extracted_dataset["all_india_headline_2026"] = resp.get("national_current_index", [])
                extracted_dataset["all_india_headline_2025"] = resp.get("national_previous_index", [])
    except Exception as e:
        print(f"Error fetching {state_name}: {e}")

# Save to data/mospi_esankhyiki_cpi.json
os.makedirs("data", exist_ok=True)
out_path = os.path.join("data", "mospi_esankhyiki_cpi.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(extracted_dataset, f, indent=2)

print(f"\nSuccessfully extracted and saved MoSPI eSankhyiki dataset to: {out_path}")
