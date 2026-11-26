import asyncio
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from database import AsyncSessionLocal
from security import hash_password, hash_token
from models.user import UserModel, UserSessionModel
from models.financial import (
    LegalEntityModel,
    AssetModel,
    AccountModel,
    AccountBalanceModel,
)

def create_uuid():
    return str(uuid.uuid4())

async def get_or_create_user(session, email: str, full_name: str, role: str, is_active: bool = True):
    stmt = select(UserModel).where(UserModel.email == email)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if not user:
        user = UserModel(
            id=create_uuid(),
            full_name=full_name,
            email=email,
            password_hash=hash_password("StrongPassword!2026#"),
            role=role,
            is_active=is_active,
            is_verified=True,
            mfa_enabled=False,
        )
        session.add(user)
        await session.flush()
    else:
        user.password_hash = hash_password("StrongPassword!2026#")
        user.role = role
        user.is_active = is_active
        user.is_verified = True
        await session.flush()
    return user

async def main():
    async with AsyncSessionLocal() as session:
        # 1. Admin user
        admin = await get_or_create_user(session, "admin_ui_tester@nexora.test", "Admin UI Tester", "admin")
        
        # 2. Normal investor (for unauthorized check)
        investor = await get_or_create_user(session, "normal_investor@nexora.test", "Normal Investor", "investor")
        
        # 3. Target user for suspend/reactivate/delete with 0 balance
        target_zero = await get_or_create_user(session, "zero_bal_user@nexora.test", "Zero Balance Target", "investor", is_active=True)
        
        # 4. Target user with positive balance
        target_pos = await get_or_create_user(session, "positive_bal_user@nexora.test", "Positive Balance Target", "investor", is_active=True)
        
        # Setup entity and asset
        stmt_entity = select(LegalEntityModel).where(LegalEntityModel.code == "NEXORA_OPCO")
        entity = (await session.execute(stmt_entity)).scalar_one_or_none()
        if not entity:
            entity = LegalEntityModel(
                id=create_uuid(),
                code="NEXORA_OPCO",
                name="Nexora Operating Company",
                entity_type="OPERATING_COMPANY",
                functional_currency="USD",
            )
            session.add(entity)
            await session.flush()

        stmt_asset = select(AssetModel).where(AssetModel.symbol == "USDT")
        asset = (await session.execute(stmt_asset)).scalar_one_or_none()
        if not asset:
            asset = AssetModel(
                id=create_uuid(),
                symbol="USDT",
                name="Tether USD",
                asset_class="CRYPTO",
                decimals=6,
            )
            session.add(asset)
            await session.flush()

        # Add positive balance account for target_pos if not exists
        stmt_acct = select(AccountModel).where(AccountModel.user_id == target_pos.id, AccountModel.asset_id == asset.id)
        acct = (await session.execute(stmt_acct)).scalar_one_or_none()
        if not acct:
            acct = AccountModel(
                id=create_uuid(),
                legal_entity_id=entity.id,
                account_number=f"USR-{target_pos.id[:8]}-{asset.symbol}",
                name=f"{target_pos.full_name} {asset.symbol} Account",
                account_type="LIABILITY",
                account_category="CUSTODIAL_WALLET",
                normal_balance="CREDIT",
                asset_id=asset.id,
                user_id=target_pos.id,
            )
            session.add(acct)
            await session.flush()

            bal = AccountBalanceModel(
                account_id=acct.id,
                current_balance=Decimal("5000.00"),
                functional_usd_balance=Decimal("5000.00"),
            )
            session.add(bal)

        await session.commit()
        print(f"ADMIN_ID={admin.id}")
        print(f"INVESTOR_ID={investor.id}")
        print(f"TARGET_ZERO_ID={target_zero.id}")
        print(f"TARGET_POS_ID={target_pos.id}")
        print("SEED_SUCCESS")

if __name__ == "__main__":
    asyncio.run(main())
