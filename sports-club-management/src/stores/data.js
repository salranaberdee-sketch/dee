import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// Supabase Edge Function URL for push notifications
const SUPABASE_URL = 'https://augislapwqypxsnnwbot.supabase.co'

/**
 * Send push notification via Edge Function
 * @param {Object} payload - Push notification payload
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPushNotification(payload) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('No session for push notification')
      return { success: false, error: 'No session' }
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Push notification failed:', errorText)
      return { success: false, error: errorText }
    }

    const result = await response.json()
    console.log('Push notification sent:', result)
    return { success: true, ...result }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, error: error.message }
  }
}

export const useDataStore = defineStore('data', () => {
  const clubs = ref([])
  const coaches = ref([])
  const athletes = ref([])
  const schedules = ref([])
  const trainingLogs = ref([])
  const announcements = ref([])
  const tournaments = ref([])
  const tournamentParticipants = ref([])
  const tournamentMatches = ref([])
  const tournamentAwards = ref([])
  const userAlbums = ref([])
  const albumMedia = ref([])
  const activityCategories = ref([])
  const trainingGoals = ref([])
  const userAchievements = ref([])
  const loading = ref(false)
  const error = ref(null)

  // ============ CLUBS ============
  async function fetchClubs() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!err) clubs.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addClub(club) {
    const { data, error: err } = await supabase
      .from('clubs')
      .insert(club)
      .select()
      .single()
    
    if (!err && data) {
      clubs.value.unshift(data)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function updateClub(id, updates) {
    const { data, error: err } = await supabase
      .from('clubs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (!err && data) {
      const idx = clubs.value.findIndex(c => c.id === id)
      if (idx !== -1) clubs.value[idx] = data
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteClub(id) {
    const { error: err } = await supabase.from('clubs').delete().eq('id', id)
    if (!err) {
      clubs.value = clubs.value.filter(c => c.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  function getClubById(id) {
    return clubs.value.find(c => c.id === id)
  }


  // ============ COACHES ============
  async function fetchCoaches() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('coaches')
      .select('*, clubs(name)')
      .order('created_at', { ascending: false })
    
    if (!err) coaches.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addCoach(coach) {
    const { data, error: err } = await supabase
      .from('coaches')
      .insert(coach)
      .select('*, clubs(name)')
      .single()
    
    if (!err && data) {
      coaches.value.unshift(data)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function updateCoach(id, updates) {
    const { data, error: err } = await supabase
      .from('coaches')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clubs(name)')
      .single()
    
    if (!err && data) {
      const idx = coaches.value.findIndex(c => c.id === id)
      if (idx !== -1) coaches.value[idx] = data
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteCoach(id) {
    const { error: err } = await supabase.from('coaches').delete().eq('id', id)
    if (!err) {
      coaches.value = coaches.value.filter(c => c.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  function getCoachById(id) {
    return coaches.value.find(c => c.id === id)
  }

  function getCoachesByClub(clubId) {
    return coaches.value.filter(c => c.club_id === clubId)
  }

  // ============ ATHLETES ============
  
  /**
   * Helper: Fetch user profiles for athletes (avatar_url)
   * Since athletes.user_id references auth.users, we need separate query
   */
  async function enrichAthletesWithProfiles(athletesList) {
    if (!athletesList || athletesList.length === 0) return athletesList
    
    // Get unique user_ids that are not null
    const userIds = [...new Set(athletesList.filter(a => a.user_id).map(a => a.user_id))]
    if (userIds.length === 0) return athletesList
    
    // Fetch user_profiles for these user_ids
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, avatar_url')
      .in('id', userIds)
    
    // Create a map for quick lookup
    const profileMap = new Map()
    if (profiles) {
      profiles.forEach(p => profileMap.set(p.id, p))
    }
    
    // Enrich athletes with user_profiles data
    return athletesList.map(athlete => ({
      ...athlete,
      user_profiles: athlete.user_id ? profileMap.get(athlete.user_id) || null : null
    }))
  }

  async function fetchAthletes() {
    loading.value = true
    // Fetch athletes with clubs and coaches
    const { data, error: err } = await supabase
      .from('athletes')
      .select('*, clubs(name), coaches(name)')
      .order('created_at', { ascending: false })
    
    if (!err) {
      // Enrich with user_profiles (avatar_url) - Requirement 5.2
      athletes.value = await enrichAthletesWithProfiles(data || [])
    } else {
      error.value = err.message
    }
    loading.value = false
  }

  async function addAthlete(athlete) {
    const { data, error: err } = await supabase
      .from('athletes')
      .insert(athlete)
      .select('*, clubs(name), coaches(name)')
      .single()
    
    if (!err && data) {
      // Enrich with user_profiles
      const enriched = await enrichAthletesWithProfiles([data])
      athletes.value.unshift(enriched[0])
      return { success: true, data: enriched[0] }
    }
    return { success: false, message: err?.message }
  }

  async function updateAthlete(id, updates) {
    const { data, error: err } = await supabase
      .from('athletes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clubs(name), coaches(name)')
      .single()
    
    if (!err && data) {
      // Enrich with user_profiles
      const enriched = await enrichAthletesWithProfiles([data])
      const idx = athletes.value.findIndex(a => a.id === id)
      if (idx !== -1) athletes.value[idx] = enriched[0]
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteAthlete(id) {
    const { error: err } = await supabase.from('athletes').delete().eq('id', id)
    if (!err) {
      athletes.value = athletes.value.filter(a => a.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  function getAthleteById(id) {
    return athletes.value.find(a => a.id === id)
  }

  function getAthletesByClub(clubId) {
    return athletes.value.filter(a => a.club_id === clubId)
  }

  function getAthletesByCoach(coachId) {
    return athletes.value.filter(a => a.coach_id === coachId)
  }


  // ============ SCHEDULES ============
  async function fetchSchedules() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('schedules')
      .select('*, clubs(name), coaches(name)')
      .order('date', { ascending: true })
    
    if (!err) schedules.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addSchedule(schedule) {
    const { data, error: err } = await supabase
      .from('schedules')
      .insert(schedule)
      .select('*, clubs(name), coaches(name)')
      .single()
    
    if (!err && data) {
      schedules.value.push(data)
      schedules.value.sort((a, b) => new Date(a.date) - new Date(b.date))
      
      // Send push notification for new schedule (Requirement 3.2)
      const pushPayload = {
        title: 'ตารางนัดหมายใหม่',
        message: `${data.title || 'นัดหมาย'} - ${new Date(data.date).toLocaleDateString('th-TH')}`,
        type: 'schedule_update',
        referenceType: 'schedule',
        referenceId: data.id,
        url: '/schedules',
        targetType: data.club_id ? 'club' : 'all',
        clubId: data.club_id || undefined
      }
      
      sendPushNotification(pushPayload).catch(err => {
        console.error('Failed to send schedule push:', err)
      })
      
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function updateSchedule(id, updates) {
    const { data, error: err } = await supabase
      .from('schedules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clubs(name), coaches(name)')
      .single()
    
    if (!err && data) {
      const idx = schedules.value.findIndex(s => s.id === id)
      if (idx !== -1) schedules.value[idx] = data
      
      // Send push notification for schedule update (Requirement 3.2)
      const pushPayload = {
        title: 'อัปเดตตารางนัดหมาย',
        message: `${data.title || 'นัดหมาย'} มีการเปลี่ยนแปลง - ${new Date(data.date).toLocaleDateString('th-TH')}`,
        type: 'schedule_update',
        referenceType: 'schedule',
        referenceId: data.id,
        url: '/schedules',
        targetType: data.club_id ? 'club' : 'all',
        clubId: data.club_id || undefined
      }
      
      sendPushNotification(pushPayload).catch(err => {
        console.error('Failed to send schedule update push:', err)
      })
      
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteSchedule(id) {
    const { error: err } = await supabase.from('schedules').delete().eq('id', id)
    if (!err) {
      schedules.value = schedules.value.filter(s => s.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  // ============ SCHEDULE RESPONSES ============
  async function getScheduleResponses(scheduleId) {
    const { data, error: err } = await supabase
      .from('schedule_responses')
      .select('*, athletes(name, email)')
      .eq('schedule_id', scheduleId)
    
    if (!err) return data || []
    return []
  }

  async function respondToSchedule(scheduleId, athleteId, response, note = null) {
    const { data, error: err } = await supabase
      .from('schedule_responses')
      .upsert({
        schedule_id: scheduleId,
        athlete_id: athleteId,
        response,
        note,
        responded_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (!err && data) return { success: true, data }
    return { success: false, message: err?.message }
  }

  async function getMyScheduleResponse(scheduleId, athleteId) {
    const { data, error: err } = await supabase
      .from('schedule_responses')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('athlete_id', athleteId)
      .single()
    
    if (!err && data) return data
    return null
  }

  // ============ TRAINING LOGS ============
  /**
   * ดึงบันทึกการฝึกซ้อม - กรองตาม role
   * Admin: ดูทั้งหมด
   * Coach: ดูในชมรมเดียวกัน
   * Athlete: ดูเฉพาะตัวเอง
   */
  async function fetchTrainingLogs() {
    loading.value = true
    
    // ดึงข้อมูลทั้งหมด (RLS จะกรองให้อัตโนมัติ)
    const { data, error: err } = await supabase
      .from('training_logs')
      .select('*, athletes(name), coaches(name), clubs(name), activity_categories(name, icon)')
      .order('date', { ascending: false })
    
    if (!err) trainingLogs.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addTrainingLog(log) {
    const { data, error: err } = await supabase
      .from('training_logs')
      .insert(log)
      .select('*, athletes(name), coaches(name), clubs(name), activity_categories(name, icon)')
      .single()
    
    if (!err && data) {
      trainingLogs.value.unshift(data)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function updateTrainingLog(id, updates) {
    const { data, error: err } = await supabase
      .from('training_logs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, athletes(name), coaches(name), clubs(name), activity_categories(name, icon)')
      .single()
    
    if (!err && data) {
      const idx = trainingLogs.value.findIndex(t => t.id === id)
      if (idx !== -1) trainingLogs.value[idx] = data
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteTrainingLog(id) {
    const { error: err } = await supabase.from('training_logs').delete().eq('id', id)
    if (!err) {
      trainingLogs.value = trainingLogs.value.filter(t => t.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  // ============ ACTIVITY CATEGORIES ============

  /**
   * ดึงหมวดหมู่กิจกรรมที่ใช้งานอยู่
   * @returns {Promise<Array>} - รายการหมวดหมู่ที่ active
   */
  async function fetchActivityCategories() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('activity_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    
    if (!err) {
      activityCategories.value = data || []
      return data || []
    } else {
      error.value = err.message
      activityCategories.value = []
      return []
    }
    loading.value = false
  }

  /**
   * ดึงหมวดหมู่กิจกรรมทั้งหมด - Admin only
   * @returns {Promise<Array>} - รายการหมวดหมู่ทั้งหมด
   */
  async function fetchAllActivityCategories() {
    const { data, error: err } = await supabase
      .from('activity_categories')
      .select('*')
      .order('sort_order', { ascending: true })
    
    if (!err) return data || []
    return []
  }

  /**
   * เพิ่มหมวดหมู่กิจกรรมใหม่ - Admin only
   * @param {Object} categoryData - ข้อมูลหมวดหมู่
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
   */
  async function addActivityCategory(categoryData) {
    const { data, error: err } = await supabase
      .from('activity_categories')
      .insert(categoryData)
      .select()
      .single()
    
    if (!err && data) {
      activityCategories.value.push(data)
      activityCategories.value.sort((a, b) => a.sort_order - b.sort_order)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  /**
   * อัพเดทหมวดหมู่กิจกรรม - Admin only
   * @param {string} id - รหัสหมวดหมู่
   * @param {Object} updates - ข้อมูลที่ต้องการอัพเดท
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
   */
  async function updateActivityCategory(id, updates) {
    const { data, error: err } = await supabase
      .from('activity_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (!err && data) {
      const idx = activityCategories.value.findIndex(c => c.id === id)
      if (idx !== -1) activityCategories.value[idx] = data
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  /**
   * ดึงหมวดหมู่ตาม ID
   * @param {string} id - รหัสหมวดหมู่
   * @returns {Object|undefined} - หมวดหมู่ที่ตรงกับ ID
   */
  function getCategoryById(id) {
    return activityCategories.value.find(c => c.id === id)
  }

  /**
   * Filter training logs by category
   * Property 1: Category filter returns only matching logs
   * @param {string} categoryId - Category ID to filter by
   * @returns {Array} Filtered training logs
   */
  function filterLogsByCategory(categoryId) {
    if (!categoryId) return trainingLogs.value
    return trainingLogs.value.filter(log => log.category_id === categoryId)
  }

  // ============ TRAINING STATISTICS ============
  // Requirements: 2.1, 2.2, 2.3, 2.4

  /**
   * Get training statistics for a user within a date range
   * Property 2: Statistics calculation accuracy
   * @param {string} userId - User ID
   * @param {Object} dateRange - { startDate, endDate } in ISO format
   * @returns {Promise<{totalSessions: number, totalHours: number, avgRating: number}>}
   */
  async function getTrainingStats(userId, dateRange = {}) {
    let query = supabase
      .from('training_logs')
      .select('id, duration, rating, date')
      .eq('user_id', userId)
    
    if (dateRange.startDate) {
      query = query.gte('date', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date', dateRange.endDate)
    }

    const { data, error: err } = await query

    if (err || !data) {
      return { totalSessions: 0, totalHours: 0, avgRating: 0 }
    }

    const totalSessions = data.length
    const totalMinutes = data.reduce((sum, log) => sum + (log.duration || 0), 0)
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10 // Round to 1 decimal
    const totalRating = data.reduce((sum, log) => sum + (log.rating || 0), 0)
    const avgRating = totalSessions > 0 ? Math.round((totalRating / totalSessions) * 10) / 10 : 0

    return { totalSessions, totalHours, avgRating }
  }

  /**
   * Get weekly comparison - current week vs previous week
   * @param {string} userId - User ID
   * @returns {Promise<{currentWeek: Object, previousWeek: Object, change: Object}>}
   */
  async function getWeeklyComparison(userId) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    
    // Calculate current week start (Monday)
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    currentWeekStart.setHours(0, 0, 0, 0)
    
    // Calculate previous week start
    const previousWeekStart = new Date(currentWeekStart)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    
    // Calculate previous week end
    const previousWeekEnd = new Date(currentWeekStart)
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1)

    const currentWeekStats = await getTrainingStats(userId, {
      startDate: currentWeekStart.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    })

    const previousWeekStats = await getTrainingStats(userId, {
      startDate: previousWeekStart.toISOString().split('T')[0],
      endDate: previousWeekEnd.toISOString().split('T')[0]
    })

    // Calculate change percentages
    const sessionChange = previousWeekStats.totalSessions > 0
      ? Math.round(((currentWeekStats.totalSessions - previousWeekStats.totalSessions) / previousWeekStats.totalSessions) * 100)
      : currentWeekStats.totalSessions > 0 ? 100 : 0

    const hoursChange = previousWeekStats.totalHours > 0
      ? Math.round(((currentWeekStats.totalHours - previousWeekStats.totalHours) / previousWeekStats.totalHours) * 100)
      : currentWeekStats.totalHours > 0 ? 100 : 0

    return {
      currentWeek: currentWeekStats,
      previousWeek: previousWeekStats,
      change: {
        sessions: sessionChange,
        hours: hoursChange
      }
    }
  }

  /**
   * ดึงข้อมูลการกระจายการฝึกซ้อมตามหมวดหมู่
   * @param {string} userId - รหัสผู้ใช้
   * @param {Object} dateRange - ช่วงวันที่ (optional)
   * @returns {Promise<Array>} - รายการการกระจายตามหมวดหมู่
   */
  async function getCategoryDistribution(userId, dateRange = {}) {
    let query = supabase
      .from('training_logs')
      .select('category_id, activity_categories(name)')
      .eq('user_id', userId)
    
    if (dateRange.startDate) {
      query = query.gte('date', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date', dateRange.endDate)
    }

    const { data, error: err } = await query

    if (err || !data) {
      return []
    }

    // นับจำนวนแต่ละหมวดหมู่
    const categoryCount = {}
    let totalLogs = 0

    data.forEach(log => {
      if (log.category_id && log.activity_categories?.name) {
        const categoryName = log.activity_categories.name
        categoryCount[log.category_id] = categoryCount[log.category_id] || {
          categoryId: log.category_id,
          categoryName: categoryName,
          count: 0
        }
        categoryCount[log.category_id].count++
        totalLogs++
      }
    })

    // คำนวณเปอร์เซ็นต์
    const distribution = Object.values(categoryCount).map(item => ({
      ...item,
      percentage: totalLogs > 0 ? Math.round((item.count / totalLogs) * 100) : 0
    }))

    // เรียงตามจำนวนมากไปน้อย
    distribution.sort((a, b) => b.count - a.count)

    return distribution
  }

  /**
   * Get daily training data for a week (for chart display)
   * @param {string} userId - User ID
   * @param {Date} weekStart - Start of the week
   * @returns {Promise<Array<{date: string, dayName: string, sessions: number}>>}
   */
  async function getWeeklyChartData(userId, weekStart = null) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    
    // Default to current week start (Monday)
    if (!weekStart) {
      weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      weekStart.setHours(0, 0, 0, 0)
    }

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const { data, error: err } = await supabase
      .from('training_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])

    const dayNames = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
    const chartData = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      const sessions = data?.filter(log => log.date === dateStr).length || 0
      
      chartData.push({
        date: dateStr,
        dayName: dayNames[i],
        sessions
      })
    }

    return chartData
  }

  // ============ TRAINING GOALS ============
  // Requirements: 3.1, 3.2, 3.3

  /**
   * Fetch user's current active goal
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Goal object or null
   */
  async function fetchUserGoal(userId) {
    const { data, error: err } = await supabase
      .from('training_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('goal_type', 'weekly_sessions')
      .single()
    
    if (!err && data) {
      trainingGoals.value = [data]
      return data
    }
    // Return default goal if none exists (Requirement 3.5)
    return { goal_type: 'weekly_sessions', target_value: 3, is_active: true }
  }

  /**
   * Set or update user's training goal
   * @param {string} userId - User ID
   * @param {Object} goalData - { target_value, goal_type? }
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
   */
  async function setUserGoal(userId, goalData) {
    // Validate target value (1-7 sessions per week)
    const targetValue = parseInt(goalData.target_value)
    if (isNaN(targetValue) || targetValue < 1 || targetValue > 7) {
      return { success: false, message: 'เป้าหมายต้องเป็นตัวเลข 1-7' }
    }

    const payload = {
      user_id: userId,
      goal_type: goalData.goal_type || 'weekly_sessions',
      target_value: targetValue,
      start_date: new Date().toISOString().split('T')[0],
      is_active: true
    }

    // Use upsert to create or update
    const { data, error: err } = await supabase
      .from('training_goals')
      .upsert(payload, { onConflict: 'user_id,goal_type' })
      .select()
      .single()
    
    if (!err && data) {
      trainingGoals.value = [data]
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  /**
   * Get goal progress for current week
   * Property 3: Goal progress calculation
   * @param {string} userId - User ID
   * @returns {Promise<{goal: Object, progress: number, isCompleted: boolean}>}
   */
  async function getGoalProgress(userId) {
    // Get user's goal
    const goal = await fetchUserGoal(userId)
    
    // Calculate current week's sessions
    const now = new Date()
    const dayOfWeek = now.getDay()
    
    // Calculate current week start (Monday)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    weekStart.setHours(0, 0, 0, 0)

    const { data, error: err } = await supabase
      .from('training_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', now.toISOString().split('T')[0])

    const progress = data?.length || 0
    const targetValue = goal?.target_value || 3
    const isCompleted = progress >= targetValue

    return {
      goal,
      progress,
      targetValue,
      isCompleted,
      percentage: Math.min(Math.round((progress / targetValue) * 100), 100)
    }
  }

  // ============ STREAKS & ACHIEVEMENTS ============
  // Requirements: 4.1, 4.2, 4.3, 4.4

  // Achievement milestone definitions
  const STREAK_MILESTONES = [7, 14, 30, 60, 90]
  const ACHIEVEMENT_TYPES = {
    7: 'streak_7_days',
    14: 'streak_14_days',
    30: 'streak_30_days',
    60: 'streak_60_days',
    90: 'streak_90_days'
  }

  /**
   * Calculate consecutive training days streak
   * Property 4: Streak calculation correctness
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of consecutive days
   */
  async function calculateStreak(userId) {
    // Get all training logs sorted by date descending
    const { data, error: err } = await supabase
      .from('training_logs')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (err || !data || data.length === 0) {
      return 0
    }

    // Get unique dates (in case of multiple logs per day)
    const uniqueDates = [...new Set(data.map(log => log.date))].sort().reverse()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Check if the most recent log is today or yesterday
    const mostRecentDate = uniqueDates[0]
    if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
      // Streak is broken - gap of more than one day
      return 0
    }

    // Count consecutive days
    let streak = 0
    let checkDate = mostRecentDate === todayStr ? today : yesterday

    for (const dateStr of uniqueDates) {
      const expectedDateStr = checkDate.toISOString().split('T')[0]
      
      if (dateStr === expectedDateStr) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dateStr < expectedDateStr) {
        // Gap found, streak ends
        break
      }
      // If dateStr > expectedDateStr, skip (duplicate date handling)
    }

    return streak
  }

  /**
   * Fetch user's earned achievements
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of achievement objects
   */
  async function fetchUserAchievements(userId) {
    const { data, error: err } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
    
    if (!err) {
      userAchievements.value = data || []
      return data || []
    }
    return []
  }

  /**
   * Check and award achievements based on current streak
   * Property 5: Achievement milestone awards
   * @param {string} userId - User ID
   * @returns {Promise<{newAchievements: Array, currentStreak: number}>}
   */
  async function checkAndAwardAchievements(userId) {
    const currentStreak = await calculateStreak(userId)
    const existingAchievements = await fetchUserAchievements(userId)
    const existingTypes = new Set(existingAchievements.map(a => a.achievement_type))
    
    const newAchievements = []

    // Check each milestone
    for (const milestone of STREAK_MILESTONES) {
      const achievementType = ACHIEVEMENT_TYPES[milestone]
      
      // Award if streak >= milestone and not already earned
      if (currentStreak >= milestone && !existingTypes.has(achievementType)) {
        const { data, error: err } = await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_type: achievementType
          })
          .select()
          .single()
        
        if (!err && data) {
          newAchievements.push(data)
          userAchievements.value.unshift(data)
        }
      }
    }

    return {
      newAchievements,
      currentStreak
    }
  }

  /**
   * Get next milestone to achieve
   * @param {number} currentStreak - Current streak count
   * @returns {{milestone: number, daysRemaining: number}|null}
   */
  function getNextMilestone(currentStreak) {
    for (const milestone of STREAK_MILESTONES) {
      if (currentStreak < milestone) {
        return {
          milestone,
          daysRemaining: milestone - currentStreak
        }
      }
    }
    return null // All milestones achieved
  }

  /**
   * Get achievement display info
   * @param {string} achievementType - Achievement type string
   * @returns {{name: string, icon: string, description: string}}
   */
  function getAchievementInfo(achievementType) {
    const achievementMap = {
      'streak_7_days': {
        name: 'สัปดาห์แรก',
        icon: 'star',
        description: 'ฝึกซ้อมติดต่อกัน 7 วัน'
      },
      'streak_14_days': {
        name: 'สองสัปดาห์',
        icon: 'fire',
        description: 'ฝึกซ้อมติดต่อกัน 14 วัน'
      },
      'streak_30_days': {
        name: 'หนึ่งเดือน',
        icon: 'trophy',
        description: 'ฝึกซ้อมติดต่อกัน 30 วัน'
      },
      'streak_60_days': {
        name: 'สองเดือน',
        icon: 'medal',
        description: 'ฝึกซ้อมติดต่อกัน 60 วัน'
      },
      'streak_90_days': {
        name: 'สามเดือน',
        icon: 'crown',
        description: 'ฝึกซ้อมติดต่อกัน 90 วัน'
      }
    }
    return achievementMap[achievementType] || { name: achievementType, icon: 'badge', description: '' }
  }


  // ============ ANNOUNCEMENTS ============
  async function fetchAnnouncements() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('announcements')
      .select('*, clubs(name), user_profiles(name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (!err) {
      // Map user_profiles to author for consistency
      announcements.value = (data || []).map(a => ({
        ...a,
        author: a.user_profiles
      }))
    }
    else error.value = err.message
    loading.value = false
  }

  async function addAnnouncement(announcement) {
    const { data, error: err } = await supabase
      .from('announcements')
      .insert(announcement)
      .select('*, clubs(name), user_profiles(name)')
      .single()
    
    if (!err && data) {
      const mapped = { ...data, author: data.user_profiles }
      announcements.value.unshift(mapped)
      
      // Send push notification for urgent announcements (Requirement 3.1)
      if (announcement.priority === 'urgent') {
        const notificationType = 'announcement_urgent'
        const pushPayload = {
          title: `🚨 ${data.title}`,
          message: data.content?.substring(0, 200) || data.title,
          type: notificationType,
          referenceType: 'announcement',
          referenceId: data.id,
          url: '/announcements',
          priority: 'urgent',
          targetType: announcement.target_type || 'all',
          clubId: announcement.club_id || undefined
        }
        
        // Send push notification asynchronously (don't block the response)
        sendPushNotification(pushPayload).catch(err => {
          console.error('Failed to send urgent announcement push:', err)
        })
      }
      
      return { success: true, data: mapped }
    }
    return { success: false, message: err?.message }
  }

  async function updateAnnouncement(id, updates) {
    const { data, error: err } = await supabase
      .from('announcements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clubs(name), user_profiles(name)')
      .single()
    
    if (!err && data) {
      const mapped = { ...data, author: data.user_profiles }
      const idx = announcements.value.findIndex(a => a.id === id)
      if (idx !== -1) announcements.value[idx] = mapped
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteAnnouncement(id) {
    const { error: err } = await supabase.from('announcements').delete().eq('id', id)
    if (!err) {
      announcements.value = announcements.value.filter(a => a.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  // ดึงประกาศเร่งด่วนที่ยังไม่ได้อ่าน (กรองตาม target_type และ role)
  async function getUnreadUrgentAnnouncements(userId, userRole, userClubId) {
    // ดึงรายการ announcement_id ที่ user นี้อ่านแล้ว
    const { data: readData } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)
    
    const readIds = new Set((readData || []).map(r => r.announcement_id))
    
    // ดึงประกาศเร่งด่วนทั้งหมด
    const { data, error: err } = await supabase
      .from('announcements')
      .select('*, clubs(name), user_profiles(name)')
      .eq('priority', 'urgent')
      .order('created_at', { ascending: false })
    
    if (!err && data) {
      // กรองตาม target_type, club และสถานะการอ่าน
      return data
        .filter(a => {
          // อ่านแล้ว? ข้าม
          if (readIds.has(a.id)) return false
          
          // ตรวจสอบ target_type
          if (a.target_type === 'all') return true
          if (a.target_type === 'coaches' && userRole === 'coach') return true
          if (a.target_type === 'athletes' && userRole === 'athlete') return true
          if (a.target_type === 'club') {
            // เฉพาะชมรม: ตรวจสอบว่า user อยู่ในชมรมนั้น
            return a.club_id === userClubId || !a.club_id
          }
          
          return false
        })
        .map(a => ({ ...a, author: a.user_profiles }))
    }
    return []
  }

  // Mark announcement as read
  // บันทึกว่าผู้ใช้อ่านประกาศแล้ว
  async function markAnnouncementAsRead(announcementId, userId) {
    const { error: err } = await supabase
      .from('announcement_reads')
      .upsert(
        { 
          announcement_id: announcementId, 
          user_id: userId,
          read_at: new Date().toISOString()
        },
        { 
          onConflict: 'announcement_id,user_id',
          ignoreDuplicates: true
        }
      )
    
    // ไม่ถือว่า error ถ้าเป็น conflict (อ่านซ้ำ)
    return !err || err.code === '23505'
  }

  // ============ ANNOUNCEMENTS REALTIME ============
  // ใช้ Realtime Broadcast เพื่อ scalability ที่ดีกว่า postgres_changes
  const announcementSubscriptions = new Map()

  /**
   * สร้าง handler สำหรับ broadcast events
   */
  function createAnnouncementHandler() {
    return {
      onInsert: async (payload) => {
        // ดึงข้อมูลเต็มของ announcement ใหม่
        const newRecord = payload.payload?.record || payload.payload
        if (!newRecord?.id) return

        // ตรวจสอบว่ามีอยู่แล้วหรือไม่
        const exists = announcements.value.some(a => a.id === newRecord.id)
        if (exists) return

        // ดึงข้อมูลเพิ่มเติม (clubs, user_profiles)
        const { data: fullData } = await supabase
          .from('announcements')
          .select('*, clubs(name), user_profiles(name)')
          .eq('id', newRecord.id)
          .single()

        if (fullData) {
          const mapped = { ...fullData, author: fullData.user_profiles }
          // เพิ่มไว้ด้านบนสุด (ถ้า pinned) หรือตามลำดับ
          if (fullData.is_pinned) {
            announcements.value.unshift(mapped)
          } else {
            // หาตำแหน่งหลัง pinned items
            const firstNonPinnedIdx = announcements.value.findIndex(a => !a.is_pinned)
            if (firstNonPinnedIdx === -1) {
              announcements.value.push(mapped)
            } else {
              announcements.value.splice(firstNonPinnedIdx, 0, mapped)
            }
          }
        }
      },
      onUpdate: async (payload) => {
        // อัพเดท announcement ใน local state
        const updatedRecord = payload.payload?.record || payload.payload
        if (!updatedRecord?.id) return

        const idx = announcements.value.findIndex(a => a.id === updatedRecord.id)
        if (idx === -1) return

        // ดึงข้อมูลเพิ่มเติม
        const { data: fullData } = await supabase
          .from('announcements')
          .select('*, clubs(name), user_profiles(name)')
          .eq('id', updatedRecord.id)
          .single()

        if (fullData) {
          announcements.value[idx] = { ...fullData, author: fullData.user_profiles }
        }
      },
      onDelete: (payload) => {
        // ลบ announcement จาก local state
        const deletedRecord = payload.payload?.old_record || payload.payload
        if (!deletedRecord?.id) return

        announcements.value = announcements.value.filter(a => a.id !== deletedRecord.id)
      }
    }
  }

  /**
   * Subscribe รับ announcements แบบ realtime
   * @param {string|null} clubId - Club ID สำหรับ filter (null = global)
   */
  async function subscribeToAnnouncements(clubId = null) {
    // กำหนด channel name ตาม club
    const channelName = clubId
      ? `announcements:${clubId}`
      : 'announcements:global'

    // ถ้า subscribe channel นี้อยู่แล้ว ไม่ต้องทำซ้ำ
    if (announcementSubscriptions.has(channelName)) return

    // ตั้งค่า auth สำหรับ Realtime Authorization
    await supabase.realtime.setAuth()

    const handler = createAnnouncementHandler()

    // สร้าง subscription ใหม่ พร้อม callback เพื่อ debug
    const subscription = supabase
      .channel(channelName, {
        config: { private: true }
      })
      .on('broadcast', { event: 'INSERT' }, handler.onInsert)
      .on('broadcast', { event: 'UPDATE' }, handler.onUpdate)
      .on('broadcast', { event: 'DELETE' }, handler.onDelete)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Error subscribing to ${channelName}:`, err)
        }
      })

    // เก็บ subscription ไว้
    announcementSubscriptions.set(channelName, subscription)
  }

  /**
   * ยกเลิก subscription announcements ทั้งหมด
   */
  function unsubscribeFromAnnouncements() {
    announcementSubscriptions.forEach((subscription, channelName) => {
      supabase.removeChannel(subscription)
    })
    announcementSubscriptions.clear()
  }

  // ============ EVENTS ============
  const events = ref([])
  const eventRegistrations = ref([])
  const eventCheckins = ref([])

  async function fetchEvents() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('events')
      .select('*, clubs(name)')
      .order('event_date', { ascending: true })
    
    if (!err) events.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addEvent(event) {
    // Generate unique checkin code
    const checkinCode = `EVT-${Date.now().toString(36).toUpperCase()}`
    
    // Clean payload - remove undefined values
    const payload = {
      title: event.title,
      description: event.description || null,
      event_type: event.event_type,
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time || null,
      location: event.location,
      requires_registration: event.requires_registration || false,
      registration_deadline: event.registration_deadline || null,
      max_participants: event.max_participants || null,
      checkin_start_minutes: event.checkin_start_minutes || 30,
      checkin_late_minutes: event.checkin_late_minutes || 15,
      club_id: event.club_id || null,
      created_by: event.created_by || null,
      checkin_code: checkinCode
    }
    
    const { data, error: err } = await supabase
      .from('events')
      .insert(payload)
      .select('*, clubs(name)')
      .single()
    
    if (!err && data) {
      events.value.push(data)
      events.value.sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function updateEvent(id, updates) {
    // Clean payload - convert undefined to null
    const payload = {
      title: updates.title,
      description: updates.description || null,
      event_type: updates.event_type,
      event_date: updates.event_date,
      start_time: updates.start_time,
      end_time: updates.end_time || null,
      location: updates.location,
      requires_registration: updates.requires_registration || false,
      registration_deadline: updates.registration_deadline || null,
      max_participants: updates.max_participants || null,
      checkin_start_minutes: updates.checkin_start_minutes || 30,
      checkin_late_minutes: updates.checkin_late_minutes || 15,
      club_id: updates.club_id || null,
      updated_at: new Date().toISOString()
    }
    
    const { data, error: err } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .select('*, clubs(name)')
      .single()
    
    if (!err && data) {
      const idx = events.value.findIndex(e => e.id === id)
      if (idx !== -1) events.value[idx] = data
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteEvent(id) {
    const { error: err } = await supabase.from('events').delete().eq('id', id)
    if (!err) {
      events.value = events.value.filter(e => e.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  function getEventById(id) {
    return events.value.find(e => e.id === id)
  }

  // Event Registration
  async function registerForEvent(eventId, athleteId) {
    const { data, error: err } = await supabase
      .from('event_registrations')
      .insert({ event_id: eventId, athlete_id: athleteId })
      .select()
      .single()
    
    if (!err && data) {
      // Send notification to event creator/admins
      const event = events.value.find(e => e.id === eventId)
      const athlete = athletes.value.find(a => a.id === athleteId)
      if (event && athlete) {
        await sendEventNotification(event, athlete, 'registration')
      }
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function cancelRegistration(eventId, athleteId) {
    const { error: err } = await supabase
      .from('event_registrations')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('athlete_id', athleteId)
    
    if (!err) return { success: true }
    return { success: false, message: err?.message }
  }

  async function getEventRegistrations(eventId) {
    const { data, error: err } = await supabase
      .from('event_registrations')
      .select('*, athletes(name, email, phone)')
      .eq('event_id', eventId)
      .eq('status', 'registered')
    
    if (!err) return data || []
    return []
  }

  async function getMyRegistration(eventId, athleteId) {
    const { data } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('athlete_id', athleteId)
      .eq('status', 'registered')
      .single()
    
    return data
  }

  // Event Check-in
  async function checkinEvent(eventId, athleteId, method = 'qr') {
    // Get event to calculate status
    const event = events.value.find(e => e.id === eventId)
    if (!event) return { success: false, message: 'ไม่พบกิจกรรม' }

    const now = new Date()
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`)
    const checkinStartTime = new Date(eventDateTime.getTime() - (event.checkin_start_minutes || 30) * 60000)
    const lateTime = new Date(eventDateTime.getTime() + (event.checkin_late_minutes || 15) * 60000)

    // Check if within checkin window
    if (now < checkinStartTime) {
      return { success: false, message: `ยังไม่ถึงเวลาเช็คอิน (เริ่ม ${event.checkin_start_minutes || 30} นาทีก่อนกิจกรรม)` }
    }

    // Determine status
    let checkinStatus = 'on_time'
    if (now > eventDateTime) {
      checkinStatus = now > lateTime ? 'absent' : 'late'
    }

    const { data, error: err } = await supabase
      .from('event_checkins')
      .insert({
        event_id: eventId,
        athlete_id: athleteId,
        checkin_status: checkinStatus,
        checkin_method: method
      })
      .select()
      .single()
    
    if (!err && data) {
      // Send notification to event creator/admins
      const athlete = athletes.value.find(a => a.id === athleteId)
      if (event && athlete) {
        await sendEventNotification(event, athlete, 'checkin', checkinStatus)
      }
      return { success: true, data, status: checkinStatus }
    }
    if (err?.code === '23505') return { success: false, message: 'คุณเช็คอินไปแล้ว' }
    return { success: false, message: err?.message }
  }

  async function manualCheckin(eventId, athleteId, status = 'on_time') {
    const { data, error: err } = await supabase
      .from('event_checkins')
      .upsert({
        event_id: eventId,
        athlete_id: athleteId,
        checkin_status: status,
        checkin_method: 'manual'
      })
      .select()
      .single()
    
    if (!err && data) return { success: true, data }
    return { success: false, message: err?.message }
  }

  async function getEventCheckins(eventId) {
    const { data, error: err } = await supabase
      .from('event_checkins')
      .select('*, athletes(name, email, phone)')
      .eq('event_id', eventId)
    
    if (!err) return data || []
    return []
  }

  async function getMyCheckin(eventId, athleteId) {
    const { data } = await supabase
      .from('event_checkins')
      .select('*')
      .eq('event_id', eventId)
      .eq('athlete_id', athleteId)
      .single()
    
    return data
  }

  // Get event by checkin code (for QR scan)
  async function getEventByCheckinCode(code) {
    const { data, error: err } = await supabase
      .from('events')
      .select('*, clubs(name)')
      .eq('checkin_code', code)
      .single()
    
    if (!err && data) return data
    return null
  }

  // ============ NOTIFICATIONS ============
  const notifications = ref([])

  async function fetchNotifications(userId) {
    const { data, error: err } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (!err) notifications.value = data || []
    return notifications.value
  }

  async function markNotificationRead(notificationId) {
    const { error: err } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    
    if (!err) {
      const idx = notifications.value.findIndex(n => n.id === notificationId)
      if (idx !== -1) notifications.value[idx].is_read = true
    }
  }

  async function markAllNotificationsRead(userId) {
    const { error: err } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (!err) {
      notifications.value.forEach(n => n.is_read = true)
    }
  }

  async function deleteNotification(notificationId) {
    const { error: err } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
    
    if (!err) {
      notifications.value = notifications.value.filter(n => n.id !== notificationId)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function clearAllNotifications(userId) {
    const { error: err } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
    
    if (!err) {
      notifications.value = []
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  // Realtime subscription for notifications
  let notificationSubscription = null

  function subscribeToNotifications(userId) {
    if (notificationSubscription) {
      notificationSubscription.unsubscribe()
    }
    
    notificationSubscription = supabase
      .channel('notifications-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // Add new notification to the top
        notifications.value.unshift(payload.new)
      })
      .subscribe()
  }

  function unsubscribeFromNotifications() {
    if (notificationSubscription) {
      notificationSubscription.unsubscribe()
      notificationSubscription = null
    }
  }

  // Create notification helper
  async function createNotification(userId, title, message, type = 'info', referenceType = null, referenceId = null) {
    const { data, error: err } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        reference_type: referenceType,
        reference_id: referenceId
      })
      .select()
      .single()
    
    if (!err && data) return { success: true, data }
    return { success: false, message: err?.message }
  }

  // Send notification to admins/coaches when athlete registers or checks in
  async function sendEventNotification(event, athlete, actionType, checkinStatus = null) {
    // Get admins and event creator
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
    
    const recipients = new Set()
    
    // Add admins
    admins?.forEach(a => recipients.add(a.id))
    
    // Add event creator
    if (event.created_by) recipients.add(event.created_by)
    
    // Create notification for each recipient
    const title = actionType === 'registration' 
      ? `ลงทะเบียนกิจกรรม: ${event.title}`
      : `เช็คอินกิจกรรม: ${event.title}`
    
    const statusText = checkinStatus === 'on_time' ? 'ตรงเวลา' : checkinStatus === 'late' ? 'สาย' : ''
    const message = actionType === 'registration'
      ? `${athlete.name} ลงทะเบียนเข้าร่วมกิจกรรม "${event.title}"`
      : `${athlete.name} เช็คอินกิจกรรม "${event.title}" ${statusText}`
    
    const notificationsToInsert = Array.from(recipients).map(userId => ({
      user_id: userId,
      title,
      message,
      type: actionType === 'registration' ? 'event_registration' : 'event_checkin',
      reference_type: 'event',
      reference_id: event.id
    }))
    
    if (notificationsToInsert.length > 0) {
      await supabase.from('notifications').insert(notificationsToInsert)
    }
  }

  const unreadNotificationsCount = computed(() => 
    notifications.value.filter(n => !n.is_read).length
  )

  // ============ TOURNAMENTS ============
  async function fetchTournaments() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: false })
    
    if (!err) tournaments.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addTournament(tournament) {
    const { data, error: err } = await supabase
      .from('tournaments')
      .insert(tournament)
      .select()
      .single()
    
    if (!err && data) {
      tournaments.value.unshift(data)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function updateTournament(id, updates) {
    const { data, error: err } = await supabase
      .from('tournaments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (!err && data) {
      const idx = tournaments.value.findIndex(t => t.id === id)
      if (idx !== -1) tournaments.value[idx] = data
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteTournament(id) {
    const { error: err } = await supabase.from('tournaments').delete().eq('id', id)
    if (!err) {
      tournaments.value = tournaments.value.filter(t => t.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  function getTournamentById(id) {
    return tournaments.value.find(t => t.id === id)
  }

  // Tournament Participants
  async function fetchTournamentParticipants(tournamentId) {
    const { data, error: err } = await supabase
      .from('tournament_participants')
      .select('*, athletes(name, email, phone, birth_date), clubs(name), coaches(name)')
      .eq('tournament_id', tournamentId)
      .order('registered_at', { ascending: false })
    
    if (!err) {
      tournamentParticipants.value = data || []
      return data || []
    }
    return []
  }

  async function addTournamentParticipant(participant) {
    const { data, error: err } = await supabase
      .from('tournament_participants')
      .insert(participant)
      .select('*, athletes(name, email, phone), clubs(name), coaches(name)')
      .single()
    
    if (!err && data) {
      tournamentParticipants.value.unshift(data)
      return { success: true, data }
    }
    if (err?.code === '23505') return { success: false, message: 'นักกีฬาคนนี้ลงทะเบียนแล้ว' }
    return { success: false, message: err?.message }
  }

  async function updateParticipantStatus(id, status) {
    // Get participant details with athlete info before update
    const { data: participant } = await supabase
      .from('tournament_participants')
      .select('*, athletes(id, name, user_id), tournaments(id, name)')
      .eq('id', id)
      .single()
    
    const { data, error: err } = await supabase
      .from('tournament_participants')
      .update({ registration_status: status })
      .eq('id', id)
      .select()
      .single()
    
    if (!err && data) {
      const idx = tournamentParticipants.value.findIndex(p => p.id === id)
      if (idx !== -1) tournamentParticipants.value[idx] = { ...tournamentParticipants.value[idx], ...data }
      
      // Send push notification to the affected athlete (Requirement 3.4)
      if (participant?.athletes?.user_id) {
        const statusText = status === 'approved' ? 'ได้รับการอนุมัติ' : 
                          status === 'rejected' ? 'ถูกปฏิเสธ' : 
                          status === 'pending' ? 'รอการอนุมัติ' : status
        
        const pushPayload = {
          userId: participant.athletes.user_id,
          title: 'อัปเดตสถานะการแข่งขัน',
          message: `การลงทะเบียนรายการ "${participant.tournaments?.name || 'การแข่งขัน'}" ${statusText}`,
          type: 'tournament_update',
          referenceType: 'tournament',
          referenceId: participant.tournament_id,
          url: `/tournaments`
        }
        
        sendPushNotification(pushPayload).catch(err => {
          console.error('Failed to send tournament status push:', err)
        })
      }
      
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function removeParticipant(id) {
    const { error: err } = await supabase.from('tournament_participants').delete().eq('id', id)
    if (!err) {
      tournamentParticipants.value = tournamentParticipants.value.filter(p => p.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  // ============ BULK TOURNAMENT OPERATIONS ============
  // Requirements: 1.3, 4.3, 4.4, 6.1

  /**
   * เพิ่มนักกีฬาหลายคนพร้อมกัน
   * Property 2: Bulk add completeness - นักกีฬาที่เพิ่มสำเร็จต้องมี record ในทัวนาเมนต์
   * Property 3: Partial failure handling - ถ้าบางคนล้มเหลว คนอื่นต้องยังเพิ่มได้
   * Validates: Requirements 1.3, 1.5
   * 
   * @param {Object} payload - { tournamentId, athleteIds, category, weightClass, registeredBy }
   * @returns {Promise<{success: boolean, addedCount: number, failedCount: number, failures: Array}>}
   */
  async function bulkAddParticipants(payload) {
    const { tournamentId, athleteIds, category, weightClass, registeredBy } = payload
    
    if (!tournamentId || !athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return { 
        success: false, 
        addedCount: 0, 
        failedCount: 0, 
        failures: [],
        message: 'กรุณาเลือกนักกีฬาอย่างน้อย 1 คน'
      }
    }

    const results = {
      success: true,
      addedCount: 0,
      failedCount: 0,
      failures: []
    }

    // ดึงข้อมูลนักกีฬาทั้งหมดที่เลือก
    const { data: athletesData } = await supabase
      .from('athletes')
      .select('id, club_id, coach_id')
      .in('id', athleteIds)

    const athleteMap = new Map()
    if (athletesData) {
      athletesData.forEach(a => athleteMap.set(a.id, a))
    }

    // เพิ่มทีละคน เพื่อจัดการ error แยกกัน
    for (const athleteId of athleteIds) {
      const athlete = athleteMap.get(athleteId)
      
      const participantData = {
        tournament_id: tournamentId,
        athlete_id: athleteId,
        club_id: athlete?.club_id || null,
        coach_id: athlete?.coach_id || null,
        category: category || null,
        weight_class: weightClass || null,
        registered_by: registeredBy,
        registration_status: 'approved'
      }

      const { data, error: err } = await supabase
        .from('tournament_participants')
        .insert(participantData)
        .select('*, athletes(name, email, phone), clubs(name), coaches(name)')
        .single()

      if (!err && data) {
        results.addedCount++
        tournamentParticipants.value.unshift(data)
      } else {
        results.failedCount++
        results.failures.push({
          athleteId,
          error: err?.code === '23505' ? 'นักกีฬาคนนี้ลงทะเบียนแล้ว' : (err?.message || 'เกิดข้อผิดพลาด')
        })
      }
    }

    // ถ้าทุกคนล้มเหลว ถือว่าไม่สำเร็จ
    if (results.addedCount === 0 && results.failedCount > 0) {
      results.success = false
    }

    return results
  }

  /**
   * ลบผู้เข้าแข่งขันหลายคนพร้อมกัน
   * Property 11: Bulk remove completeness - ผู้เข้าแข่งขันที่เลือกต้องถูกลบทั้งหมด
   * Validates: Requirements 4.3
   * 
   * @param {Array<string>} participantIds - รายการ ID ของผู้เข้าแข่งขันที่จะลบ
   * @returns {Promise<{success: boolean, removedCount: number}>}
   */
  async function bulkRemoveParticipants(participantIds) {
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return { success: false, removedCount: 0, message: 'กรุณาเลือกรายการที่ต้องการลบ' }
    }

    const { error: err } = await supabase
      .from('tournament_participants')
      .delete()
      .in('id', participantIds)

    if (!err) {
      // อัพเดท local state
      const removedSet = new Set(participantIds)
      tournamentParticipants.value = tournamentParticipants.value.filter(p => !removedSet.has(p.id))
      return { success: true, removedCount: participantIds.length }
    }

    return { success: false, removedCount: 0, message: err?.message }
  }

  /**
   * เปลี่ยนรุ่น/ประเภทของผู้เข้าแข่งขันหลายคนพร้อมกัน
   * Property 12: Bulk category update consistency - ผู้เข้าแข่งขันที่เลือกต้องมี category ใหม่
   * Validates: Requirements 4.4
   * 
   * @param {Array<string>} participantIds - รายการ ID ของผู้เข้าแข่งขัน
   * @param {string} category - รุ่น/ประเภทใหม่
   * @returns {Promise<{success: boolean, updatedCount: number}>}
   */
  async function bulkUpdateCategory(participantIds, category) {
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return { success: false, updatedCount: 0, message: 'กรุณาเลือกรายการที่ต้องการแก้ไข' }
    }

    const { data, error: err } = await supabase
      .from('tournament_participants')
      .update({ category: category || null })
      .in('id', participantIds)
      .select()

    if (!err) {
      // อัพเดท local state
      const updatedMap = new Map()
      if (data) {
        data.forEach(p => updatedMap.set(p.id, p))
      }

      tournamentParticipants.value = tournamentParticipants.value.map(p => {
        if (updatedMap.has(p.id)) {
          return { ...p, category: category || null }
        }
        return p
      })

      return { success: true, updatedCount: participantIds.length }
    }

    return { success: false, updatedCount: 0, message: err?.message }
  }

  /**
   * ดึงสถิติการลงทะเบียนของทัวนาเมนต์
   * Property 15: Statistics count accuracy
   * Property 16: Remaining slots calculation
   * Validates: Requirements 6.1
   * 
   * @param {string} tournamentId - ID ของทัวนาเมนต์
   * @returns {Object} - สถิติการลงทะเบียน
   */
  function getRegistrationStats(tournamentId) {
    const tournament = tournaments.value.find(t => t.id === tournamentId)
    const participants = tournamentParticipants.value.filter(p => p.tournament_id === tournamentId)
    
    const stats = {
      totalRegistered: participants.length,
      maxParticipants: tournament?.max_participants || null,
      remainingSlots: null,
      byStatus: {
        pending: 0,
        approved: 0,
        rejected: 0,
        withdrawn: 0
      },
      byCategory: new Map()
    }

    // นับตาม status และ category
    for (const participant of participants) {
      const status = participant.registration_status || 'pending'
      if (stats.byStatus.hasOwnProperty(status)) {
        stats.byStatus[status]++
      }

      const category = participant.category || 'uncategorized'
      stats.byCategory.set(category, (stats.byCategory.get(category) || 0) + 1)
    }

    // คำนวณ remaining slots
    if (stats.maxParticipants !== null && stats.maxParticipants > 0) {
      stats.remainingSlots = Math.max(0, stats.maxParticipants - stats.totalRegistered)
    }

    return stats
  }

  // Tournament Matches
  // ดึงข้อมูลการแข่งขันพร้อมข้อมูลนักกีฬาและชมรม
  async function fetchTournamentMatches(tournamentId) {
    const { data, error: err } = await supabase
      .from('tournament_matches')
      .select('*, tournament_participants(athlete_id, club_id, athletes(name), clubs(name))')
      .eq('tournament_id', tournamentId)
      .order('match_date', { ascending: true })
    
    if (!err) {
      tournamentMatches.value = data || []
      return data || []
    }
    return []
  }

  async function addTournamentMatch(match) {
    const { data, error: err } = await supabase
      .from('tournament_matches')
      .insert(match)
      .select('*, tournament_participants(athlete_id, club_id, athletes(name), clubs(name))')
      .single()
    
    if (!err && data) {
      tournamentMatches.value.push(data)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function updateTournamentMatch(id, updates) {
    const { data, error: err } = await supabase
      .from('tournament_matches')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, tournament_participants(athlete_id, club_id, athletes(name), clubs(name))')
      .single()
    
    if (!err && data) {
      const idx = tournamentMatches.value.findIndex(m => m.id === id)
      if (idx !== -1) tournamentMatches.value[idx] = data
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function deleteTournamentMatch(id) {
    const { error: err } = await supabase.from('tournament_matches').delete().eq('id', id)
    if (!err) {
      tournamentMatches.value = tournamentMatches.value.filter(m => m.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  // Tournament Awards
  async function fetchTournamentAwards(tournamentId) {
    const { data, error: err } = await supabase
      .from('tournament_awards')
      .select('*, tournament_participants(athlete_id, athletes(name))')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })
    
    if (!err) {
      tournamentAwards.value = data || []
      return data || []
    }
    return []
  }

  async function addTournamentAward(award) {
    const { data, error: err } = await supabase
      .from('tournament_awards')
      .insert(award)
      .select('*, tournament_participants(athlete_id, athletes(name))')
      .single()
    
    if (!err && data) {
      tournamentAwards.value.unshift(data)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  async function deleteTournamentAward(id) {
    const { error: err } = await supabase.from('tournament_awards').delete().eq('id', id)
    if (!err) {
      tournamentAwards.value = tournamentAwards.value.filter(a => a.id !== id)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  // Get athlete tournament history
  async function getAthleteHistory(athleteId) {
    const { data: participations } = await supabase
      .from('tournament_participants')
      .select(`
        *,
        tournaments(name, sport_type, start_date, end_date, location),
        tournament_matches(match_date, opponent_name, result, score),
        tournament_awards(award_type, award_name, awarded_date)
      `)
      .eq('athlete_id', athleteId)
      .order('registered_at', { ascending: false })
    
    return participations || []
  }

  // ============ ATHLETE DOCUMENTS ============
  async function fetchAthleteDocuments(athleteId) {
    const { data, error: err } = await supabase
      .from('athlete_documents')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('uploaded_at', { ascending: false })
    
    if (!err) return data || []
    return []
  }

  async function addAthleteDocument(doc) {
    const { data, error: err } = await supabase
      .from('athlete_documents')
      .insert(doc)
      .select()
      .single()
    
    if (!err && data) return { success: true, data }
    return { success: false, message: err?.message }
  }

  async function deleteAthleteDocument(id) {
    const { error: err } = await supabase.from('athlete_documents').delete().eq('id', id)
    if (!err) return { success: true }
    return { success: false, message: err?.message }
  }

  async function verifyAthleteDocument(id, verifiedBy) {
    const { data, error: err } = await supabase
      .from('athlete_documents')
      .update({ verified: true, verified_at: new Date().toISOString(), verified_by: verifiedBy })
      .eq('id', id)
      .select()
      .single()
    
    if (!err && data) return { success: true, data }
    return { success: false, message: err?.message }
  }

  // ============ CLUB APPLICATIONS (ใบสมัครชมรม) ============
  const clubApplications = ref([])

  async function fetchClubApplications(filters = {}) {
    loading.value = true
    let query = supabase
      .from('club_applications')
      .select('*, athletes(id, name, email, phone, birth_date), clubs(id, name, sport)')
      .order('applied_at', { ascending: false })
    
    if (filters.clubId) query = query.eq('club_id', filters.clubId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.athleteId) query = query.eq('athlete_id', filters.athleteId)
    
    const { data, error: err } = await query
    
    if (!err) clubApplications.value = data || []
    else error.value = err.message
    loading.value = false
    return clubApplications.value
  }

  async function createClubApplication(athleteId, clubId, notes = null) {
    const { data, error: err } = await supabase
      .from('club_applications')
      .insert({ athlete_id: athleteId, club_id: clubId, notes })
      .select('*, athletes(id, name, email, phone), clubs(id, name, sport)')
      .single()
    
    if (!err && data) {
      clubApplications.value.unshift(data)
      // ส่ง notification ไปยัง admin และ coach ของชมรม
      await sendApplicationNotification(data, 'new')
      return { success: true, data }
    }
    if (err?.code === '23505') return { success: false, message: 'คุณได้สมัครชมรมนี้ไปแล้ว' }
    return { success: false, message: err?.message }
  }

  async function approveApplication(applicationId, reviewerId, reviewerRole) {
    const { data, error: err } = await supabase
      .from('club_applications')
      .update({ 
        status: 'approved', 
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        reviewer_role: reviewerRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select('*, athletes(id, name, email, phone, user_id), clubs(id, name)')
      .single()
    
    if (!err && data) {
      // อัพเดท athlete ให้เข้าชมรม
      await supabase
        .from('athletes')
        .update({ 
          club_id: data.club_id, 
          registration_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.athlete_id)
      
      // อัพเดท user_profiles ด้วย
      if (data.athletes?.user_id) {
        await supabase
          .from('user_profiles')
          .update({ club_id: data.club_id })
          .eq('id', data.athletes.user_id)
      }
      
      // อัพเดท local state
      const idx = clubApplications.value.findIndex(a => a.id === applicationId)
      if (idx !== -1) clubApplications.value[idx] = data
      
      // ส่ง notification ไปยังนักกีฬา
      await sendApplicationNotification(data, 'approved')
      
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function rejectApplication(applicationId, reviewerId, reviewerRole, reason = null) {
    const { data, error: err } = await supabase
      .from('club_applications')
      .update({ 
        status: 'rejected', 
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        reviewer_role: reviewerRole,
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select('*, athletes(id, name, email, phone, user_id), clubs(id, name)')
      .single()
    
    if (!err && data) {
      const idx = clubApplications.value.findIndex(a => a.id === applicationId)
      if (idx !== -1) clubApplications.value[idx] = data
      
      // ส่ง notification ไปยังนักกีฬา
      await sendApplicationNotification(data, 'rejected')
      
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  async function getMyApplications(athleteId) {
    const { data, error: err } = await supabase
      .from('club_applications')
      .select('*, clubs(id, name, sport)')
      .eq('athlete_id', athleteId)
      .order('applied_at', { ascending: false })
    
    if (!err) return data || []
    return []
  }

  async function sendApplicationNotification(application, actionType) {
    const recipients = new Set()
    
    if (actionType === 'new') {
      // แจ้ง admin ทั้งหมด
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
      admins?.forEach(a => recipients.add(a.id))
      
      // แจ้ง coach ของชมรม
      const { data: clubCoaches } = await supabase
        .from('coaches')
        .select('user_id')
        .eq('club_id', application.club_id)
      clubCoaches?.forEach(c => c.user_id && recipients.add(c.user_id))
      
      const title = 'ใบสมัครใหม่'
      const message = `${application.athletes?.name || 'นักกีฬา'} สมัครเข้าชมรม ${application.clubs?.name || ''}`
      
      const notifs = Array.from(recipients).map(userId => ({
        user_id: userId,
        title,
        message,
        type: 'info',
        reference_type: 'club_application',
        reference_id: application.id
      }))
      
      if (notifs.length > 0) await supabase.from('notifications').insert(notifs)
      
      // Send push notification to admins and coaches
      if (recipients.size > 0) {
        const pushPayload = {
          userIds: Array.from(recipients),
          title,
          message,
          type: 'club_application',
          referenceType: 'club_application',
          referenceId: application.id,
          url: '/club-applications'
        }
        
        sendPushNotification(pushPayload).catch(err => {
          console.error('Failed to send new application push:', err)
        })
      }
    } else {
      // แจ้งนักกีฬา (Requirement 3.5)
      if (application.athletes?.user_id) {
        const title = actionType === 'approved' ? 'ใบสมัครได้รับการอนุมัติ' : 'ใบสมัครถูกปฏิเสธ'
        const message = actionType === 'approved' 
          ? `ยินดีต้อนรับสู่ชมรม ${application.clubs?.name || ''}`
          : `ใบสมัครชมรม ${application.clubs?.name || ''} ถูกปฏิเสธ${application.rejection_reason ? ': ' + application.rejection_reason : ''}`
        
        // In-app notification
        await supabase.from('notifications').insert({
          user_id: application.athletes.user_id,
          title,
          message,
          type: actionType === 'approved' ? 'success' : 'warning',
          reference_type: 'club_application',
          reference_id: application.id
        })
        
        // Push notification (Requirement 3.5)
        const pushPayload = {
          userId: application.athletes.user_id,
          title,
          message,
          type: 'club_application',
          referenceType: 'club_application',
          referenceId: application.id,
          url: '/my-applications'
        }
        
        sendPushNotification(pushPayload).catch(err => {
          console.error('Failed to send application status push:', err)
        })
      }
    }
  }

  // Computed: นับใบสมัครที่รออนุมัติ
  const pendingApplicationsCount = computed(() => 
    clubApplications.value.filter(a => a.status === 'pending').length
  )

  // ============ USER ALBUMS ============
  // Requirements: 1.2, 1.3, 1.4, 3.4

  /**
   * Fetch all albums for a user, sorted by updated_at desc
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Albums array
   */
  async function fetchUserAlbums(userId) {
    loading.value = true
    const { data, error: err } = await supabase
      .from('user_albums')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (!err) userAlbums.value = data || []
    else error.value = err.message
    loading.value = false
    return userAlbums.value
  }

  /**
   * Create a new album with validation
   * @param {Object} albumData - Album data { user_id, name, description?, album_type? }
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
   */
  async function createAlbum(albumData) {
    // Validate name is not empty or whitespace-only (Requirement 1.5)
    if (!albumData.name || albumData.name.trim() === '') {
      return { success: false, message: 'กรุณาระบุชื่ออัลบั้ม' }
    }

    const payload = {
      user_id: albumData.user_id,
      name: albumData.name.trim(),
      description: albumData.description?.trim() || null,
      album_type: albumData.album_type || 'general',
      cover_image_url: albumData.cover_image_url || null
    }

    const { data, error: err } = await supabase
      .from('user_albums')
      .insert(payload)
      .select()
      .single()
    
    if (!err && data) {
      userAlbums.value.unshift(data)
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  /**
   * Update an existing album
   * @param {string} albumId - Album ID
   * @param {Object} albumData - Updated album data
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async function updateAlbum(albumId, albumData) {
    // Validate name if provided
    if (albumData.name !== undefined && (!albumData.name || albumData.name.trim() === '')) {
      return { success: false, message: 'กรุณาระบุชื่ออัลบั้ม' }
    }

    const updates = {
      updated_at: new Date().toISOString()
    }
    
    if (albumData.name !== undefined) updates.name = albumData.name.trim()
    if (albumData.description !== undefined) updates.description = albumData.description?.trim() || null
    if (albumData.album_type !== undefined) updates.album_type = albumData.album_type
    if (albumData.cover_image_url !== undefined) updates.cover_image_url = albumData.cover_image_url

    const { data, error: err } = await supabase
      .from('user_albums')
      .update(updates)
      .eq('id', albumId)
      .select()
      .single()
    
    if (!err && data) {
      const idx = userAlbums.value.findIndex(a => a.id === albumId)
      if (idx !== -1) userAlbums.value[idx] = data
      // Re-sort by updated_at
      userAlbums.value.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      return { success: true, data }
    }
    return { success: false, message: err?.message }
  }

  /**
   * Delete an album and cascade delete all associated media
   * @param {string} albumId - Album ID
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async function deleteAlbum(albumId) {
    // First, get all media items for this album to delete from storage
    const { data: mediaItems } = await supabase
      .from('album_media')
      .select('id, file_url')
      .eq('album_id', albumId)
    
    // Delete files from storage
    if (mediaItems && mediaItems.length > 0) {
      const filePaths = mediaItems.map(m => {
        // Extract path from URL: profile-albums/{user_id}/{album_id}/{filename}
        const url = new URL(m.file_url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/profile-albums\/(.+)/)
        return pathMatch ? pathMatch[1] : null
      }).filter(Boolean)
      
      if (filePaths.length > 0) {
        await supabase.storage.from('profile-albums').remove(filePaths)
      }
    }
    
    // Delete album (cascade will delete album_media records)
    const { error: err } = await supabase
      .from('user_albums')
      .delete()
      .eq('id', albumId)
    
    if (!err) {
      userAlbums.value = userAlbums.value.filter(a => a.id !== albumId)
      // Also clear albumMedia if it was for this album
      albumMedia.value = albumMedia.value.filter(m => m.album_id !== albumId)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  /**
   * Get album by ID
   * @param {string} albumId - Album ID
   * @returns {Object|undefined} Album object
   */
  function getAlbumById(albumId) {
    return userAlbums.value.find(a => a.id === albumId)
  }

  /**
   * Get albums filtered by type
   * @param {string} userId - User ID
   * @param {string} albumType - Album type (competition, training, documents, general)
   * @returns {Array} Filtered albums
   */
  function getAlbumsByType(userId, albumType) {
    return userAlbums.value.filter(a => a.user_id === userId && a.album_type === albumType)
  }

  // ============ ALBUM MEDIA ============
  // Requirements: 2.2, 2.3, 2.4, 2.5, 3.3

  // Allowed file types and max size
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  /**
   * Validate file type and size
   * @param {File} file - File to validate
   * @returns {{valid: boolean, error?: string}}
   */
  function validateFile(file) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { valid: false, error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF' }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'ไฟล์ต้องไม่เกิน 10MB' }
    }
    return { valid: true }
  }

  /**
   * Fetch all media items for an album
   * @param {string} albumId - Album ID
   * @returns {Promise<Array>} Media items array
   */
  async function fetchAlbumMedia(albumId) {
    loading.value = true
    const { data, error: err } = await supabase
      .from('album_media')
      .select('*')
      .eq('album_id', albumId)
      .order('uploaded_at', { ascending: false })
    
    if (!err) albumMedia.value = data || []
    else error.value = err.message
    loading.value = false
    return albumMedia.value
  }

  /**
   * Upload media file to album
   * @param {string} albumId - Album ID
   * @param {File} file - File to upload
   * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
   */
  async function uploadMedia(albumId, file) {
    // Validate file (Requirements 2.2, 2.3)
    const validation = validateFile(file)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    // Get album to get user_id
    let album = userAlbums.value.find(a => a.id === albumId)
    if (!album) {
      // Try to fetch from DB
      const { data: albumData } = await supabase
        .from('user_albums')
        .select('user_id')
        .eq('id', albumId)
        .single()
      
      if (!albumData) {
        return { success: false, message: 'ไม่พบอัลบั้ม' }
      }
      album = albumData
    }

    const userId = album.user_id

    // Check storage quota before upload (Requirement 6.2)
    const quotaCheck = await checkStorageQuota(userId)
    if (!quotaCheck.canUpload) {
      return { success: false, message: 'พื้นที่เก็บข้อมูลเต็ม กรุณาลบไฟล์เก่าก่อน' }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${userId}/${albumId}/${fileName}`

    // Upload to Supabase Storage (Requirement 2.4)
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('profile-albums')
      .upload(storagePath, file)
    
    if (uploadErr) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-albums')
      .getPublicUrl(storagePath)

    // Create database record (Requirement 2.5)
    const mediaRecord = {
      album_id: albumId,
      user_id: userId,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      thumbnail_url: file.type.startsWith('image/') ? urlData.publicUrl : null
    }

    const { data, error: err } = await supabase
      .from('album_media')
      .insert(mediaRecord)
      .select()
      .single()
    
    if (!err && data) {
      albumMedia.value.unshift(data)
      
      // Update album's updated_at timestamp
      await supabase
        .from('user_albums')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', albumId)
      
      return { success: true, data }
    }

    // If DB insert failed, try to clean up storage
    await supabase.storage.from('profile-albums').remove([storagePath])
    return { success: false, message: err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }
  }

  /**
   * Delete media item from storage and database
   * @param {string} mediaId - Media ID
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async function deleteMedia(mediaId) {
    // Get media record first
    const media = albumMedia.value.find(m => m.id === mediaId)
    let fileUrl = media?.file_url

    if (!fileUrl) {
      const { data: mediaData } = await supabase
        .from('album_media')
        .select('file_url, album_id')
        .eq('id', mediaId)
        .single()
      
      if (!mediaData) {
        return { success: false, message: 'ไม่พบไฟล์' }
      }
      fileUrl = mediaData.file_url
    }

    // Extract storage path from URL
    const url = new URL(fileUrl)
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/profile-albums\/(.+)/)
    const storagePath = pathMatch ? pathMatch[1] : null

    // Delete from storage (Requirement 3.3)
    if (storagePath) {
      await supabase.storage.from('profile-albums').remove([storagePath])
    }

    // Delete from database (Requirement 3.3)
    const { error: err } = await supabase
      .from('album_media')
      .delete()
      .eq('id', mediaId)
    
    if (!err) {
      albumMedia.value = albumMedia.value.filter(m => m.id !== mediaId)
      return { success: true }
    }
    return { success: false, message: err?.message }
  }

  /**
   * Get media item by ID
   * @param {string} mediaId - Media ID
   * @returns {Object|undefined} Media object
   */
  function getMediaById(mediaId) {
    return albumMedia.value.find(m => m.id === mediaId)
  }

  // ============ STORAGE STATISTICS ============
  // Requirements: 6.2, 6.3

  const STORAGE_QUOTA_BYTES = 100 * 1024 * 1024 // 100MB per user

  /**
   * Get storage statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<{totalFiles: number, totalSize: number, quotaUsedPercent: number}>}
   */
  async function getUserStorageStats(userId) {
    const { data, error: err } = await supabase
      .from('album_media')
      .select('file_size')
      .eq('user_id', userId)
    
    if (err) {
      return { totalFiles: 0, totalSize: 0, quotaUsedPercent: 0 }
    }

    const totalFiles = data?.length || 0
    const totalSize = data?.reduce((sum, m) => sum + (m.file_size || 0), 0) || 0
    const quotaUsedPercent = Math.round((totalSize / STORAGE_QUOTA_BYTES) * 100)

    return { totalFiles, totalSize, quotaUsedPercent }
  }

  /**
   * Check if user can upload more files (quota check)
   * @param {string} userId - User ID
   * @returns {Promise<{canUpload: boolean, remainingBytes: number}>}
   */
  async function checkStorageQuota(userId) {
    const stats = await getUserStorageStats(userId)
    const remainingBytes = STORAGE_QUOTA_BYTES - stats.totalSize
    const canUpload = remainingBytes > 0

    return { canUpload, remainingBytes }
  }

  // ============ STATS ============
  const stats = computed(() => ({
    totalClubs: clubs.value.length,
    totalCoaches: coaches.value.length,
    totalAthletes: athletes.value.length,
    totalSchedules: schedules.value.length,
    totalLogs: trainingLogs.value.length,
    totalAnnouncements: announcements.value.length,
    totalEvents: events.value.length,
    totalTournaments: tournaments.value.length,
    pendingApplications: pendingApplicationsCount.value
  }))

  // ============ COMPUTED ============
  const upcomingSchedules = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return schedules.value.filter(s => s.date >= today)
  })

  // ============ INIT ============
  async function initData() {
    await Promise.all([
      fetchClubs(),
      fetchCoaches(),
      fetchAthletes(),
      fetchSchedules(),
      fetchTrainingLogs(),
      fetchAnnouncements(),
      fetchEvents(),
      fetchTournaments()
    ])
  }

  // ============ BACKUP (Admin only) ============
  async function exportData() {
    const data = {
      clubs: clubs.value,
      coaches: coaches.value,
      athletes: athletes.value,
      schedules: schedules.value,
      trainingLogs: trainingLogs.value,
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  }

  return {
    // State
    clubs, coaches, athletes, schedules, trainingLogs, announcements, events, notifications,
    tournaments, tournamentParticipants, tournamentMatches, tournamentAwards,
    clubApplications, pendingApplicationsCount,
    userAlbums, albumMedia,
    unreadNotificationsCount,
    loading, error, stats, upcomingSchedules,
    
    // Clubs
    fetchClubs, addClub, updateClub, deleteClub, getClubById,
    
    // Coaches
    fetchCoaches, addCoach, updateCoach, deleteCoach, getCoachById, getCoachesByClub,
    
    // Athletes
    fetchAthletes, addAthlete, updateAthlete, deleteAthlete, 
    getAthleteById, getAthletesByClub, getAthletesByCoach,
    
    // Schedules
    fetchSchedules, addSchedule, updateSchedule, deleteSchedule,
    getScheduleResponses, respondToSchedule, getMyScheduleResponse,
    
    // Training Logs
    fetchTrainingLogs, addTrainingLog, updateTrainingLog, deleteTrainingLog,
    
    // Activity Categories (Requirements: 1.4, 6.2, 6.3)
    activityCategories,
    fetchActivityCategories, fetchAllActivityCategories,
    addActivityCategory, updateActivityCategory,
    getCategoryById, filterLogsByCategory,
    
    // Training Statistics (Requirements: 2.1, 2.2, 2.3, 2.4)
    getTrainingStats, getWeeklyComparison, getCategoryDistribution, getWeeklyChartData,
    
    // Training Goals (Requirements: 3.1, 3.2, 3.3)
    trainingGoals,
    fetchUserGoal, setUserGoal, getGoalProgress,
    
    // Streaks & Achievements (Requirements: 4.1, 4.2, 4.3, 4.4)
    userAchievements,
    calculateStreak, fetchUserAchievements, checkAndAwardAchievements,
    getNextMilestone, getAchievementInfo,
    STREAK_MILESTONES, ACHIEVEMENT_TYPES,
    
    // Announcements
    fetchAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
    getUnreadUrgentAnnouncements, markAnnouncementAsRead,
    subscribeToAnnouncements, unsubscribeFromAnnouncements,
    
    // Events
    fetchEvents, addEvent, updateEvent, deleteEvent, getEventById,
    registerForEvent, cancelRegistration, getEventRegistrations, getMyRegistration,
    checkinEvent, manualCheckin, getEventCheckins, getMyCheckin, getEventByCheckinCode,
    
    // Tournaments
    fetchTournaments, addTournament, updateTournament, deleteTournament, getTournamentById,
    fetchTournamentParticipants, addTournamentParticipant, updateParticipantStatus, removeParticipant,
    fetchTournamentMatches, addTournamentMatch, updateTournamentMatch, deleteTournamentMatch,
    fetchTournamentAwards, addTournamentAward, deleteTournamentAward,
    getAthleteHistory,
    
    // Bulk Tournament Operations (Requirements: 1.3, 4.3, 4.4, 6.1)
    bulkAddParticipants, bulkRemoveParticipants, bulkUpdateCategory, getRegistrationStats,
    
    // Athlete Documents
    fetchAthleteDocuments, addAthleteDocument, deleteAthleteDocument, verifyAthleteDocument,
    
    // Club Applications (ใบสมัครชมรม)
    fetchClubApplications, createClubApplication, approveApplication, rejectApplication, getMyApplications,
    
    // Notifications
    fetchNotifications, markNotificationRead, markAllNotificationsRead,
    deleteNotification, clearAllNotifications,
    subscribeToNotifications, unsubscribeFromNotifications, createNotification,
    
    // User Albums (Profile Album)
    fetchUserAlbums, createAlbum, updateAlbum, deleteAlbum, getAlbumById, getAlbumsByType,
    
    // Album Media
    fetchAlbumMedia, uploadMedia, deleteMedia, getMediaById, validateFile,
    ALLOWED_MIME_TYPES, MAX_FILE_SIZE,
    
    // Storage Statistics
    getUserStorageStats, checkStorageQuota, STORAGE_QUOTA_BYTES,
    
    // Utils
    initData, exportData
  }
})
