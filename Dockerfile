FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN chmod +x entrypoint.sh
RUN sed -i 's/\r//' entrypoint.sh
EXPOSE 3003
CMD ["sh", "entrypoint.sh"]
