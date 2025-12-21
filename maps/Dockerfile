FROM docker.arvancloud.ir/rtsp/lighttpd

# Install lighttpd
# RUN apk add --no-cache lighttpd

# Create necessary directories
# RUN mkdir -p /var/www/localhost/htdocs
# RUN mkdir -p /var/log/lighttpd

# Copy map contents to web root
COPY contents/ /var/www/html/

# Create lighttpd configuration
COPY maps.conf /etc/lighttpd/conf.d/21-maps.conf
# \
# server.document-root = "/var/www/localhost/htdocs" \
# server.port = 8000 \
# server.errorlog = "/var/log/lighttpd/error.log" \
# accesslog.filename = "/var/log/lighttpd/access.log" \
# \
# # Enable compression for better performance \
# compress.cache-dir = "/var/cache/lighttpd/compress/" \
# compress.filetype = ( \
#     "application/javascript", \
#     "text/css", \
#     "text/html", \
#     "text/javascript", \
#     "text/plain", \
#     "application/json", \
#     "application/xml" \
# ) \
# \
# # MIME types for map files \
# mimetype.assign = ( \
#     ".pmtiles" => "application/octet-stream", \
#     ".json" => "application/json", \
#     ".pbf" => "application/x-protobuf", \
#     ".png" => "image/png", \
#     ".jpg" => "image/jpeg", \
#     ".jpeg" => "image/jpeg", \
#     ".gif" => "image/gif", \
#     ".svg" => "image/svg+xml", \
#     ".css" => "text/css", \
#     ".js" => "application/javascript", \
#     ".html" => "text/html", \
#     ".txt" => "text/plain" \
# )' > /etc/lighttpd/lighttpd.conf

# Expose port 8000
# EXPOSE 8000/tcp

# # Start lighttpd
# CMD ["lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.conf"]
