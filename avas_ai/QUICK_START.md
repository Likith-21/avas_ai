# AVAS AI - Quick Start Guide

Get AVAS AI running in **3 minutes** on your local network.

## 📋 What You Need
- Node.js 18+
- Gemini API key (free from https://aistudio.google.com/app/apikey)
- Supabase project (optional, for login)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

**Get your computer's IP address:**
```powershell
ipconfig  # Windows - look for IPv4 Address like 192.168.1.100
```

**Update `.env` files with your IP:**

`apps/api/.env`:
```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
PORT=3001
```

`apps/web/.env`:
```env
VITE_API_BASE_URL=http://YOUR_IP:3001

# Optional: Supabase for email + Google login
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_key
```

`apps/mobile/app.json` (in `expo.extra`):
```json
"apiBaseUrl": "http://YOUR_IP:3001",
"supabaseUrl": "your_url",
"supabaseAnonKey": "your_key"
```

### 3. Start the Server

Open 2 terminals:

**Terminal 1 - API Server:**
```bash
npm --workspace apps/api run dev
```

**Terminal 2 - Web App:**
```bash
npm --workspace apps/web run dev
```

### 4. Open in Browser

**On your computer:**
```
http://localhost:5173
```

**On other devices (phone, tablet):**
```
http://YOUR_IP:5173
```

### 5. Try Mobile (Optional)

**Terminal 3:**
```bash
npm --workspace apps/mobile run start
```

Scan the QR code with your phone's camera (iOS) or Expo Go (Android).

## ✨ Key Features

- 💬 Real-time chat with Gemini AI
- 🎤 Voice input + speech output
- 📱 Works on web, mobile, all devices
- 🔐 Email + Google login (with Supabase)
- 📝 Settings, notebooks, activity logging
- 🌐 Share conversations as public links
- ⏰ Scheduled actions
- 🎨 Dark/light theme

## 🌐 Network Access

Want to use on multiple devices?
1. Replace `localhost` with your IP in `.env`
2. Restart servers
3. Access from other devices on your WiFi

**Full details:** See [NETWORK_SETUP.md](./NETWORK_SETUP.md)

## 📱 Mobile App

The mobile app has a **more beautiful UI** than the web app:
- Purple gradient header
- Smooth animations
- Modern message bubbles
- Enhanced typing indicators

**Learn more:** [MOBILE_APP.md](./MOBILE_APP.md)

## ⚠️ Troubleshooting

### "Cannot connect to API"
✅ Is API running on port 3001?
✅ Correct IP in `.env`?
✅ Same WiFi network?

### "Module not found"
```bash
npm install
npm --workspace apps/web run dev
```

### "findLast is not a function"
Already fixed! Update TypeScript target to ES2023 (done automatically).

## 📚 Full Documentation

- [README.md](./README.md) - Complete feature list
- [NETWORK_SETUP.md](./NETWORK_SETUP.md) - Local network setup
- [MOBILE_APP.md](./MOBILE_APP.md) - Mobile app features

## 🎯 Next Steps

1. ✅ Get Gemini API key
2. ✅ Set up Supabase (optional)
3. ✅ Follow Quick Start above
4. ✅ Test from multiple devices
5. ✅ Try mobile app

**Questions?** Check the full README or NETWORK_SETUP guide!

---

Made with ❤️ using Gemini, React, Express, and Expo.
