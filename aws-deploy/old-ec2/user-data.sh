#!/bin/bash
# User data สำหรับ Launch Template "gamenight-template"
# Learner Lab ไม่อนุญาต CloudFront จึงให้ ALB เป็นประตูหน้า:
#   ALB :80 -> EC2 :3000 (nginx) -> หน้าเว็บ dist  และ  /api/* -> Node :3001
# ก่อนใช้: เปลี่ยน __DB_PASSWORD__ และ __DB_ENDPOINT__ เป็นค่าจริงจาก RDS
set -euxo pipefail
export HOME=/root

# swap 1 GB กัน t3.micro แรมไม่พอตอน npm ci / vite build
dd if=/dev/zero of=/swapfile bs=1M count=1024 && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile

curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - && dnf install -y nodejs git nginx
git clone --depth 1 https://github.com/jordijack/CS446_Project_GameNight.git /opt/repo

# ---------- backend ----------
cd /opt/repo/backend
cat > .env <<'EOF'
DATABASE_URL="postgresql://postgres:__DB_PASSWORD__@__DB_ENDPOINT__:5432/gamenight?sslmode=no-verify"
DB_POOL_MAX=10
API_PORT=3001
EOF
npm ci && npx prisma migrate deploy && npm run db:seed-if-empty

cat > /etc/systemd/system/gamenight.service <<'EOF'
[Unit]
Description=Game Night API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/repo/backend
Environment=HOME=/root
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now gamenight

# ---------- frontend (เว้น VITE_API_URL ว่าง = เรียก /api โดเมนเดียวกัน) ----------
cd /opt/repo/frontend
npm ci && VITE_API_URL= npm run build
mkdir -p /usr/share/nginx/gamenight && cp -r dist/. /usr/share/nginx/gamenight/

cat > /etc/nginx/conf.d/gamenight.conf <<'EOF'
server {
    listen 3000;
    root /usr/share/nginx/gamenight;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA: รีเฟรช /game/1008 แล้วยังได้ index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
systemctl enable --now nginx
