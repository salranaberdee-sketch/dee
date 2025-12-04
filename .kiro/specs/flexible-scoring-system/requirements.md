# Requirements Document

## Introduction

ระบบเกณฑ์การให้คะแนนที่ยืดหยุ่น (Flexible Scoring System) สำหรับการประเมินนักกีฬาที่สามารถปรับแต่งได้ตามประเภทกีฬาและความต้องการของแต่ละชมรม ระบบนี้ออกแบบครั้งเดียวแต่ใช้ได้กับทุกประเภทกีฬา ไม่ว่าจะเป็น:

- **ปันจักสีลัต** - กีฬาต่อสู้ มีทั้งแบบต่อสู้คะแนนและรำโชว์
- **ฟุตซอล** - กีฬาทีม 5 คน สนามในร่ม
- **ฟุตบอล** - กีฬาทีม 11 คน สนามกลางแจ้ง
- **ตะกร้อ** - กีฬาทีม/วง ใช้เท้า-เข่า-หัว

## Glossary

- **Sport_Type**: ประเภทกีฬาที่ชมรมเลือกใช้ (เช่น pencak_silat, futsal, football, sepak_takraw)
- **Competition_Format**: รูปแบบการแข่งขันของกีฬานั้นๆ (เช่น ต่อสู้คะแนน, รำโชว์, ทีม, วง)
- **Scoring_Template**: เทมเพลตเกณฑ์การให้คะแนนสำเร็จรูปสำหรับแต่ละประเภทกีฬา
- **Scoring_Category**: หมวดหมู่ของเกณฑ์การให้คะแนน (เช่น attendance, training, skill, competition)
- **Scoring_Metric**: ตัวชี้วัดที่ใช้ในการประเมิน (เช่น จำนวนครั้ง, เปอร์เซ็นต์, คะแนน)
- **Weight**: น้ำหนักคะแนนของแต่ละเกณฑ์ (รวมกันต้องเท่ากับ 100%)
- **Flexible_Scoring_System**: ระบบที่ Admin/Coach สามารถกำหนดเกณฑ์การให้คะแนนเองได้

## Requirements

### Requirement 1: Sport Type Management

**User Story:** As an admin, I want to define sport types for my club, so that the scoring system can be customized for each sport's unique characteristics.

#### Acceptance Criteria

1. WHEN an admin creates a new club THEN the Flexible_Scoring_System SHALL allow selection of a Sport_Type from predefined options (pencak_silat, futsal, football, sepak_takraw, custom)
2. WHEN a Sport_Type is selected THEN the Flexible_Scoring_System SHALL load the default Scoring_Template for that sport
3. WHEN a club uses custom Sport_Type THEN the Flexible_Scoring_System SHALL allow the admin to define all scoring categories from scratch
4. WHEN displaying sport configuration THEN the Flexible_Scoring_System SHALL show Competition_Format options specific to the selected Sport_Type

### Requirement 2: Scoring Template System

**User Story:** As an admin, I want to use pre-built scoring templates for common sports, so that I can quickly set up evaluation criteria without starting from scratch.

#### Acceptance Criteria

1. WHEN a Scoring_Template is loaded THEN the Flexible_Scoring_System SHALL populate default Scoring_Categories with appropriate Weights
2. WHEN an admin views a template THEN the Flexible_Scoring_System SHALL display all categories, metrics, and their default weights
3. WHEN an admin modifies a template THEN the Flexible_Scoring_System SHALL validate that total Weight equals 100 percent
4. WHEN saving modified template THEN the Flexible_Scoring_System SHALL store it as club-specific configuration without affecting the original template

### Requirement 3: Dynamic Scoring Categories

**User Story:** As a coach, I want to add custom scoring categories beyond the defaults, so that I can evaluate athletes on criteria specific to my training program.

#### Acceptance Criteria

1. WHEN a coach adds a new Scoring_Category THEN the Flexible_Scoring_System SHALL require name, description, metric type, and weight
2. WHEN a Scoring_Category is added THEN the Flexible_Scoring_System SHALL automatically adjust other category weights proportionally to maintain 100 percent total
3. WHEN a coach removes a Scoring_Category THEN the Flexible_Scoring_System SHALL redistribute the removed weight to remaining categories
4. WHEN displaying categories THEN the Flexible_Scoring_System SHALL group them by type (attendance, training, skill, competition, custom)

### Requirement 4: Metric Configuration

**User Story:** As a coach, I want to configure how each metric is measured and calculated, so that the scoring reflects the actual performance standards of my sport.

#### Acceptance Criteria

1. WHEN configuring a Scoring_Metric THEN the Flexible_Scoring_System SHALL allow selection of measurement type (count, percentage, rating, time, distance)
2. WHEN a metric uses count type THEN the Flexible_Scoring_System SHALL allow setting target value and scoring formula
3. WHEN a metric uses percentage type THEN the Flexible_Scoring_System SHALL calculate based on actual versus expected values
4. WHEN a metric uses rating type THEN the Flexible_Scoring_System SHALL allow setting rating scale (1-5, 1-10, custom)
5. WHEN displaying metric configuration THEN the Flexible_Scoring_System SHALL show example calculations for clarity

### Requirement 5: Sport-Specific Metrics

**User Story:** As a coach, I want to use metrics that are specific to my sport type, so that athlete evaluation is relevant and meaningful.

#### Acceptance Criteria

1. WHEN Sport_Type is pencak_silat THEN the Flexible_Scoring_System SHALL offer metrics for technique_score, form_accuracy, sparring_performance, and kata_score
2. WHEN Sport_Type is futsal or football THEN the Flexible_Scoring_System SHALL offer metrics for goals, assists, defensive_actions, and tactical_awareness
3. WHEN Sport_Type is sepak_takraw THEN the Flexible_Scoring_System SHALL offer metrics for spike_accuracy, serve_success, team_coordination, and acrobatic_score
4. WHEN any Sport_Type is selected THEN the Flexible_Scoring_System SHALL always include common metrics for attendance_rate, training_hours, and coach_rating

### Requirement 6: Scoring Calculation Engine

**User Story:** As a system, I want to calculate athlete scores consistently based on configured criteria, so that evaluations are fair and comparable.

#### Acceptance Criteria

1. WHEN calculating overall score THEN the Flexible_Scoring_System SHALL apply each category weight to its normalized score and sum the results
2. WHEN a metric value exceeds the target THEN the Flexible_Scoring_System SHALL cap the category score at 100 percent unless bonus points are configured
3. WHEN calculating scores THEN the Flexible_Scoring_System SHALL handle missing data by using zero or configurable default values
4. WHEN score calculation completes THEN the Flexible_Scoring_System SHALL assign performance tier based on configured thresholds

### Requirement 7: Configuration Validation

**User Story:** As an admin, I want the system to validate my scoring configuration, so that I avoid errors that could affect athlete evaluations.

#### Acceptance Criteria

1. WHEN saving scoring configuration THEN the Flexible_Scoring_System SHALL verify total weights equal exactly 100 percent
2. WHEN a category has no metrics defined THEN the Flexible_Scoring_System SHALL display a warning and prevent activation
3. WHEN metric thresholds are invalid THEN the Flexible_Scoring_System SHALL display specific error messages indicating the issue
4. WHEN configuration is valid THEN the Flexible_Scoring_System SHALL allow activation and display confirmation message

### Requirement 8: Configuration History

**User Story:** As an admin, I want to track changes to scoring configuration, so that I can understand how evaluation criteria have evolved and revert if needed.

#### Acceptance Criteria

1. WHEN scoring configuration changes THEN the Flexible_Scoring_System SHALL create a versioned snapshot of the previous configuration
2. WHEN viewing configuration history THEN the Flexible_Scoring_System SHALL display change date, changed by, and summary of changes
3. WHEN an admin selects a previous version THEN the Flexible_Scoring_System SHALL allow restoration with confirmation
4. WHEN restoring a version THEN the Flexible_Scoring_System SHALL create a new version entry rather than overwriting history
