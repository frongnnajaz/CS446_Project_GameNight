# Game Night บน AWS แบบ serverless (Learner Lab, us-east-1)

> **สถานะ 17 พ.ย. 2026: ลบ resource ทั้งหมดแล้ว และ End Lab แล้ว** ลิงก์ด้านล่างใช้ไม่ได้แล้ว ถ้าจะขึ้นระบบใหม่ ให้ทำตามคู่มือใน `guide/` (โค้ดและสคริปต์ยังอยู่ครบใน `serverless/`)

- เว็บ: https://main.d2yvjayx2tsoci.amplifyapp.com/
- API: https://qll966s60h.execute-api.us-east-1.amazonaws.com/api
- ภาพ architecture: `architecture.png` / `architecture.svg`

## บริการ 7 ตัว

| บริการ | ชื่อ resource | หน้าที่ |
|---|---|---|
| AWS Amplify | `gamenight-web` (branch `main`) | เสิร์ฟหน้าเว็บ React + ภาพปก ผ่าน https, rewrite ทุก path ที่ไม่ใช่ไฟล์ไป `/index.html` |
| Amazon API Gateway | `gamenight-http-api` (HTTP API, route `$default`) | ส่งทุก request ไป Lambda `gamenight-api` |
| AWS Lambda | `gamenight-api` (nodejs22.x) | Express app เดิมที่เปลี่ยน Prisma/PostgreSQL เป็น DynamoDB (`serverless/src/`) |
| AWS Lambda | `gamenight-deals` | ตรวจ Wishlist กับราคา ส่งแจ้งเตือนเกมลดราคา (`serverless/src/deals.ts`) |
| Amazon EventBridge | `gamenight-hourly` · `rate(1 hour)` | สั่ง `gamenight-deals` ทุกชั่วโมง |
| Amazon DynamoDB | `gamenight-games / lookups / users / sessions / collections / counters` | ข้อมูลทั้งหมด (on-demand, sessions มี TTL) |
| Amazon SNS | `gamenight-deals` | ส่งอีเมล ใช้ filter policy `{ email: [<อีเมลผู้ใช้>] }` ให้แต่ละคนได้เฉพาะของตัวเอง |
| Amazon S3 | `gamenight-config-31df7073` (private) | `config.json` (เกณฑ์ส่วนลดขั้นต่ำ), `logs/` ผลการตรวจแต่ละรอบ, `deploy/web.zip` สำเนาหน้าเว็บที่ deploy |

ทุก Lambda ใช้ IAM role `LabRole` ของ Learner Lab และเขียน log ลง CloudWatch Logs

## เส้นทางการทำงาน
- **A อัตโนมัติ**: EventBridge ทุก 1 ชม. → `gamenight-deals` อ่าน `config.json` จาก S3 → อ่าน Wishlist + ราคาใน DynamoDB → เกมที่ลด ≥ `minDiscountPercent` และยังไม่เคยแจ้งที่ส่วนลดนี้ → publish SNS (ทีละผู้ใช้) → อีเมล → เขียน log ลง S3 `logs/`
- **B ผู้ใช้**: เบราว์เซอร์ → Amplify (หน้าเว็บ) → API Gateway → `gamenight-api` → DynamoDB
  ในหน้า Collection แท็บ Wishlist มีปุ่ม "เปิดแจ้งเตือนลดราคา" → `POST /api/alerts` → SNS subscribe อีเมลผู้ใช้ (ต้องกดยืนยันในอีเมลก่อน)

## บัญชีตัวอย่าง (จาก seed)
`demo@gamenight.test` และ `mai@gamenight.test` รหัสผ่านอยู่ใน `serverless/scripts/seed-data.ts`
(อีเมลตัวอย่างรับเมลจริงไม่ได้ ถ้าจะทดสอบแจ้งเตือนให้สมัครด้วยอีเมลจริงของตัวเอง)

## ทดสอบการแจ้งเตือน
1. สมัครด้วยอีเมลจริง → ใส่เกมใน Wishlist → กด "เปิดแจ้งเตือนลดราคา" → ยืนยันในอีเมลจาก AWS
2. หน้า Admin แก้ราคาเกมนั้นให้ลด ≥ 10% (หรือ `PUT /api/prices/<gameId>`)
3. รอรอบถัดไป หรือสั่งรันทันที:
   ```bash
   python -m awscli lambda invoke --function-name gamenight-deals out.json
   ```

## อัปเดตโค้ด
```bash
cd serverless && npm run build
python -m awscli lambda update-function-code --function-name gamenight-api --zip-file fileb://dist/api.zip
python -m awscli lambda update-function-code --function-name gamenight-deals --zip-file fileb://dist/deals.zip
```
หน้าเว็บ:
```bash
cd repo/frontend && VITE_API_URL=https://qll966s60h.execute-api.us-east-1.amazonaws.com/api npm run build
python serverless/scripts/deploy-web.py repo/frontend/dist d2yvjayx2tsoci gamenight-config-31df7073
```
ใส่ข้อมูลตัวอย่างใหม่: `cd serverless && AWS_REGION=us-east-1 npx tsx scripts/seed.ts --force`

ID ทั้งหมดอยู่ใน `serverless.env` · ระบบเดิม (EC2 + ALB + RDS) ลบแล้ว ไฟล์เก่าเก็บไว้ใน `old-ec2/`

## ลบเมื่อใช้เสร็จ
```bash
. ./aws.sh && . ./serverless.env
aws events remove-targets --rule gamenight-hourly --ids deals && aws events delete-rule --name gamenight-hourly
aws lambda delete-function --function-name gamenight-api
aws lambda delete-function --function-name gamenight-deals
aws apigatewayv2 delete-api --api-id $API_ID
aws amplify delete-app --app-id $AMPLIFY_APP
aws sns delete-topic --topic-arn $TOPIC_ARN
for t in games lookups users sessions collections counters; do aws dynamodb delete-table --table-name gamenight-$t; done
aws s3 rb s3://$CONFIG_BUCKET --force
```
ระบบนี้ไม่มีค่าใช้จ่ายรายชั่วโมงแบบ ALB/EC2/RDS จ่ายตามการใช้งานจริง (ส่วนใหญ่อยู่ใน free tier)
