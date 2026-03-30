"""add login-user profile and scope fields

Revision ID: 20260330_0001
Revises: 20260330_0000
Create Date: 2026-03-30 00:01:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260330_0001"
down_revision = "20260330_0000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    role_enum = sa.Enum("admin", "group_admin", name="loginuserrole")
    if dialect == "postgresql":
        op.execute("DROP TYPE IF EXISTS loginuserrole CASCADE")
        role_enum.create(bind, checkfirst=True)

    role_default = "admin"
    if dialect == "postgresql":
        role_default = sa.text("'admin'::loginuserrole")

    op.add_column("login_users", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column(
        "login_users",
        sa.Column(
            "role",
            role_enum,
            nullable=False,
            server_default=role_default,
        ),
    )
    op.add_column("login_users", sa.Column("group_id", sa.Integer(), nullable=True))
    op.add_column(
        "login_users",
        sa.Column(
            "preferred_theme_mode",
            sa.String(length=16),
            nullable=False,
            server_default="system",
        ),
    )
    op.add_column(
        "login_users",
        sa.Column(
            "preferred_locale",
            sa.String(length=16),
            nullable=False,
            server_default="en",
        ),
    )
    op.add_column(
        "login_users",
        sa.Column(
            "preferred_timezone",
            sa.String(length=64),
            nullable=False,
            server_default="UTC",
        ),
    )
    op.add_column("login_users", sa.Column("avatar_url", sa.String(length=512), nullable=True))

    op.create_index("ix_login_users_role", "login_users", ["role"], unique=False)
    op.create_index("ix_login_users_group_id", "login_users", ["group_id"], unique=False)
    op.create_foreign_key(
        "fk_login_users_group_id_groups",
        "login_users",
        "groups",
        ["group_id"],
        ["id"],
    )

    op.execute("UPDATE login_users SET role = 'admin' WHERE role IS NULL")
    op.execute("UPDATE login_users SET preferred_theme_mode = 'system' WHERE preferred_theme_mode IS NULL")
    op.execute("UPDATE login_users SET preferred_locale = 'en' WHERE preferred_locale IS NULL")
    op.execute("UPDATE login_users SET preferred_timezone = 'UTC' WHERE preferred_timezone IS NULL")

    op.alter_column("login_users", "role", server_default=None)
    op.alter_column("login_users", "preferred_theme_mode", server_default=None)
    op.alter_column("login_users", "preferred_locale", server_default=None)
    op.alter_column("login_users", "preferred_timezone", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.drop_constraint("fk_login_users_group_id_groups", "login_users", type_="foreignkey")
    op.drop_index("ix_login_users_group_id", table_name="login_users")
    op.drop_index("ix_login_users_role", table_name="login_users")
    op.drop_column("login_users", "avatar_url")
    op.drop_column("login_users", "preferred_timezone")
    op.drop_column("login_users", "preferred_locale")
    op.drop_column("login_users", "preferred_theme_mode")
    op.drop_column("login_users", "group_id")
    op.drop_column("login_users", "role")
    op.drop_column("login_users", "email")

    if dialect == "postgresql":
        sa.Enum(name="loginuserrole").drop(bind, checkfirst=True)
