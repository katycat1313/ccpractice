# AI Sales Practice Platform

An interactive web application that helps sales professionals practice and improve their cold calling skills through realistic AI-powered conversations.

## Overview

Practice makes perfect, but finding time to practice cold calling can be challenging. This platform provides on-demand AI conversation partners with different personalities and objection styles, allowing sales reps to refine their pitch in a risk-free environment.

## Features

- **AI Conversation Partners** - Practice with multiple AI prospect personalities, each with unique communication styles and objection patterns
- **Real-time Transcription** - Live speech-to-text using Deepgram API for accurate conversation tracking
- **Smart Script Builder** - Visual node-based script editor for creating custom cold call flows
- **AI Script Generation** - Generate personalized sales scripts using Google Gemini based on your product and target market
- **Intelligent Prompter** - Context-aware suggestions that analyze prospect responses and recommend appropriate next lines
- **Session Feedback** - AI-powered analysis highlighting strengths and areas for improvement
- **User Accounts** - Secure authentication with Supabase for saving scripts and tracking progress

## Tech Stack

**Frontend**
- React 19 with Vite
- React Router for navigation
- ReactFlow for visual script building
- Tailwind CSS for styling
- Lucide React icons

**Backend & APIs**
- Supabase (Authentication, Database, Edge Functions)
- Google Gemini 2.5 Flash (AI responses and script generation)
- Deepgram (Speech-to-text transcription)
- Google Cloud Text-to-Speech (AI prospect voices)

**Development Tools**
- Jest for testing
- ESLint for code quality

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account
- API keys for Gemini, Deepgram, and Google Cloud TTS

### Installation

1. Clone the repository
```bash
git clone https://github.com/katycat1313/ccpractice.git
cd ccpractice
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file with your API keys:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GEMINI_API_KEY=your_gemini_key
VITE_DEEPGRAM_API_KEY=your_deepgram_key
VITE_GOOGLE_TTS_API_KEY=your_google_tts_key
```

4. Run the development server
```bash
npm run dev
```

## Project Structure

```
src/
├── components/        # React components
├── hooks/            # Custom React hooks
├── pages/            # Route pages
├── services/         # API integrations
└── utils/            # Helper functions
```

## Skills Demonstrated

- Complex state management with React hooks
- Real-time audio stream processing
- Integration of multiple AI APIs
- Serverless edge functions for secure API access
- Responsive UI design
- Full authentication flow implementation
- Node-based visual programming interface

## License

MIT License - see LICENSE file for details

## Contact

Kathleen Casto - [GitHub](https://github.com/katycat1313)
