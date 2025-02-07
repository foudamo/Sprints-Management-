# Sprints Management System

A modern task management system designed to help teams track and manage sprint tasks efficiently.

## Features
- Calendar view for task management
- Team member task tracking
- Task export functionality
- Real-time updates
- Meeting notes integration

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18.x or higher)
- npm (usually comes with Node.js)
- Git

You can check your installations by running:
```bash
node --version
npm --version
git --version
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone [repository-url]
   cd [project-folder]
   ```

2. **Install Backend Dependencies**
   ```bash
   # In the root directory
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   # Navigate to client directory
   cd client

   # Install all required frontend packages
   npm install @emotion/react@11.11.3 @emotion/styled@11.11.0 @mui/icons-material@5.15.5 @mui/material@5.15.5 @mui/x-date-pickers@6.18.6 ajv@8.12.0 ajv-keywords@5.1.0 dayjs@1.11.10 react@18.2.0 react-dom@18.2.0 react-markdown@9.0.3 react-scripts@5.0.1 socket.io-client@4.7.4

   # Or simply run (if package.json is up to date)
   npm install
   ```

4. **Environment Setup**
   - Create a `.env` file in the root directory for backend:
     ```
     PORT=3001
     NODE_ENV=development
     ```
   - Create a `.env` file in the client directory for frontend:
     ```
     REACT_APP_BACKEND_URL=http://localhost:3001
     ```

5. **Start the Application**
   ```bash
   # Start backend server (in root directory)
   npm start

   # In a new terminal, start frontend (in client directory)
   cd client
   npm start
   ```

   The application should now be running at:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Troubleshooting

If you encounter any issues:

1. **Node Version Issues**
   ```bash
   # Install nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

   # Install and use the correct Node version
   nvm install 18
   nvm use 18
   ```

2. **Dependency Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force

   # Delete node_modules and reinstall
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

3. **Port Conflicts**
   - If port 3000 or 3001 is in use, you can modify the ports in the `.env` files
   - For frontend, you can also just press 'Y' when prompted to use a different port

## Development

The system is designed to help teams track tasks and manage sprints effectively. It includes features for viewing tasks in a calendar format, managing team members, and exporting task reports.

## Tech Stack
- Frontend: React.js with Material-UI
- Backend: Node.js with Express
- Real-time: Socket.IO

## Common Issues and Solutions

1. **"Module not found" errors**
   - Make sure you're in the correct directory
   - Try deleting `node_modules` and running `npm install` again

2. **Socket.IO connection issues**
   - Check if the backend server is running
   - Verify the REACT_APP_BACKEND_URL in your frontend .env file

3. **Build errors**
   - Make sure you have the latest stable version of Node.js
   - Clear your npm cache and reinstall dependencies

For any other issues, please check the project's issue tracker or create a new issue.
