# Cryptiq Architectural Blueprint

## System Overview
Cryptiq is engineered as a three-tier institutional cryptocurrency investment and liquidity platform:
1. **Frontend Layer**: Next.js App Router for web; React Native & Expo for mobile.
2. **Shared Foundation**: Design tokens, domain types, and API client packages in pnpm workspace.
3. **Backend Engine**: Asynchronous Python FastAPI with PostgreSQL, SQLAlchemy 2.0, and Alembic.

```
+-----------------------------------------------------------+
|                       CRYPTIQ CLIENTS                     |
|  +-----------------------------+  +--------------------+  |
|  |      Next.js Web App        |  |  React Native App  |  |
|  | (Ledger Wall + Crawler HUD) |  |   (Mobile Scanner) |  |
|  +--------------+--------------+  +---------+----------+  |
+-----------------|---------------------------|-------------+
                  |                           |
                  v                           v
+-----------------------------------------------------------+
|                   SHARED MONOREPO PACKAGES                |
|  +--------------------+  +--------------------+  +------+ |
|  | @cryptiq/tokens    |  | @cryptiq/types     |  | @api | |
|  +--------------------+  +--------------------+  +------+ |
+------------------------------------+----------------------+
                                     |
                                     v
+-----------------------------------------------------------+
|                     CRYPTIQ BACKEND                       |
|  +-----------------------------------------------------+  |
|  |             FastAPI Asynchronous Gateway            |  |
|  |   - /health                                         |  |
|  |   - /api/v1/market/quotes                           |  |
|  |   - /api/v1/ledger/recent                           |  |
|  |   - /api/v1/scenarios/calculate                     |  |
|  +--------------------------+--------------------------+  |
|                             |                             |
|                             v                             |
|  +-----------------------------------------------------+  |
|  |            PostgreSQL (Audit Ledger & Assets)       |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```
