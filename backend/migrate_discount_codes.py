"""Create discount_codes table."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'discount_codes')"
        ))
        exists = result.scalar()
        if exists:
            print("Table discount_codes already exists")
            return

        await conn.execute(text("""
            CREATE TABLE discount_codes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR(64) NOT NULL,
                code VARCHAR(50) NOT NULL,
                discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                value NUMERIC(10,2) NOT NULL,
                max_uses INTEGER,
                used_count INTEGER NOT NULL DEFAULT 0,
                valid_from TIMESTAMPTZ,
                valid_to TIMESTAMPTZ,
                applicable_to VARCHAR(20) NOT NULL DEFAULT 'both',
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX idx_discount_codes_tenant_id ON discount_codes (tenant_id)"))
        await conn.execute(text("CREATE INDEX idx_discount_codes_code ON discount_codes (tenant_id, code)"))
        print("Table discount_codes created successfully")


if __name__ == "__main__":
    asyncio.run(main())
