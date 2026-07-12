FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

# Copia o resto do código da aplicação
COPY . .

# Por segurança, impede que a aplicação rode como Root
USER node

EXPOSE 3000

# O comando de ignição
CMD ["node", "src/server.js"]