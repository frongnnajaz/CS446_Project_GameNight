// สมัครรับอีเมลแจ้งเตือนเกมใน Wishlist ลดราคา: /api/alerts (ต้องล็อกอิน)
// subscribe อีเมลของผู้ใช้เข้า SNS topic พร้อม filter policy { email: [<อีเมลตัวเอง>] }
// Lambda gamenight-deals publish ทีละคนพร้อม message attribute email จึงได้อีเมลเฉพาะของตัวเอง
import { GetSubscriptionAttributesCommand, SNSClient, SubscribeCommand, UnsubscribeCommand } from '@aws-sdk/client-sns'
import { Router } from 'express'
import { currentUser, requireAuth } from '../auth'
import { getItem, putItem, T, type UserDoc } from '../db'
import { ApiError } from '../errors'

const sns = new SNSClient({})
const topicArn = () => {
  const arn = process.env.TOPIC_ARN
  if (!arn) throw new ApiError(503, 'ยังไม่ได้ตั้งค่า SNS topic')
  return arn
}

type AlertStatus = 'none' | 'pending' | 'confirmed'

async function statusOf(user: UserDoc): Promise<AlertStatus> {
  if (!user.alertsSubscriptionArn) return 'none'
  try {
    const r = await sns.send(new GetSubscriptionAttributesCommand({ SubscriptionArn: user.alertsSubscriptionArn }))
    return r.Attributes?.PendingConfirmation === 'true' ? 'pending' : 'confirmed'
  } catch {
    // subscription ถูกลบไปแล้ว (เช่น ผู้ใช้กด unsubscribe ในอีเมล หรือไม่ยืนยันภายใน 3 วัน)
    return 'none'
  }
}

async function loadUser(email: string) {
  const u = await getItem<UserDoc>(T.users, { email })
  if (!u) throw new ApiError(401, 'กรุณาเข้าสู่ระบบ')
  return u
}

export const alerts = Router()
alerts.use(requireAuth)

/** GET /api/alerts -> { email, status: none | pending | confirmed } */
alerts.get('/', async (req, res) => {
  const user = await loadUser(currentUser(req).email)
  res.json({ email: user.email, status: await statusOf(user) })
})

/** POST /api/alerts สมัครรับแจ้งเตือน (SNS ส่งอีเมลให้กดยืนยันก่อน) */
alerts.post('/', async (req, res) => {
  const user = await loadUser(currentUser(req).email)
  const current = await statusOf(user)
  if (current !== 'none') {
    res.json({ email: user.email, status: current })
    return
  }
  const r = await sns.send(
    new SubscribeCommand({
      TopicArn: topicArn(),
      Protocol: 'email',
      Endpoint: user.email,
      ReturnSubscriptionArn: true,
      Attributes: { FilterPolicy: JSON.stringify({ email: [user.email] }) },
    }),
  )
  await putItem(T.users, { ...user, alertsSubscriptionArn: r.SubscriptionArn })
  res.status(201).json({ email: user.email, status: 'pending' satisfies AlertStatus })
})

/** DELETE /api/alerts ยกเลิกรับแจ้งเตือน */
alerts.delete('/', async (req, res) => {
  const user = await loadUser(currentUser(req).email)
  if (user.alertsSubscriptionArn) {
    await sns.send(new UnsubscribeCommand({ SubscriptionArn: user.alertsSubscriptionArn })).catch(() => undefined)
    const { alertsSubscriptionArn: _a, ...rest } = user
    await putItem(T.users, rest)
  }
  res.status(204).end()
})
