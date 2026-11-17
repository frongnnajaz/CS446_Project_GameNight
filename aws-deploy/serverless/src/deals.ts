// Lambda gamenight-deals: EventBridge เรียกทุก 1 ชั่วโมง
// 1) อ่านเกณฑ์จาก S3 config.json  2) อ่าน Wishlist + ราคาเกมจาก DynamoDB
// 3) เกมไหนลดราคาถึงเกณฑ์และยังไม่เคยแจ้งที่ส่วนลดนี้ -> publish SNS ทีละผู้ใช้ (filter ด้วย email)
// 4) บันทึกว่าแจ้งแล้ว และเขียน log ผลการตรวจลง S3 logs/
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { GetSubscriptionAttributesCommand, PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { allGames, putItem, scanAll, T, type CollectionDoc, type UserDoc } from './db'

const s3 = new S3Client({})
const sns = new SNSClient({})
const bucket = process.env.CONFIG_BUCKET
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '')

interface Config {
  /** ส่วนลดขั้นต่ำ (%) ที่จะส่งอีเมลแจ้ง */
  minDiscountPercent: number
}

async function readConfig(): Promise<Config> {
  const fallback: Config = { minDiscountPercent: 1 }
  if (!bucket) return fallback
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'config.json' }))
    return { ...fallback, ...JSON.parse(await r.Body!.transformToString()) }
  } catch {
    return fallback
  }
}

async function isConfirmed(arn?: string) {
  if (!arn) return false
  try {
    const r = await sns.send(new GetSubscriptionAttributesCommand({ SubscriptionArn: arn }))
    return r.Attributes?.PendingConfirmation === 'false'
  } catch {
    return false
  }
}

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`

export async function handler() {
  const config = await readConfig()
  const [items, games, users] = await Promise.all([
    scanAll<CollectionDoc>(T.collections, { FilterExpression: '#t = :w', ExpressionAttributeNames: { '#t': 'type' }, ExpressionAttributeValues: { ':w': 'wishlist' } }),
    allGames(),
    scanAll<UserDoc>(T.users),
  ])
  const gameById = new Map(games.map((g) => [g.id, g]))
  const subscribed = new Set<string>()
  for (const u of users) if (await isConfirmed(u.alertsSubscriptionArn)) subscribed.add(u.email)

  const perUser = new Map<string, CollectionDoc[]>()
  let reset = 0
  for (const it of items) {
    const g = gameById.get(it.gameId)
    if (!g) continue
    const discount = g.price.discountPercent
    if (discount < config.minDiscountPercent) {
      // เลิกลดราคาแล้ว: ล้างสถานะ เพื่อให้รอบลดราคาครั้งหน้าแจ้งได้อีก
      if (it.notifiedDiscount) {
        await putItem(T.collections, { ...it, notifiedDiscount: 0 })
        reset++
      }
      continue
    }
    if (!subscribed.has(it.email) || discount <= (it.notifiedDiscount ?? 0)) continue
    perUser.set(it.email, [...(perUser.get(it.email) ?? []), it])
  }

  const sent: { email: string; games: number[] }[] = []
  for (const [email, list] of perUser) {
    const lines = list.map((it) => {
      const g = gameById.get(it.gameId)!
      const { price, discountPercent } = g.price
      const now = Math.round((price * (100 - discountPercent)) / 100)
      return `• ${g.name}: ลด ${discountPercent}% จาก ${baht(price)} เหลือ ${baht(now)}${siteUrl ? `\n  ${siteUrl}/game/${g.id}` : ''}`
    })
    await sns.send(
      new PublishCommand({
        TopicArn: process.env.TOPIC_ARN,
        Subject: `Game Night: เกมใน Wishlist ลดราคา ${list.length} เกม`,
        Message: `เกมที่คุณใส่ Wishlist ไว้กำลังลดราคา\n\n${lines.join('\n')}\n\nยกเลิกรับแจ้งเตือนได้ที่หน้า Collection บนเว็บ Game Night`,
        MessageAttributes: { email: { DataType: 'String', StringValue: email } },
      }),
    )
    for (const it of list) await putItem(T.collections, { ...it, notifiedDiscount: gameById.get(it.gameId)!.price.discountPercent })
    sent.push({ email, games: list.map((it) => it.gameId) })
  }

  const result = {
    at: new Date().toISOString(),
    config,
    wishlistItems: items.length,
    subscribers: subscribed.size,
    emailsSent: sent.length,
    sent,
    reset,
  }
  console.log(JSON.stringify(result))
  if (bucket) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `logs/${result.at.slice(0, 10)}/${result.at.slice(11, 19).replace(/:/g, '-')}.json`,
        Body: JSON.stringify(result, null, 2),
        ContentType: 'application/json',
      }),
    )
  }
  return result
}
