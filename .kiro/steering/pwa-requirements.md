# ข้อกำหนด PWA (Progressive Web App)

## ⚠️ สถานะการบังคับติดตั้ง

```
DISABLE_INSTALL_PROMPT = true  (ปิดอยู่ - สำหรับทดสอบ)
```

เมื่อต้องการเปิดใช้งาน:
1. แก้ไขไฟล์ `sports-club-management/src/components/InstallPrompt.vue`
2. เปลี่ยน `DISABLE_INSTALL_PROMPT = false`
3. Commit และ Deploy

---

## กฎสำคัญ

**ทุกฟีเจอร์ที่พัฒนาต้องรองรับ PWA:**

1. ✅ ต้องทำงานแบบ **Offline-First** เมื่อเป็นไปได้
2. ✅ ต้องใช้ **Service Worker** สำหรับ caching
3. ✅ ต้องรองรับ **Background Sync** สำหรับข้อมูลที่ต้อง sync
4. ✅ ต้องมี **Push Notifications** สำหรับการแจ้งเตือน
5. ✅ ต้อง **Installable** บนทุกอุปกรณ์

---

## Checklist การพัฒนาแบบ PWA

### 1. Offline Support
- [ ] Cache static assets (HTML, CSS, JS, images)
- [ ] Cache API responses ที่จำเป็น
- [ ] แสดง UI ที่เหมาะสมเมื่อ offline
- [ ] Queue actions เมื่อ offline และ sync เมื่อ online

### 2. Caching Strategy
```
┌─────────────────────────────────────────────────────────┐
│  Static Assets     → Cache First                        │
│  API Data          → Network First, fallback to cache   │
│  Images            → Cache First with expiration        │
│  User Data         → Network First + IndexedDB backup   │
└─────────────────────────────────────────────────────────┘
```

### 3. Service Worker
- [ ] Register service worker ใน main.js
- [ ] Handle install, activate, fetch events
- [ ] Implement cache versioning
- [ ] Clean up old caches

### 4. Manifest
- [ ] ตั้งค่า name, short_name, description
- [ ] กำหนด icons ทุกขนาด (192x192, 512x512)
- [ ] ตั้งค่า start_url, display, theme_color
- [ ] กำหนด background_color

### 5. Push Notifications
- [ ] ขอ permission จาก user
- [ ] Subscribe to push service
- [ ] Handle push events ใน service worker
- [ ] แสดง notification ที่เหมาะสม

---

## การจัดการข้อมูล Offline

### IndexedDB สำหรับ Local Storage
```javascript
// ใช้ IndexedDB เก็บข้อมูลที่ต้องใช้ offline
- athletes (รายชื่อนักกีฬา)
- schedules (ตารางนัดหมาย)
- training_logs (บันทึกการฝึกซ้อม)
- announcements (ประกาศ)
```

### Sync Strategy
```
┌─────────────────────────────────────────────────────────┐
│  1. User ทำ action (เช่น บันทึกข้อมูล)                   │
│  2. บันทึกลง IndexedDB ก่อน                             │
│  3. ถ้า online → sync ไป Supabase ทันที                 │
│  4. ถ้า offline → queue ไว้ใน sync queue                │
│  5. เมื่อ online → Background Sync ทำงาน               │
│  6. Sync สำเร็จ → อัพเดท IndexedDB                      │
└─────────────────────────────────────────────────────────┘
```

---

## UI/UX สำหรับ PWA

### Online/Offline Indicator
- [ ] แสดงสถานะ connection ใน NavBar
- [ ] แจ้งเตือนเมื่อ offline
- [ ] แจ้งเตือนเมื่อกลับมา online

### Loading States
- [ ] Skeleton loading สำหรับ cached content
- [ ] Progress indicator สำหรับ sync

### Install Prompt
- [ ] แสดง custom install prompt
- [ ] เก็บ beforeinstallprompt event
- [ ] แสดงปุ่ม "ติดตั้งแอป" ที่เหมาะสม

---

## Performance Requirements

### Lighthouse Scores (เป้าหมาย)
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: ผ่านทุกข้อ

### Core Web Vitals
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

---

## ตัวอย่างการเพิ่มฟีเจอร์แบบ PWA

```markdown
## ฟีเจอร์: บันทึกการฝึกซ้อม

### PWA Checklist
- [x] Offline: บันทึกลง IndexedDB ก่อน
- [x] Sync: Queue ไว้ถ้า offline, sync เมื่อ online
- [x] Cache: Cache รายการฝึกซ้อมล่าสุด
- [x] UI: แสดง sync status (synced/pending)
- [x] Notification: แจ้งเตือนเมื่อ sync สำเร็จ
```


---

## ✅ Feature PWA Checklists (สถานะปัจจุบัน)

### ฟีเจอร์: Push Notifications
```
- [x] Service Worker: Handle push events
- [x] Permission: ขอ permission จาก user
- [x] Subscribe: ลงทะเบียน push subscription
- [x] Notification Display: แสดง notification พร้อม icon
- [x] Click Navigation: นำทางไปหน้าที่เกี่ยวข้อง
- [x] Preferences: ตั้งค่าประเภทการแจ้งเตือน
- [x] Multi-device: รองรับหลายอุปกรณ์
- [x] Cleanup: ลบ subscription เมื่อ logout
```

### ฟีเจอร์: Notification Inbox
```
- [x] Realtime: อัพเดทแบบ realtime ผ่าน Supabase
- [x] Badge: แสดงจำนวน unread ใน NavBar
- [x] Pagination: โหลดเพิ่มเมื่อ scroll
- [x] Filter: กรองตามประเภท notification
- [x] Read Status: mark as read/unread
- [x] Bulk Actions: mark all, clear all
- [x] Navigation: คลิกไปหน้าที่เกี่ยวข้อง
- [x] Offline: Cache notifications ใน IndexedDB ✅
```

### ฟีเจอร์: Profile Album
```
- [x] Upload: อัพโหลดรูป/วิดีโอไป Storage
- [x] Validation: ตรวจสอบ file type และ size
- [x] Quota: จำกัด storage ต่อ user
- [x] Thumbnail: แสดง thumbnail ใน grid
- [x] Preview: ดูรูปขนาดเต็ม
- [ ] Offline: Cache รูปที่เปิดล่าสุด (TODO)
- [ ] Upload Queue: Queue upload เมื่อ offline (TODO)
```

### ฟีเจอร์: Training Logs Enhancement
```
- [x] Categories: เลือกประเภทกิจกรรม
- [x] Statistics: แสดงสถิติการฝึกซ้อม
- [x] Goals: ตั้งเป้าหมายรายสัปดาห์
- [ ] Streak: นับวันฝึกซ้อมต่อเนื่อง (In Progress)
- [ ] Achievements: ระบบ badges (In Progress)
- [x] Offline: บันทึกลง IndexedDB ก่อน ✅
- [x] Sync: Queue ไว้ถ้า offline ✅
```

---

## 📋 PWA TODO Summary

### High Priority
- [x] IndexedDB caching สำหรับ notifications ✅
- [x] Offline queue สำหรับ training logs ✅
- [x] Background sync implementation ✅

### Medium Priority
- [ ] Cache profile album images
- [ ] Offline upload queue
- [x] Online/Offline indicator ใน NavBar ✅

### Low Priority
- [ ] Skeleton loading states
- [ ] Sync progress indicator
