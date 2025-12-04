# Specs Overview

## สรุปความสัมพันธ์ของ Specs

### 🏆 กลุ่ม Scoring & Evaluation

| Spec | หน้าที่ | สถานะ |
|------|--------|-------|
| `flexible-scoring-system` | ระบบเกณฑ์คะแนนที่ยืดหยุ่น รองรับหลายประเภทกีฬา | ✅ Active |
| `athlete-evaluation` | ติดตามการเข้าร่วม, ฝึกซ้อม, แสดงผลงาน | ✅ Active |

**ความสัมพันธ์:**
- `flexible-scoring-system` = กำหนดเกณฑ์คะแนน (Sport Types, Templates, Categories, Metrics)
- `athlete-evaluation` = ใช้เกณฑ์คำนวณคะแนน + จัดการ Attendance/Training Logs

---

### 🔔 กลุ่ม Notifications

| Spec | หน้าที่ | สถานะ |
|------|--------|-------|
| `pwa-push-notifications` | ส่ง Push Notifications | ✅ Active |
| `notification-inbox` | ดูประวัติ, จัดการสถานะ | ✅ Active |
| `notification-settings-enhancement` | Quiet Hours, เสียง, Vibration | ✅ Active |

**ความสัมพันธ์:** ทั้ง 3 specs ทำงานร่วมกันเป็นระบบ Notification ที่สมบูรณ์

---

### 📸 กลุ่ม Albums & Profile

| Spec | หน้าที่ | สถานะ |
|------|--------|-------|
| `profile-album` | ผู้ใช้จัดการอัลบั้มตัวเอง | ✅ Active |
| `album-individual-view` | Coach/Admin ดูอัลบั้มของนักกีฬา | ✅ Active |
| `profile-picture` | เปลี่ยนรูปโปรไฟล์ | ✅ Active |

**ความสัมพันธ์:**
- `profile-album` = Data Model หลัก
- `album-individual-view` = มุมมองสำหรับ Coach/Admin
- `profile-picture` = ใช้ MediaPicker จาก album

---

### 🏅 กลุ่ม Tournament & Training

| Spec | หน้าที่ | สถานะ |
|------|--------|-------|
| `tournament-management-enhancement` | Bulk Add, Organized UI, Quick Actions | ✅ Active |
| `training-logs-enhancement` | Categories, Statistics, Goals, Streaks | ✅ Active |

---

## Stores ที่เกี่ยวข้อง

| Store | ใช้กับ Spec |
|-------|------------|
| `scoringConfig.js` | flexible-scoring-system |
| `scoringCriteria.js` | athlete-evaluation (legacy, fallback) |
| `evaluation.js` | athlete-evaluation + flexible-scoring-system |
| `notificationInbox.js` | notification-inbox |
| `notificationPreferences.js` | notification-settings-enhancement |
| `albumManagement.js` | album-individual-view |

---

## หมายเหตุ

- **Scoring System:** ระบบใช้ `scoringConfig` (Flexible) เป็นหลัก และ fallback ไปใช้ `scoringCriteria` ถ้าไม่มี config
- **Notifications:** ทั้ง 3 specs ใช้ตาราง `notification_history` และ `notification_preferences` ร่วมกัน
- **Albums:** ใช้ตาราง `user_albums` และ `user_album_media` ร่วมกัน
