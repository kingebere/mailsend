// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: hash,
      name: 'Demo User',
      fromEmail: 'hello@yourdomain.com',
      fromName: 'Your Brand',
    },
  })

  // Create groups
  const allGroup = await prisma.group.upsert({
    where: { name_userId: { name: 'All Subscribers', userId: user.id } },
    update: {},
    create: { name: 'All Subscribers', description: 'Everyone on your list', userId: user.id },
  })
  const vipGroup = await prisma.group.upsert({
    where: { name_userId: { name: 'VIP Customers', userId: user.id } },
    update: {},
    create: { name: 'VIP Customers', description: 'High-value customers', userId: user.id },
  })

  // Sample contacts
  const contacts = [
    { email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith' },
    { email: 'mike@gmail.com', firstName: 'Mike', lastName: 'Kim' },
    { email: 'amy@work.com', firstName: 'Amy', lastName: 'Lee' },
    { email: 'bob@old.net', firstName: 'Bob', lastName: 'Jones', status: 'bounced' },
  ]

  for (const c of contacts) {
    await prisma.contact.upsert({
      where: { email_userId: { email: c.email, userId: user.id } },
      update: {},
      create: { ...c, userId: user.id },
    })
  }

  // Sample template
  await prisma.template.upsert({
    where: { id: 'tpl_welcome' },
    update: {},
    create: {
      id: 'tpl_welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{company_name}}!',
      htmlBody: `<h1>Hi {{first_name}},</h1><p>Welcome aboard! We're thrilled to have you.</p><p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>`,
      userId: user.id,
    },
  })

  console.log('✅ Seed complete. Login: demo@example.com / password123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
