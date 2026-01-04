# Multi-Niche Practice Apps

This repository contains 4 distinct AI-powered practice applications:

## 🎯 Applications

### 1. Cold Calling Coach
**Purpose**: Practice cold calling with AI sales prospects  
**Target Users**: Sales professionals, SDRs, account executives  
**Features**: Multiple prospect personalities (busy CEO, friendly owner, skeptical manager, etc.) with varying difficulty levels

### 2. Interview Prep Pro
**Purpose**: Practice job interviews for various positions  
**Target Users**: Job seekers across all industries  
**Features**: Position-specific interviewers (Frontend Dev, Product Manager, Marketing Manager, HR Manager, Sales, etc.) with relevant questions

### 3. Meeting Mastery
**Purpose**: Practice facilitating different types of meetings  
**Target Users**: Managers, team leads, consultants  
**Features**: Different meeting scenarios (standups, client pitches, difficult conversations, brainstorming)

### 4. Presentation Practice Studio
**Purpose**: Practice presentations with AI audience Q&A  
**Target Users**: Anyone giving presentations  
**Features**: Different audience types (board members, conference attendees, investors, employees)

## 🏗️ Project Structure

```
ccpractice/
├── apps/
│   ├── shared/                    # Shared components across all apps
│   │   ├── components/            # ApiKeySetup, VoiceSelector
│   │   ├── hooks/                 # useGeminiVoiceAgent
│   │   └── utils/                 # apiKeyManager
│   ├── cold-calling-coach/        # Cold calling practice app
│   ├── interview-prep-pro/        # Interview practice app
│   ├── meeting-mastery/           # Meeting practice app
│   └── presentation-studio/       # Presentation practice app
├── dist/                          # Built apps ready for distribution
├── build-all-apps.sh             # Script to build all apps
└── README-APPS.md                # This file
```

## 🚀 Building the Apps

### Build All Apps at Once
```bash
./build-all-apps.sh
```

This will:
1. Install dependencies for each app
2. Build production bundles
3. Output to `dist/[app-name]` directories

### Build Individual Apps
```bash
cd apps/cold-calling-coach
npm install
npm run build
```

## 📦 Distribution

Each built app in the `dist/` folder is a standalone application containing:
- `index.html` - Main HTML file
- `assets/` - JavaScript and CSS bundles
- All necessary dependencies bundled

### How to Distribute

**Option 1: Download & Open (Simplest)**
- Zip the `dist/[app-name]` folder
- Customer downloads and unzips
- Customer opens `index.html` in their browser
- That's it!

**Option 2: Host on Web Server**
- Upload `dist/[app-name]` contents to any web hosting
- Customer accesses via URL
- No installation needed

**Option 3: Electron App (Desktop)**
- Wrap the built app in Electron
- Create installable desktop applications
- More professional but requires additional setup

## 🔐 API Key Setup

**IMPORTANT**: None of these apps contain hardcoded API keys!

On first launch, each app will:
1. Show a beautiful onboarding wizard
2. Guide the user to get a free Gemini API key
3. Validate and save the key locally
4. Begin practice sessions

### Getting a Gemini API Key (For Your Customers)

Include these instructions with each app:

1. Visit https://aistudio.google.com/apikey
2. Sign in with a Google account (free!)
3. Click "Get API Key" and create a new key
4. Copy the key
5. Paste it into the app's setup wizard

**Cost**: Gemini API is very affordable:
- ~$0.002 per minute of audio
- Most practice sessions cost less than $0.01
- Generous free tier available

## 🎤 Voice Features

All apps use Google Gemini's native audio:
- **Free** human-sounding voices (included with API key)
- Multiple voice options (male & female)
- Real-time bidirectional audio
- No additional TTS service needed!

## 🎨 Visual Identity

Each app has a distinct visual theme so customers don't realize they're based on the same codebase:

- **Cold Calling Coach**: Purple/Blue gradient (sales energy)
- **Interview Prep Pro**: Green/Teal (professional growth)
- **Meeting Mastery**: Orange/Yellow (collaborative warmth)
- **Presentation Studio**: Red/Pink (creative confidence)

## 💡 Customization

### Adding New Personas/Interviewers

Edit the config file for each app:
- `apps/cold-calling-coach/src/config/prospects.js`
- `apps/interview-prep-pro/src/config/interviewers.js`
- `apps/meeting-mastery/src/config/scenarios.js`
- `apps/presentation-studio/src/config/audiences.js`

### Changing Branding

Update the app-specific files:
- `index.html` - Title and description
- `App.jsx` - App name and UI text
- `App.css` - Color scheme

## 🧪 Testing

### Test an App Locally

```bash
cd apps/cold-calling-coach
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Test Built App

After running `build-all-apps.sh`:
```bash
cd dist/cold-calling-coach
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

## 📄 License

Each app can be sold separately with appropriate licensing.

## 🎯 Target Markets

### Cold Calling Coach
- Sales teams
- SDR training programs
- B2B companies  
- Sales bootcamps

### Interview Prep Pro
- Job seekers
- Career coaching services
- University career centers
- HR departments for interview training

### Meeting Mastery
- Corporate training programs
- Leadership development
- Consulting firms
- MBA programs

### Presentation Practice Studio
- Public speaking courses
- Executive coaching
- Conference speakers
- Sales enablement teams

## 💼 Pricing Suggestions

Since customers need their own API key:

**One-Time Purchase Model**:
- Cold Calling Coach: $97-$197
- Interview Prep Pro: $67-$147
- Meeting Mastery: $97-$177
- Presentation Studio: $87-$167
- Bundle (All 4): $297-$497

The API costs are passed to the customer (pennies per session), so you have zero ongoing costs!

## 🆘 Support

Common customer questions:

**Q: Do I need to pay monthly?**
A: No! One-time purchase. You just need a Gemini API key (very cheap, you only pay for what you use).

**Q: How much does the API key cost?**
A: About $0.002 per minute. Most practice sessions cost less than a penny!

**Q: Is my data secure?**
A: Yes! Your API key is stored locally in your browser. Nothing is sent to our servers.

**Q: Can I use this offline?**
A: No, it requires internet to connect to the Gemini API for AI conversations.

**Q: What browsers are supported?**
A: Chrome, Edge, and other Chromium browsers work best. Firefox and Safari may have audio limitations.
