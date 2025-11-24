from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import json
import httpx
from groq import Groq


load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

app = FastAPI()



class QuestionInput(BaseModel):
    question: str;
    previous_convo: list[list[str]]

class DetailsInput(BaseModel):
    content: str;


# endpoint for /ask
@app.post("/ask")
async def ask_question(request: QuestionInput):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Groq-Model-Version": "latest"
    }
    
    payload = {
        "messages": [
            {
                "role": "system",
                "content": """You're a helpful Company research assistant. Visit famous company review websites and search there to provide accurate information. Some of the key websites you should visit include:
- Naukri.com - India's leading job portal with company reviews and ratings
- Glassdoor - Comprehensive company reviews, salaries, and interview experiences
- Indeed - Job listings with company reviews and ratings
- AmbitionBox - Indian company reviews and salary insights
- LinkedIn - Professional network with company pages and employee insights
- Quora - Community discussions about companies and work culture
- Reddit - Subreddits discussing companies, careers, and workplace experiences
- Company websites and official pages for authentic information

Search these platforms to gather comprehensive information about companies, their work culture, employee reviews, salary ranges, interview processes, and overall reputation.

IMPORTANT: Always include these major pointers in each response:
1. Company Overview - Basic company information, industry, size, and location
2. Work Culture - Employee experiences, work-life balance, and company values
3. Compensation & Benefits - Salary ranges, benefits packages, and perks
4. Career Growth - Opportunities for advancement, learning, and skill development
5. Reviews & Ratings - Overall employee satisfaction scores and key feedback
6. Interview Process - Typical interview stages, difficulty, and common questions
7. Pros & Cons - Key advantages and disadvantages of working at the company

NOTE: If the user is asking about a new company and the previous conversation doesn't make sense or is unrelated to the current query, you're safe to ignore the previous conversation and focus solely on the current question."""
            },
            {
                "role": "user",
                "content": request.question
            },
            {
                "role": "user",
                "content": f"Previous Conversation: {request.previous_convo}"
            }
        ],
        "model": "groq/compound",
        "temperature": 1,
        "max_completion_tokens": 1024,
        "top_p": 1,
        "stream": True,
        "stop": None,
        "compound_custom": {
            "tools": {
                "enabled_tools": [
                    "web_search",
                    "visit_website",
                ]
            }
        }
    }

    async def generate():
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", GROQ_API_URL, json=payload, headers=headers) as response:
                async for chunk in response.aiter_bytes():
                    yield chunk
    
    return StreamingResponse(generate(), media_type="text/event-stream")



@app.post("/get-speech")
async def get_speech(file: UploadFile = File(...)):
    """
    Transcribe MP3 audio file to text using Whisper model.
    Accepts MP3 audio files and returns the transcribed text.
    """
    # Validate file type
    if not file.filename.endswith('.mp3'):
        return {"error": "Only MP3 files are supported"}
    
    # Initialize Groq client
    client = Groq(api_key=GROQ_API_KEY)
    
    # Read the uploaded file
    file_contents = await file.read()
    
    # Create transcription using Groq
    transcription = client.audio.transcriptions.create(
        file=(file.filename, file_contents),
        model="whisper-large-v3",
        temperature=0,
        response_format="verbose_json",
    )
    
    return {
        "text": transcription.text,
        "transcription": transcription
    }

@app.post("/get-details-as-json")
async def get_details_as_json(request: DetailsInput):
    """
    Convert the research content into a structured JSON format.
    Takes the content from the research assistant and formats it into a generic JSON structure.
    """
    client = Groq(api_key=GROQ_API_KEY)
    
    system_prompt = """You are a JSON formatter. Your task is to convert the provided company research content into a well-structured JSON format.

IMPORTANT: You MUST respond with valid JSON only. Do not include any markdown formatting, code blocks, or explanatory text. Return only the JSON object.

Generate a JSON object with the following generic structure:
{
  "company_name": "string",
  "overview": {
    "industry": "string",
    "size": "string",
    "location": "string",
    "description": "string"
  },
  "work_culture": {
    "work_life_balance": "string",
    "company_values": ["string"],
    "employee_experiences": "string"
  },
  "compensation": {
    "salary_range": "string",
    "benefits": ["string"],
    "perks": ["string"]
  },
  "career_growth": {
    "advancement_opportunities": "string",
    "learning_development": "string",
    "skill_development": "string"
  },
  "reviews_ratings": {
    "overall_rating": "string",
    "key_feedback": ["string"],
    "satisfaction_score": "string"
  },
  "interview_process": {
    "stages": ["string"],
    "difficulty": "string",
    "common_questions": ["string"]
  },
  "pros_cons": {
    "pros": ["string"],
    "cons": ["string"]
  },
  "mermaid": {
    "diagrams": [
      {
        "title": "string",
        "type": "string (flowchart, sequenceDiagram, gantt, pie, etc.)",
        "code": "string (mermaid diagram code)"
      }
    ]
  },
  "chartjs": {
    "charts": [
      {
        "title": "string",
        "type": "string (bar, line, pie, doughnut, radar, polarArea, etc.)",
        "data": {
          "labels": ["string"],
          "datasets": [
            {
              "label": "string",
              "data": [number],
              "backgroundColor": ["string"],
              "borderColor": "string",
              "borderWidth": number
            }
          ]
        },
        "options": {
          "responsive": boolean,
          "plugins": {
            "legend": {
              "position": "string"
            },
            "title": {
              "display": boolean,
              "text": "string"
            }
          }
        }
      }
    ]
  },
  "sources": ["string"],
  "additional_info": "string"
}

Extract and organize the information from the provided content into this structure. 

For the mermaid section: Generate relevant diagrams such as organizational charts, process flows, or data visualizations that help illustrate company structure, interview process flow, or career progression paths. Use valid mermaid syntax.

For the chartjs section: Create chart configurations for visualizing data like salary ranges, ratings distribution, or comparison charts. Use standard Chart.js format with proper data structure.

If certain information is not available, use "Not available" or empty arrays/strings as appropriate. If no diagrams or charts are relevant, use empty arrays for mermaid.diagrams and chartjs.charts. Remember: You MUST output only valid JSON, no other text or formatting."""
    
    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"Here's my content:\n\n{request.content}"
                }
            ],
            temperature=1,
            max_completion_tokens=1024,
            top_p=1,
            stream=False,
            response_format={"type": "json_object"},
            stop=None
        )
        
        response_content = completion.choices[0].message.content
        
        # Parse the JSON response
        try:
            json_data = json.loads(response_content)
            return json_data
        except json.JSONDecodeError:
            # If parsing fails, return the raw content with error info
            return {
                "error": "Failed to parse JSON from response",
                "raw_response": response_content
            }
            
    except Exception as e:
        return {
            "error": str(e),
            "message": "Failed to generate JSON structure"
        }