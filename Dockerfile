FROM node:20.11-alpine

# Create app directory
WORKDIR /usr/src/app
# for rect build output
RUN mkdir -p /usr/src/app/public/dist

# Install app dependencies
COPY package*.json ./
ENV NODE_ENV=production
RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Build React application
# uncomment while mount volume from docker-compose (need manual build)
# RUN npm run build

# Create a non-root user and use it
# uncomment because i don't like this
# RUN adduser -D appuser && chown -R appuser:appuser /usr/src/app
# USER appuser

EXPOSE 3000

CMD ["node", "src/index.js"]
