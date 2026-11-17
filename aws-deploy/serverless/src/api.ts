// Lambda gamenight-api: รับ event จาก API Gateway HTTP API แล้วส่งต่อให้ Express app
import serverless from 'serverless-http'
import { app } from './app'

export const handler = serverless(app)
