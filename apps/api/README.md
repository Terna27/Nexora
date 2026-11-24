# Cryptiq Backend API

FastAPI-powered high-throughput backend service for the Cryptiq digital asset investment platform.

## Architecture & Responsibilities
- **Asynchronous Engine**: Built on FastAPI and SQLAlchemy 2.0 async.
- **Ledger Verification**: Serves illustrative and verified audit streams with Merkle proofs.
- **Scenario Models**: Transparent mathematical scenario models respecting non-compounded financial disclosure guidelines.
- **Database**: PostgreSQL support via SQLAlchemy & Alembic migrations.

## Local Development
```bash
# Set up virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```
Open interactive documentation at: `http://localhost:8000/api/v1/docs`
