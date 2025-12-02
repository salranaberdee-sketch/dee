# Supabase Migrations & Edge Functions

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `augislapwqypxsnnwbot`
3. Navigate to SQL Editor
4. Copy and paste the migration SQL
5. Run the query

### Option 2: Supabase CLI
```bash
supabase db push
```

### Option 3: MCP Tools (via Kiro)
Use the `apply_migration` MCP tool with the migration SQL.

## Migrations

| File | Description | Status |
|------|-------------|--------|
| `20241202_create_notification_history.sql` | Create notification_history table for Notification Inbox | Applied |

## Edge Functions

### send-push

Location: `functions/send-push/index.ts`

Sends push notifications and stores them in notification_history table.

**Features:**
- Sends web push notifications to target users
- Stores notification in notification_history for inbox display
- Supports targeting: all users, specific club, coaches, athletes, or single user
- Automatic retry for transient errors when storing notifications
- Cleans up expired push subscriptions

**Required Environment Variables:**
- `VAPID_PUBLIC_KEY` - VAPID public key for web push
- `VAPID_PRIVATE_KEY` - VAPID private key for web push
- `VAPID_SUBJECT` - VAPID subject (mailto: URL)
- `SUPABASE_URL` - Supabase project URL (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-set)

**Deploy:**
```bash
supabase functions deploy send-push
```

**Request Body:**
```json
{
  "title": "Notification Title",
  "message": "Notification message body",
  "type": "announcement_urgent",
  "referenceType": "announcement",
  "referenceId": "uuid",
  "url": "/announcements",
  "targetType": "all",
  "clubId": "uuid",
  "userId": "uuid"
}
```

## Project Info
- **Project ID:** augislapwqypxsnnwbot
- **Region:** ap-south-1
- **URL:** https://augislapwqypxsnnwbot.supabase.co
