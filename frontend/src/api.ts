export const BASE_API_ENDPOINT = 'http://localhost';

export interface AskRequest {
  question: string;
  previous_convo: string[][];
}

export interface ExecutedTool {
  index: number;
  type: string;
  arguments?: string;
  search_results?: {
    results?: any[];
  };
  output?: string;
}

export interface StreamChunk {
  reasoning?: string;
  executed_tools?: ExecutedTool[];
  content?: string;
}

export interface SpeechResponse {
  text: string;
  transcription: {
    text: string;
    task: string;
    language: string;
    duration: number;
    segments: Array<{
      id: number;
      seek: number;
      start: number;
      end: number;
      text: string;
      tokens: number[];
      temperature: number;
      avg_logprob: number;
      compression_ratio: number;
      no_speech_prob: number;
    }>;
    x_groq?: {
      id: string;
    };
  };
}

export async function askQuestionStream(
  question: string,
  previousConvo: string[][],
  onChunk: (chunk: StreamChunk) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${BASE_API_ENDPOINT}/ask`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        previous_convo: previousConvo,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isComplete = false;
    const processedIds = new Set<string>(); // Track processed chunk IDs to prevent duplicates

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Process any remaining buffer only if not already complete
        if (!isComplete && buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ')) {
            processLine(trimmed, onChunk, () => {}, processedIds);
          }
        }
        if (!isComplete) {
          onComplete();
        }
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      
      buffer += chunk;
      
      // Process complete lines (SSE format: "data: {...}" or "data: [DONE]")
      // Split by newline and keep the last incomplete line in buffer
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        const trimmed = line.trim();
        if (trimmed) {
          const wasComplete = processLine(trimmed, onChunk, () => {
            isComplete = true;
            onComplete();
          }, processedIds);
          if (wasComplete) {
            buffer = ''; // Clear buffer when done
            break;
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
}

function processLine(
  line: string,
  onChunk: (chunk: StreamChunk) => void,
  onComplete: () => void,
  processedIds: Set<string>
): boolean {
  // Check for SSE format: "data: ..."
  if (line.startsWith('data: ')) {
    const data = line.slice(6).trim();
    
    // Skip empty data lines
    if (!data || data.length === 0) {
      return false;
    }
    
    // Check for completion signal
    if (data === '[DONE]') {
      onComplete();
      return true; // Signal that we're done
    }

    // Try to parse as JSON
    try {
      const json = JSON.parse(data);
      
      // Use chunk ID to prevent duplicate processing
      const chunkId = json.id;
      if (chunkId && processedIds.has(chunkId)) {
        // Already processed this chunk, skip it
        return false;
      }
      
      // Extract delta from choices[0].delta
      if (json.choices && Array.isArray(json.choices) && json.choices[0] && json.choices[0].delta) {
        const delta = json.choices[0].delta;
        const chunk: StreamChunk = {};

        // Only extract non-empty fields
        if (delta.reasoning && typeof delta.reasoning === 'string' && delta.reasoning.length > 0) {
          chunk.reasoning = delta.reasoning;
        }

        if (delta.executed_tools && Array.isArray(delta.executed_tools) && delta.executed_tools.length > 0) {
          chunk.executed_tools = delta.executed_tools;
        }

        if (delta.content && typeof delta.content === 'string' && delta.content.length > 0) {
          chunk.content = delta.content;
        }

        // Only call onChunk if there's actual data
        if (chunk.reasoning || (chunk.executed_tools && chunk.executed_tools.length > 0) || chunk.content) {
          if (chunkId) {
            processedIds.add(chunkId);
          }
          onChunk(chunk);
        }
      }
    } catch (e) {
      // If parsing fails, ignore the line (might be incomplete or malformed)
      // Only log warnings for non-empty, non-DONE data
      if (data && data !== '[DONE]' && data.length > 10) {
        console.warn('Failed to parse SSE data:', data.substring(0, 100));
      }
    }
  }
  return false; // Not done yet
}

export async function transcribeAudio(file: File): Promise<SpeechResponse> {
  const formData = new FormData();
  formData.append('file', file, 'recording.mp3');
  formData.append('type', 'audio/mpeg');

  const response = await fetch(`${BASE_API_ENDPOINT}/get-speech`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Speech transcription failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

export interface VisualizationData {
  company_name: string;
  overview: {
    industry: string;
    size: string;
    location: string;
    description: string;
  };
  work_culture: {
    work_life_balance: string;
    company_values: string[];
    employee_experiences: string;
  };
  compensation: {
    salary_range: string;
    benefits: string[];
    perks: string[];
  };
  career_growth: {
    advancement_opportunities: string;
    learning_development: string;
    skill_development: string;
  };
  reviews_ratings: {
    overall_rating: string;
    key_feedback: string[];
    satisfaction_score: string;
  };
  interview_process: {
    stages: string[];
    difficulty: string;
    common_questions: string[];
  };
  pros_cons: {
    pros: string[];
    cons: string[];
  };
  mermaid: {
    diagrams: Array<{
      title: string;
      type: string;
      code: string;
    }>;
  };
  chartjs: {
    charts: Array<{
      title: string;
      type: string;
      data: {
        labels: string[];
        datasets: Array<{
          label: string;
          data: number[];
          backgroundColor?: string[];
          borderColor?: string;
          borderWidth?: number;
        }>;
      };
      options?: {
        responsive?: boolean;
        plugins?: {
          legend?: {
            position?: string;
          };
          title?: {
            display?: boolean;
            text?: string;
          };
        };
      };
    }>;
  };
  sources: string[];
  additional_info: string;
}

export async function getVisualizationData(content: string): Promise<VisualizationData> {
  const response = await fetch(`${BASE_API_ENDPOINT}/get-details-as-json`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: content,
    }),
  });

  if (!response.ok) {
    throw new Error(`Visualization data fetch failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
