from fastapi import APIRouter
from .endpoints import ask_question, get_speech, get_details_as_json

app_router = APIRouter()

app_router.post("/ask")(ask_question)

app_router.post("/get-speech")(get_speech)

app_router.post("/get-details-as-json")(get_details_as_json)
