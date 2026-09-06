import ssl
import urllib.request
import json

ctx = ssl.create_default_context()
ctx.set_ciphers('DEFAULT@SECLEVEL=1')
ctx.options |= 0x4

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://esankhyiki.mospi.gov.in',
    'Referer': 'https://esankhyiki.mospi.gov.in/'
}

# Payload with 100% Transport weight (which includes Airfare / Aviation & Passenger transport)
payload = {
    "food": 0, "tobacco": 0, "clothing": 0, "housing": 0,
    "furnishings": 0, "health": 0, "transport": 100, "communication": 0,
    "recreation": 0, "education": 0, "restaurants": 0, "personal": 0
}

# Test Combined (sector 3), State 1 (All India), Month 7 (Latest)
url = "https://api.mospi.gov.in/api/cpi/getInflation?year=2026&state_code=1&sector_code=3&month_code=7"
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
with urllib.request.urlopen(req, context=ctx, timeout=15) as res:
    data = json.loads(res.read().decode('utf-8'))
    print("Full response keys:", data.keys())
    print(json.dumps(data, indent=2))
