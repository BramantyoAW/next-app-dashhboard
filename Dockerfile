FROM node:20-bullseye

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with clean pnpm
RUN npm ci

# Copy whole project
COPY . .


ARG GRAPHQL_URL=http://nginx-server:80/graphql
ENV GRAPHQL_URL=$GRAPHQL_URL

ARG NEXT_PUBLIC_GRAPHQL_URL=/graphql
ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL

# Build production bundles
RUN npm run build

# Remove devDependencies (make container lighter)
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "run", "start"]
