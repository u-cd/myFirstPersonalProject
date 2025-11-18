FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --include=dev

# Bundle app source
COPY . .

# Build React application
RUN npm run build

EXPOSE 3000

CMD ["node", "src/index.js"]
