# AVAS AI

AVAS AI is a full-stack, voice-ready assistant powered by **Google Gemini API** with a web app, mobile app, and Express API. It features real-time streaming responses, Gemini-inspired UI, chat history, and voice capabilities.

## Structure
- **apps/api**: Express API with Google Gemini integration
- **apps/web**: Vite React web client with browser speech and Gemini-like UI
- **apps/mobile**: Expo client with device speech (react-native-voice)
- **packages/shared**: Shared types

## Prerequisites
- Node.js 18+
- **Google Gemini API Key** (Free tier available)
- Supabase project (optional, for auth)

## Setup

### 1. Get Your Gemini API Key (FREE)
1. Visit **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key

### 2. Configure Environment
1. Copy `.env.example` to `.env`
2. Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```

3. For web, create `apps/web/.env` with:
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   # Optional: Supabase for email + Google login
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

4. For mobile, edit `apps/mobile/app.json` -> `expo.extra` values and add Supabase keys.

### 3. Install Dependencies
```bash
npm install
```

## Run

### Start API Server
```bash
npm --workspace apps/api run dev
```
API runs at **http://localhost:3001**

### Start Web App
```bash
npm --workspace apps/web run dev
```
Web app runs at **http://localhost:5173**

### Start Mobile (Expo)
```bash
npm --workspace apps/mobile run start
```

## 🌐 Network Access

To run AVAS on other devices (phones, tablets, other computers) via your local network:

1. Find your computer's IP address (see [NETWORK_SETUP.md](./NETWORK_SETUP.md) for details)
2. Update `VITE_API_BASE_URL` in `.env` files with your IP (e.g., `http://192.168.1.100:3001`)
3. Restart the API and web servers
4. Access from other devices using your IP address

**Full guide:** See [NETWORK_SETUP.md](./NETWORK_SETUP.md)

## Features
✅ **Google Gemini 1.5 Flash** - Fast, accurate AI responses  
✅ **Real-time streaming** - Token-by-token response display  
✅ **Gemini-inspired UI** - Modern, collapsible sidebar layout  
✅ **Chat history** - Save, load, rename, and delete conversations  
✅ **Voice I/O** - Speech-to-text and text-to-speech  
✅ **Dark/Light themes** - Multiple theme modes  
✅ **Markdown support** - Code blocks, headers, lists, formatting  
✅ **Activity logging** - Track your AI interactions  
✅ **Supabase Auth** - Email and Google login (optional)  
✅ **Scheduled tasks** - Set up automated AI actions  
✅ **Public share links** - Share conversations anonymously  
✅ **AVAS Notebooks** - AI-powered research and note-taking  
✅ **Personal context** - Remember user preferences  
✅ **Upgrade modals** - Plans and premium features  
✅ **Mobile app (Expo)** - Beautiful React Native client with enhanced UI
✅ **Beautiful auth modal** - Gradient design with smooth animations
✅ **Network access** - Run on local network, accessible from any device  

## Gemini Free Tier Limits
- **15 requests/minute**
- **1,500 requests/day**
- **1 million tokens/day**

Perfect for development and personal use!

## Authentication (Optional)
To enable email and Google login, set up a **free Supabase project**:
1. Visit **https://supabase.com**
2. Create a new project
3. Go to **Settings > API** and copy your URL and anon key
4. Add them to `.env` files in `apps/api`, `apps/web`, and `apps/mobile`

## Settings & Features
- **Settings modal** opens from the sidebar gear icon (⚙️)
- **Personal Context** - Help AVAS understand your preferences
- **Activity log** - View your interaction history
- **Scheduled Actions** - Set recurring AI tasks
- **Notebooks** - Create research notes with AI assistance
- **Public links** - Share conversations anonymously
- **Theme modes** - Auto, light, or dark theme
- **Location tracking** - Auto-detect or manually update
- **Help & FAQs** - In-app documentation
- **Feedback** - Send feature requests and bug reports

## Notes
- Web voice uses the browser Web Speech API
- Mobile voice uses `@react-native-voice/voice` (may need `expo prebuild`)
- Built with TypeScript, React 18, Express, and Vite
