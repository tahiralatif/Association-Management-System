"""Granular RBAC permission system for AssocHub.

Permissions follow the format: module:action
Examples: members:read, finances:write, events:delete, admin:all

Role hierarchy (highest to lowest):
- super_admin: all permissions
- tenant_admin: all permissions within their tenant
- staff: read + write on most modules, no delete on critical
- member: read-only on public data, manage own profile
"""

# Permission constants
PERMISSIONS = {
    # Members module
    "members:read": "View member list and profiles",
    "members:write": "Create and edit member profiles",
    "members:delete": "Delete or deactivate members",
    "members:import": "Bulk import members",
    "members:export": "Export member data",
    "members:groups": "Manage groups and committees",

    # Finances module
    "finances:read": "View invoices, payments, budgets",
    "finances:write": "Create invoices, record payments",
    "finances:delete": "Delete financial records",
    "finances:approve": "Approve expenses and refunds",
    "finances:reports": "View and export financial reports",

    # Events module
    "events:read": "View events",
    "events:write": "Create and edit events",
    "events:delete": "Delete events",
    "events:register": "Register for events (member)",
    "events:sessions": "Manage event sessions and speakers",

    # Communications module
    "communications:read": "View campaigns and announcements",
    "communications:write": "Create campaigns and announcements",
    "communications:send": "Send email campaigns",
    "communications:templates": "Manage email templates",

    # Elections module
    "elections:read": "View elections and candidates",
    "elections:write": "Create and manage elections",
    "elections:vote": "Cast votes (member)",
    "elections:publish": "Publish election results",

    # Documents module
    "documents:read": "View documents",
    "documents:write": "Create and edit documents",
    "documents:upload": "Upload files",
    "documents:delete": "Delete documents",
    "documents:share": "Share documents with members",

    # Analytics module
    "analytics:read": "View dashboards and reports",
    "analytics:write": "Create custom dashboards",
    "analytics:export": "Export analytics data",

    # Workflows module
    "workflows:read": "View workflows",
    "workflows:write": "Create and edit workflows",
    "workflows:execute": "Trigger workflow execution",

    # AI module
    "ai:chat": "Use AI chat",
    "ai:predictions": "View AI predictions",
    "ai:models": "Manage AI models",

    # Integrations module
    "integrations:read": "View integrations and webhooks",
    "integrations:write": "Create and manage integrations",
    "integrations:webhooks": "Manage webhooks",

    # Admin
    "admin:all": "Full administrative access",
    "admin:users": "Manage user accounts and roles",
    "admin:settings": "Manage system settings",
    "admin:audit": "View audit logs",
    "admin:backups": "Manage backups",
}

# Role → permissions mapping
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": ["*"],  # Wildcard = everything
    "tenant_admin": [
        "admin:all",
        "members:read", "members:write", "members:delete", "members:import", "members:export", "members:groups",
        "finances:read", "finances:write", "finances:delete", "finances:approve", "finances:reports",
        "events:read", "events:write", "events:delete", "events:sessions",
        "communications:read", "communications:write", "communications:send", "communications:templates",
        "elections:read", "elections:write", "elections:publish",
        "documents:read", "documents:write", "documents:upload", "documents:delete", "documents:share",
        "analytics:read", "analytics:write", "analytics:export",
        "workflows:read", "workflows:write", "workflows:execute",
        "ai:chat", "ai:predictions", "ai:models",
        "integrations:read", "integrations:write", "integrations:webhooks",
        "admin:users", "admin:settings", "admin:audit", "admin:backups",
    ],
    "staff": [
        "members:read", "members:write", "members:export", "members:groups",
        "finances:read", "finances:write", "finances:reports",
        "events:read", "events:write", "events:sessions",
        "communications:read", "communications:write", "communications:send", "communications:templates",
        "elections:read", "elections:write",
        "documents:read", "documents:write", "documents:upload", "documents:share",
        "analytics:read", "analytics:write", "analytics:export",
        "workflows:read", "workflows:write", "workflows:execute",
        "ai:chat", "ai:predictions",
        "integrations:read", "integrations:write",
    ],
    "member": [
        "members:read",  # directory
        "events:read", "events:register",
        "documents:read",
        "elections:read", "elections:vote",
        "ai:chat",
        "communications:read",
    ],
}


def get_permissions_for_roles(roles: list[str]) -> set[str]:
    """Resolve all permissions for a set of roles. Custom user permissions are merged in."""
    perms: set[str] = set()
    for role in roles:
        role_perms = ROLE_PERMISSIONS.get(role, [])
        if "*" in role_perms:
            return set(PERMISSIONS.keys())  # super_admin gets everything
        perms.update(role_perms)
    return perms


def user_has_permission(
    roles: list[str],
    custom_permissions: list[str] | None,
    permission: str,
) -> bool:
    """Check if a user has a specific permission.

    Custom permissions override role defaults:
    - Custom permissions are additive (can only ADD, not remove role permissions)
    - Format: "+permission" to add, or just "permission" to add
    """
    all_perms = get_permissions_for_roles(roles)

    # Add custom permissions (if any)
    if custom_permissions:
        for p in custom_permissions:
            if p.startswith("+"):
                all_perms.add(p[1:])
            else:
                all_perms.add(p)

    # Check exact match or wildcard
    if permission in all_perms:
        return True

    # Check module wildcard (e.g., "members:*" covers "members:read")
    module = permission.split(":")[0]
    if f"{module}:*" in all_perms:
        return True

    return False
