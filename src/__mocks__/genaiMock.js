export class GoogleGenAI {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.models = {
      generateContent: jest.fn().mockResolvedValue({
        text: () => '',
        candidates: [{ content: { parts: [{ text: '' }] } }],
        functionCalls: () => []
      })
    };
  }
}

export default {
  GoogleGenAI
};
