-- เพิ่ม columns ใหม่สำหรับ Notification Settings Enhancement
-- Requirements: 1.2, 2.3, 4.3, 5.1

-- เพิ่ม Quiet Hours settings
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '07:00';

-- เพิ่ม Sound settings
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notification_sound TEXT DEFAULT 'default';

-- เพิ่ม Vibration settings
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS vibration_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS vibration_pattern TEXT DEFAULT 'short';

-- เพิ่ม CHECK constraints สำหรับค่าที่ถูกต้อง
ALTER TABLE notification_preferences
ADD CONSTRAINT valid_notification_sound 
CHECK (notification_sound IN ('default', 'chime', 'bell', 'soft', 'none'));

ALTER TABLE notification_preferences
ADD CONSTRAINT valid_vibration_pattern 
CHECK (vibration_pattern IN ('short', 'medium', 'long', 'pulse'));

-- เพิ่ม comment อธิบายตาราง
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'เปิด/ปิดโหมดไม่รบกวน';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'เวลาเริ่มต้นโหมดไม่รบกวน (HH:MM)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'เวลาสิ้นสุดโหมดไม่รบกวน (HH:MM)';
COMMENT ON COLUMN notification_preferences.notification_sound IS 'เสียงแจ้งเตือน: default, chime, bell, soft, none';
COMMENT ON COLUMN notification_preferences.vibration_enabled IS 'เปิด/ปิดการสั่น';
COMMENT ON COLUMN notification_preferences.vibration_pattern IS 'รูปแบบการสั่น: short, medium, long, pulse';
