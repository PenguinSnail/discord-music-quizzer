FROM node:12.18.4-stretch

WORKDIR /app

RUN apt-get update && \
    apt install -y ffmpeg libav-tools opus-tools

COPY ./package.json /app
COPY ./package-lock.json /app
RUN npm ci

COPY ./ /app
RUN npm run build

ENTRYPOINT ["node", "dist/index.js"]
