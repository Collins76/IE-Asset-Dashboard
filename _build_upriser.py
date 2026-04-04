"""Build upriser_feeder_pillar.js from the GeoJSON survey data."""
import json, os, re

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'IE_Upriser_FeederPillar.geojson')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'upriser_feeder_pillar.js')

def extract_photo_id(photo_str):
    """Extract first Google Drive file ID from photo field."""
    if not photo_str:
        return ''
    m = re.search(r'id=([a-zA-Z0-9_-]+)', str(photo_str))
    return m.group(1) if m else ''

def clean_bu(bu):
    """Normalize BU name: 'Ikorodu BU' -> 'IKORODU'"""
    if not bu:
        return ''
    return bu.replace(' BU', '').strip().upper()

def clean_ut(ut):
    """Normalize UT name: 'Ayangburen U/T' -> 'AYANGBUREN'"""
    if not ut:
        return ''
    return ut.replace(' U/T', '').replace(' UT', '').strip().upper()

def main():
    with open(SRC, 'r', encoding='utf-8') as f:
        data = json.load(f)

    records = []
    for ft in data.get('features', []):
        p = ft.get('properties', {})
        geom = ft.get('geometry')

        lat = p.get('Latitude', 0)
        lng = p.get('Longitude', 0)
        if geom and geom.get('type') == 'Point':
            coords = geom.get('coordinates', [])
            if len(coords) >= 2:
                lng = coords[0]
                lat = coords[1]

        # Keep all records (even without coords) for the data table

        good = p.get('Number of upriser that are good', 0)
        bad = p.get('Number of upriser that are bad', 0)
        total = p.get('Total number of Upriser', 0)
        try:
            good = int(good) if good else 0
        except:
            good = 0
        try:
            bad = int(bad) if bad else 0
        except:
            bad = 0
        try:
            total = int(total) if total else 0
        except:
            total = 0

        fp_exists = p.get('Is there feeder pillar', False)
        fp_type = p.get('Select below if the Feeder Pillar is', '')
        fp_cond = p.get('Condition of Feeder Pillar', '')
        validation = p.get('Validation', '')
        photo_id = extract_photo_id(p.get('Photo', ''))

        rec = {
            'dt': p.get('PUBLIC DTs', ''),
            'bu': clean_bu(p.get('BU', '')),
            'ut': clean_ut(p.get('UNDERTAKINGS.1', '')),
            'addr': p.get('Address', ''),
            'gd': good,
            'bd': bad,
            'tt': total,
            'fp': bool(fp_exists),
            'ft': fp_type if fp_type else '',
            'fc': fp_cond if fp_cond else '',
            'vl': validation,
            'ph': photo_id,
            'la': round(float(lat), 6) if lat else 0,
            'ln': round(float(lng), 6) if lng else 0,
        }
        records.append(rec)

    print(f'Total records: {len(records)}')

    # Stats
    bu_counts = {}
    for r in records:
        bu_counts[r['bu']] = bu_counts.get(r['bu'], 0) + 1
    print(f'BUs: {bu_counts}')

    cond_counts = {}
    for r in records:
        cond_counts[r['fc']] = cond_counts.get(r['fc'], 0) + 1
    print(f'Conditions: {cond_counts}')

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated Upriser & Feeder Pillar survey data\n')
        f.write(f'// {len(records)} records\n')
        f.write('var UF_DATA=')
        json.dump(records, f, separators=(',', ':'))
        f.write(';\n')

    fsize = os.path.getsize(OUT) / 1024
    print(f'Output: {OUT} ({fsize:.0f} KB)')

if __name__ == '__main__':
    main()
