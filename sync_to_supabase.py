"""
Sync dashboard assets to Supabase Storage.

Re-uploads the data bundles and geo files to the public 'dashboard-assets'
bucket in project blxuwvxitbbjhzgucvhp. Run this after regenerating any of
the .js data files (e.g. after build_data.py / _build_network.py /
_build_upriser.py) so the live dashboard picks up the new data.

Setup (once):
    1. Create a .env file next to this script containing:
           SUPABASE_SERVICE_ROLE_KEY=eyJ...your service_role key...
       Get it from: https://supabase.com/dashboard/project/blxuwvxitbbjhzgucvhp/settings/api-keys
       (.env is gitignored.)
    2. pip install requests python-dotenv

Usage:
    python sync_to_supabase.py                # upload all known files
    python sync_to_supabase.py dashboard_data.js ie_network_overview.js
                                              # upload just these
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_REF = "blxuwvxitbbjhzgucvhp"
BUCKET = "dashboard-assets"
BASE_URL = f"https://{PROJECT_REF}.supabase.co/storage/v1/object/{BUCKET}"

# filename -> (local path relative to this script, content-type)
FILES: dict[str, tuple[str, str]] = {
    "dashboard_data.js":              ("dashboard_data.js",              "application/javascript"),
    "upriser_feeder_pillar.js":       ("upriser_feeder_pillar.js",       "application/javascript"),
    "ie_network_overview.js":         ("ie_network_overview.js",         "application/javascript"),
    "IE_Upriser_FeederPillar.geojson":("IE_Upriser_FeederPillar.geojson","application/geo+json"),
    "IE+Network+Overview.geojson":    ("IE+Network+Overview.geojson",    "application/geo+json"),
    "IE+Network+Overview.kml":        ("IE+Network+Overview.kml",        "application/vnd.google-earth.kml+xml"),
    "IE_Network_Overview.kmz":        ("IE Network Overview.kmz",        "application/vnd.google-earth.kmz"),
    "IE_Upriser_FeederPillar.qmd":    ("IE_Upriser_FeederPillar.qmd",    "text/plain"),
    "build_data.py":                  ("build_data.py",                  "text/x-python"),
    "_build_network.py":              ("_build_network.py",              "text/x-python"),
    "_build_upriser.py":              ("_build_upriser.py",              "text/x-python"),
    "_parse_kmz.py":                  ("_parse_kmz.py",                  "text/x-python"),
    "_parse_kmz2.py":                 ("_parse_kmz2.py",                 "text/x-python"),
}


def upload(dest_name: str, local_path: Path, content_type: str, key: str) -> None:
    size = local_path.stat().st_size
    print(f"  {dest_name}  ({size/1_048_576:.2f} MB)  ... ", end="", flush=True)
    with local_path.open("rb") as f:
        r = requests.post(
            f"{BASE_URL}/{dest_name}",
            headers={
                "Authorization": f"Bearer {key}",
                "apikey": key,
                "Content-Type": content_type,
                "x-upsert": "true",
            },
            data=f,
            timeout=300,
        )
    if r.status_code in (200, 201):
        print("OK")
    else:
        print(f"FAIL [{r.status_code}] {r.text[:200]}")
        sys.exit(1)


def main() -> None:
    here = Path(__file__).parent
    load_dotenv(here / ".env")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        sys.exit(
            "ERROR: SUPABASE_SERVICE_ROLE_KEY not set. "
            "Add it to a .env file next to this script."
        )

    targets = sys.argv[1:] or list(FILES.keys())
    print(f"Uploading {len(targets)} file(s) to bucket '{BUCKET}':")
    for name in targets:
        if name not in FILES:
            print(f"  {name}  ... SKIP (not in FILES map)")
            continue
        local_name, ctype = FILES[name]
        path = here / local_name
        if not path.exists():
            print(f"  {name}  ... SKIP (local file missing: {local_name})")
            continue
        upload(name, path, ctype, key)
    print("Done.")


if __name__ == "__main__":
    main()
