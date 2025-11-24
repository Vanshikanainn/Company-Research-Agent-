from fastapi import FastAPI
from .api.routes import app_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Company Research Assistant Backend")

app.include_router(app_router)

# allow requests from all origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Default route
@app.get("/")
async def root():
    return {"message": "Welcome to the Company Research Assistant Backend"}