FROM mcr.microsoft.com/playwright:focal as build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Create a new image for the release
FROM mcr.microsoft.com/playwright:focal

# Set the working directory
WORKDIR /app

# Copy the built application from the previous stage
COPY --from=build /app/build ./build
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "build/index.js"]