# Notification Sounds

โฟลเดอร์นี้เก็บไฟล์เสียงแจ้งเตือนสำหรับ PWA

## ไฟล์เสียง

| ไฟล์ | คำอธิบาย | ขนาดสูงสุด |
|------|----------|-----------|
| default.mp3 | เสียงแจ้งเตือนมาตรฐาน | < 50KB |
| chime.mp3 | เสียงระฆัง | < 50KB |
| bell.mp3 | เสียงกระดิ่ง | < 50KB |
| soft.mp3 | เสียงนุ่มนวล | < 50KB |

## การใช้งาน

### ในแอปพลิเคชัน (Client-side)
แอปใช้ Web Audio API ผ่าน `src/lib/notificationSounds.js` เพื่อสร้างเสียงแบบ programmatic
ไม่ต้องใช้ไฟล์ MP3 จริง ทำให้:
- ไม่ต้องโหลดไฟล์เสียง
- ทำงานได้แบบ offline
- ขนาดเล็กกว่า

### ใน Service Worker (Background)
Service Worker ใช้ไฟล์ MP3 เหล่านี้สำหรับ push notifications
เนื่องจาก Service Worker ไม่สามารถใช้ Web Audio API ได้โดยตรง

## หมายเหตุ

ไฟล์ MP3 ในโฟลเดอร์นี้เป็น placeholder
สามารถแทนที่ด้วยไฟล์เสียงจริงได้ตามต้องการ
