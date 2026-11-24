# CRYPTIQ — Institutional Algorithmic Digital Asset Platform

Cryptiq is a high-performance cryptocurrency investment and digital asset management platform combining algorithmic liquidity infrastructure, verifiable cryptographic custody, and a procedural cybernetic design system.

---

## 1. Monorepo Architecture

The repository is organized as a unified monorepo managed with **pnpm workspaces**:

```
cryptiq/
  apps/
    web/                 # Next.js App Router (React, Tailwind CSS, Canvas 2D)
    mobile/              # React Native with Expo and Expo Router
    api/                 # Python FastAPI, SQLAlchemy, Alembic, Pydantic
  packages/
    design-tokens/       # Shared color tokens, typography, and crawler parameters
    types/               # Shared TypeScript domain models & API contracts
    api-client/          # Typed API client with mathematical scenario models
  infrastructure/        # Docker Compose configuration (PostgreSQL & API)
  docs/                  # Architecture & Procedural Design System specifications
  .github/workflows/     # CI pipeline for automated package, web, and api validation
  package.json
  pnpm-workspace.yaml
  README.md
```

---

## 2. Core Visual Systems

### The Ledger Wall
A continuous, drifting full-viewport background telemetry stream simulating high-throughput decentralized exchange operations:
- Multi-column streaming blockchain transaction hashes, block numbers, asset pairs, liquidity metrics, order book spreads, and Merkle audit proofs.
- Muted cyan, electric blue, and slate palette with high contrast against the foreground.
- Low-overhead GPU-accelerated CSS animations preventing layout reflow.
- **Regulatory Transparency**: Synthetic streams are explicitly labeled: `[ILLUSTRATIVE DATA — NOT LIVE CUSTOMER TRANSACTIONS]`.

### Procedural Cryptiq Crawler Engine
An original geometric eight-legged robotic arachnid scanner rendered via HTML5 Canvas 2D:
- **Inverse Kinematics (IK)**: 2-bone analytical IK for realistic knee/leg flexion.
- **Alternating Gait Generator**: Ripple tetrapod gait ensuring realistic robotic locomotion.
- **DOM Target Detection**: Discovers elements tagged with `data-crawl-target`, caches bounding boxes, and steers toward targets.
- **HUD Reticle & Scanning Beam**: Projects coordinate crosshairs, vector tracer lines, and scanning beams upon latching onto nodes.
- **Interaction Safety & Accessibility**: Canvas is configured with `pointer-events: none` so no interactive UI is blocked; respects `prefers-reduced-motion` and includes interactive pause and reduced-motion controls.

---

## 3. Financial Compliance & 3% Scenario Calculator

The platform features an interactive return scenario calculator allowing users to model BTC, ETH, USDT, and SOL:
- **Non-Compounded Math**:
  $$\text{Daily Scenario} = P \times 0.03$$
  $$\text{7-Day Scenario} = P \times 0.03 \times 7$$
  $$\text{30-Day Scenario} = P \times 0.03 \times 30$$
- **Strict Disclosures**: The 3% figure is prominently marked as a hypothetical modeling assumption and not an expected, historical, or guaranteed yield. Digital assets carry risk of loss, including loss of principal.

---

## 4. Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 10 (`corepack enable pnpm`)
- Python >= 3.11

### Setup & Build
```bash
# Install workspace dependencies
pnpm install

# Build shared packages
pnpm build:packages

# Run web application in development
pnpm dev:web

# Run mobile application in development
pnpm dev:mobile

# Build web application for production
pnpm build:web
```

### Running Backend API
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API Documentation: `http://localhost:8000/api/v1/docs`
