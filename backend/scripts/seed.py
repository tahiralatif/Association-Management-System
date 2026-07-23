"""Seed script — generate demo data for development."""

import asyncio
import random
import uuid
from datetime import datetime, timezone, timedelta

from app.core.database import async_session_factory
from app.core.auth import hash_password
from app.modules.members.models import (
    MemberGroup,
    MemberGroupMembership,
    MemberGroupMembership,
    MemberProfile,
    MemberStatus,
    MemberTag,
    MembershipTier,
    User,
)


TENANT_ID = "demo-association"

FIRST_NAMES = [
    "Sarah", "James", "Maria", "David", "Emily", "Michael", "Jessica", "Robert",
    "Ashley", "William", "Jennifer", "Thomas", "Amanda", "Daniel", "Stephanie",
    "Andrew", "Nicole", "Joshua", "Heather", "Christopher", "Michelle", "Ryan",
    "Megan", "Kevin", "Laura", "Brian", "Rachel", "Timothy", "Angela", "Jason",
]

LAST_NAMES = [
    "Anderson", "Martinez", "Johnson", "Williams", "Brown", "Jones", "Garcia",
    "Miller", "Davis", "Rodriguez", "Wilson", "Taylor", "Thomas", "Lee",
    "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young", "King",
    "Wright", "Scott", "Green", "Baker", "Adams", "Nelson", "Hill", "Ramirez",
]

ORGANIZATIONS = [
    "Acme Corp", "Tech Solutions Inc", "Global Industries", "Innovate Labs",
    "Pinnacle Systems", "Nexus Group", "Vanguard Partners", "Summit Associates",
    "Horizon Technologies", "Atlas Consulting", None, None, None,
]

JOB_TITLES = [
    "Executive Director", "Board President", "VP of Operations",
    "Program Manager", "Membership Coordinator", "Finance Director",
    "Communications Manager", "Event Planner", "Policy Analyst",
    "Research Associate", "Volunteer Coordinator", "Marketing Director",
    None, None, None,
]

GROUPS = [
    {"name": "Board of Directors", "group_type": "board", "description": "Governing board"},
    {"name": "Finance Committee", "group_type": "committee", "description": "Oversees financial matters"},
    {"name": "Membership Committee", "group_type": "committee", "description": "Recruitment and retention"},
    {"name": "Events Committee", "group_type": "committee", "description": "Plans and executes events"},
    {"name": "Communications Committee", "group_type": "committee", "description": "Marketing and outreach"},
    {"name": "Policy & Advocacy", "group_type": "committee", "description": "Policy positions and advocacy"},
    {"name": "Northeast Chapter", "group_type": "chapter", "description": "Regional chapter"},
    {"name": "West Coast Chapter", "group_type": "chapter", "description": "Regional chapter"},
    {"name": "Technology Interest Group", "group_type": "interest_group", "description": "Tech enthusiasts"},
    {"name": "Mentorship Program", "group_type": "working_group", "description": "Peer mentorship"},
]

TAGS = [
    ("Board Member", "#EF4444"),
    ("Volunteer", "#22C55E"),
    ("Donor", "#3B82F6"),
    ("Event Speaker", "#A855F7"),
    ("New Member", "#F59E0B"),
    ("At Risk", "#EF4444"),
    ("VIP", "#F59E0B"),
    ("Committee Chair", "#6366F1"),
    ("Lifetime Member", "#10B981"),
    ("Corporate Rep", "#8B5CF6"),
]


async def seed():
    """Generate demo data."""
    async with async_session_factory() as db:
        print("🌱 Seeding demo data...")

        # Create tags
        tags = []
        for name, color in TAGS:
            tag = MemberTag(tenant_id=TENANT_ID, name=name, color=color)
            db.add(tag)
            tags.append(tag)
        await db.flush()
        print(f"  ✅ Created {len(tags)} tags")

        # Create groups
        groups = []
        for g_data in GROUPS:
            group = MemberGroup(tenant_id=TENANT_ID, **g_data)
            db.add(group)
            groups.append(group)
        await db.flush()
        print(f"  ✅ Created {len(groups)} groups")

        # Create members
        hashed = hash_password("demo1234")
        members = []

        for i in range(50):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            email = f"{first.lower()}.{last.lower()}@example.com"

            user = User(
                email=email,
                hashed_password=hashed,
                first_name=first,
                last_name=last,
                tenant_id=TENANT_ID,
                roles=["member"],
                is_active=random.random() > 0.05,  # 5% inactive
            )
            db.add(user)
            await db.flush()

            tier = random.choice(list(MembershipTier))
            status = random.choices(
                list(MemberStatus),
                weights=[5, 70, 5, 15, 5],  # pending, active, suspended, lapsed, cancelled
            )[0]

            joined_days_ago = random.randint(1, 1825)  # up to 5 years
            profile = MemberProfile(
                tenant_id=TENANT_ID,
                user_id=user.id,
                member_number=f"MEM-{uuid.uuid4().hex[:8].upper()}",
                tier=tier,
                status=status,
                joined_at=datetime.now(timezone.utc) - timedelta(days=joined_days_ago),
                phone=f"+1555{random.randint(1000000, 9999999)}",
                organization=random.choice(ORGANIZATIONS),
                job_title=random.choice(JOB_TITLES),
                bio=f"Passionate about {random.choice(['technology', 'community', 'leadership', 'innovation', 'advocacy'])}",
                engagement_score=round(random.uniform(0, 1), 2),
                churn_risk=round(random.uniform(0, 1), 2),
                lifetime_value=round(random.uniform(100, 5000), 2),
                email_opt_in=random.random() > 0.2,
                auto_renew=random.random() > 0.5,
                interests=random.sample(
                    ["governance", "fundraising", "events", "technology", "policy", "mentorship"],
                    k=random.randint(1, 3),
                ),
            )
            db.add(profile)
            members.append(profile)

        await db.flush()
        print(f"  ✅ Created {len(members)} members")

        # Assign members to groups (random)
        group_member_count = 0
        for group in groups:
            num_members = random.randint(3, 12)
            assigned = random.sample(members, min(num_members, len(members)))
            for m in assigned:
                membership = MemberGroupMembership(
                    group_id=group.id,
                    member_id=m.id,
                    role=random.choice(["member", "member", "member", "chair", "co_chair"]),
                )
                db.add(membership)
                group_member_count += 1

        await db.flush()
        print(f"  ✅ Created {group_member_count} group memberships")

        # Assign tags to members
        tag_count = 0
        for m in members:
            num_tags = random.randint(0, 3)
            assigned_tags = random.sample(tags, min(num_tags, len(tags)))
            for tag in assigned_tags:
                from app.modules.members.models import MemberProfileTag
                db.add(MemberProfileTag(member_id=m.id, tag_id=tag.id))
                tag_count += 1

        await db.commit()
        print(f"  ✅ Assigned {tag_count} tags")
        print("\n🎉 Seed complete!")
        print(f"\n📧 Demo login: any member email + password: demo1234")
        print(f"🏷️  Tenant ID: {TENANT_ID}")


if __name__ == "__main__":
    asyncio.run(seed())
