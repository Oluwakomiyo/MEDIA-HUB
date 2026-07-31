# Use Node.js LTS version
FROM node:20-alpine

# Install build tools (needed for certain Node.js packages like sharp/sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

RUN npm ci --omit=dev

# Copy the rest of the backend code
COPY . .

EXPOSE 5000

CMD ["node", "index.js"]