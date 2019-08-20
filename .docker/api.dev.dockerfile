FROM node:12-alpine

RUN apk --no-cache add --virtual native-deps \
    g++ gcc libgcc libstdc++ linux-headers autoconf automake make nasm python git && \
    npm install --quiet node-gyp -g

RUN npm install pm2 -g

# Create app directory
WORKDIR /var/www
### install node_modules in container - do not use the local one:
### bcrypt needs to be build and compiled for targeted system  because it uses native libs!!!
COPY package.json ./

RUN npm install

COPY . .

### Initialize DB with this command
### docker-compose exec api npm run db-migrate:up

### For testing DB run:
### docker-compose exec api npm run db-migrate:db:test
### docker-compose exec api npm run db-migrate:up:test

### For running tests (first create qoestream_test db) 
### Enter docker api container:
### docker-compose exec api /bin/bash
### From container run tests:
### npm run test
### Or run tests directly from host:
### docker-compose exec api yarn run test