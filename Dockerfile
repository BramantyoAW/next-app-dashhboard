FROM node:20-bullseye

WORKDIR /app

# install deps
COPY package.json package-lock.json ./
RUN npm ci

# copy source
COPY . .

# ===== BUILD ENV =====

ARG NEXT_PUBLIC_BACKEND_BASE
ARG NEXT_PUBLIC_GRAPHQL_URL
ARG GRAPHQL_URL

ENV NEXT_PUBLIC_BACKEND_BASE=$NEXT_PUBLIC_BACKEND_BASE
ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL
ENV GRAPHQL_URL=$GRAPHQL_URL

# build next
RUN npm run build

# remove dev deps
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "run", "start"]