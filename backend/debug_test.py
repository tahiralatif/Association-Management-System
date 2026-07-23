"""Quick debug script for 500 errors."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test():
    async with SessionLocal() as db:
        from app.modules.integrations import crud as int_crud
        from app.modules.integrations.schemas import WebhookResponse, DashboardStats, IntegrationResponse

        # list_webhooks
        try:
            wh = await int_crud.list_webhooks(db, 'demo-association')
            print(f"list_webhooks OK: {len(wh)} webhooks")
            for w in wh:
                WebhookResponse.model_validate(w)
            print("WebhookResponse validation OK")
        except Exception as e:
            print(f"list_webhooks FAIL: {type(e).__name__}: {e}")

        # dashboard
        try:
            stats = await int_crud.get_dashboard_stats(db, 'demo-association')
            DashboardStats(**stats)
            print(f"DashboardStats OK")
        except Exception as e:
            print(f"DashboardStats FAIL: {type(e).__name__}: {e}")

        # list_events
        try:
            events = await int_crud.list_events(db, 'demo-association')
            print(f"list_events OK: {len(events)} events")
        except Exception as e:
            print(f"list_events FAIL: {type(e).__name__}: {e}")

        # list_integrations
        try:
            ints = await int_crud.list_integrations(db, 'demo-association')
            for i in ints:
                IntegrationResponse.model_validate(i)
            print(f"list_integrations OK: {len(ints)} integrations")
        except Exception as e:
            print(f"list_integrations FAIL: {type(e).__name__}: {e}")

        # Test finances
        from app.modules.finances import crud as fin_crud
        try:
            result = await fin_crud.list_invoices(db, 'demo-association')
            print(f"list_invoices OK: {result}")
        except Exception as e:
            print(f"list_invoices FAIL: {type(e).__name__}: {e}")

        try:
            result = await fin_crud.list_expenses(db, 'demo-association')
            print(f"list_expenses OK: {result}")
        except Exception as e:
            print(f"list_expenses FAIL: {type(e).__name__}: {e}")

        # Test documents
        from app.modules.documents import crud as doc_crud
        try:
            result = await doc_crud.create_document(db, 'demo-association', 'test-uuid', {
                'title': 'Test Doc', 'document_type': 'policy'
            })
            print(f"create_document OK: {result.title}")
        except Exception as e:
            print(f"create_document FAIL: {type(e).__name__}: {e}")

        # Test workflows action templates
        from app.modules.workflows import crud as wf_crud
        try:
            templates = await wf_crud.list_action_templates(db, 'demo-association')
            print(f"list_action_templates OK: {len(templates)}")
        except Exception as e:
            print(f"list_action_templates FAIL: {type(e).__name__}: {e}")

asyncio.run(test())
