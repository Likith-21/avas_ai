# Network Access Setup - AVAS AI

Run AVAS AI on your local network and access it from other devices like phones, tablets, and computers.

## Prerequisites
- Node.js 18+
- Gemini API key
- Supabase credentials (for auth, optional)
- All devices on the **same WiFi network**

## 1. Find Your Computer's IP Address

### Windows (PowerShell)
```powershell
ipconfig
```
Look for "IPv4 Address" under your WiFi connection (e.g., `192.168.1.100`)

### macOS/Linux
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## 2. Update Environment Variables

Replace `localhost` with your computer's IP address in `.env` files.

### apps/api/.env
```env
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-1.5-flash
PORT=3001
VITE_API_BASE_URL=http://192.168.1.100:3001  # Replace with YOUR IP
```

### apps/web/.env
```env
VITE_API_BASE_URL=http://192.168.1.100:3001  # Replace with YOUR IP
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_key
```

### apps/mobile/app.json
```json
"extra": {
  "apiBaseUrl": "http://192.168.1.100:3001",  // Replace with YOUR IP
  "supabaseUrl": "your_url",
  "supabaseAnonKey": "your_key"
}
```

## 3. Start the API Server

```bash
npm --workspace apps/api run dev
```

It should show:
```
AVAS API running on http://localhost:3001
```

## 4. Access from Other Devices

### From Another Computer (Web)
Open browser and go to:
```
http://192.168.1.100:5173
```

### From Mobile (Expo)
```bash
npm --workspace apps/mobile run start
```

Scan the QR code with your phone's camera (iOS) or Expo Go app (Android).

## 5. Verify Connection

1. Look for "API health: Healthy" in settings
2. Check the status bar shows correct IP
3. Test with a simple message

## Troubleshooting

### "Cannot connect to API"
- ✅ Is the API server running on port 3001?
- ✅ Are devices on the same WiFi?
- ✅ Do you have the correct IP address? (check `ipconfig` again)
- ✅ Firewall allowing port 3001? (add exception if needed)

### Wrong IP in Web App
1. Open DevTools (F12)
2. Check Console for `VITE_API_BASE_URL`
3. Update `apps/web/.env` with correct IP
4. Refresh browser hard (Ctrl+Shift+R)

### Mobile App Can't Connect
1. Make sure expo dev server is running
2. Check `app.json` has correct IP
3. Clear Expo cache: `expo start --clear`

## Security Notes

⚠️ This setup is for **local network only**. For public access:
- Use a proper VPN or tunnel
- Add authentication layer
- Use HTTPS with valid certificates
- Never expose to the internet without security

## Quick Reference

| Device | URL | How to Access |
|--------|-----|--------------|
| Web (same computer) | http://localhost:5173 | Browser |
| Web (other computer) | http://192.168.1.100:5173 | Browser |
| Mobile (via Expo) | Scan QR from `expo start` | Camera/Expo Go |
| API Server | http://192.168.1.100:3001 | Localhost |

---

**Need help?** Check the main [README.md](./README.md) or run `npm --workspace apps/api run dev` with the `--verbose` flag for more details.
