PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TEXT NOT NULL,
  "awsAccessKeyId" TEXT,
  "awsSecretAccessKey" TEXT,
  "awsRegion" TEXT NOT NULL DEFAULT 'us-east-1',
  "fromEmail" TEXT,
  "fromName" TEXT
);

CREATE TABLE IF NOT EXISTS "Contact" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'subscribed',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  UNIQUE("email", "userId")
);
CREATE INDEX IF NOT EXISTS "contact_user_idx" ON "Contact" ("userId");
CREATE INDEX IF NOT EXISTS "contact_status_idx" ON "Contact" ("status");

CREATE TABLE IF NOT EXISTS "Tag" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  UNIQUE("name", "userId")
);

CREATE TABLE IF NOT EXISTS "ContactTag" (
  "contactId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  PRIMARY KEY ("contactId", "tagId")
);

CREATE TABLE IF NOT EXISTS "Group" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  UNIQUE("name", "userId")
);

CREATE TABLE IF NOT EXISTS "GroupMember" (
  "groupId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  PRIMARY KEY ("groupId", "contactId")
);

CREATE TABLE IF NOT EXISTS "Template" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "userId" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "fromName" TEXT NOT NULL,
  "replyTo" TEXT,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT,
  "previewText" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduledAt" TEXT,
  "sentAt" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "groupId" TEXT,
  "templateId" TEXT
);
CREATE INDEX IF NOT EXISTS "campaign_user_idx" ON "Campaign" ("userId");
CREATE INDEX IF NOT EXISTS "campaign_status_idx" ON "Campaign" ("status");

CREATE TABLE IF NOT EXISTS "CampaignRecipient" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "campaignId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "messageId" TEXT,
  "sentAt" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  UNIQUE("campaignId", "contactId")
);
CREATE INDEX IF NOT EXISTS "campaign_recipient_campaign_idx" ON "CampaignRecipient" ("campaignId");

CREATE TABLE IF NOT EXISTS "EmailEvent" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "type" TEXT NOT NULL,
  "contactId" TEXT,
  "campaignId" TEXT,
  "messageId" TEXT,
  "metadata" TEXT,
  "createdAt" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "email_event_campaign_idx" ON "EmailEvent" ("campaignId");
CREATE INDEX IF NOT EXISTS "email_event_contact_idx" ON "EmailEvent" ("contactId");
CREATE INDEX IF NOT EXISTS "email_event_type_idx" ON "EmailEvent" ("type");

CREATE TABLE IF NOT EXISTS "ApiKey" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL UNIQUE,
  "keyPrefix" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "lastUsed" TEXT,
  "expiresAt" TEXT
);

CREATE TABLE IF NOT EXISTS "UnsubscribeToken" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);
