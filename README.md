# MailSend — Self-hosted Email Marketing with AWS SES

A full-featured email marketing dashboard built with Next.js 14, Prisma, and AWS SES.
**You own everything. No monthly fees. Pay only AWS SES costs ($0.10/1,000 emails).**

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="run: openssl rand -base64 32"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### 3. Set up database
```bash
npx prisma migrate dev --name init
npx prisma generate
node prisma/seed.js   # optional demo data
```

### 4. Run
```bash
npm run dev   # http://localhost:3000
```

Demo login: `demo@example.com` / `password123`

---

## ☁️ AWS SES Setup (do this once)

### Step 1: Create IAM user
1. Go to AWS Console → IAM → Users → Create user
2. Attach this inline policy (minimum permissions):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ses:SendEmail", "ses:SendRawEmail", "ses:GetSendQuota", "ses:GetSendStatistics"],
    "Resource": "*"
  }]
}
```
3. Create access key → copy into Settings → AWS SES in the dashboard

### Step 2: Verify your domain in SES
1. AWS Console → SES → Verified identities → Create identity
2. Choose "Domain" and enter yours
3. Add the DNS records AWS gives you (DKIM + MAIL FROM)
4. Wait ~10 mins for verification

### Step 3: Request production access
New AWS accounts start in "sandbox" mode (can only send to verified addresses).
1. AWS Console → SES → Account dashboard → Request production access
2. Fill in the form — explain your use case, list size, opt-in process
3. Usually approved within 24 hours

### Step 4: Set up bounce/complaint webhook (important for deliverability)
1. AWS Console → SNS → Create topic (Standard type)
2. Create an HTTPS subscription with URL: `https://yourdomain.com/api/ses-webhook`
3. AWS will send a confirmation request — the app auto-confirms it
4. In SES → Verified identities → your domain → Notifications tab
   → Set Bounces and Complaints to your new SNS topic

---

## 📧 DNS Records (critical for deliverability)

Add these to your domain's DNS:

| Type | Name | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` |
| TXT | `@` | `v=spf1 include:amazonses.com ~all` |
| CNAME | (provided by SES) | (provided by SES) — DKIM records × 3 |

---

## 🏗️ Production Deployment

### Deploy to Vercel (easiest)
```bash
npm install -g vercel
vercel
```
Set environment variables in Vercel dashboard.

**Important:** Switch `DATABASE_URL` from SQLite to PostgreSQL for production:
```
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
```
And update prisma/schema.prisma: `provider = "postgresql"`

### Deploy to a VPS (Ubuntu)
```bash
npm run build
npm start   # or use PM2: pm2 start npm -- start
```
Put Nginx in front with SSL (Let's Encrypt).

---

## 📁 Project Structure

```
app/
├── (dashboard)/          # Protected dashboard pages
│   ├── dashboard/        # Overview + stats
│   ├── campaigns/        # Campaign list + composer
│   ├── contacts/         # Contact management + CSV import
│   ├── groups/           # Audience segments
│   ├── analytics/        # Charts + performance
│   ├── templates/        # Reusable email templates
│   └── settings/         # SES config + API keys
├── api/
│   ├── auth/             # Login, register, logout, me
│   ├── campaigns/        # CRUD + send
│   ├── contacts/         # CRUD + CSV import
│   ├── groups/           # CRUD + members
│   ├── templates/        # CRUD
│   ├── analytics/        # Stats aggregation
│   ├── ses/              # Credential validation
│   ├── ses-webhook/      # SNS bounce/complaint handler
│   ├── send/             # Transactional email API
│   └── api-keys/         # Developer API key management
├── login/ register/      # Auth pages
└── unsubscribe/          # Public unsubscribe page
lib/
├── ses.ts                # AWS SES client + helpers
├── campaign-sender.ts    # Bulk send with rate limiting
├── auth.ts               # JWT helpers
├── prisma.ts             # Database client
└── api-helpers.ts        # Route auth wrappers
prisma/
└── schema.prisma         # Full database schema
```

---

## 🔌 Developer API

Send transactional emails from your app:

```js
// POST /api/send
fetch('https://yourapp.com/api/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_live_your_key'
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Order confirmed!',
    html: '<p>Hi {{first_name}}, your order is confirmed.</p>',
    data: { first_name: 'Jane' }
  })
})
```

---

## ⚠️ Deliverability Checklist

- [ ] SPF record set (include:amazonses.com)
- [ ] DKIM enabled in SES (adds 3 CNAME records)
- [ ] DMARC record added
- [ ] Custom MAIL FROM domain configured
- [ ] SNS bounce/complaint webhook set up
- [ ] Every email includes {{unsubscribe_link}}
- [ ] Bounce rate below 2%
- [ ] Complaint rate below 0.1%
- [ ] Warm up sending volume gradually
# mailsend
# mailsend
# mailsend
