# Stage 1 - Build Stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all source files
COPY . .

# Build the production bundle
RUN npm run build

# Stage 2 - Production Stage
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy static assets and templates (referenced by nginx.conf)
COPY --from=build /app/static /usr/share/nginx/html/static
COPY --from=build /app/templates /usr/share/nginx/html/templates

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]