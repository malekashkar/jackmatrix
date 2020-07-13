FROM node:13-alpine

WORKDIR /usr/src/discord_bot

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80
CMD [ "node", "main.js" ]