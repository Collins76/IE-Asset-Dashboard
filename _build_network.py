"""
Build ie_network_overview.js from GeoJSON files.
Parses HTML description tables row-by-row, extracts key fields,
builds proper nomenclature names for DSS and HT lines.
"""
import json, os, re, html as htmlmod
from collections import Counter

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_geojson_temp', 'GeoJSON Files')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ie_network_overview.js')

LAYERS = [
    ('Lagos Boundary Lines.geojson', 'lagos', 'Lagos Boundary', '#f43f5e', None),
    ('UT Boundary Lines.geojson', 'ut_boundary', 'UT Boundaries', '#94a3b8', None),
    ('TCN.geojson', 'tcn', 'TCN Stations', '#ef4444', None),
    ('ISS.geojson', 'iss', 'Injection Substations', '#f59e0b', None),
    ('All 33kv Lines.geojson', '33kv_lines', '33kV Feeder Lines', '#06b6d4', None),
    ('Shomolu 11kv DSS.geojson', '11kv_dss_shomolu', '11kV Shomolu DSS', '#ef4444', 'SHOMOLU'),
    ('Shomolu 33kv DSS.geojson', '33kv_dss_shomolu', '33kV Shomolu DSS', '#ef4444', 'SHOMOLU'),
    ('Shomolu HT Feeder Lines.geojson', 'ht_lines_shomolu', 'HT Lines Shomolu', '#ef4444', 'SHOMOLU'),
    ('Oshodi 11kv DSS.geojson', '11kv_dss_oshodi', '11kV Oshodi DSS', '#8b5cf6', 'OSHODI'),
    ('Oshodi 33kv DSS.geojson', '33kv_dss_oshodi', '33kV Oshodi DSS', '#8b5cf6', 'OSHODI'),
    ('Oshodi HT Feeder Lines.geojson', 'ht_lines_oshodi', 'HT Lines Oshodi', '#8b5cf6', 'OSHODI'),
    ('Ikorodu 11kv DSS.geojson', '11kv_dss_ikorodu', '11kV Ikorodu DSS', '#10b981', 'IKORODU'),
    ('Ikorodu 33kv DSS.geojson', '33kv_dss_ikorodu', '33kV Ikorodu DSS', '#10b981', 'IKORODU'),
    ('Ikorodu HT Feeder Lines.geojson', 'ht_lines_ikorodu', 'HT Lines Ikorodu', '#10b981', 'IKORODU'),
    ('Ikeja 11kv DSS.geojson', '11kv_dss_ikeja', '11kV Ikeja DSS', '#00d4ff', 'IKEJA'),
    ('Ikeja 33kv DSS.geojson', '33kv_dss_ikeja', '33kV Ikeja DSS', '#00d4ff', 'IKEJA'),
    ('Ikeja HT Feeder Lines.geojson', 'ht_lines_ikeja', 'HT Lines Ikeja', '#00d4ff', 'IKEJA'),
    ('Akowonjo 11kv DSS.geojson', '11kv_dss_akowonjo', '11kV Akowonjo DSS', '#f59e0b', 'AKOWONJO'),
    ('Akowonjo 33kv DSS.geojson', '33kv_dss_akowonjo', '33kV Akowonjo DSS', '#f59e0b', 'AKOWONJO'),
    ('Akwonjo HT Feeder Lines.geojson', 'ht_lines_akowonjo', 'HT Lines Akowonjo', '#f59e0b', 'AKOWONJO'),
    ('Abule Egba 11kv DSS.geojson', '11kv_dss_abule_egba', '11kV Abule Egba DSS', '#f97316', 'ABULE EGBA'),
    ('Abule Egba 33kv DSS.geojson', '33kv_dss_abule_egba', '33kV Abule Egba DSS', '#f97316', 'ABULE EGBA'),
    ('Abule Egba HT Feeder Lines.geojson', 'ht_lines_abule_egba', 'HT Lines Abule Egba', '#f97316', 'ABULE EGBA'),
]

# Normalize field name variants to standard keys
FIELD_MAP = {
    # Standard key -> list of source field name variants
    'BU_NAME': ['BU_NAME', 'BU', 'Bu'],
    'UT_NAME': ['UT_NAME', 'New_UT_Nam', 'UT'],
    'DSS_NAME': ['DSS_NAME'],
    'FED_NAME': ['FED_NAME'],
    'FEEDER_NAME': ['FEEDER_NAME', 'Feeder_Nam', 'Feeder_Name', 'FEEDER_NAM'],
    'DT_CODE': ['UNIQUE_NOM', 'CIS_DT_NAM', 'DT_CODE'],
    'CAPACITY': ['CAPACITY', 'Capacity'],
    'OWNERSHIP': ['OWNERSHIP', 'Ownership'],
    'INSTALL_POS': ['INSTALATION_POSITION', 'Installati', 'Installation', 'INSTALATIO', 'INSTL_POSI'],
    'METERING': ['METERING_STATUS', 'Metering_S', 'Metering Status', 'METERING__'],
    'METER_NO': ['METER_NUMBER', 'Meter_Numb', 'Meter_Number', 'METER_NUMB'],
    'CONNECTION': ['CONNECTION', 'Connection', 'Connection Status', 'CONNECTION_STATUS', 'COMMUNICATION_STATUS', 'COMMUNICAT'],
    'COMMISSION': ['COMMISSIONING_STATUS', 'Commission', 'Commissioning Status', 'COMMISSION'],
    'MAINTENANCE': ['MAINTENANCE', 'Maintenanc', 'MAINTENANC'],
    'STATUS': ['DISCONNECTION_STATUS', 'Disconnect', 'Disconnection Status', 'DISCONNECT'],
    'ADDRESS': ['ADDRESS', 'Addresses', 'Address'],
    'LAT': ['DECIMAL_DEGREE_LAT', 'LAT1', 'LAT_DEC', 'Coordinates__LAT_', 'Coordinates (LAT)', 'DECIMAL_DE'],
    'LONG': ['DECIMAL_DEGREE_LONG', 'LONG1', 'LONG_DEC', 'Coordinates__LONG_', 'Coordinates (LONG)', 'DECIMAL__1'],
    'INJECTION': ['INJECTION'],
    'TOTAL_CAP': ['TOTAL CAP'],
    'POWER_TX': ['POWER TRANSFORMER'],
    'VOLT_RATIO': ['VOLTAGE__RATIO'],
    'NUM_FEEDER': ['NUMBER OF FEEDER'],
    'OP_CAPACITY': ['OPERATING_CAPACITY'],
    'CIS_DT': ['CIS_DT_Num', 'CIS_ACCOUNT_NUMBER'],
    'STATE': ['STATE'],
}

def normalize_props(parsed):
    """Map variant field names to standard keys."""
    result = {}
    for std_key, variants in FIELD_MAP.items():
        for v in variants:
            if v in parsed and parsed[v] and str(parsed[v]).lower() not in ('', '<null>', '&lt;null&gt;', 'null', 'n/a'):
                result[std_key] = parsed[v]
                break
    return result


def parse_html_rows(desc_html):
    """Parse HTML description using row-based extraction (correct order)."""
    if not desc_html:
        return {}
    txt = htmlmod.unescape(str(desc_html))
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', txt, re.DOTALL | re.IGNORECASE)
    props = {}
    for row in rows:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
        clean = [re.sub(r'<[^>]+>', '', td).strip() for td in tds]
        if len(clean) == 2:
            key, val = clean[0], clean[1]
            if key and val and val.lower() not in ('', '<null>', '&lt;null&gt;', 'null'):
                props[key] = val
    return props


def round_coords(coords, precision=5):
    if isinstance(coords, (int, float)):
        return round(coords, precision)
    if isinstance(coords, list):
        if len(coords) in (2, 3) and all(isinstance(c, (int, float)) for c in coords):
            return [round(coords[0], precision), round(coords[1], precision)]
        return [round_coords(c, precision) for c in coords]
    return coords


def main():
    all_features = []

    for fname, layer_id, display_name, color, bu_key in LAYERS:
        fpath = os.path.join(SRC, fname)
        if not os.path.exists(fpath):
            print(f'  SKIP: {fname}')
            continue

        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        features = data.get('features', [])
        count = 0
        for ft in features:
            geom = ft.get('geometry', {})
            orig_props = ft.get('properties', {})
            orig_name = orig_props.get('Name', '') or ''
            desc_html = orig_props.get('description', '')
            parsed = parse_html_rows(desc_html)

            # Normalize all field names
            norm = normalize_props(parsed)

            # Build proper name based on layer type
            name = orig_name
            is_dss = 'dss' in layer_id
            is_ht = 'ht_lines' in layer_id

            if is_dss:
                # Prefer UNIQUE_NOM/DT_CODE if available (full nomenclature)
                unique_nom = norm.get('DT_CODE', '')
                if unique_nom and '-' in unique_nom:
                    name = unique_nom
                else:
                    # Build from FEEDER_NAME + DSS_NAME
                    feeder = norm.get('FEEDER_NAME', '') or parsed.get('FEEDER_NAME', '') or parsed.get('Feeder_Nam', '')
                    dss_name = norm.get('DSS_NAME', '') or parsed.get('DSS_NAME', orig_name)
                    if feeder and dss_name:
                        name = feeder + '-' + dss_name
                    elif feeder:
                        name = feeder + '-' + orig_name
                    elif dss_name:
                        name = dss_name
            elif is_ht:
                fed_name = parsed.get('FED_NAME', orig_name)
                name = fed_name if fed_name else orig_name

            new_props = {'name': name, '_layer': layer_id, '_color': color}
            if bu_key:
                new_props['_bu'] = bu_key

            # Add all normalized fields
            for k, v in norm.items():
                if len(str(v)) < 200:
                    new_props[k] = v

            new_geom = {
                'type': geom.get('type', ''),
                'coordinates': round_coords(geom.get('coordinates', []))
            }

            all_features.append({
                'type': 'Feature',
                'geometry': new_geom,
                'properties': new_props
            })
            count += 1

        print(f'  {layer_id}: {count} features')

    # Write output
    print(f'\nTotal features: {len(all_features)}')
    layer_counts = Counter(f['properties']['_layer'] for f in all_features)
    for lid, cnt in sorted(layer_counts.items()):
        print(f'  {lid}: {cnt}')

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated IE Network Overview data\n')
        f.write(f'// {len(all_features)} features from {len(layer_counts)} layers\n')
        f.write('var OV_NETWORK_DATA=')
        json.dump({"type": "FeatureCollection", "features": all_features}, f, separators=(',', ':'))
        f.write(';\n')

    fsize = os.path.getsize(OUT) / (1024 * 1024)
    print(f'\nOutput: {OUT} ({fsize:.1f} MB)')


if __name__ == '__main__':
    main()
