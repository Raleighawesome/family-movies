# Family Movies

An AI-powered family movie recommendation and tracking app that helps households discover, discuss, and log movies they watch together.

## Features

### 🎬 AI Movie Concierge
- Interactive chat with an AI assistant for personalized movie recommendations
- Context-aware conversations with chat history
- Quick actions for common requests ("Recommend something new", "Short movie night")
- Real-time responses via N8n webhook integration

### 🏠 Household Management
- Multi-user households with shared preferences and chat history
- Family members can collaborate on movie selections
- Shared movie logs and ratings across the household

### 🎯 Content Filtering
- Customizable content filters based on intensity levels
- "Hard no" options to block specific content types
- Automatic filtering ensures family-appropriate recommendations

### 📝 Movie Tracking
- Log movies after watching with ratings and watch dates
- Track which family members watched each movie
- Block movies from future recommendations

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: N8n webhooks for chat functionality
- **Authentication**: Basic auth with household-based access

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Configure Supabase connection
   - Set up N8n webhook URL for AI chat (optional)

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Access the app**
   - Open http://localhost:3000
   - Sign in with household credentials
   - Set up content preferences
   - Start chatting with the movie assistant

## Usage

1. **Sign in** with your household credentials
2. **Configure preferences** - set content filters for your family
3. **Chat with the AI** - ask for recommendations or log movies you've watched
4. **Track your viewing** - mark movies as watched and rate them
5. **Refine recommendations** - block movies you don't want suggested again

The app makes family movie nights easier by providing personalized, AI-powered recommendations while respecting your household's content preferences.