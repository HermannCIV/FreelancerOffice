# Image minimale pour héberger reporting-mcp-btob. Sans secret embarqué : toutes les
# valeurs de configuration sont injectées à l'exécution (variables d'environnement,
# cf. .env.example), jamais copiées dans l'image.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
RUN addgroup -S reporting && adduser -S reporting -G reporting
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER reporting
EXPOSE 8787
CMD ["node", "src/mcpServer.js"]
