# Control ESP32 from anywhere in the World - WebSocket Server Project

This repository has been created as a part of the YouTube video:
[Control ESP32 from ANYWHERE in the World - Step-By-Step Tutorial](https://youtu.be/z53MkVFOnIo)

This is WebSocket server code that after deploying to AWS API Gateway WebSockets with Serverless Framework acts as an intermediary between ReactJS Web Application and ESP32 Microcontroller.

In case you are not familiar with Serverless Framework yet I recommend checking this video:
[Getting started with AWS Lambda and Serverless Framework](https://youtu.be/JL_7Odb7GLM)

## Prerequisites

- AWS CLI installed and configured
- [`serverless-framework`](https://github.com/serverless/serverless)
- [`node.js`](https://nodejs.org)

## Installation

Run:

```bash
npm install
```

or

```
yarn install
```

## Deployment

Run:

```bash
yarn deploy
```

or

```bash
npm run deploy
```

## Licence

MIT.
