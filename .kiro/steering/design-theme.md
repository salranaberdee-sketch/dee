# แนวทางการออกแบบ UI/UX

## ธีมสี: ขาวดำชัดเจน (Clean Black & White)

### หลักการ
- ใช้ขาว-ดำเป็นสีหลัก 100%
- ปุ่มหลัก: พื้นดำ ตัวอักษรขาว
- **ห้ามใช้ Emoji** - ใช้ SVG icons แทนเสมอ
- สีเน้นใช้เฉพาะ: สถานะ (success/error), badges

### Color Palette

```css
/* Base Colors */
--white: #FFFFFF;
--black: #000000;
--gray-50: #FAFAFA;
--gray-100: #F5F5F5;
--gray-200: #E5E5E5;
--gray-300: #D4D4D4;
--gray-400: #A3A3A3;
--gray-500: #737373;
--gray-600: #525252;
--gray-700: #404040;
--gray-800: #262626;
--gray-900: #171717;

/* Accent Colors (ใช้เฉพาะสถานะ) */
--accent-success: #22C55E;    /* Green - Success states */
--accent-warning: #F59E0B;    /* Amber - Warnings */
--accent-danger: #EF4444;     /* Red - Errors/Delete */
```

### การใช้งาน
- **Background:** ขาว (#FFFFFF) หรือ gray-50
- **Text:** ดำ (#000000) หรือ gray-900
- **Borders:** gray-200 หรือ gray-300
- **Primary Button:** ดำ (#171717) ตัวอักษรขาว
- **Secondary Button:** พื้นขาว/gray-100 ขอบเทา ตัวอักษรดำ
- **Icons:** ใช้ SVG stroke icons สีดำ/ขาวตาม context
- **Card Icons:** พื้นดำ icon ขาว (48x48px, border-radius: 12px)

### Icons
- ใช้ SVG icons เท่านั้น (stroke-based)
- viewBox="0 0 24 24", stroke-width="2"
- ห้ามใช้ emoji ทุกกรณี

### ตัวอย่าง Components
```css
/* Primary Button */
.btn-primary { background: #171717; color: #fff; }

/* Card Icon Box */
.card-icon { 
  width: 48px; height: 48px; 
  background: #171717; 
  border-radius: 12px; 
  display: flex; align-items: center; justify-content: center; 
}
.card-icon svg { width: 24px; height: 24px; color: #fff; }

/* Success State */
.doc-done { background: #D1FAE5; color: #065F46; }

/* Danger Button */
.btn-danger { background: #EF4444; color: #fff; }
```
