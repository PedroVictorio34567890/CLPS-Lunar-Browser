# Lunar Mission Browser

**Explore lunar south pole sites with communications at the center of mission planning.**

Lunar Mission Browser is an interactive web prototype developed by **Team AsteroidDestroyer** for **NASA Space Apps Challenge 2026**. It helps users compare candidate locations and understand how terrain, sunlight, battery capacity and radio equipment affect a mission's ability to send data to Earth.

**Version:** 0.3.0 · **Interface:** English and Spanish · **Deployment:** static website

This is an independent research and educational prototype. It is not an official NASA application and does not certify operational feasibility or landing safety. Default settings are editable examples, not NASA mission requirements.

## Why this project matters

A view of Earth alone does not establish a usable communication link. Local ridges can block the path, radio equipment must provide sufficient margin, and the spacecraft needs power to transmit. During an outage, stored data can accumulate until memory fills.

The application brings these constraints into one comparison. Users can inspect the assumptions behind a result, compare scenarios and export the evidence for further study.

## Try a mission

1. Open the application and select **English** in the language menu. Follow the tutorial, or reopen it at any time with **Tutorial**.
2. Select **Add LOLA example · Shackleton rim**, or enter a candidate's latitude and longitude. South and west coordinates are negative.
3. Choose a start and end date in **UTC**. Review the example mission requirements, ground station and equipment settings.
4. Select **Analyze and compare**. The summary shows link availability with power, the longest radio outage, minimum battery charge and sunlight availability.
5. Expand **Communications**, **Data storage**, **Terrain and illumination**, or **Spherical reference** to inspect the results and their limitations.
6. Open **Save your results** to download the full **JSON** report or a **CSV** summary.

The Shackleton example demonstrates the effect of terrain and outages. It is not a recommended or certified landing site. Saved scenarios remain in the current browser and do not synchronize through a cloud account.

## What the application includes

| Capability | What users can explore |
| --- | --- |
| **Interactive lunar explorer** | Orbit the camera around a fixed Moon, view Earth and the Sun, inspect directions from a selected site, and play back the scene in UTC. |
| **Site and scenario comparison** | Compare up to eight candidate locations, save scenarios locally and examine changes in mission timing. |
| **Direct communications** | Evaluate lunar and ground-station visibility, a configurable downlink radio budget, link margin, availability with energy and outage duration. |
| **Energy balance** | Estimate solar generation and battery charge using panel orientation, solar distance, efficiencies, reserve requirements and power limits. |
| **Data storage** | Estimate transmitted data, pending data and losses when storage fills during outages. |
| **Terrain assessment** | Examine horizon obstruction, slopes, elevation range and deviations from a fitted plane where elevation data are available. |
| **Official resource access** | View Moon Trek map context, open external resources and import a Horizons response for a limited coordinate comparison. |
| **Exportable evidence** | Download inputs, results, source metadata and numerical consistency checks in the full report. |

The interface includes a repeatable tutorial, labeled controls, keyboard interaction and visible focus indicators. It adapts to smaller screens and initially respects reduced-motion preferences. Coordinate entry and reports remain usable if WebGL is unavailable.

## Run locally

### Requirements

- Node.js **22.18+** or **24 LTS**.
- **pnpm 11**, available in your terminal.
- A modern browser. WebGL is needed for the interactive 3D view.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite in the terminal. Keep the terminal running while using the application; press **Ctrl+C** to stop the server.

No backend, API keys or AI service are required. Core calculations use the included numerical datasets. External websites and Moon Trek map tiles require an internet connection.

### Check and build

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`pnpm build` creates the static website in `dist/`. `pnpm preview` serves that build locally for review. Open its printed URL rather than opening `index.html` directly: workers and data files require HTTP or HTTPS, not `file://`.

The documented verification for version 0.3.0 includes **98 automated tests**, TypeScript checks and a production build. Tests cover energy and data conservation, radio calculations, terrain, reference-frame transformations, report exports and a bounded comparison with Horizons. These checks do not constitute independent physical validation across the model's full domain.

## Publish the application

For hosting at a domain's root, run `pnpm build` and publish **all contents of `dist/`**, including `assets/`, `textures/` and `terrain/`, to a static HTTPS host.

For a GitHub Pages project site under `/CLPS-Lunar-Browser/`, use:

```sh
pnpm typecheck
pnpm exec vite build --base=/CLPS-Lunar-Browser/
```

Replace the base path if your repository or hosting path differs, then publish the resulting `dist/`. The host must serve JavaScript with the correct MIME type and serve the terrain data files without replacing them with an HTML fallback page.

Before sharing the public URL, open it in a private browser window without signing in. Confirm that the Shackleton example completes its analysis and that JSON and CSV downloads work. A `localhost` address is only accessible on the machine running the server.

Additional release instructions are in the [delivery guide](docs/DELIVERY.md) (Spanish).

## Data sources and their roles

| Source | Use in this project |
| --- | --- |
| [NASA/GSFC LOLA south pole products](https://pgda.gsfc.nasa.gov/products/78) | Local Shackleton elevation data processed to a 20 m grid for terrain calculations. |
| [LRO/LOLA regional DEM](https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_80M.LBL) | Regional elevation data at 80 m spacing. |
| [NASA/JPL NAIF SPICE](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/) | Preparation of lunar orientation data in the MOON_ME/DE421 frame. |
| [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | A user-imported, limited comparison of apparent sub-Earth and subsolar coordinates. It does not replace the calculation engine. |
| [NASA Moon Trek](https://trek.nasa.gov/moon/) | Visual map context. Map images are not the numerical elevation data used in calculations. |
| [LROC QuickMap](https://quickmap.lroc.asu.edu/) | External inspection of lunar imagery and map layers. |
| [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/4720/) | Lunar surface texture for visualization. |
| [NASA/JPL Telecommunications Link Design Handbook](https://deepspace.jpl.nasa.gov/dsndocs/810-005/) | Reference material for radio link calculations. |
| [Canadian Space Agency: Moon exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/) | Exploration context, not relay orbit or service availability data. |

Dataset provenance, processing details and hashes accompany the files in [`public/terrain/`](public/terrain/). External data and software retain their original credits and licenses. See [CREDITS.md](CREDITS.md) for the complete attribution list, including Earth imagery and software libraries.

## Scientific scope and limitations

- **Visualization and terrain are separate.** The orbital 3D Moon is a sphere, not a topographic mesh. Numerical elevation grids drive terrain calculations. Surface views and event countdowns use the terrain horizon when a current report and coverage are available; otherwise, they show the spherical reference. Halos, stars and atmospheric effects are visual effects.
- **Coverage is finite.** The local terrain horizon searches up to 100 km, combining nearby 20 m and more distant 80 m elevation data with a 2 m observer. Regional slope coverage does not automatically extend terrain-horizon coverage.
- **Results depend on sampling.** The analysis uses five-minute samples and includes the exact interval endpoints. Narrow terrain features and short events can be missed. Reported outages are limited to the selected period.
- **Time ranges differ by model.** The spherical model supports 2000–2100 with an analysis period of at most 90 days. The bundled terrain orientation data cover 1 January 2000 through 1 January 2050; the application checks this narrower range.
- **Radio estimates are preliminary.** The model considers a one-way direct downlink to one configurable ground station. It does not model station scheduling, ground terrain, weather forecasts, interference, acquisition or a guaranteed relay service. A positive theoretical radio margin does not establish an unobstructed or powered link.
- **Further validation is needed.** Real relay operations require orbit and service data. Eclipses, partial solar disk visibility, hazards smaller than the terrain grid, soil mechanics, landing dynamics, thermal effects and aging remain outside the model. Numerical consistency checks do not certify mission or landing safety.

## Technology and repository guide

The application uses **React**, **strict TypeScript** and **Vite**. **Three.js**, **React Three Fiber** and **Drei** provide visualization. **Astronomy Engine** supplies ephemeris calculations, and a **Web Worker** runs the analysis. **SpiceyPy** supports offline preparation of lunar orientation data.

| Location | Contents |
| --- | --- |
| [`src/`](src/) | Application interface, translations and visualization. |
| [`src/science/`](src/science/) | Scientific calculations and analysis worker. |
| [`public/terrain/`](public/terrain/) | Bundled terrain and orientation data with metadata. |
| [`public/textures/`](public/textures/) | Visualization assets and attribution. |
| [`tests/`](tests/) | Automated tests and reference fixtures. |
| [`docs/`](docs/) | Scientific scope, data integration, terrain assessment and export documentation. |

Detailed technical documentation is currently in Spanish:

- [Scientific model and development history](docs/SCIENCE.md)
- [Terrain screening](docs/TERRAIN_SCREENING.md)
- [Official resource integration](docs/OFFICIAL_RESOURCES.md)
- [Report format and consistency checks](docs/REPORT_EXPORT.md)
- [Release and deployment](docs/DELIVERY.md)

## Attribution and AI assistance

OpenAI **ChatGPT/Codex** assisted with programming, debugging, tests, documentation, interface text and styling. Scientific source datasets come from the credited providers. Computed results are model estimates, not new NASA observations. The application does not call an AI service at runtime.

The project uses its own orbital symbol and favicon. Participation in NASA Space Apps does not imply NASA endorsement or certification. Full resource and AI-assistance disclosures are available in [CREDITS.md](CREDITS.md).
