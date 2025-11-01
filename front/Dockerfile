FROM nginx:alpine

# Copy static files to /usr/share/nginx/html/static
COPY static/ /usr/share/nginx/html/static/

# Copy templates to /usr/share/nginx/html/templates
COPY templates/ /usr/share/nginx/html/templates/

# Copy custom nginx.conf to /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]