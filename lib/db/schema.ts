import { sqliteTable, text, primaryKey, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  name: text('name'),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
  awsAccessKeyId: text('awsAccessKeyId'),
  awsSecretAccessKey: text('awsSecretAccessKey'),
  awsRegion: text('awsRegion').notNull().default('us-east-1'),
  fromEmail: text('fromEmail'),
  fromName: text('fromName'),
})

export const contacts = sqliteTable('Contact', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  firstName: text('firstName'),
  lastName: text('lastName'),
  status: text('status').notNull().default('subscribed'),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updatedAt').notNull().default('CURRENT_TIMESTAMP'),
  userId: text('userId').notNull(),
}, (table: any) => ({
  userIdx: index('contact_user_idx').on(table.userId),
  statusIdx: index('contact_status_idx').on(table.status),
}))

export const tags = sqliteTable('Tag', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('userId').notNull(),
})

export const contactTags = sqliteTable('ContactTag', {
  contactId: text('contactId').notNull(),
  tagId: text('tagId').notNull(),
}, (table: any) => ({
  pk: primaryKey({ columns: [table.contactId, table.tagId] }),
}))

export const groups = sqliteTable('Group', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
  userId: text('userId').notNull(),
})

export const groupMembers = sqliteTable('GroupMember', {
  groupId: text('groupId').notNull(),
  contactId: text('contactId').notNull(),
}, (table: any) => ({
  pk: primaryKey({ columns: [table.groupId, table.contactId] }),
}))

export const templates = sqliteTable('Template', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  htmlBody: text('htmlBody').notNull(),
  textBody: text('textBody'),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updatedAt').notNull().default('CURRENT_TIMESTAMP'),
  userId: text('userId').notNull(),
})

export const campaigns = sqliteTable('Campaign', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  fromEmail: text('fromEmail').notNull(),
  fromName: text('fromName').notNull(),
  replyTo: text('replyTo'),
  htmlBody: text('htmlBody').notNull(),
  textBody: text('textBody'),
  previewText: text('previewText'),
  status: text('status').notNull().default('draft'),
  scheduledAt: text('scheduledAt'),
  sentAt: text('sentAt'),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updatedAt').notNull().default('CURRENT_TIMESTAMP'),
  userId: text('userId').notNull(),
  groupId: text('groupId'),
  templateId: text('templateId'),
}, (table: any) => ({
  userIdx: index('campaign_user_idx').on(table.userId),
  statusIdx: index('campaign_status_idx').on(table.status),
}))

export const campaignRecipients = sqliteTable('CampaignRecipient', {
  id: text('id').primaryKey(),
  campaignId: text('campaignId').notNull(),
  contactId: text('contactId').notNull(),
  messageId: text('messageId'),
  sentAt: text('sentAt'),
  status: text('status').notNull().default('pending'),
}, (table: any) => ({
  campaignIdx: index('campaign_recipient_campaign_idx').on(table.campaignId),
}))

export const emailEvents = sqliteTable('EmailEvent', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  contactId: text('contactId'),
  campaignId: text('campaignId'),
  messageId: text('messageId'),
  metadata: text('metadata'),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
}, (table: any) => ({
  campaignIdx: index('email_event_campaign_idx').on(table.campaignId),
  contactIdx: index('email_event_contact_idx').on(table.contactId),
  typeIdx: index('email_event_type_idx').on(table.type),
}))

export const apiKeys = sqliteTable('ApiKey', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  keyHash: text('keyHash').notNull().unique(),
  keyPrefix: text('keyPrefix').notNull(),
  userId: text('userId').notNull(),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
  lastUsed: text('lastUsed'),
  expiresAt: text('expiresAt'),
})

export const unsubscribeTokens = sqliteTable('UnsubscribeToken', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  userId: text('userId').notNull(),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
})
