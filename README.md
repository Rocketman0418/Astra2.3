# Astra Intelligence v1.1

RocketHub team chat tool for company information queries powered by AI.

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your API keys and webhook URL to the `.env` file:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url_here
   ```

## Development

```bash
npm install
npm run dev
```

## Production Deployment

This app is configured to deploy to Netlify. Make sure to set the following environment variables in your Netlify dashboard:

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key
- `VITE_N8N_WEBHOOK_URL`: Your n8n webhook URL for chat processing

## Features

- AI-powered chat interface
- Dynamic visualization generation using Gemini 2.5 Flash
- Progressive Web App (PWA) capabilities
- Mobile-optimized interface
