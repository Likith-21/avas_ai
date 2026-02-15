# AVAS AI - Quick Setup Guide

## ✅ Step 1: Get Your Gemini API Key (2 minutes)

1. **Visit**: https://aistudio.google.com/app/apikey
2. **Sign in** with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. **Copy** the generated key (starts with `AIza...`)

## ✅ Step 2: Configure Environment

1. Open `d:\avas-ai\.env` file
2. Paste your API key:
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```
3. Save the file

## ✅ Step 3: Start the Servers

### Terminal 1 - API Server
```bash
npm --workspace apps/api run dev
```
**Expected output**: `AVAS API running on http://localhost:3001`

### Terminal 2 - Web App
```bash
npm --workspace apps/web run dev
```
**Expected output**: `Local: http://localhost:5173/`

## ✅ Step 4: Test Your AI

1. Open browser to **http://localhost:5173**
2. Type a message like **"What is quantum computing?"**
3. Watch the AI stream response in real-time! 🚀

## 🎯 Features to Try

- **Chat History**: Click the new chat button and switch between conversations
- **Voice Input**: Click microphone icon to speak your questions
- **Dark Mode**: Toggle theme in settings (gear icon)
- **Markdown**: Ask "Show me Python code for hello world"
- **Activity Log**: Check settings to see your usage stats

## 🆓 Free Tier Limits

Your Gemini API key includes:
- ✅ **15 requests per minute**
- ✅ **1,500 requests per day**
- ✅ **1,000,000 tokens per day**

Perfect for personal use and development!

## 🧪 Test API Directly

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

## 🛠️ Troubleshooting

**"gemini_not_configured" error?**
→ Check that GEMINI_API_KEY is set in `.env` file

**API not starting?**
→ Run `npm install` first

**No response?**
→ Check API logs for rate limit warnings

**Build errors?**
→ Run `npm run build` to see detailed errors

## 📱 Mobile App (Optional)

```bash
npm --workspace apps/mobile run start
```

Then scan QR code with Expo Go app on your phone.

---

**🎉 That's it! Your AVAS AI is now powered by Google Gemini!**
