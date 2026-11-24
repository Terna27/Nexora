import asyncio
from sqlalchemy import text
from database import engine

async def main():
    async with engine.connect() as connection:
        result = await connection.execute(text("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """))

        print("Existing public tables:")
        for row in result:
            print("-", row[0])

    await engine.dispose()

asyncio.run(main())
