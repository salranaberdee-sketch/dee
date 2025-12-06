# Requirements Document

## Introduction

ระบบรวมศูนย์การจัดการคะแนน (Scoring Hub) เพื่อแก้ปัญหาที่ระบบคะแนนกระจายอยู่หลายฟีเจอร์ทำให้โค้ชสับสน ระบบนี้ออกแบบให้โค้ช **เข้าใจได้ภายใน 3 วินาที** ว่าต้องทำอะไร ที่ไหน

### ปัญหาปัจจุบัน

ระบบคะแนนกระจายอยู่หลายที่:
- `/evaluation` - หน้าประเมินผลนักกีฬา
- `/scoring-config` - ตั้งค่าเกณฑ์คะแนน (Flexible Scoring System)
- `/scoring-config/history` - ประวัติการตั้งค่า
- `ScoringConditionForm` - เงื่อนไขโบนัส/หักคะแนน
- `ScoreCalculatorView` - คำนวณคะแนน

### เป้าหมายหลัก: 3 วินาทีเข้าใจ

```
┌─────────────────────────────────────────────────────────┐
│  วินาทีที่ 1: เห็นหน้าจอ → รู้ว่า "นี่คือศูนย์คะแนน"      │
│  วินาทีที่ 2: เห็นการ์ด → รู้ว่า "ทำอะไรได้บ้าง"          │
│  วินาทีที่ 3: เลือกการ์ด → รู้ว่า "กดตรงนี้เพื่อทำสิ่งนั้น" │
└─────────────────────────────────────────────────────────┘
```

### หลักการออกแบบ

1. **Minimal UI** - แสดงเฉพาะสิ่งจำเป็น ไม่มีข้อมูลเกินจำเป็น
2. **Big Clear Cards** - การ์ดใหญ่ ชัดเจน อ่านง่าย
3. **One Action Per Card** - 1 การ์ด = 1 การกระทำ
4. **Visual Hierarchy** - สิ่งสำคัญอยู่บนสุด ขนาดใหญ่สุด

## Glossary

- **Scoring_Hub**: หน้ารวมศูนย์ทุกอย่างที่เกี่ยวกับคะแนน - เข้าใจได้ใน 3 วินาที
- **Action_Card**: การ์ดขนาดใหญ่ ชัดเจน 1 การ์ด = 1 การกระทำ
- **Score_Source_Bar**: แถบแสดงแหล่งที่มาคะแนนพร้อมน้ำหนัก (เห็นปุ๊บรู้ปั๊บ)
- **Scoring_System**: ระบบที่รวมศูนย์การจัดการคะแนนทั้งหมด

## Requirements

### Requirement 1: 3-Second Comprehension Hub

**User Story:** As a coach, I want to understand the scoring hub within 3 seconds of viewing, so that I can immediately know what actions are available.

#### Acceptance Criteria

1. WHEN a coach opens the scoring hub THEN the Scoring_System SHALL display maximum 4 Action_Cards above the fold (ไม่ต้อง scroll)
2. WHEN displaying Action_Cards THEN the Scoring_System SHALL use large icons (48x48px minimum) and short titles (maximum 4 words)
3. WHEN the hub loads THEN the Scoring_System SHALL complete rendering within 1 second
4. WHEN displaying the hub THEN the Scoring_System SHALL show only essential information without visual clutter

### Requirement 2: Clear Action Cards

**User Story:** As a coach, I want to see exactly 4 main actions I can take, so that I am not overwhelmed with choices.

#### Acceptance Criteria

1. WHEN displaying Action_Cards THEN the Scoring_System SHALL show exactly 4 cards: "ตั้งค่าเกณฑ์", "ดูผลประเมิน", "คำนวณคะแนน", "โบนัส/หักคะแนน"
2. WHEN a card is displayed THEN the Scoring_System SHALL show only: icon, title (2-4 words), and status indicator (dot: green=active, gray=inactive)
3. WHEN a coach taps a card THEN the Scoring_System SHALL navigate immediately without confirmation dialogs
4. WHEN a card represents incomplete setup THEN the Scoring_System SHALL show a subtle "ตั้งค่า" badge

### Requirement 3: Score Source Bar (At-a-Glance)

**User Story:** As a coach, I want to see where scores come from in a single horizontal bar, so that I understand the weight distribution instantly.

#### Acceptance Criteria

1. WHEN displaying Score_Source_Bar THEN the Scoring_System SHALL show a single horizontal stacked bar with color-coded segments
2. WHEN a segment is displayed THEN the Scoring_System SHALL show category name and percentage inside or below the segment
3. WHEN the bar is displayed THEN the Scoring_System SHALL use maximum 5 segments: การเข้าร่วม, ฝึกซ้อม, ทักษะ, แข่งขัน, โบนัส/หัก
4. WHEN a coach taps a segment THEN the Scoring_System SHALL navigate to configure that specific category

### Requirement 4: Status at Top

**User Story:** As a coach, I want to see the current status immediately at the top, so that I know if the system is ready to use.

#### Acceptance Criteria

1. WHEN configuration is active THEN the Scoring_System SHALL display a green banner: "✓ พร้อมใช้งาน"
2. WHEN configuration is inactive THEN the Scoring_System SHALL display a yellow banner: "⚠ ยังไม่เปิดใช้งาน" with a single "เปิดใช้งาน" button
3. WHEN no configuration exists THEN the Scoring_System SHALL display: "เริ่มต้นใช้งาน" with a single "ตั้งค่าเลย" button
4. WHEN displaying status THEN the Scoring_System SHALL use maximum 1 line of text

### Requirement 5: Single Menu Entry

**User Story:** As a coach, I want to see only one menu item for scoring, so that I am not confused by multiple related options.

#### Acceptance Criteria

1. WHEN displaying NavBar THEN the Scoring_System SHALL show single menu item "ศูนย์คะแนน" replacing all previous scoring-related items
2. WHEN on any scoring sub-page THEN the Scoring_System SHALL display a back arrow that returns to the hub
3. WHEN navigating back THEN the Scoring_System SHALL always return to the hub (not to previous random page)
4. WHEN displaying sub-page header THEN the Scoring_System SHALL show page title only (no breadcrumbs to reduce visual noise)

### Requirement 6: Quick Stats (Optional Section)

**User Story:** As a coach, I want to optionally see quick stats below the main actions, so that I can monitor without leaving the hub.

#### Acceptance Criteria

1. WHEN displaying quick stats THEN the Scoring_System SHALL show 4 numbers only: จำนวนนักกีฬา, คะแนนเฉลี่ย, ดีเยี่ยม (count), ต้องปรับปรุง (count)
2. WHEN stats are displayed THEN the Scoring_System SHALL use large numbers (24px+) with small labels below
3. WHEN a coach taps a stat THEN the Scoring_System SHALL navigate to filtered evaluation list
4. WHEN no data exists THEN the Scoring_System SHALL hide the stats section entirely (not show zeros)

### Requirement 7: First-Time Setup Flow

**User Story:** As a new coach, I want a simple 2-step setup, so that I can start using the system quickly.

#### Acceptance Criteria

1. WHEN a coach has no configuration THEN the Scoring_System SHALL show only 2 steps: "1. เลือกประเภทกีฬา" → "2. ยืนยันเกณฑ์"
2. WHEN step 1 is shown THEN the Scoring_System SHALL display sport type cards (max 5 options) for one-tap selection
3. WHEN step 2 is shown THEN the Scoring_System SHALL display pre-filled template with single "ยืนยัน" button
4. WHEN setup completes THEN the Scoring_System SHALL immediately show the normal hub view

### Requirement 8: Mobile-First Design

**User Story:** As a coach on mobile, I want the hub to work perfectly on small screens, so that I can manage scores on the go.

#### Acceptance Criteria

1. WHEN viewing on mobile THEN the Scoring_System SHALL display 2x2 grid of Action_Cards (not single column)
2. WHEN viewing on mobile THEN the Scoring_System SHALL ensure minimum touch target of 48x48 pixels
3. WHEN viewing on mobile THEN the Scoring_System SHALL hide Score_Source_Bar and show only on tap/expand
4. WHEN viewing on any device THEN the Scoring_System SHALL maintain the same 4-card layout structure

