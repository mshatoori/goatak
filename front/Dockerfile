# Stage 1 - Build Stage
FROM registry.docker.ir/node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy all source files
COPY . .

# Build the production bundle
RUN yarn build

# Stage 2 - Production Stage
FROM registry.docker.ir/nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy static assets
COPY --from=build /app/static /usr/share/nginx/html/static

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]