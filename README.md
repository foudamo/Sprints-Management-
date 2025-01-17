# Fireflies Task Management Board

A modern task management board that integrates with Fireflies.ai API to help you manage your tasks from meeting transcripts.

## Features
- View and manage tasks from Fireflies meetings
- Organize tasks in a Kanban-style board
- Search and filter tasks
- Real-time updates

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   ```
3. Create a `.env` file in the root directory with your Fireflies API credentials:
   ```
   FIREFLIES_API_KEY=your_api_key
   ```
4. Start the development server:
   ```bash
   npm run dev:full
   ```

## Tech Stack
- Frontend: React.js with Material-UI
- Backend: Node.js with Express
- API: Fireflies GraphQL API

## Note
You'll need to obtain an API key from Fireflies.ai to use this application. Please visit their documentation for more information.
