# Roster Checker

A minimal static site that provides a Roster Checker for the Open Series, using ISO country lists (with extras) and configurable rules that can be changed from year to year. 

**Disclaimer**: This should not replace the official rulebook, and should only be used as a reference.

A copy of the live checker can be found in: https://fregerson.github.io/osChecker/

## Structure

- `index.html` — Roster Checker UI
- `assets/css/styles.css` — minimal styling
- `assets/js/config.js` — configurable regions, thresholds, representable countries
- `assets/js/guidelines.js` — player representation + roster checks
- `assets/js/script.js` — populates country list (with extras), roster UI (5–7 players), and results
- `assets/js/countries.js` — territories missing from RestCountries

## Customizing Eligibility Rules

Edit `assets/js/config.js` for high-level policy and `assets/js/guidelines.js` for any custom business logic.

Dual nationality: if any nationality is in the restricted set (`CN`,`HK`,`MO`,`TW`), PR is ignored and the player can only represent that restricted nationality.

### Regions and Disallowed Countries
Configure in [assets/js/config.js](assets/js/config.js):
- `regions`: `{ RegionName: ["US","CA",...] }`
- `restrictedCitizenshipNoPRExpansion`: `["CN","HK","MO","TW"]`
- `disallowedRepresentCountries`: `["XX", ...]`

## Local Testing

You can open `index.html` directly in a browser or run a simple static server:

### VS Code Live Server (recommended)
- Install the "Live Server" extension
- Open `index.html` and click "Go Live"

### Python (if installed)
```bash
python -m http.server 5500
```
Then open http://localhost:5500/

Directly opening `index.html` from disk may block `fetch('assets/data.json')` in the browser, so use a local server for testing.

## Notes
- Country lists are loaded from `assets/data.json`.
- If you update the bundled country data, keep the `name` and `alpha-2` fields intact so the roster dropdowns continue to work.

## Roster Checker
- Add 5–7 players, then Check Roster.
- The app automatically evaluates all configured regions and shows where the team qualifies.
- Validation counts a player’s representable country (from nationality/PR rules):
	- Minimum of 5 and maximum of 7 players.
	- Maximum of 1 player whose representable country is outside the region being evaluated.
	- Team representation threshold is region-specific:
		- "Southeast Asia": requires at least 3 players representing the same country and must be in the SEA representable whitelist.
		- All other regions (default): requires at least 2 players representing the same country; filtered by the region’s representable whitelist (if defined).
	- The result shows which countries the team may represent for each region.

### Configure thresholds
Set per-region minimums in [assets/js/config.js](assets/js/config.js):

```
teamRepresentationMinByRegion: {
	"Southeast Asia": 3,
	"India": 3,
	// OtherRegion: 2
}
```
