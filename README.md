# IE Asset Dashboard

Enterprise-grade Asset Monitoring & Network Intelligence Dashboard for **Ikeja Electric Plc**, visualizing **20,641 distribution transformer** records, **21,560 network infrastructure features**, and **16,127 upriser/feeder pillar survey records** across multiple interactive pages.

## Live Dashboard

**[View Dashboard](https://ie-asset-dashboard.vercel.app)**

---

## Dashboard Pages

### 1. Executive Summary
- 5 KPI cards with animated icons (Total DTs, Capacity, Metered %, Connected %, BU Count)
- Transformers by BU (bar chart), Asset Ownership (donut), Metering/Connection/SRT overviews
- Risk & anomaly alerts (unmetered, faulty meters, disconnected-but-commissioned)
- AI Data Intelligence Assistant for natural language queries

### 2. Network Infrastructure
- Feeder voltage analysis (11kV vs 33kV distribution)
- Substation distribution across BUs
- Ownership breakdown (Public vs Private)
- Route length analysis by feeder

### 3. Metering Analytics
- Metering status breakdown by BU (stacked bar)
- Meter type distribution (donut)
- Meter functionality analysis
- Metering gap identification

### 4. Operational Status
- Connection & commissioning status charts
- Installation position by BU (Ground vs Pole Mounted)
- SRT Band distribution
- Asset creation trend over time
- Disconnection status analysis

### 5. Upriser & Feeder Pillar
- **5 KPI cards** with animated icons: DTs Surveyed (16,127), Uprisers Good/Bad, FP Coverage (92.3%), Critical Condition (538), Validation Rate (96.6%)
- **Interactive map** color-coded by Feeder Pillar Condition (Excellent/Good/Poor/Critical/No) with UT and Lagos State boundaries
- **Photo popups** showing up to 3 field survey photos per DT from Google Drive
- **Stacked bar chart**: FP Condition by BU
- **Donut chart**: FP Type distribution (Wired/Fused/No)
- **Data table** with 16,127 records, Field Officer filter, search with intellisense, pagination
- Cross-filtered by dashboard BU, UT, Feeder, and DT Nom filters

### 6. Geospatial DT Map
- Interactive Leaflet map with **20,641 markers** (Canvas renderer for performance)
- BU color-coded markers with hover expand and detailed popups
- Search bar with intellisense (autocomplete suggestions)
- DT Nom filter zoom with color-cycling pulse animation
- Map layer switcher (OpenStreetMap, Dark Gray, Satellite, Humanitarian)

### 7. IE Network Overview
- **21,560 network features** across 23 layers from GeoJSON/KMZ data
- Layers include: Lagos Boundary, UT Boundaries (54 territories with labels), TCN Stations, Injection Substations, 33kV Feeder Lines, 11kV/33kV DSS and HT Lines per BU
- Distinct marker shapes: circles (11kV DSS), diamonds (33kV DSS), stars (TCN/ISS), dashed lines (HT)
- In-map filter panel with Select All/Deselect All toggle
- Search bar with intellisense across all network features
- Cross-filtered by dashboard BU, Ownership, Metering, Connection, and State filters
- Geographic State filtering (features outside selected state bounds are hidden)

### 8. Asset Data Table
- Sortable, searchable, paginated table with all 20,641 records
- Status badges (color-coded connection, metering, commissioning status)
- CSV export functionality
- Search with autocomplete intellisense

---

## Key Features

### Filtering System
- **15 cascading multi-select filters**: BU, UT, Substation, Feeder, Voltage, Metering, Connection, Commission, SRT Band, Ownership, Installation, State, Maintenance, Year, DT Nomenclature
- **Real-time filter sync**: selecting any filter updates available options across all other filters
- **Cross-page filtering**: filters apply to all pages including maps and network overview
- **Lazy page rendering**: only the active page re-renders on filter change (performance optimization)
- **Search bars with intellisense** on Feeder and DT Nom filter dropdowns

### Map Features
- **Auto-zoom** to filtered area when BU or State filter is applied
- **DT Nom zoom** with color-cycling expanding ring pulse animation (8 colors, 3s duration)
- **Hover effects** on all markers (expand radius, increase opacity)
- **Photo integration** in upriser map popups (Google Drive thumbnails)
- **UT boundary labels** with distinct colors per territory
- **Geographic State filtering** using bounding box from filtered DT coordinates

### Export & Reporting
- **PDF Report** generation with styled multi-page layout (KPIs, charts, tables, BU breakdown)
- **CSV Export** of filtered data
- **Animated buttons** with hover lift, ripple glow, and click snap effects

### Performance Optimizations
- **Lazy page rendering**: dirty page tracking, only active page renders on filter change
- **Debounced filters**: 80ms debounce on filter changes, prevents queuing heavy renders
- **Pre-built search index** for map markers (instant string lookup)
- **Canvas renderer** for Leaflet maps (handles 20K+ markers smoothly)
- **requestAnimationFrame** for reset button (instant visual feedback)

### Responsive Design
- **Desktop** (1200px+): full layout with side-by-side charts
- **Tablet** (768-1200px): stacked charts, 2-column filters
- **Mobile** (480-768px): wrapped nav tabs, single-column KPIs, 50vh maps
- **Small phone** (480px-): compact tabs, 2-column filters, minimized UI

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Charts | Plotly.js 2.27 |
| Maps | Leaflet.js 1.9.4 (Canvas renderer) |
| Frontend | Single HTML file, vanilla JS/CSS |
| Theme | Dark charcoal carbon with animated elements |
| Hosting | Vercel (auto-deploy from GitHub) |
| Data | Pre-built JS data files (dashboard_data.js, ie_network_overview.js, upriser_feeder_pillar.js) |

---

## Project Structure

```
IE_Asset_Dashboard.html          -- Main dashboard (single-file app, all pages)
dashboard_data.js                -- DT asset data (20,641 records, 31 fields)
ie_network_overview.js           -- Network infrastructure data (21,560 features, 23 layers)
upriser_feeder_pillar.js         -- Upriser & FP survey data (16,127 records)
IE Logo.png                      -- IE company logo
vercel.json                      -- Vercel deployment config

Build Scripts:
_build_network.py                -- GeoJSON -> ie_network_overview.js builder
_build_upriser.py                -- GeoJSON -> upriser_feeder_pillar.js builder

Source Data:
IE_Upriser_FeederPillar.geojson  -- Source upriser survey GeoJSON
IE+Network+Overview.geojson      -- Source network boundary GeoJSON
IE Network Overview.kmz          -- Source network KMZ file
_geojson_temp/                   -- Extracted GeoJSON files from KMZ sources
```

---

## Data Sources

### Distribution Transformer Data (dashboard_data.js)
- **20,641 records** with 31 fields per record
- Fields: DT Number, Nomenclature, BU, UT, Feeder, Capacity (kVA), Metering Status, Connection Status, Commissioning Status, SRT Band, Ownership, Installation Position, Address, GPS Coordinates, State, and more
- Feeder names normalized (case/hyphen/space deduplication)

### Network Infrastructure Data (ie_network_overview.js)
- **21,560 features** from 12 GeoJSON source files
- 23 layers organized by type and BU:
  - Boundaries: Lagos State, 54 UT territories
  - Infrastructure: 17 TCN Stations, 65 Injection Substations
  - 33kV Network: 91 feeder lines
  - 11kV per BU: DSS points, 33kV DSS, HT feeder lines (6 BUs)
- DSS nomenclature: full `FEEDER_NAME-DSS_NAME` format
- Field name normalization across BU variants (Oshodi/Ikeja/Ikorodu use different schemas)

### Upriser & Feeder Pillar Survey (upriser_feeder_pillar.js)
- **16,127 survey records** from field officer inspections
- Fields: DT name, BU, UT, Upriser counts (Good/Bad/Total), FP Condition, FP Type, Validation, Address, Field Officer, Role Position, Timestamp, GPS, Photo links
- Up to 3 Google Drive photo links per record
- State derived from ASSET_DATA DT name lookup

---

## BU Color Scheme

| Business Unit | Primary Color | Hex Code |
|--------------|---------------|----------|
| IKEJA | Cyan | `#00d4ff` |
| IKORODU | Green | `#10b981` |
| AKOWONJO | Amber | `#f59e0b` |
| SHOMOLU | Red | `#ef4444` |
| OSHODI | Purple | `#8b5cf6` |
| ABULE EGBA | Orange | `#f97316` |

---

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Collins76/IE-Asset-Dashboard.git
   cd IE-Asset-Dashboard
   ```

2. Serve locally:
   ```bash
   npx serve -l 3000 -s .
   ```

3. Open `http://localhost:3000` in your browser

### Rebuilding Data Files

To rebuild network overview data from GeoJSON sources:
```bash
python _build_network.py
```

To rebuild upriser data from survey GeoJSON:
```bash
python _build_upriser.py
```

---

## Deployment

The dashboard auto-deploys to Vercel on every push to `main`:

```
GitHub Push (main)
    -> Vercel Build (static files)
        -> Live at https://ie-asset-dashboard.vercel.app
```

Configuration in `vercel.json`:
```json
{
  "framework": null,
  "buildCommand": "",
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/", "destination": "/IE_Asset_Dashboard.html" }
  ]
}
```

---

## License

Proprietary -- Ikeja Electric Plc. All rights reserved.

Built by the **GIS Team, Ikeja Electric** with AI assistance from Claude.
