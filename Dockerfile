FROM node:14
WORKDIR /app
COPY . .
RUN npm install
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "build", "&&", "npm", "run", "start"]