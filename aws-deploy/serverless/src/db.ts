// ชั้นข้อมูล DynamoDB ของ Game Night (แทน Prisma + PostgreSQL)
// ตาราง (ชื่อขึ้นต้นด้วย TABLE_PREFIX, ค่าเริ่มต้น "gamenight-"):
//   games        PK id (N)                     เอกสารเกมทั้งก้อน รวม genreIds/platformIds/... ราคา และภาพหน้าจอ
//   lookups      PK kind (S) + SK id (N)       kind = genre | platform | company
//   users        PK email (S)                  id, name, passwordHash, alertsSubscriptionArn
//   sessions     PK token (S)                  userId, email, name, expiresAt, ttl (DynamoDB TTL ลบให้เอง)
//   collections  PK userId (N) + SK sk (S)     sk = wishlist#<gameId> | library#<gameId>
//   counters     PK name (S)                   เลข id ถัดไปของแต่ละชนิด (atomic counter)
// ข้อมูลมีไม่กี่ร้อยแถว จึงใช้ Scan แล้วกรอง/เรียงในหน่วยความจำแทนการทำ index ซับซ้อน
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  type ScanCommandInput,
} from '@aws-sdk/lib-dynamodb'

const prefix = process.env.TABLE_PREFIX ?? 'gamenight-'
export const T = {
  games: `${prefix}games`,
  lookups: `${prefix}lookups`,
  users: `${prefix}users`,
  sessions: `${prefix}sessions`,
  collections: `${prefix}collections`,
  counters: `${prefix}counters`,
}

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})

// ---------- ชนิดข้อมูล ----------

export type LookupKind = 'genre' | 'platform' | 'company'

export interface Lookup {
  kind: LookupKind
  id: number
  name: string
  slug?: string
}

export interface PriceDoc {
  price: number
  discountPercent: number
  isFeatured: boolean
}

export interface ScreenshotDoc {
  id: number
  image: string | null
  width: number | null
  height: number | null
}

export interface GameDoc {
  id: number
  slug: string
  name: string
  released: string | null
  rating: number
  ratingsCount: number
  added: number
  metacritic: number | null
  backgroundImage: string | null
  description: string
  website: string
  genreIds: number[]
  platformIds: number[]
  developerIds: number[]
  publisherIds: number[]
  price: PriceDoc
  screenshots: ScreenshotDoc[]
  createdAt: string
  updatedAt: string
}

export interface UserDoc {
  email: string
  id: number
  name: string
  passwordHash: string
  createdAt: string
  /** ARN ของ subscription อีเมลแจ้งเตือนเกมลดราคาใน SNS */
  alertsSubscriptionArn?: string
}

export interface SessionDoc {
  token: string
  userId: number
  email: string
  name: string
  expiresAt: string
  ttl: number
}

export type PlayStatus = 'unplayed' | 'playing' | 'finished'

export interface CollectionDoc {
  userId: number
  sk: string
  type: 'wishlist' | 'library'
  gameId: number
  email: string
  addedAt: string
  status?: PlayStatus
  myRating?: number
  /** ส่วนลดล่าสุดที่เคยส่งอีเมลแจ้งไปแล้ว (กันส่งซ้ำทุกชั่วโมง) */
  notifiedDiscount?: number
}

// ---------- helper ----------

export async function scanAll<T>(TableName: string, extra: Omit<ScanCommandInput, 'TableName'> = {}): Promise<T[]> {
  const out: T[] = []
  let ExclusiveStartKey: Record<string, unknown> | undefined
  do {
    const r = await ddb.send(new ScanCommand({ TableName, ExclusiveStartKey, ...extra }))
    out.push(...((r.Items ?? []) as T[]))
    ExclusiveStartKey = r.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return out
}

export async function getItem<T>(TableName: string, Key: Record<string, unknown>): Promise<T | undefined> {
  const r = await ddb.send(new GetCommand({ TableName, Key }))
  return r.Item as T | undefined
}

export const putItem = (TableName: string, Item: object, ConditionExpression?: string) =>
  ddb.send(new PutCommand({ TableName, Item: Item as Record<string, unknown>, ConditionExpression }))

export const deleteItem = (TableName: string, Key: Record<string, unknown>) =>
  ddb.send(new DeleteCommand({ TableName, Key }))

export async function queryAll<T>(TableName: string, KeyConditionExpression: string, values: Record<string, unknown>) {
  const out: T[] = []
  let ExclusiveStartKey: Record<string, unknown> | undefined
  do {
    const r = await ddb.send(
      new QueryCommand({ TableName, KeyConditionExpression, ExpressionAttributeValues: values, ExclusiveStartKey }),
    )
    out.push(...((r.Items ?? []) as T[]))
    ExclusiveStartKey = r.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return out
}

/** เขียนทีละ 25 แถว (ขีดจำกัดของ BatchWrite) */
export async function batchPut(TableName: string, items: object[]) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item: Item as Record<string, unknown> } }))
    let req: Record<string, typeof chunk> | undefined = { [TableName]: chunk }
    while (req && Object.keys(req).length) {
      const r = await ddb.send(new BatchWriteCommand({ RequestItems: req }))
      req = r.UnprocessedItems as typeof req
    }
  }
}

export async function batchDelete(TableName: string, keys: Record<string, unknown>[]) {
  for (let i = 0; i < keys.length; i += 25) {
    const chunk = keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } }))
    let req: Record<string, typeof chunk> | undefined = { [TableName]: chunk }
    while (req && Object.keys(req).length) {
      const r = await ddb.send(new BatchWriteCommand({ RequestItems: req }))
      req = r.UnprocessedItems as typeof req
    }
  }
}

/** ขอเลข id ถัดไปแบบ atomic เช่น nextId('game') */
export async function nextId(name: string): Promise<number> {
  const r = await ddb.send(
    new UpdateCommand({
      TableName: T.counters,
      Key: { name },
      UpdateExpression: 'ADD #v :one',
      ExpressionAttributeNames: { '#v': 'value' },
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    }),
  )
  return Number(r.Attributes!.value)
}

export const isConditionFailed = (e: unknown) =>
  e instanceof Error && e.name === 'ConditionalCheckFailedException'

// ---------- lookups ----------

export async function listLookups(kind: LookupKind): Promise<Lookup[]> {
  return queryAll<Lookup>(T.lookups, 'kind = :k', { ':k': kind })
}

export async function lookupMap(kind: LookupKind): Promise<Map<number, Lookup>> {
  return new Map((await listLookups(kind)).map((l) => [l.id, l]))
}

export const allGames = () => scanAll<GameDoc>(T.games)
