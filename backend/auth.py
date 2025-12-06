"""Authentication utilities for verifying Supabase JWT tokens."""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .database import get_supabase

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Verify JWT token and return user data.

    Args:
        credentials: Bearer token from Authorization header

    Returns:
        Dict with user 'id' and 'email'

    Raises:
        HTTPException 401 if token is missing or invalid
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:
        supabase = get_supabase()
        # Verify the JWT token with Supabase
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"}
            )

        return {
            "id": str(user_response.user.id),
            "email": user_response.user.email
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    Optionally verify JWT token. Returns None if no token provided.
    Useful for endpoints that work differently for authenticated vs anonymous users.

    Args:
        credentials: Bearer token from Authorization header (optional)

    Returns:
        Dict with user 'id' and 'email', or None if no token
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
