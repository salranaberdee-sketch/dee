/**
 * ฟังก์ชันสำหรับจัดการวันที่และเวลาของนัดหมาย
 * ใช้สำหรับ Upcoming Schedule Banner
 */

// ชื่อวันภาษาไทย
const THAI_DAY_NAMES = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์'
]

// ชื่อเดือนภาษาไทยแบบย่อ
const THAI_MONTH_NAMES = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.'
]

// ค่าคงที่สำหรับการแปลงปี ค.ศ. เป็น พ.ศ.
const BUDDHIST_ERA_OFFSET = 543

/**
 * คำนวณ label สำหรับวันที่ (วันนี้, พรุ่งนี้, ชื่อวัน, หรือวันที่)
 * @param {string | Date} date - วันที่ของนัดหมาย (ISO string หรือ Date)
 * @returns {string} - label ที่จะแสดง
 * 
 * Requirements: 3.3, 3.4, 3.5
 */
export function getDateLabel(date) {
  if (!date) return ''
  
  // แปลงเป็น Date object
  const scheduleDate = typeof date === 'string' ? new Date(date) : date
  
  // ตรวจสอบว่าเป็น valid date
  if (isNaN(scheduleDate.getTime())) return ''
  
  // สร้างวันที่ปัจจุบันโดยตัดเวลาออก (เปรียบเทียบเฉพาะวัน)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(scheduleDate)
  targetDate.setHours(0, 0, 0, 0)
  
  // คำนวณความต่างของวัน
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  // วันนี้
  if (diffDays === 0) {
    return 'วันนี้'
  }
  
  // พรุ่งนี้
  if (diffDays === 1) {
    return 'พรุ่งนี้'
  }
  
  // ภายใน 7 วัน - แสดงชื่อวัน
  if (diffDays >= 2 && diffDays <= 7) {
    return THAI_DAY_NAMES[scheduleDate.getDay()]
  }
  
  // มากกว่า 7 วัน - แสดงวันที่แบบ Thai format
  return formatThaiDate(scheduleDate)
}

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย (พ.ศ.)
 * @param {string | Date} date - วันที่
 * @returns {string} - วันที่ในรูปแบบ "15 ธ.ค. 2567"
 * 
 * Requirements: 3.1
 */
export function formatThaiDate(date) {
  if (!date) return ''
  
  // แปลงเป็น Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // ตรวจสอบว่าเป็น valid date
  if (isNaN(dateObj.getTime())) return ''
  
  const day = dateObj.getDate()
  const month = THAI_MONTH_NAMES[dateObj.getMonth()]
  const year = dateObj.getFullYear() + BUDDHIST_ERA_OFFSET
  
  return `${day} ${month} ${year}`
}

/**
 * จัดรูปแบบเวลาเป็น 24 ชั่วโมง
 * @param {string} time - เวลา (HH:MM:SS หรือ HH:MM)
 * @returns {string} - เวลาในรูปแบบ "18:00"
 * 
 * Requirements: 3.2
 */
export function formatTime(time) {
  if (!time) return ''
  
  // ถ้าเป็น string ที่มี : อยู่แล้ว
  if (typeof time === 'string' && time.includes(':')) {
    // แยกเอาเฉพาะ HH:MM (ตัด seconds ออกถ้ามี)
    const parts = time.split(':')
    const hours = parts[0].padStart(2, '0')
    const minutes = parts[1].padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  return ''
}

/**
 * กรองและเลือกนัดหมายถัดไปสำหรับผู้ใช้
 * - กรองตาม club_id ของผู้ใช้
 * - รวม global schedules (club_id = null) สำหรับผู้ใช้ที่ไม่มี club
 * - กรองนัดหมายที่ผ่านไปแล้วและที่ถูกยกเลิกออก
 * - เรียงตามวันที่และเวลา
 * - คืนค่านัดหมายที่ใกล้ที่สุดหรือ null
 * 
 * @param {Array} schedules - รายการนัดหมายทั้งหมด
 * @param {string|null} userClubId - club_id ของผู้ใช้ (null ถ้าไม่มี)
 * @returns {Object|null} - นัดหมายถัดไปหรือ null
 * 
 * Requirements: 1.1, 2.1, 5.1, 5.2, 5.3
 */
export function getNextUpcomingSchedule(schedules, userClubId) {
  // ตรวจสอบ input
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return null
  }
  
  // สร้างวันที่และเวลาปัจจุบัน
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentTimeStr = now.toTimeString().slice(0, 5) // HH:MM
  
  // กรองนัดหมาย
  const filteredSchedules = schedules.filter(schedule => {
    // กรองนัดหมายที่ถูกยกเลิก
    if (schedule.status === 'cancelled') {
      return false
    }
    
    // กรองนัดหมายที่ผ่านไปแล้ว
    // - วันที่ก่อนวันนี้ = ผ่านไปแล้ว
    // - วันนี้แต่เวลาผ่านไปแล้ว = ผ่านไปแล้ว
    if (schedule.date < todayStr) {
      return false
    }
    
    if (schedule.date === todayStr && schedule.time) {
      const scheduleTime = schedule.time.slice(0, 5) // HH:MM
      if (scheduleTime < currentTimeStr) {
        return false
      }
    }
    
    // กรองตาม club_id
    // - ถ้าผู้ใช้มี club_id: แสดงเฉพาะนัดหมายของ club นั้น หรือ global schedules
    // - ถ้าผู้ใช้ไม่มี club_id: แสดงเฉพาะ global schedules (club_id = null)
    if (userClubId) {
      // ผู้ใช้มี club - แสดงนัดหมายของ club หรือ global
      return schedule.club_id === userClubId || schedule.club_id === null
    } else {
      // ผู้ใช้ไม่มี club - แสดงเฉพาะ global schedules
      return schedule.club_id === null || schedule.club_id === undefined
    }
  })
  
  // ถ้าไม่มีนัดหมายที่ผ่านการกรอง
  if (filteredSchedules.length === 0) {
    return null
  }
  
  // เรียงตามวันที่และเวลา (ascending)
  const sortedSchedules = filteredSchedules.sort((a, b) => {
    // เปรียบเทียบวันที่ก่อน
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date)
    }
    
    // ถ้าวันเดียวกัน เปรียบเทียบเวลา
    const timeA = a.time || '00:00'
    const timeB = b.time || '00:00'
    return timeA.localeCompare(timeB)
  })
  
  // คืนค่านัดหมายแรก (ใกล้ที่สุด)
  return sortedSchedules[0]
}
