# Company Research Assistant ( Account Plan Generator )

A full-stack application for researching companies with AI-powered assistance. The backend provides API endpoints for company research queries, audio transcription, and structured data formatting, while the frontend (React.js) provides the user interface.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [AI Models Used](#ai-models-used)
- [Running the Application](#running-the-application)

## Features

- **AI-Powered Company Research**: Get comprehensive information about companies using web search capabilities
- **Voice Input**: Transcribe audio files (MP3) to text for voice-based queries
- **Structured Data Export**: Convert research content into well-formatted JSON with charts and diagrams
- **Streaming Responses**: Real-time streaming of AI responses for better user experience

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Groq API**: High-performance AI inference
- **Python 3.x**: Programming language

### Frontend
- **React.js**: Frontend framework
- **npm**: Package manager

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd "Company Research Assistant_backend"
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - **Windows**:
   ```bash
   venv\Scripts\activate
   ```
   - **macOS/Linux**:
   ```bash
   source venv/bin/activate
   ```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install npm dependencies:
```bash
npm install
```

## Environment Variables

Create a `.env` file in the backend root directory with the following variable:

```env
GROQ_API_KEY=your_groq_api_key_here
```

You can obtain your Groq API key from [https://console.groq.com](https://console.groq.com)

## API Endpoints

### Base URL
The API is available at the root of your backend server (default: `http://localhost:8000`)

### 1. POST `/ask`

Ask questions about companies and get AI-powered research responses with streaming support.

**Request Body:**
```json
{
  "question": "Tell me about Google's work culture",
  "previous_convo": [
    ["user", "What is Google?"],
    ["assistant", "Google is a technology company..."]
  ]
}
```

**Response:**
- **Type**: `text/event-stream` (Server-Sent Events)
- **Description**: Streaming response with real-time AI-generated content about the company

**Features:**
- Uses web search and website visiting tools to gather real-time information
- Provides comprehensive company research including:
  - Company Overview
  - Work Culture
  - Compensation & Benefits
  - Career Growth
  - Reviews & Ratings
  - Interview Process
  - Pros & Cons

---

### 2. POST `/get-speech`

Transcribe MP3 audio files to text using speech recognition.

**Request:**
- **Type**: `multipart/form-data`
- **Body**: File upload (MP3 format only)

**Example (using curl):**
```bash
curl -X POST "http://localhost:8000/get-speech" \
  -F "file=@audio.mp3"
```

**Response:**
```json
{
  "text": "Transcribed text from the audio file",
  "transcription": {
    // Full transcription object with metadata
  }
}
```

**Limitations:**
- Only MP3 files are supported
- Returns error if file format is not MP3

---

### 3. POST `/get-details-as-json`

Convert research content into a structured JSON format with charts and diagrams.

**Request Body:**
```json
{
  "content": "Company research content text here..."
}
```

**Response:**
```json
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
        "type": "string",
        "code": "string"
      }
    ]
  },
  "chartjs": {
    "charts": [
      {
        "title": "string",
        "type": "string",
        "data": {},
        "options": {}
      }
    ]
  },
  "sources": ["string"],
  "additional_info": "string"
}
```

**Features:**
- Structured JSON output with all company information
- Includes Mermaid diagrams for visualizations (flowcharts, sequence diagrams, etc.)
- Includes Chart.js configurations for data visualization
- Handles missing information gracefully

---

## AI Models Used

### 1. `groq/compound` (Compound Model)
- **Used in**: `/ask` endpoint
- **Purpose**: Company research and question answering
- **Features**:
  - Web search capabilities
  - Website visiting tools
  - Real-time information gathering
  - Streaming responses
- **Configuration**:
  - Temperature: 1
  - Max tokens: 1024
  - Top-p: 1
  - Tools enabled: `web_search`, `visit_website`

### 2. `whisper-large-v3`
- **Used in**: `/get-speech` endpoint
- **Purpose**: Audio transcription (speech-to-text)
- **Features**:
  - High-accuracy speech recognition
  - Supports MP3 audio files
  - Returns verbose JSON with metadata
- **Configuration**:
  - Temperature: 0 (for deterministic results)
  - Response format: verbose_json

### 3. `meta-llama/llama-4-maverick-17b-128e-instruct`
- **Used in**: `/get-details-as-json` endpoint
- **Purpose**: Content structuring and JSON formatting
- **Features**:
  - Converts unstructured text to structured JSON
  - Generates Mermaid diagram code
  - Creates Chart.js configurations
  - Extracts and organizes company information
- **Configuration**:
  - Temperature: 1
  - Max tokens: 1024
  - Top-p: 1
  - Response format: JSON object (enforced)

## Running the Application

### Backend

1. Make sure your virtual environment is activated and `.env` file is configured

2. Run the FastAPI server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

3. Access the interactive API documentation:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Start the development server:
```bash
npm start
```

The frontend will typically run on `http://localhost:3000`

## CORS Configuration

The backend is configured to accept requests from all origins (`*`). For production, update the CORS settings in `app/main.py` to restrict access to specific domains.

## Error Handling

All endpoints include error handling:
- `/get-speech`: Returns error if file format is not MP3
- `/get-details-as-json`: Returns error object if JSON parsing fails or API call fails
- `/ask`: Streaming errors will be included in the event stream

## Notes

- The `/ask` endpoint uses streaming responses for real-time feedback
- Previous conversation context is included in the `/ask` endpoint to maintain conversation flow
- The system prompt for `/ask` includes instructions to visit major company review websites (Naukri, Glassdoor, Indeed, etc.)
- All models are accessed through the Groq API for high-performance inference
