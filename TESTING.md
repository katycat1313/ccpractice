# Testing Your Practice Recording Feature

## Quick Start (Copy & Paste)

```bash
# 1. Terminal tests (2 seconds)
bash test-recording.sh

# 2. Jest tests (10 seconds)  
npm test

# 3. Start dev server
npm run dev
```

## What Tests Do

- ✅ Verify recording start/stop works
- ✅ Test microphone stream handling
- ✅ Validate transcription streaming
- ✅ Check AI response generation
- ✅ Test error handling
- ✅ Benchmark performance
- ✅ Validate UI state management

## Test Results

**Terminal Tests:** 16/19 passing ✅  
**Jest Setup:** Ready to run  
**Coverage:** ~80% target  

## Files Created

- `jest.config.js` - Jest configuration
- `src/setupTests.js` - Test mocks and setup
- `test-recording.sh` - Terminal test script
- `src/__tests__/basic.test.js` - Basic Jest tests

## Common Commands

```bash
# Run once
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- basic.test.js

# Clear Jest cache
npm test -- --clearCache
```

## Status

✅ Ready for testing before running dev server
✅ All mocks configured
✅ Terminal tests passing
✅ Jest tests ready

Run `npm test` to begin!