# Design Document: Upcoming Schedule Banner

## Overview

ฟีเจอร์แบนเนอร์นัดหมายถัดไปเป็น Vue component ที่แสดงนัดหมายที่ใกล้ที่สุดในรูปแบบแบนเนอร์ที่โดดเด่น โดยกรองตาม club_id ของผู้ใช้ และแสดงข้อมูลวันที่ในรูปแบบที่เข้าใจง่าย (วันนี้, พรุ่งนี้, ชื่อวัน)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard.vue                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │           UpcomingScheduleBanner.vue              │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  [Icon]  Title | Date Label | Time | Place │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [Other Dashboard Content...]                           │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  DataStore   │────▶│  Computed    │────▶│ UpcomingSchedule     │
│  schedules   │     │  filtering   │     │ Banner Component     │
└──────────────┘     └──────────────┘     └──────────────────────┘
       │                    │
       │                    ▼
       │            ┌──────────────┐
       │            │ getDateLabel │
       │            │ formatDate   │
       │            │ formatTime   │
       │            └──────────────┘
       │
       ▼
┌──────────────┐
│  AuthStore   │
│  club_id     │
└──────────────┘
```

## Components and Interfaces

### UpcomingScheduleBanner.vue

Component ใหม่ที่แสดงแบนเนอร์นัดหมายถัดไป

**Props:**
```typescript
interface Props {
  schedule: Schedule | null  // นัดหมายที่จะแสดง (null = ไม่แสดงแบนเนอร์)
}
```

**Emits:**
```typescript
interface Emits {
  click: () => void  // เมื่อคลิกที่แบนเนอร์
}
```

### Utility Functions

```typescript
// ฟังก์ชันสำหรับจัดการวันที่
interface DateUtils {
  /**
   * คำนวณ label สำหรับวันที่ (วันนี้, พรุ่งนี้, ชื่อวัน, หรือวันที่)
   * @param date - วันที่ของนัดหมาย (ISO string หรือ Date)
   * @returns string - label ที่จะแสดง
   */
  getDateLabel(date: string | Date): string
  
  /**
   * จัดรูปแบบวันที่เป็นภาษาไทย
   * @param date - วันที่
   * @returns string - วันที่ในรูปแบบ "15 ธ.ค. 2567"
   */
  formatThaiDate(date: string | Date): string
  
  /**
   * จัดรูปแบบเวลาเป็น 24 ชั่วโมง
   * @param time - เวลา (HH:MM:SS หรือ HH:MM)
   * @returns string - เวลาในรูปแบบ "18:00"
   */
  formatTime(time: string): string
}
```

### Schedule Filtering

```typescript
/**
 * กรองและเลือกนัดหมายถัดไปสำหรับผู้ใช้
 * @param schedules - รายการนัดหมายทั้งหมด
 * @param userClubId - club_id ของผู้ใช้ (null ถ้าไม่มี)
 * @returns Schedule | null - นัดหมายถัดไปหรือ null
 */
function getNextUpcomingSchedule(
  schedules: Schedule[],
  userClubId: string | null
): Schedule | null
```

## Data Models

### Schedule (Existing)

```typescript
interface Schedule {
  id: string
  title: string
  description?: string
  date: string          // ISO date string (YYYY-MM-DD)
  time: string          // Time string (HH:MM:SS)
  end_time?: string
  location: string
  club_id?: string
  coach_id?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  schedule_type: 'training' | 'competition' | 'meeting' | 'other'
  created_at: string
  updated_at: string
  clubs?: { name: string }
  coaches?: { name: string }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Club-based schedule filtering returns only matching schedules

*For any* list of schedules and a user with a club_id, filtering schedules should return only schedules where schedule.club_id equals user.club_id or schedule.club_id is null (global schedules).

**Validates: Requirements 1.1, 2.1, 5.1, 5.2**

### Property 2: Nearest schedule selection

*For any* list of upcoming schedules, the selected schedule should be the one with the earliest date and time combination that is greater than or equal to the current date/time.

**Validates: Requirements 5.3**

### Property 3: Banner content completeness

*For any* schedule displayed in the banner, the rendered output should contain the schedule's title, formatted date, formatted time, and location.

**Validates: Requirements 1.3, 2.3**

### Property 4: Relative date label correctness

*For any* schedule date:
- If the date equals today, the label should be "วันนี้"
- If the date equals tomorrow, the label should be "พรุ่งนี้"
- If the date is within 7 days, the label should be the Thai day name
- Otherwise, the label should be the formatted date

**Validates: Requirements 3.3, 3.4, 3.5**

### Property 5: Date and time formatting

*For any* valid date and time, the formatted output should:
- Date: Match Thai locale format (day month year in Buddhist era)
- Time: Be in 24-hour format (HH:MM)

**Validates: Requirements 3.1, 3.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No schedules available | Hide banner component (v-if) |
| Invalid date format | Use fallback display or hide |
| Missing schedule fields | Show available fields, hide missing |
| User has no club_id | Show global schedules (club_id = null) |

## Testing Strategy

### Unit Testing

- Test `getDateLabel` function with various date inputs
- Test `formatThaiDate` function with edge cases
- Test `formatTime` function with different time formats
- Test `getNextUpcomingSchedule` filtering logic

### Property-Based Testing

ใช้ **fast-check** library สำหรับ property-based testing

**Configuration:**
- Minimum iterations: 100
- Shrinking enabled for finding minimal failing examples

**Test Files:**
- `src/tests/upcomingScheduleBanner.property.test.js`

**Property Tests:**
1. **Property 1**: Generate random schedules with various club_ids, verify filtering returns only matching schedules
2. **Property 2**: Generate random upcoming schedules, verify the nearest one is selected
3. **Property 3**: Generate random schedules, verify banner output contains all required fields
4. **Property 4**: Generate random dates relative to today, verify correct label is returned
5. **Property 5**: Generate random dates and times, verify formatting is correct

Each property-based test must be tagged with:
- `**Feature: upcoming-schedule-banner, Property {number}: {property_text}**`

### Integration Testing

- Test banner rendering in Dashboard context
- Test navigation on banner click
- Test with real schedule data from store

## Role Matrix

| การกระทำ | Admin | Coach | Athlete |
|----------|-------|-------|---------|
| ดูแบนเนอร์ | ✅ | ✅ | ✅ |
| ดูนัดหมายทั้งหมด | ✅ | ❌ | ❌ |
| ดูนัดหมายในชมรม | ✅ | ✅ | ✅ |
| คลิกไปหน้านัดหมาย | ✅ | ✅ | ✅ |
