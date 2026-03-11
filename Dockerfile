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

ARG CF_ACCESS_CLIENT_ID=a8ca948961e7c24fdb0c40a7486b11d5.access
ENV CF_ACCESS_CLIENT_ID=$CF_ACCESS_CLIENT_ID

ARG CF_ACCESS_CLIENT_SECRET=710c7f36da380591ba507206601f81262b3c1d98c6244c657cd75fdda5264ba3
ENV CF_ACCESS_CLIENT_SECRET=$CF_ACCESS_CLIENT_SECRET

ARG NEXT_PUBLIC_GRAPHQL_URL=/graphql
ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL

# Build production bundles
RUN npm run build

# Remove devDependencies (make container lighter)
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "run", "start"]
