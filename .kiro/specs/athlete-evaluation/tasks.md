# Tasks: ระบบประเมินผลนักกีฬา

## สถานะ: ✅ เสร็จสมบูรณ์

## Checklist

### 1. Database ✅
- [x] สร้างตาราง attendance_records
- [x] สร้างตาราง athlete_evaluations
- [x] RLS Policy: Admin (SELECT/INSERT/UPDATE/DELETE all) - 4 policies x 2 tables
- [x] RLS Policy: Coach (SELECT/INSERT/UPDATE in club) - 3 policies x 2 tables
- [x] RLS Policy: Athlete (SELECT own, INSERT/UPDATE leave) - 3 policies
- [x] รัน get_advisors - ไม่มี security warnings

### 2. Store ✅
- [x] สร้าง evaluation.js store
- [x] State: attendanceRecords, evaluations, athleteStats
- [x] Actions: fetchAttendanceRecords, recordAttendance, submitLeaveRequest, approveLeave
- [x] Actions: fetchAthleteEvaluations, calculateAthleteStats, saveEvaluation
- [x] Getters: athletesByTier, topPerformers, needsAttention, attendanceSummary
- [x] Helper functions: getTierLabel, getTierColor

### 3. UI ✅
- [x] EvaluationDashboard.vue - ภาพรวมนักกีฬาทั้งหมด
- [x] AttendanceManager.vue - บันทึกการเข้าร่วมรายวัน
- [x] AthletePerformance.vue - รายละเอียดนักกีฬารายคน
- [x] LeaveRequest.vue - หน้าขอลาสำหรับนักกีฬา
- [x] ใช้ Design Theme (ขาว-ดำ, SVG icons)
- [x] Responsive Design
- [x] Loading States

### 4. Routing ✅
- [x] /evaluation - Dashboard (admin, coach)
- [x] /evaluation/athlete/:id - รายละเอียดนักกีฬา
- [x] /attendance - บันทึกการเข้าร่วม (admin, coach)
- [x] /leave-request - ขอลา (athlete)
- [x] /my-performance - ผลงานของฉัน (athlete)
- [x] เพิ่มใน Dashboard quick actions

### 5. Security ✅
- [x] รัน get_advisors - ผ่าน
- [x] ตรวจสอบ RLS ครบทุก Role
- [x] ไม่มี USING (true) หรือ WITH CHECK (true)
- [x] ใช้ EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() ...)

## Role Matrix (ตรวจสอบแล้ว)

| การกระทำ | Admin | Coach | Athlete |
|----------|-------|-------|---------|
| ดูสถิติทั้งหมด | ✅ | ❌ | ❌ |
| ดูสถิติในชมรม | ✅ | ✅ | ❌ |
| ดูสถิติตัวเอง | ✅ | ✅ | ✅ |
| บันทึกการลา | ✅ | ✅ | ✅ (ตัวเอง) |
| บันทึก Attendance | ✅ | ✅ | ❌ |
| อนุมัติการลา | ✅ | ✅ | ❌ |
| Export รายงาน | ✅ | ✅ | ❌ |

## RLS Policies Summary

### attendance_records (10 policies)
1. Admin can SELECT all attendance
2. Admin can INSERT all attendance
3. Admin can UPDATE all attendance
4. Admin can DELETE all attendance
5. Coach can SELECT attendance in club
6. Coach can INSERT attendance in club
7. Coach can UPDATE attendance in club
8. Athletes can SELECT own attendance
9. Athletes can INSERT own leave request
10. Athletes can UPDATE own leave request

### athlete_evaluations (8 policies)
1. Admin can SELECT all evaluations
2. Admin can INSERT all evaluations
3. Admin can UPDATE all evaluations
4. Admin can DELETE all evaluations
5. Coach can SELECT evaluations in club
6. Coach can INSERT evaluations in club
7. Coach can UPDATE evaluations in club
8. Athletes can SELECT own evaluations

## Performance Tier Calculation

```
attendance_score = attendance_rate * 0.4 (max 40)
training_score = (sessions / 12) * 30 (max 30)
rating_score = (avg_rating / 5) * 30 (max 30)

overall_score = attendance_score + training_score + rating_score

Tier:
- excellent: score ≥ 85
- good: score ≥ 70
- average: score ≥ 50
- needs_improvement: score < 50
```
