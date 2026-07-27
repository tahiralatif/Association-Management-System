"""PDF generation for invoices, receipts, and other documents."""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates" / "pdf"


def generate_invoice_pdf(invoice_data: dict) -> bytes:
    """Generate a professional invoice PDF.
    
    Args:
        invoice_data: dict with keys:
            - association_name, association_address, association_email, association_logo_url
            - invoice_number, issued_at, due_at
            - member_name, member_email, member_address
            - line_items: list of {description, quantity, unit_price, amount}
            - subtotal, tax_rate, tax_amount, discount_amount, total, amount_paid, balance_due
            - currency, notes, payment_instructions
    
    Returns:
        PDF bytes
    """
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
    template = env.get_template("invoice.html")
    html_content = template.render(**invoice_data)
    return HTML(string=html_content).write_pdf()


def generate_receipt_pdf(receipt_data: dict) -> bytes:
    """Generate a payment receipt PDF."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
    template = env.get_template("receipt.html")
    html_content = template.render(**receipt_data)
    return HTML(string=html_content).write_pdf()
