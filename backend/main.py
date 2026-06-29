import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from database.connection import create_tables
from routes import auth, profiles, ai, affiliate, experts, expert_applications, admin, expert_accounts

FRONTEND_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="ZITLAS API",
    version="2.0.0",
    description="ZITLAS Fitness Platform — AI + Human Experts for Better Fitness Results",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router,                prefix="/api/auth",                  tags=["Authentication"])
app.include_router(profiles.router,            prefix="/api/profile",               tags=["Profiles"])
app.include_router(ai.router,                  prefix="/api/ai",                    tags=["AI Services"])
app.include_router(affiliate.router,           prefix="/api/affiliate",             tags=["Affiliate"])
app.include_router(experts.router,             prefix="/api/experts",               tags=["Experts"])
app.include_router(expert_applications.router, prefix="/api/expert-applications",   tags=["Expert Applications"])
app.include_router(admin.router,               prefix="/api/admin",                 tags=["Admin"])
app.include_router(expert_accounts.router,     prefix="/api/expert-accounts",       tags=["Expert Accounts"])


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "2.0.0", "service": "ZITLAS Fitness Platform"}


# Serve login.html at root — must be defined BEFORE the static mount
@app.get("/", include_in_schema=False)
async def root():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))


# ── Page routes ────────────────────────────────────────────────────────────────

@app.get("/home", include_in_schema=False)
async def home_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "home.html"))


@app.get("/explore", include_in_schema=False)
async def explore_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "explore.html"))


@app.get("/expert-profile", include_in_schema=False)
async def expert_profile_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "expert-profile.html"))


# Serve apply selector at /apply so referral links work: /apply?ref=AFF-RAMESH01
@app.get("/apply", include_in_schema=False)
async def apply_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "apply", "apply.html"))


@app.get("/set-password", include_in_schema=False)
async def set_password_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "set-password.html"))


@app.get("/admin/applications", include_in_schema=False)
async def admin_applications_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin", "applications.html"))


# Catch-all static file serving — must be LAST so API routes take priority
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")
