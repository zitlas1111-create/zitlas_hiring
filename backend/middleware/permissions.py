from fastapi import HTTPException

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "nutritionist":  ["apply_opportunities", "manage_profile"],
    "fitness_coach": ["apply_opportunities", "manage_profile"],
    "both":          ["apply_opportunities", "manage_profile"],
    "coach":         ["apply_opportunities", "manage_profile"],
}


def require_roles(*allowed_roles: str):
    """FastAPI dependency that raises 403 if the current user's role is not in allowed_roles."""
    def _check(current_user):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access restricted to: {', '.join(allowed_roles)}",
            )
        return current_user
    return _check


def can(user, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(user.role, [])
