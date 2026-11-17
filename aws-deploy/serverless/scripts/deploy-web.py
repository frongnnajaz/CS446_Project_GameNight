"""deploy หน้าเว็บ (frontend/dist) ขึ้น AWS Amplify แบบ manual deploy แล้วเก็บสำเนา zip ไว้ใน S3 deploy/
ใช้: python scripts/deploy-web.py <dist-dir> <amplify-app-id> <config-bucket>
ต้องมี boto3 (pip install boto3) และ AWS credentials ของ Learner Lab
"""
import io, os, sys, time, urllib.request, zipfile
import boto3

dist, app_id, bucket = sys.argv[1:4]
amp = boto3.client('amplify', region_name='us-east-1')

buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, files in os.walk(dist):
        for f in files:
            p = os.path.join(d, f)
            z.write(p, os.path.relpath(p, dist).replace(os.sep, '/'))
data = buf.getvalue()

# ยกเลิก job ที่ค้างอยู่ (deploy ซ้อนกันไม่ได้)
for j in amp.list_jobs(appId=app_id, branchName='main', maxResults=5)['jobSummaries']:
    if j['status'] in ('PENDING', 'PROVISIONING', 'RUNNING'):
        amp.stop_job(appId=app_id, branchName='main', jobId=j['jobId'])
        print('stopped job', j['jobId'])

dep = amp.create_deployment(appId=app_id, branchName='main')
req = urllib.request.Request(dep['zipUploadUrl'], data=data, method='PUT', headers={'Content-Type': 'application/zip'})
print('upload', urllib.request.urlopen(req).status, f'{len(data) // 1024} KB')
amp.start_deployment(appId=app_id, branchName='main', jobId=dep['jobId'])
while True:
    s = amp.get_job(appId=app_id, branchName='main', jobId=dep['jobId'])['job']['summary']['status']
    if s in ('SUCCEED', 'FAILED', 'CANCELLED'):
        print('job', dep['jobId'], s)
        break
    time.sleep(4)

boto3.client('s3').put_object(Bucket=bucket, Key='deploy/web.zip', Body=data, ContentType='application/zip')
print(f's3://{bucket}/deploy/web.zip')
