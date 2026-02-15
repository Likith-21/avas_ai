# AVAS AI - Copilot Instructions

## Project Overview
AVAS AI is a full-stack AI assistant powered by Google Gemini API with web, mobile, and API components.

## Tech Stack
- **Backend**: Express + TypeScript + Google Generative AI SDK
- **Frontend**: React 18 + Vite + TypeScript
- **Mobile**: Expo + React Native
- **AI**: Google Gemini 1.5 Flash (Free tier)
- **Styling**: CSS with Gemini-inspired design

## Key Features
- Real-time streaming responses from Gemini API
- Chat history with save/load/rename/delete
- Voice input/output (Web Speech API)
- Dark/Light theme modes
- Markdown rendering with code blocks
- Activity logging
- Account management

## Architecture
- Monorepo structure with npm workspaces
- API server on port 3001
- Web app on port 5173
- Streaming via Server-Sent Events (SSE)
- Environment-based configuration

## Development Guidelines
- Use TypeScript strict mode
- Follow React 18 best practices
- Maintain Gemini-inspired UI consistency
- Keep API responses fast and accurate
- Use markdown for formatted responses
- Implement proper error handling

## Environment Setup
Required environment variables:
- `GEMINI_API_KEY`: Get from https://aistudio.google.com/app/apikey
- `GEMINI_MODEL`: Default is gemini-1.5-flash
- `API_BASE_URL`: http://localhost:3001

## Build Commands
- `npm install`: Install all dependencies
- `npm run build`: Build API and web app
- `npm --workspace apps/api run dev`: Start API server
- `npm --workspace apps/web run dev`: Start web app
- `npm --workspace apps/mobile run start`: Start Expo

## Important Notes
- Gemini API free tier: 15 RPM, 1500/day, 1M tokens/day
- Streaming format: JSON lines with `{message: {content: "..."}}`
- Frontend batches updates every 3 characters for smooth UX
- System instruction optimized for accuracy and conciseness
