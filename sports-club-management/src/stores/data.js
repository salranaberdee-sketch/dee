import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

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
  async function fetchAthletes() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('athletes')
      .select('*, clubs(name), coaches(name)')
      .order('created_at', { ascending: false })
    
    if (!err) athletes.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addAthlete(athlete) {
    const { data, error: err } = await supabase
      .from('athletes')
      .insert(athlete)
      .select('*, clubs(name), coaches(name)')
      .single()
    
    if (!err && data) {
      athletes.value.unshift(data)
      return { success: true, data }
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
      const idx = athletes.value.findIndex(a => a.id === id)
      if (idx !== -1) athletes.value[idx] = data
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
  async function fetchTrainingLogs() {
    loading.value = true
    const { data, error: err } = await supabase
      .from('training_logs')
      .select('*, athletes(name), coaches(name), clubs(name)')
      .order('date', { ascending: false })
    
    if (!err) trainingLogs.value = data || []
    else error.value = err.message
    loading.value = false
  }

  async function addTrainingLog(log) {
    const { data, error: err } = await supabase
      .from('training_logs')
      .insert(log)
      .select('*, athletes(name), coaches(name), clubs(name)')
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
      .select('*, athletes(name), coaches(name), clubs(name)')
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

  // Get unread urgent announcements for popup (filtered by target_type and role)
  async function getUnreadUrgentAnnouncements(userId, userRole, userClubId) {
    const { data, error: err } = await supabase
      .from('announcements')
      .select('*, clubs(name), user_profiles(name), announcement_reads!left(user_id)')
      .eq('priority', 'urgent')
      .order('created_at', { ascending: false })
    
    if (!err && data) {
      // Filter by target_type and club, then filter out already read
      return data
        .filter(a => {
          // Already read? Skip
          if (a.announcement_reads?.some(r => r.user_id === userId)) return false
          
          // Check target_type
          if (a.target_type === 'all') return true
          if (a.target_type === 'coaches' && userRole === 'coach') return true
          if (a.target_type === 'athletes' && userRole === 'athlete') return true
          if (a.target_type === 'club') {
            // Club-specific: check if user is in that club
            return a.club_id === userClubId || !a.club_id
          }
          
          return false
        })
        .map(a => ({ ...a, author: a.user_profiles }))
    }
    return []
  }

  // Mark announcement as read
  async function markAnnouncementAsRead(announcementId, userId) {
    const { error: err } = await supabase
      .from('announcement_reads')
      .upsert({ announcement_id: announcementId, user_id: userId })
    
    return !err
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
    const { data, error: err } = await supabase
      .from('tournament_participants')
      .update({ registration_status: status })
      .eq('id', id)
      .select()
      .single()
    
    if (!err && data) {
      const idx = tournamentParticipants.value.findIndex(p => p.id === id)
      if (idx !== -1) tournamentParticipants.value[idx] = { ...tournamentParticipants.value[idx], ...data }
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

  // Tournament Matches
  async function fetchTournamentMatches(tournamentId) {
    const { data, error: err } = await supabase
      .from('tournament_matches')
      .select('*, tournament_participants(athlete_id, athletes(name))')
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
      .select('*, tournament_participants(athlete_id, athletes(name))')
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
      .select('*, tournament_participants(athlete_id, athletes(name))')
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
      .select('*, athletes(id, name, email, phone, birth_date), clubs(id, name, sport), reviewer:reviewed_by(id, name)')
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
    } else {
      // แจ้งนักกีฬา
      if (application.athletes?.user_id) {
        const title = actionType === 'approved' ? 'ใบสมัครได้รับการอนุมัติ' : 'ใบสมัครถูกปฏิเสธ'
        const message = actionType === 'approved' 
          ? `ยินดีต้อนรับสู่ชมรม ${application.clubs?.name || ''}`
          : `ใบสมัครชมรม ${application.clubs?.name || ''} ถูกปฏิเสธ${application.rejection_reason ? ': ' + application.rejection_reason : ''}`
        
        await supabase.from('notifications').insert({
          user_id: application.athletes.user_id,
          title,
          message,
          type: actionType === 'approved' ? 'success' : 'warning',
          reference_type: 'club_application',
          reference_id: application.id
        })
      }
    }
  }

  // Computed: นับใบสมัครที่รออนุมัติ
  const pendingApplicationsCount = computed(() => 
    clubApplications.value.filter(a => a.status === 'pending').length
  )

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
    
    // Announcements
    fetchAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
    getUnreadUrgentAnnouncements, markAnnouncementAsRead,
    
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
    
    // Athlete Documents
    fetchAthleteDocuments, addAthleteDocument, deleteAthleteDocument, verifyAthleteDocument,
    
    // Club Applications (ใบสมัครชมรม)
    fetchClubApplications, createClubApplication, approveApplication, rejectApplication, getMyApplications,
    
    // Notifications
    fetchNotifications, markNotificationRead, markAllNotificationsRead,
    
    // Utils
    initData, exportData
  }
})
