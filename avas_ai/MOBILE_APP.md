# AVAS Mobile App - Enhanced UI Guide

The mobile app is built with **React Native + Expo** and features a **more beautiful and modern UI** compared to the web app.

## Visual Enhancements

### Design Features
- **Gradient header** - Purple to lavender gradient with real-time status
- **Smooth animations** - Message slide-in effects and typing indicator
- **Pulsing effects** - Listening state with animated visual feedback
- **Modern message bubbles** - Rounded corners with shadows and proper spacing
- **Floating action buttons** - Voice and send buttons with hover states
- **Typing indicator** - Animated dots while AI is thinking
- **Timestamps** - Each message shows exact time

### Color Scheme
- **Primary**: Purple gradient (#7c3aed → #a78bfa)
- **User messages**: Purple background with white text
- **Assistant messages**: Light gray background with dark text
- **Accents**: Subtle shadows for depth

## Features

### Voice Input 🎤
- Tap **🎤** to start listening
- Real-time mic feedback with animated pulsing
- Tap **⏹** to stop listening
- Auto-transcribe and send

### Send Messages ➤
- Tap **➤** to send text
- Disabled when empty
- Shows **⏳** while generating

### Clear Chat ↻
- Tap the **↻** button in header
- Confirmation dialog to prevent accidents

### File Attachment +
- Upcoming feature for document/image upload
- Tap **+** button for future updates

### Status Display
- Header shows real-time status
- "Ready" - waiting for input
- "🎤 Listening..." - recording voice
- "Thinking..." - processing message

## Network Setup

To use the mobile app on your network:

1. **Get your computer's IP**:
   ```powershell
   ipconfig  # Windows
   ifconfig | grep "inet"  # Mac/Linux
   ```

2. **Update `apps/mobile/app.json`**:
   ```json
   "extra": {
     "apiBaseUrl": "http://YOUR_IP_HERE:3001"
   }
   ```

3. **Start Expo**:
   ```bash
   npm --workspace apps/mobile run start
   ```

4. **Connect from phone**:
   - Scan QR code with camera (iOS)
   - Open Expo Go app and scan (Android)

## Performance Optimization

### Message Scrolling
- Auto-scrolls to latest message
- Non-blocking scroll animation

### Input Handling
- Max 500 characters per message
- Real-time character count
- Multiline support with dynamic height

### Memory Management
- Cleanup of event listeners
- Proper state management
- No memory leaks from animations

## Debugging

### View console logs
```bash
npm --workspace apps/mobile run start
```
Then follow the prompts to open in simulator or physical device.

### Common Issues

**"Cannot reach API"**
- Check IP address in app.json is correct
- Verify firewall allows port 3001
- Ensure devices are on same WiFi

**Crash on startup**
- Clear Expo cache: `expo start --clear`
- Delete node_modules and reinstall
- Check app.json syntax

**Microphone not working**
- Grant microphone permissions in phone settings
- Ensure `@react-native-voice/voice` is installed
- Some emulators don't support voice

## Comparison: Mobile vs Web

| Feature | Mobile | Web |
|---------|--------|-----|
| Design | ⭐⭐⭐⭐⭐ Modern gradient | ⭐⭐⭐⭐ Clean |
| Voice I/O | ⭐⭐⭐⭐⭐ Native feel | ⭐⭐⭐ Browser-based |
| Touch interaction | ⭐⭐⭐⭐⭐ Optimized | N/A |
| Animations | ⭐⭐⭐⭐⭐ Smooth | ⭐⭐⭐⭐ CSS |
| Settings access | Full iOS/Android UI | Full feature set |
| Chat history | Native storage | LocalStorage |
| Auth | Supabase integrated | Supabase integrated |

## Future Enhancements

- 📱 Push notifications for responses
- 📎 File/image upload support
- 🎨 Custom theme selector
- 💾 Cloud sync with web
- 🔔 Offline message queue
- 🎙️ Better voice UI with waveforms

---

**Start the mobile app**: `npm --workspace apps/mobile run start`
**Network setup guide**: See [NETWORK_SETUP.md](./NETWORK_SETUP.md)
