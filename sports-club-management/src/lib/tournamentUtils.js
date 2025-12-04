/**
 * Tournament Utility Functions
 * 
 * ฟังก์ชันสำหรับจัดการข้อมูลทัวนาเมนต์
 * Implements Requirements: 2.1, 2.2, 3.1, 3.2, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2
 */

/**
 * จัดกลุ่มนักกีฬาตามชมรม
 * Property 4: Club grouping correctness - แต่ละนักกีฬาจะอยู่ในกลุ่มเดียวที่ตรงกับ club_id
 * Validates: Requirements 2.1
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @returns {Map<string, Array>} - Map ของ club_id -> นักกีฬาในชมรมนั้น
 */
export function groupAthletesByClub(athletes) {
  const grouped = new Map()
  
  if (!athletes || !Array.isArray(athletes)) {
    return grouped
  }
  
  for (const athlete of athletes) {
    // ใช้ club_id หรือ 'no_club' สำหรับนักกีฬาที่ไม่มีชมรม
    const clubId = athlete.club_id || 'no_club'
    
    if (!grouped.has(clubId)) {
      grouped.set(clubId, [])
    }
    grouped.get(clubId).push(athlete)
  }
  
  return grouped
}

/**
 * จัดกลุ่มผู้เข้าแข่งขันตามรุ่น/ประเภท
 * Property 8: Category grouping correctness - แต่ละผู้เข้าแข่งขันจะอยู่ในกลุ่มเดียว
 * Validates: Requirements 3.1, 3.4
 * 
 * @param {Array} participants - รายการผู้เข้าแข่งขัน
 * @returns {Map<string, Array>} - Map ของ category -> ผู้เข้าแข่งขันในรุ่นนั้น
 */
export function groupParticipantsByCategory(participants) {
  const grouped = new Map()
  
  if (!participants || !Array.isArray(participants)) {
    return grouped
  }
  
  for (const participant of participants) {
    // ใช้ category หรือ 'uncategorized' สำหรับผู้เข้าแข่งขันที่ไม่มีรุ่น
    const category = participant.category && participant.category.trim() !== '' 
      ? participant.category 
      : 'uncategorized'
    
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category).push(participant)
  }
  
  return grouped
}

/**
 * จัดกลุ่มการแข่งขันตามรอบ
 * Property 13: Match round grouping correctness - แต่ละการแข่งขันจะอยู่ในรอบเดียว
 * Validates: Requirements 5.4, 7.1
 * 
 * @param {Array} matches - รายการการแข่งขัน
 * @returns {Map<string, Array>} - Map ของ round -> การแข่งขันในรอบนั้น
 */
export function groupMatchesByRound(matches) {
  const grouped = new Map()
  
  if (!matches || !Array.isArray(matches)) {
    return grouped
  }
  
  for (const match of matches) {
    // ใช้ round หรือ 'ไม่ระบุรอบ' สำหรับการแข่งขันที่ไม่มีรอบ
    const round = match.round && match.round.trim() !== '' 
      ? match.round 
      : 'ไม่ระบุรอบ'
    
    if (!grouped.has(round)) {
      grouped.set(round, [])
    }
    grouped.get(round).push(match)
  }
  
  return grouped
}

/**
 * เรียงลำดับผู้เข้าแข่งขันตาม weight_class แล้ว name
 * Property 9: Participant sorting correctness
 * Validates: Requirements 3.2
 * 
 * @param {Array} participants - รายการผู้เข้าแข่งขัน
 * @returns {Array} - รายการที่เรียงลำดับแล้ว
 */
export function sortParticipants(participants) {
  if (!participants || !Array.isArray(participants)) {
    return []
  }
  
  return [...participants].sort((a, b) => {
    // เรียงตาม weight_class ก่อน (null/undefined ไปท้าย)
    const weightA = a.weight_class || ''
    const weightB = b.weight_class || ''
    
    if (weightA !== weightB) {
      // ถ้าทั้งคู่ว่าง ไม่ต้องเปรียบเทียบ
      if (weightA === '' && weightB !== '') return 1
      if (weightA !== '' && weightB === '') return -1
      
      // เปรียบเทียบ weight_class แบบ locale-aware
      return weightA.localeCompare(weightB, 'th')
    }
    
    // ถ้า weight_class เท่ากัน เรียงตาม name
    const nameA = a.athletes?.name || a.name || ''
    const nameB = b.athletes?.name || b.name || ''
    
    return nameA.localeCompare(nameB, 'th')
  })
}

/**
 * เรียงลำดับการแข่งขันตามวันเวลา
 * Property 14: Match chronological sorting
 * Validates: Requirements 7.2
 * 
 * @param {Array} matches - รายการการแข่งขัน
 * @returns {Array} - รายการที่เรียงลำดับตามวันเวลา (เก่าสุดก่อน)
 */
export function sortMatchesChronologically(matches) {
  if (!matches || !Array.isArray(matches)) {
    return []
  }
  
  return [...matches].sort((a, b) => {
    // สร้าง datetime string สำหรับเปรียบเทียบ
    const dateA = a.match_date || ''
    const dateB = b.match_date || ''
    
    // เปรียบเทียบวันที่ก่อน
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB)
    }
    
    // ถ้าวันที่เท่ากัน เปรียบเทียบเวลา
    const timeA = a.match_time || '00:00'
    const timeB = b.match_time || '00:00'
    
    return timeA.localeCompare(timeB)
  })
}

/**
 * กรองนักกีฬาตาม search query
 * Property 5: Search filter correctness - ผลลัพธ์ทั้งหมดต้องมีชื่อที่ตรงกับ query
 * Validates: Requirements 2.2
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @param {string} query - คำค้นหา
 * @returns {Array} - รายการนักกีฬาที่ตรงกับคำค้นหา
 */
export function filterAthletesByName(athletes, query) {
  if (!athletes || !Array.isArray(athletes)) {
    return []
  }
  
  // ถ้าไม่มี query คืนค่าทั้งหมด
  if (!query || query.trim() === '') {
    return athletes
  }
  
  const normalizedQuery = query.trim().toLowerCase()
  
  return athletes.filter(athlete => {
    const name = athlete.name || ''
    return name.toLowerCase().includes(normalizedQuery)
  })
}

/**
 * คำนวณสถิติการลงทะเบียน
 * Property 15: Statistics count accuracy - ผลรวมของ status breakdown ต้องเท่ากับ total
 * Property 16: Remaining slots calculation
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 * 
 * @param {Array} participants - รายการผู้เข้าแข่งขัน
 * @param {number|null} maxParticipants - จำนวนผู้เข้าแข่งขันสูงสุด (null = ไม่จำกัด)
 * @returns {Object} - สถิติการลงทะเบียน
 */
export function calculateRegistrationStats(participants, maxParticipants = null) {
  const stats = {
    totalRegistered: 0,
    maxParticipants: maxParticipants,
    remainingSlots: null,
    byStatus: {
      pending: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0
    },
    byCategory: new Map()
  }
  
  if (!participants || !Array.isArray(participants)) {
    return stats
  }
  
  stats.totalRegistered = participants.length
  
  // นับตาม status
  for (const participant of participants) {
    const status = participant.registration_status || 'pending'
    
    if (stats.byStatus.hasOwnProperty(status)) {
      stats.byStatus[status]++
    } else {
      // สำหรับ status ที่ไม่รู้จัก ให้นับเป็น pending
      stats.byStatus.pending++
    }
    
    // นับตาม category
    const category = participant.category && participant.category.trim() !== '' 
      ? participant.category 
      : 'uncategorized'
    
    stats.byCategory.set(category, (stats.byCategory.get(category) || 0) + 1)
  }
  
  // คำนวณ remaining slots
  if (maxParticipants !== null && maxParticipants > 0) {
    stats.remainingSlots = Math.max(0, maxParticipants - stats.totalRegistered)
  }
  
  return stats
}

/**
 * แปลง Map ของ category count เป็น Array สำหรับแสดงผล
 * 
 * @param {Map<string, number>} categoryMap - Map ของ category -> count
 * @returns {Array<{category: string, count: number}>}
 */
export function categoryMapToArray(categoryMap) {
  if (!categoryMap || !(categoryMap instanceof Map)) {
    return []
  }
  
  return Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    displayName: category === 'uncategorized' ? 'ไม่ระบุรุ่น' : category,
    count
  }))
}

/**
 * ตรวจสอบว่านักกีฬาลงทะเบียนในทัวนาเมนต์แล้วหรือไม่
 * Property 7: Registered athletes exclusion
 * Validates: Requirements 2.4
 * 
 * @param {string} athleteId - ID ของนักกีฬา
 * @param {Array} participants - รายการผู้เข้าแข่งขัน
 * @returns {boolean} - true ถ้าลงทะเบียนแล้ว
 */
export function isAthleteRegistered(athleteId, participants) {
  if (!athleteId || !participants || !Array.isArray(participants)) {
    return false
  }
  
  return participants.some(p => p.athlete_id === athleteId)
}

/**
 * กรองนักกีฬาที่ยังไม่ได้ลงทะเบียน
 * 
 * @param {Array} athletes - รายการนักกีฬาทั้งหมด
 * @param {Array} participants - รายการผู้เข้าแข่งขันที่ลงทะเบียนแล้ว
 * @returns {Array} - รายการนักกีฬาที่ยังไม่ได้ลงทะเบียน
 */
export function getUnregisteredAthletes(athletes, participants) {
  if (!athletes || !Array.isArray(athletes)) {
    return []
  }
  
  if (!participants || !Array.isArray(participants)) {
    return athletes
  }
  
  const registeredIds = new Set(participants.map(p => p.athlete_id))
  
  return athletes.filter(athlete => !registeredIds.has(athlete.id))
}

/**
 * นับจำนวนผู้เข้าแข่งขันในแต่ละ category
 * Property 10: Category count consistency - ผลรวมต้องเท่ากับ total
 * Validates: Requirements 3.3
 * 
 * @param {Map<string, Array>} groupedParticipants - ผู้เข้าแข่งขันที่จัดกลุ่มแล้ว
 * @returns {Array<{category: string, count: number}>}
 */
export function getCategoryCounts(groupedParticipants) {
  if (!groupedParticipants || !(groupedParticipants instanceof Map)) {
    return []
  }
  
  return Array.from(groupedParticipants.entries()).map(([category, participants]) => ({
    category,
    displayName: category === 'uncategorized' ? 'ไม่ระบุรุ่น' : category,
    count: participants.length
  }))
}

/**
 * คำนวณจำนวนผู้เข้าแข่งขันทั้งหมดจาก grouped data
 * 
 * @param {Map<string, Array>} groupedParticipants - ผู้เข้าแข่งขันที่จัดกลุ่มแล้ว
 * @returns {number}
 */
export function getTotalFromGrouped(groupedParticipants) {
  if (!groupedParticipants || !(groupedParticipants instanceof Map)) {
    return 0
  }
  
  let total = 0
  for (const participants of groupedParticipants.values()) {
    total += participants.length
  }
  
  return total
}
