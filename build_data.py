#!/usr/bin/env python3
"""Extract IE Asset Data from Excel to JavaScript for the dashboard."""
import openpyxl
import json
from datetime import datetime

KEY_MAP = {
    'S/N': 'sn', 'DT Number': 'dt', 'New Unique DT Nomenclature': 'nom',
    'BU': 'bu', 'UT': 'ut', 'New UT Name': 'nut',
    'Feeder Voltage (V)': 'fv', 'Feeder Name': 'fn', 'SRT Band': 'srt',
    'Ownership': 'own', 'Installation Position': 'ip', 'Customer Name': 'cust',
    'Acc Platform': 'ap', 'Acc Type (Pre-Paid/Post-Paid)': 'at',
    'Metering Status': 'ms', 'Meter Number': 'mn',
    'Meter Functionality Status': 'mfs', 'Meter Type': 'mt',
    'Capacity (kVA)': 'cap', 'Connection Status': 'cs',
    'Commissioning Status': 'cos', 'Disconnection Status': 'ds',
    'Coordinates (LAT)': 'lat', 'Coordinates (LONG)': 'lng',
    'Address': 'addr', 'Creation Date': 'cd', 'State': 'st',
    'Feeder Status': 'fs', 'Substation': 'sub',
    'Feeder Position': 'fp', 'Route Length (KM)': 'rl'
}

def read_excel(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    headers = None
    records = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = list(row)
            continue
        rec = {}
        for j, val in enumerate(row):
            col = headers[j]
            key = KEY_MAP.get(col)
            if key is None:
                continue
            if isinstance(val, datetime):
                val = val.strftime('%Y-%m-%d')
            elif val is None:
                val = ''
            elif isinstance(val, str):
                val = val.strip()
            elif isinstance(val, float):
                if key in ('lat', 'lng'):
                    val = round(val, 6)
                elif key == 'rl':
                    val = round(val, 4)
                else:
                    val = int(val) if val == int(val) else round(val, 2)
            rec[key] = val
        records.append(rec)
    wb.close()
    return records

if __name__ == '__main__':
    print('Reading Excel file...')
    records = read_excel('IE Asset Data 2026.xlsx')
    print(f'Extracted {len(records)} records')

    print('Writing dashboard_data.js...')
    with open('dashboard_data.js', 'w', encoding='utf-8') as f:
        f.write('// Auto-generated from IE Asset Data 2026.xlsx\n')
        f.write('// Key mapping: sn=S/N, dt=DT Number, nom=Nomenclature, bu=BU, ut=UT, nut=New UT,\n')
        f.write('// fv=Feeder Voltage, fn=Feeder Name, srt=SRT Band, own=Ownership, ip=Installation Position,\n')
        f.write('// cust=Customer, ap=Acc Platform, at=Acc Type, ms=Metering Status, mn=Meter Number,\n')
        f.write('// mfs=Meter Func Status, mt=Meter Type, cap=Capacity kVA, cs=Connection Status,\n')
        f.write('// cos=Commissioning Status, ds=Disconnection Status, lat/lng=Coordinates,\n')
        f.write('// addr=Address, cd=Creation Date, st=State, fs=Feeder Status, sub=Substation,\n')
        f.write('// fp=Feeder Position, rl=Route Length KM\n\n')
        f.write('const ASSET_DATA = ')
        json.dump(records, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')

    import os
    size = os.path.getsize('dashboard_data.js')
    print(f'Generated dashboard_data.js ({size/1024/1024:.1f} MB)')
