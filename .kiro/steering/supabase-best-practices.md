# Supabase Best Practices & Technology Guidelines

## 🎯 หลักการสำคัญ

เมื่อพัฒนาฟีเจอร์ใหม่ที่เกี่ยวข้องกับ Supabase ต้องปฏิบัติตามแนวทางนี้เสมอ เพื่อให้ระบบมี scalability, performance และ cost-effectiveness ที่ดีที่สุด

---

## 🔄 Realtime: ใช้ Broadcast แทน Postgres Changes

### ❌ ห้ามใช้ (Deprecated)
```javascript
// ❌ ห้ามใช้ Postgres Changes สำหรับฟีเจอร์ใหม่
const channel = supabase
  .channel('changes')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public',
    table: 'notifications' 
  }, (payload) => {
    console.log(payload)
  })
  .subscribe()
```

### ✅ ใช้แทน (Recommended)
```javascript
// ✅ ใช้ Broadcast from Database
const userId = authStore.user.id
await supabase.realtime.setAuth() // สำคัญ! สำหรับ Authorization
const channel = supabase
  .channel(`notifications:${userId}`, {
    config: { private: true } // ใช้ private channel เสมอ
  })
  .on('broadcast', { event: 'INSERT' }, (payload) => {
    console.log(payload)
  })
  .on('broadcast', { event: 'UPDATE' }, (payload) => {
    console.log(payload)
  })
  .on('broadcast', { event: 'DELETE' }, (payload) => {
    console.log(payload)
  })
  .subscribe()
```

### Database Trigger Setup
```sql
-- สร้าง trigger function
CREATE OR REPLACE FUNCTION broadcast_table_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'notifications:' || COALESCE(NEW.user_id, OLD.user_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN NULL;
END;
$$;

-- สร้าง trigger
CREATE TRIGGER broadcast_notifications
AFTER INSERT OR UPDATE OR DELETE
ON notifications
FOR EACH ROW
EXECUTE FUNCTION broadcast_table_changes();
```

### RLS Policy สำหรับ Broadcast

**⚠️ สำคัญมาก: ห้ามใช้ subquery ไปยังตารางที่มี RLS policies ซับซ้อน**

ปัญหา: ถ้า policy บน `realtime.messages` ใช้ subquery ไปยัง `user_profiles` ซึ่งมี RLS policies ที่ซับซ้อน จะเกิด **infinite recursion**

```sql
-- ❌ ห้ามทำ - จะเกิด infinite recursion
CREATE POLICY "Bad policy" ON realtime.messages
FOR SELECT USING (
  realtime.topic() = 'channel:' || (
    SELECT club_id FROM user_profiles WHERE id = auth.uid()  -- ❌ subquery ไปยังตารางที่มี RLS
  )::text
);

-- ✅ ถูกต้อง - ใช้ SECURITY DEFINER function แทน
-- 1. สร้าง function ที่ bypass RLS
CREATE OR REPLACE FUNCTION get_my_club_id_for_realtime()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM user_profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION get_my_club_id_for_realtime() TO authenticated;

-- 2. ใช้ function ใน policy
CREATE POLICY "Users can receive club broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'channel:' || COALESCE(get_my_club_id_for_realtime()::text, '')
);
```

### ตัวอย่าง RLS Policies สำหรับ Realtime (ที่ใช้ในโปรเจคนี้)

```sql
-- Policy สำหรับ announcements - รองรับทั้ง global และ club-specific
CREATE POLICY "Users can receive announcement broadcasts for their club"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'announcements:global'
  OR realtime.topic() = 'announcements:' || COALESCE(get_my_club_id_for_realtime()::text, '')
);

-- Policy สำหรับ schedules - รองรับ club-specific
CREATE POLICY "Users can receive schedule broadcasts for their club"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'schedules:' || COALESCE(get_my_club_id_for_realtime()::text, '')
);

-- Policy สำหรับ notifications - user-specific (ไม่ต้องใช้ function เพราะใช้ auth.uid() โดยตรง)
CREATE POLICY "Users can receive their own notification broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
);
```

### Checklist เมื่อสร้าง Realtime Policy ใหม่

- [ ] ไม่ใช้ subquery ไปยังตารางที่มี RLS policies
- [ ] ใช้ `auth.uid()` โดยตรงถ้าเป็นไปได้
- [ ] ถ้าต้องดึงข้อมูลจากตารางอื่น ให้สร้าง SECURITY DEFINER function
- [ ] ทดสอบด้วย demo accounts ทั้ง 3 roles
- [ ] ตรวจสอบ realtime logs ว่าไม่มี RlsPolicyError

### เหตุผลที่ต้องใช้ Broadcast
- ✅ Scalable กว่ามาก (ไม่มี database bottleneck)
- ✅ ใช้ Realtime Authorization (RLS)
- ✅ ไม่ block database operations
- ✅ รองรับ high concurrent users
- ✅ ลด load บน database

---

## 🖼️ Storage: Image Transformations & Smart CDN

### ❌ ห้ามทำ
```javascript
// ❌ ห้าม store หลายขนาดของรูปเดียวกัน
await supabase.storage.from('albums').upload('photo-thumb.jpg', thumbnail)
await supabase.storage.from('albums').upload('photo-medium.jpg', medium)
await supabase.storage.from('albums').upload('photo-large.jpg', large)
```

### ✅ ใช้แทน
```javascript
// ✅ Upload เฉพาะ original, ใช้ transformation ตอน serve
await supabase.storage
  .from('albums')
  .upload('photo.jpg', file, {
    cacheControl: '86400', // 24 ชั่วโมง - สำคัญ!
    upsert: false
  })

// ดึงรูปขนาดต่างๆ ด้วย transformation
const { data: thumbnail } = supabase.storage
  .from('albums')
  .getPublicUrl('photo.jpg', {
    transform: {
      width: 300,
      height: 300,
      resize: 'cover'
    }
  })

const { data: medium } = supabase.storage
  .from('albums')
  .getPublicUrl('photo.jpg', {
    transform: {
      width: 800,
      height: 800,
      resize: 'contain'
    }
  })
```

### Cache-Control Guidelines
```javascript
// ตั้ง cache-control ตามประเภทไฟล์
const cacheSettings = {
  images: '86400',      // 24 ชั่วโมง
  videos: '604800',     // 7 วัน
  documents: '3600',    // 1 ชั่วโมง
  avatars: '43200'      // 12 ชั่วโมง
}
```

### Storage Query Optimization
```sql
-- สร้าง custom function สำหรับ list objects (เร็วกว่า default)
CREATE OR REPLACE FUNCTION list_objects(
    bucketid text,
    prefix text,
    limits int DEFAULT 100,
    offsets int DEFAULT 0
) RETURNS TABLE (
    name text,
    id uuid,
    updated_at timestamptz,
    created_at timestamptz,
    last_accessed_at timestamptz,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY SELECT
        objects.name,
        objects.id,
        objects.updated_at,
        objects.created_at,
        objects.last_accessed_at,
        objects.metadata
    FROM storage.objects
    WHERE objects.name LIKE prefix || '%'
    AND bucket_id = bucketid
    ORDER BY name ASC
    LIMIT limits
    OFFSET offsets;
END;
$$ LANGUAGE plpgsql STABLE;
```

```javascript
// ใช้ custom function แทน .list()
const { data, error } = await supabase.rpc('list_objects', {
  bucketid: 'albums',
  prefix: `${userId}/`,
  limits: 50,
  offsets: 0
})
```

---

## ⚡ Edge Functions: เมื่อไหร่ควรใช้

### ✅ ใช้ Edge Functions สำหรับ

1. **Complex Calculations**
   - Tournament bracket generation
   - Statistics calculations
   - Scoring algorithms

2. **External API Integrations**
   - Payment processing
   - Email sending
   - Third-party webhooks

3. **Image/Video Processing**
   - Watermark generation
   - Format conversion
   - Compression

4. **Background Jobs**
   - Batch operations
   - Data migrations
   - Scheduled tasks

### ❌ ไม่ควรใช้ Edge Functions สำหรับ

- Simple CRUD operations (ใช้ PostgREST)
- Real-time updates (ใช้ Realtime Broadcast)
- File uploads (ใช้ Storage API โดยตรง)
- Authentication (ใช้ Auth API)

### Edge Function Template
```typescript
// supabase/functions/function-name/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // 1. Validate request
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // 2. Parse body
    const { data } = await req.json()

    // 3. Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 5. Your logic here
    const result = await processData(data)

    // 6. Return response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
```

---

## 🔔 Database Webhooks: External Integrations

### เมื่อไหร่ควรใช้
- ส่ง notifications ไป external services
- Sync ข้อมูลกับ third-party systems
- Trigger external workflows

### Setup Webhook
```sql
-- ตัวอย่าง: ส่ง webhook เมื่อมี tournament ใหม่
CREATE TRIGGER notify_new_tournament
AFTER INSERT ON tournaments
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://your-api.com/webhook/tournament',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '5000' -- timeout 5 วินาที
);
```

### ข้อควรระวัง
- ⚠️ Webhook ทำงานแบบ async (ไม่ block database)
- ⚠️ ต้องมี retry logic ที่ external service
- ⚠️ ตรวจสอบ logs ที่ `net` schema

---

## 🛡️ Security: Event Triggers

### Auto-enable RLS บนตารางใหม่
```sql
-- สร้าง function
CREATE OR REPLACE FUNCTION auto_enable_rls()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL 
       AND cmd.schema_name IN ('public') 
       AND cmd.schema_name NOT IN ('pg_catalog','information_schema') 
       AND cmd.schema_name NOT LIKE 'pg_toast%' 
       AND cmd.schema_name NOT LIKE 'pg_temp%' 
    THEN
      BEGIN
        EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY', 
                      cmd.object_identity);
        RAISE LOG 'auto_enable_rls: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'auto_enable_rls: failed to enable RLS on %', cmd.object_identity;
      END;
    END IF;
  END LOOP;
END;
$$;

-- สร้าง event trigger
DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION auto_enable_rls();
```

---

## 📊 Monitoring & Performance

### ต้องตรวจสอบเสมอ
1. **Realtime Connections**
   - จำนวน concurrent connections
   - Message throughput
   - Latency

2. **Storage Metrics**
   - Cache hit rate
   - Egress usage
   - Transformation requests

3. **Edge Function Metrics**
   - Execution time
   - Memory usage
   - Error rate

### Logging Best Practices
```typescript
// ใน Edge Functions
console.log('Function started', { 
  executionId: Deno.env.get('EXECUTION_ID'),
  timestamp: new Date().toISOString()
})

// Log errors พร้อม context
console.error('Error processing request', {
  error: error.message,
  stack: error.stack,
  userId: user.id,
  data: JSON.stringify(data)
})
```

---

## 🚀 Migration Strategy

### เมื่อ migrate จาก Postgres Changes → Broadcast

1. **Phase 1: Dual Support**
   - รองรับทั้ง Postgres Changes และ Broadcast
   - Client ใหม่ใช้ Broadcast
   - Client เก่ายังใช้ Postgres Changes ได้

2. **Phase 2: Gradual Migration**
   - แจ้ง users ให้ update app
   - Monitor metrics ทั้งสองระบบ
   - ค่อยๆ ปิด Postgres Changes

3. **Phase 3: Complete Migration**
   - ปิด Postgres Changes สมบูรณ์
   - ลบ code ที่ไม่ใช้แล้ว
   - Update documentation

---

## ✅ Checklist สำหรับฟีเจอร์ใหม่

เมื่อพัฒนาฟีเจอร์ใหม่ที่เกี่ยวข้องกับ Supabase ต้องตรวจสอบ:

### Supabase Technology
- [ ] ใช้ Realtime Broadcast แทน Postgres Changes
- [ ] ตั้ง cache-control สูงสำหรับ Storage
- [ ] ใช้ Image Transformations แทนการ store หลายขนาด
- [ ] พิจารณาใช้ Edge Functions สำหรับ complex logic

### Security (ตาม development-workflow.md)
- [ ] มี RLS policies ครบถ้วนทุก Role (Admin/Coach/Athlete)
- [ ] มี Realtime Authorization policies
- [ ] ไม่มี policy ที่ใช้ `USING (true)` หรือ `auth.jwt() ->> 'role'`
- [ ] รัน `get_advisors` หลังสร้าง/แก้ไข table
- [ ] ทดสอบด้วย 3 demo accounts (admin@test.com, coach@test.com, athlete@test.com)

### Development Best Practices
- [ ] ตรวจสอบว่าไม่กระทบฟีเจอร์เดิม (Feature Conflict Prevention)
- [ ] แก้ไขเฉพาะส่วนที่เกี่ยวข้อง (Focused Development)
- [ ] Log events สำคัญ
- [ ] Test performance และ scalability
- [ ] Document API endpoints และ functions
- [ ] Setup monitoring และ alerts

---

## 📚 Resources

- [Realtime Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast)
- [Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Event Triggers](https://supabase.com/docs/guides/database/postgres/event-triggers)
