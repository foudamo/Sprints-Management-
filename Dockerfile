# Base image
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy all package files first
COPY package*.json ./
COPY client/package*.json ./client/

# Install server dependencies
RUN npm install

# Install and build client
WORKDIR /app/client
RUN npm install

# Copy client source code
COPY client/src ./src
COPY client/public ./public
RUN npm run build

# Return to main directory
WORKDIR /app

# Copy application code
COPY . .

# Verify client/build exists and is not empty
RUN ls -la client/build && \
    echo "Contents of client/build:" && \
    find client/build -type f || \
    echo "Warning: client/build directory is empty"

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 