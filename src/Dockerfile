# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
# Copia apenas arquivos de lock e package para cache mais eficiente
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm i; fi

# ---------- build ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# (opcional) garante standalone
# RUN node -e "try{require('fs').writeFileSync('next.config.js','module.exports={output:\"standalone\"}')}catch(e){}"
RUN \
  if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm build; \
  elif [ -f yarn.lock ]; then yarn build; \
  else npm run build; fi

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Copia a saída standalone do Next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Porta padrão
ENV PORT=8080
EXPOSE 8080

# O standalone inclui server.js na raiz copiada acima
CMD ["node", "server.js"]
