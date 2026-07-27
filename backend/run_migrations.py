#!/usr/bin/env python3
"""Run database migrations for new features."""
import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from app.core.database import engine


MIGRATIONS = [
    # Discount codes table
    """
    CREATE TABLE IF NOT EXISTS discount_codes (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        code VARCHAR(50) NOT NULL,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
        value NUMERIC(10,2) NOT NULL,
        max_uses INTEGER,
        used_count INTEGER NOT NULL DEFAULT 0,
        valid_from TIMESTAMP WITH TIME ZONE,
        valid_to TIMESTAMP WITH TIME ZONE,
        applicable_to VARCHAR(20) NOT NULL DEFAULT 'both',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by VARCHAR(36),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_discount_codes_tenant ON discount_codes(tenant_id);",
    "CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code, tenant_id);",
    
    # Email tracking events table
    """
    CREATE TABLE IF NOT EXISTS email_tracking_events (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        email_log_id VARCHAR(36),
        event_type VARCHAR(20) NOT NULL,
        tracking_id VARCHAR(36),
        ip_address VARCHAR(45),
        user_agent TEXT,
        url TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_email_tracking_tenant ON email_tracking_events(tenant_id);",
    
    # Add unsubscribe_token to email_sending_logs if not present
    """
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'email_sending_logs' AND column_name = 'unsubscribe_token'
        ) THEN
            ALTER TABLE email_sending_logs ADD COLUMN unsubscribe_token VARCHAR(36);
            ALTER TABLE email_sending_logs ADD COLUMN tracking_id VARCHAR(36);
            CREATE INDEX IF NOT EXISTS idx_esl_unsubscribe ON email_sending_logs(unsubscribe_token);
            CREATE INDEX IF NOT EXISTS idx_esl_tracking ON email_sending_logs(tracking_id);
        END IF;
    END $$;
    """,
    
    # Add discount_code_id to invoices if not present
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'invoices' AND column_name = 'discount_code_id'
        ) THEN
            ALTER TABLE invoices ADD COLUMN discount_code_id VARCHAR(36);
        END IF;
    END $$;
    """,
    
    # Notifications table (if not exists)
    """
    CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        notification_type VARCHAR(50) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, tenant_id);",
    "CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, tenant_id, is_read);",
]


async def run_migrations():
    async with engine.begin() as conn:
        for i, sql in enumerate(MIGRATIONS):
            try:
                await conn.execute(text(sql.strip()))
                print(f"Migration {i+1}/{len(MIGRATIONS)}: OK")
            except Exception as e:
                print(f"Migration {i+1}/{len(MIGRATIONS)}: {e}")
    print("All migrations complete.")


if __name__ == "__main__":
    asyncio.run(run_migrations())
