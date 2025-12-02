# Gemini Live Voice Chat

A real-time voice conversation application powered by Google's Gemini 2.5 Flash with native audio capabilities. Talk naturally with AI through your browser with beautiful audio visualization.

## Features

- **Real-time Voice Conversation**: Seamless bidirectional audio streaming with Gemini AI
- **Live Audio Visualization**: Dynamic frequency visualization that pulses with the conversation
- **Low Latency**: Native audio processing for smooth, natural conversations
- **Modern UI**: Clean, polished interface with smooth animations
- **Browser-based**: No installation required, runs entirely in your browser

## Prerequisites

- Node.js (v16 or higher)
- A Gemini API key from [Google AI Studio](https://ai.studio)
- Modern browser with microphone support (Chrome, Edge, or Safari recommended)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up your API key**

   Open `.env.local` and add your Gemini API key:
   ```
   API_KEY=your_gemini_api_key_here
   ```

3. **Run the application**
   ```bash
   npm run dev
   ```

4. **Open in browser**

   Navigate to `http://localhost:5173` and click the play button to start talking!

## How It Works

The app uses Gemini's native audio capabilities to process real-time voice input and generate spoken responses. Audio is captured from your microphone, encoded to PCM format, and streamed to Gemini. The AI's audio responses are decoded and played back through your speakers with minimal latency.

### Technical Details

- **Input**: 16kHz PCM audio from browser microphone
- **Output**: 24kHz PCM audio with Zephyr voice
- **Processing**: Web Audio API for capture and playback
- **Visualization**: Canvas-based frequency analysis
- **Model**: `gemini-2.5-flash-native-audio-preview-09-2025`

## Project Structure

```
app/
├── index.html          # Main HTML entry point
├── index.tsx           # React application with audio logic
├── package.json        # Dependencies and scripts
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
└── .env.local          # API key (create this file)
```

## Building for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory, ready to deploy to any static hosting service.

## Troubleshooting

**Microphone not working?**
- Check browser permissions for microphone access
- Ensure you're using HTTPS or localhost
- Try refreshing the page

**API errors?**
- Verify your API key is correct in `.env.local`
- Check your API quota at [Google AI Studio](https://ai.studio)
- Ensure you're using a supported region

**Audio quality issues?**
- Check your internet connection speed
- Ensure your microphone is working properly
- Try using headphones to reduce echo

## Browser Support

- Chrome/Edge 89+
- Safari 14.1+
- Firefox 88+

## License

MIT License - feel free to use this project however you'd like!

## Credits

Built with:
- [React](https://react.dev)
- [Google Gemini AI](https://ai.google.dev)
- [Vite](https://vitejs.dev)
- [TypeScript](https://www.typescriptlang.org)

---

Made with care by a human developer who loves clean code and great UX.
