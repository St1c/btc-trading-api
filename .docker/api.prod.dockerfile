FROM node:12-alpine

# Create app directory
WORKDIR /var/www

RUN npm install pm2 -g

### install node_modules in container - do not use the local one:
### bcrypt needs to be build and compiled for targeted system  because it uses native libs!!!
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD [ "npm", "run", "start:pm2" ]