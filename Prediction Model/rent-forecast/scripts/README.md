# rent-forecast scripts

## export_area_forecast.py

Exports the per-area 3-month rent-forecast snapshot the Nook website reads from
`lib/seed/rent-forecast.json`.

The panel is static (latest month = Dec 2025), so the forecast is deterministic —
we compute it once here and commit the JSON instead of serving the FastAPI at
runtime. The snapshot stores **only percentage changes** per horizon; the website
rebases them onto each area's real median listing price (the panel is synthetic,
so its absolute rents are the wrong scale for Nook's student rooms).

The site-area → panel crosswalk lives in `AREA_MAP` inside the script. Areas with
no panel proxy (bangi / serdang / gombak) are omitted, and the site renders no
outlook for them.

### Regenerate (only when the panel or models change)

Run from the `rent-forecast` directory (paths contain spaces — quote them):

```
cd "Prediction Model/rent-forecast"
.venv/Scripts/python scripts/export_area_forecast.py
```

Then rebuild the site (`npm run build`) and commit the updated
`lib/seed/rent-forecast.json`.
