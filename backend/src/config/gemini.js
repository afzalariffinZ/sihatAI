const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  throw new Error('Missing Google AI API key. Please check your GOOGLE_AI_API_KEY environment variable.');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Configuration for the Gemini model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.2,
    topK: 32,
    topP: 0.95,
    maxOutputTokens: 1024,
  },
});

module.exports = { model, genAI };