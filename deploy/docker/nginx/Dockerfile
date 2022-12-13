FROM nginx:1.23-alpine

# curl used for local health checks
RUN apk update && \
    apk add --update curl && \
    rm -rf /var/cache/apk/*

#RUN rm /etc/nginx/conf.d/default.conf
COPY default.conf.template /etc/nginx/templates/
