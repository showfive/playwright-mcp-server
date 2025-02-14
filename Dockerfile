FROM zenika/alpine-chrome:with-node as build

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD 1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /usr/src/app
COPY --chown=chrome package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Create a new image for the release
FROM zenika/alpine-chrome:with-node

# Set the working directory
WORKDIR /usr/src/app

# Copy the built application from the previous stage
COPY --from=build usr/src/app/build ./build
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "build/index.js"]