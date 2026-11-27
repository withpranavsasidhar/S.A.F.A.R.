from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.schemas.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdate
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Input validation
    clean_name = user_in.full_name.strip()
    if len(clean_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Full name must be at least 2 characters long."
        )
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters long."
        )

    clean_email = user_in.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in instead."
        )

    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        full_name=clean_name,
        email=clean_email,
        password_hash=hashed_pwd,
        role="USER",
        home_location=(user_in.home_location or "Vijayawada").strip()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    }

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    clean_email = credentials.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=str(user.id), role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.full_name is not None:
        clean_name = update_data.full_name.strip()
        if len(clean_name) < 2:
            raise HTTPException(status_code=422, detail="Full name must be at least 2 characters long.")
        current_user.full_name = clean_name

    if update_data.home_location is not None:
        current_user.home_location = update_data.home_location.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"status": "success", "message": "Logged out successfully."}
