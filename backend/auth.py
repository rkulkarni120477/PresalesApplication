from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from config import settings
from models import User
from database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Try to find user in database
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return user

    # Demo mode: if token is valid but user not in DB, allow access with minimal user object
    from models import Role
    try:
        admin_role = db.query(Role).filter(Role.name == "Presales Administrator").first()
        if not admin_role:
            admin_role = db.query(Role).first()

        temp_user = User(id=user_id, email=f"demo@example.com", first_name="Demo", last_name="User")
        if admin_role:
            temp_user.role_id = admin_role.id
            temp_user.role = admin_role
        return temp_user
    except:
        # If roles don't exist yet, still allow with empty role
        temp_user = User(id=user_id, email=f"demo@example.com", first_name="Demo", last_name="User")
        return temp_user


def get_current_user_optional(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
    except ValueError:
        return None

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    # Try to find user in database
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return user

    # Demo mode: if token is valid but user not in DB, allow access with minimal user object
    from models import Role
    try:
        admin_role = db.query(Role).filter(Role.name == "Presales Administrator").first()
        if not admin_role:
            admin_role = db.query(Role).first()

        temp_user = User(id=user_id, email=f"demo@example.com", first_name="Demo", last_name="User")
        if admin_role:
            temp_user.role_id = admin_role.id
            temp_user.role = admin_role
        return temp_user
    except:
        # If roles don't exist yet, still allow with empty role
        temp_user = User(id=user_id, email=f"demo@example.com", first_name="Demo", last_name="User")
        return temp_user


def require_permission(permission_name: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # For demo purposes, admins have all permissions
        if current_user.role.name == "Administrator":
            return current_user

        # Check if user's role has this permission
        has_permission = any(p.name == permission_name for p in current_user.role.permissions)
        if not has_permission:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return permission_checker
