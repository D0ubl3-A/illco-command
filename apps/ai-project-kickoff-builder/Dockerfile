FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY public ./public
COPY data ./data
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
ENV PORT=8787
EXPOSE 8787
VOLUME ["/app/data"]
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8787/healthz >/dev/null || exit 1
CMD ["node","server.js"]
