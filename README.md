# IE Asset Dashboard

Enterprise-grade Asset Monitoring Dashboard for **Ikeja Electric Plc**, visualizing **20,641 distribution transformer** records across 31 data fields.

## Live Dashboard

**[View Dashboard](https://ie-asset-dashboard.vercel.app)**

## Features

### 6 Dashboard Pages
- **Executive Summary** — KPI cards, BU distribution, metering overview, risk alerts
- **Network Infrastructure** — Feeder voltage analysis, substation distribution, ownership breakdown
- **Metering Analytics** — Metering status, meter types, functionality analysis by BU
- **Operational Status** — Connection/commissioning status, installation position, SRT band analysis
- **Geospatial Map** — Interactive Leaflet map with 20K+ markers, BU color-coded, popups with DT details
- **Data Table** — Sortable, searchable, paginated table with CSV export and intellisense search

### Key Capabilities
- **15 Cascading Filters** — BU, UT, Substation, Feeder, Voltage, Metering, Connection, Commission, SRT Band, Ownership, Installation, State, Maintenance, Year, DT Nomenclature
- **Real-time Filter Sync** — Selecting any filter updates available options across all other filters
- **PDF Report Generation** — Styled multi-page report with KPIs, charts, tables, and BU breakdown
- **CSV Export** — Export filtered data to CSV
- **Responsive Design** — Works on desktop and tablet screens

## Tech Stack

| Component | Technology |
|-----------|------------|
| Charts | Plotly.js |
| Map | Leaflet.js (Canvas renderer) |
| Frontend | Single HTML file, vanilla JS/CSS |
| Theme | Dark charcoal carbon with animated KPI cards |
| Hosting | Vercel (auto-deploy from GitHub) |
| Data Storage | Supabase Storage |
| CI/CD | GitHub Actions |

## Auto-Update Pipeline

```
Supabase Storage (Excel upload)
    → Database trigger (pg_net)
        → GitHub Actions (repository_dispatch)
            → Python build_data.py (openpyxl)
                → Commit dashboard_data.js
                    → Vercel auto-deploy
```

When the source Excel file is updated in Supabase Storage, the dashboard automatically rebuilds and redeploys.

## Project Structure

```
IE_Asset_Dashboard.html   — Main dashboard (single-file app)
dashboard_data.js         — Auto-generated data (20,641 records)
build_data.py             — Excel → JS data pipeline
requirements.txt          — Python dependencies (openpyxl)
vercel.json               — Vercel static site config
.github/workflows/        — GitHub Actions rebuild workflow
```

## BU Coverage

| Business Unit | Color |
|--------------|-------|
| IKEJA | Cyan |
| IKORODU | Green |
| AKOWONJO | Amber |
| SHOMOLU | Red |
| OSHODI | Purple |
| ABULE EGBA | Orange |

## Local Development

1. Clone the repo
2. Open `IE_Asset_Dashboard.html` in a browser
3. To rebuild data from Excel:
   ```bash
   pip install -r requirements.txt
   python build_data.py
   ```

## License

Proprietary — Ikeja Electric Plc
