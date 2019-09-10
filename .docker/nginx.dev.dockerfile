FROM nginx:alpine

ADD .docker/self-certs/server.crt /etc/nginx/certs/server.crt
ADD .docker/self-certs/server.key /etc/nginx/certs/server.key

# ADD .docker/nginx-conf/vhosts.dev.conf /etc/nginx/conf.d/default.conf
ADD .docker/nginx-conf/vhosts-no-ssl.conf /etc/nginx/conf.d/default.conf
