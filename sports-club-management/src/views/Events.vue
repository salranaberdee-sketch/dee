<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'
import QRCodeDisplay from '@/components/QRCodeDisplay.vue'
import QRScanner from '@/components/QRScanner.vue'

const data = useDataStore()
const auth = useAuthStore()

// Constants
const MAX_CALENDAR_EVENTS_DISPLAY = 3
const MAX_PAST_EVENTS_DISPLAY = 10
const MAX_TODAY_EVENTS_PREVIEW = 3
const DEFAULT_CHECKIN_START_MINUTES = 30
const DEFAULT_CHECKIN_LATE_MINUTES = 15
const MAX_CHECKIN_DURATION_HOURS = 2
const MILLISECONDS_PER_MINUTE = 60000
const MINUTES_PER_HOUR = 60
const CALENDAR_GRID_SIZE = 42
const TIME_FORMAT_LENGTH = 5

// View mode
const viewMode = ref('list') // 'list' | 'calendar'
const currentMonth = ref(new Date())
const loading = ref(false)
const error = ref(null)

// Filters
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')
const filterClub = ref('')
const filterDateRange = ref('all') // 'all' | 'today' | 'week' | 'month'

const showForm = ref(false)
const showDetail = ref(false)
const showQRScanner = ref(false)
const showExportModal = ref(false)
const editingEvent = ref(null)
const selectedEvent = ref(null)
const checkins = ref([])
const registrations = ref([])
const myRegistration = ref(null)
const myCheckin = ref(null)
const scanResult = ref('')
const exportLoading = ref(false)

const form = ref({
  title: '',
  description: '',
  event_type: 'training',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  requires_registration: false,
  registration_deadline: '',
  max_participants: null,
  enable_checkin_settings: true,
  checkin_start_minutes: 30,
  checkin_late_minutes: 15,
  club_id: ''
})

const eventTypes = [
  { value: 'training', label: 'ฝึกซ้อม' },
  { value: 'competition', label: 'แข่งขัน' },
  { value: 'test', label: 'ทดสอบ' },
  { value: 'other', label: 'อื่นๆ' }
]

const statusOptions = [
  { value: 'upcoming', label: 'กำลังจะมาถึง' },
  { value: 'ongoing', label: 'กำลังดำเนินการ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' }
]

const isAdmin = computed(() => auth.profile?.role === 'admin')
const isCoach = computed(() => auth.profile?.role === 'coach')
const isAthlete = computed(() => auth.profile?.role === 'athlete')
const canManage = computed(() => isAdmin.value || isCoach.value)

// Filtered events with search and filters
const filteredEvents = computed(() => {
  let events = data.events
  
  // Role-based filter
  if (!isAdmin.value) {
    events = events.filter(e => !e.club_id || e.club_id === auth.profile?.club_id)
  }
  
  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    events = events.filter(e => 
      e.title.toLowerCase().includes(q) || 
      e.location?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    )
  }
  
  // Type filter
  if (filterType.value) {
    events = events.filter(e => e.event_type === filterType.value)
  }
  
  // Status filter
  if (filterStatus.value) {
    events = events.filter(e => e.status === filterStatus.value)
  }
  
  // Club filter (admin only)
  if (filterClub.value) {
    events = events.filter(e => e.club_id === filterClub.value)
  }
  
  // Date range filter
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (filterDateRange.value === 'today') {
    const todayStr = today.toISOString().split('T')[0]
    events = events.filter(e => e.event_date === todayStr)
  } else if (filterDateRange.value === 'week') {
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    events = events.filter(e => {
      const d = new Date(e.event_date)
      return d >= today && d <= weekEnd
    })
  } else if (filterDateRange.value === 'month') {
    const monthEnd = new Date(today)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    events = events.filter(e => {
      const d = new Date(e.event_date)
      return d >= today && d <= monthEnd
    })
  }
  
  return events
})

const upcomingEvents = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return filteredEvents.value
    .filter(e => e.event_date >= today && e.status !== 'cancelled' && e.status !== 'completed')
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
})

const pastEvents = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return filteredEvents.value
    .filter(e => e.event_date < today || e.status === 'completed')
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
})

const todayEvents = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return filteredEvents.value.filter(e => e.event_date === today && e.status !== 'cancelled')
})

// Athletes for manual checkin - filtered by role and club
const athletesForManualCheckin = computed(() => {
  if (!selectedEvent.value) return []
  
  let athletes = data.athletes
  
  // If event has club_id, filter athletes by that club
  if (selectedEvent.value.club_id) {
    athletes = athletes.filter(a => a.club_id === selectedEvent.value.club_id)
  }
  
  // If coach, only show athletes in their club
  if (isCoach.value && auth.profile?.club_id) {
    athletes = athletes.filter(a => a.club_id === auth.profile.club_id)
  }
  
  // If event requires registration, only show registered athletes
  if (selectedEvent.value.requires_registration && registrations.value.length > 0) {
    const registeredIds = registrations.value.map(r => r.athlete_id)
    athletes = athletes.filter(a => registeredIds.includes(a.id))
  }
  
  return athletes
})

// Athletes who haven't checked in yet
const uncheckedAthletes = computed(() => {
  const checkedIds = checkins.value.map(c => c.athlete_id)
  return athletesForManualCheckin.value.filter(a => !checkedIds.includes(a.id))
})

// Statistics
const stats = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const allEvents = data.events
  
  return {
    total: allEvents.length,
    upcoming: allEvents.filter(e => e.event_date >= today && e.status !== 'cancelled').length,
    today: allEvents.filter(e => e.event_date === today).length,
    completed: allEvents.filter(e => e.status === 'completed').length,
    requiresReg: allEvents.filter(e => e.requires_registration).length
  }
})

// Calendar helpers
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const days = []
  const startPadding = firstDay.getDay()
  
  // Previous month padding
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false, events: [] })
  }
  
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i)
    const dateStr = d.toISOString().split('T')[0]
    const dayEvents = filteredEvents.value.filter(e => e.event_date === dateStr)
    days.push({ date: d, isCurrentMonth: true, events: dayEvents })
  }
  
  // Next month padding
  const remaining = CALENDAR_GRID_SIZE - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push({ date: d, isCurrentMonth: false, events: [] })
  }
  
  return days
})

const currentMonthLabel = computed(() => {
  return currentMonth.value.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

function goToToday() {
  currentMonth.value = new Date()
}

onMounted(async () => {
  try {
    loading.value = true
    await Promise.all([
      data.fetchEvents(),
      data.fetchClubs(),
      data.fetchAthletes()
    ])
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', err)
    error.value = 'ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้าเว็บ'
  } finally {
    loading.value = false
  }
})

function clearFilters() {
  searchQuery.value = ''
  filterType.value = ''
  filterStatus.value = ''
  filterClub.value = ''
  filterDateRange.value = 'all'
}

function openForm(event = null) {
  editingEvent.value = event
  if (event) {
    form.value = { 
      ...event,
      enable_checkin_settings: event.checkin_start_minutes !== 30 || event.checkin_late_minutes !== 15
    }
  } else {
    form.value = {
      title: '', description: '', event_type: 'training',
      event_date: '', start_time: '', end_time: '', location: '',
      requires_registration: false, registration_deadline: '', max_participants: null,
      enable_checkin_settings: false, checkin_start_minutes: 30, checkin_late_minutes: 15,
      club_id: isAdmin.value ? '' : auth.profile?.club_id
    }
  }
  showForm.value = true
}

async function saveEvent() {
  try {
    loading.value = true
    const checkinStart = form.value.enable_checkin_settings && form.value.checkin_start_minutes !== '' && form.value.checkin_start_minutes !== null
      ? Number(form.value.checkin_start_minutes) 
      : DEFAULT_CHECKIN_START_MINUTES
    const checkinLate = form.value.enable_checkin_settings && form.value.checkin_late_minutes !== '' && form.value.checkin_late_minutes !== null
      ? Number(form.value.checkin_late_minutes) 
      : DEFAULT_CHECKIN_LATE_MINUTES

    const payload = {
      title: form.value.title,
      description: form.value.description || null,
      event_type: form.value.event_type,
      event_date: form.value.event_date,
      start_time: form.value.start_time,
      end_time: form.value.end_time || null,
      location: form.value.location,
      requires_registration: form.value.requires_registration || false,
      registration_deadline: form.value.registration_deadline || null,
      max_participants: form.value.max_participants ? Number(form.value.max_participants) : null,
      checkin_start_minutes: checkinStart,
      checkin_late_minutes: checkinLate,
      club_id: form.value.club_id || null,
      created_by: auth.user?.id || null
    }
    
    let result
    if (editingEvent.value && editingEvent.value.id) {
      result = await data.updateEvent(editingEvent.value.id, payload)
    } else {
      result = await data.addEvent(payload)
    }
    
    if (result.success) {
      showForm.value = false
    } else {
      alert(result.message || 'ไม่สามารถบันทึกกิจกรรมได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการบันทึกกิจกรรม:', err)
    alert('เกิดข้อผิดพลาดในการบันทึกกิจกรรม กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

async function deleteEvent(event) {
  try {
    if (!confirm(`ลบกิจกรรม "${event.title}"?`)) return
    
    loading.value = true
    const result = await data.deleteEvent(event.id)
    
    if (!result.success) {
      alert(result.message || 'ไม่สามารถลบกิจกรรมได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการลบกิจกรรม:', err)
    alert('เกิดข้อผิดพลาดในการลบกิจกรรม กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

async function updateEventStatus(event, newStatus) {
  try {
    loading.value = true
    const result = await data.updateEvent(event.id, { ...event, status: newStatus })
    
    if (result.success) {
      // Refresh selectedEvent from store to get updated data
      await data.fetchEvents()
      const updated = data.events.find(e => e.id === event.id)
      if (updated) {
        selectedEvent.value = updated
      }
    } else {
      alert(result.message || 'ไม่สามารถเปลี่ยนสถานะได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ:', err)
    alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

async function openDetail(event) {
  try {
    loading.value = true
    error.value = null
    selectedEvent.value = event
    showDetail.value = true
    
    registrations.value = await data.getEventRegistrations(event.id)
    checkins.value = await data.getEventCheckins(event.id)
    
    if (isAthlete.value) {
      const athleteRecord = data.athletes.find(a => a.user_id === auth.user?.id)
      if (athleteRecord) {
        myRegistration.value = await data.getMyRegistration(event.id, athleteRecord.id)
        myCheckin.value = await data.getMyCheckin(event.id, athleteRecord.id)
      }
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการโหลดรายละเอียดกิจกรรม:', err)
    error.value = 'ไม่สามารถโหลดรายละเอียดกิจกรรมได้'
    alert('ไม่สามารถโหลดรายละเอียดกิจกรรมได้ กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

async function register() {
  try {
    loading.value = true
    const athleteRecord = data.athletes.find(a => a.user_id === auth.user?.id)
    if (!athleteRecord) {
      alert('ไม่พบข้อมูลนักกีฬา')
      return
    }
    
    if (selectedEvent.value.registration_deadline) {
      const deadline = new Date(selectedEvent.value.registration_deadline)
      if (new Date() > deadline) {
        alert('หมดเวลาลงทะเบียนแล้ว')
        return
      }
    }
    
    if (selectedEvent.value.max_participants && registrations.value.length >= selectedEvent.value.max_participants) {
      alert('จำนวนผู้เข้าร่วมเต็มแล้ว')
      return
    }
    
    const result = await data.registerForEvent(selectedEvent.value.id, athleteRecord.id)
    if (result.success) {
      myRegistration.value = result.data
      registrations.value = await data.getEventRegistrations(selectedEvent.value.id)
    } else {
      alert(result.message || 'ไม่สามารถลงทะเบียนได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการลงทะเบียน:', err)
    alert('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

async function cancelReg() {
  try {
    if (!confirm('ยกเลิกการลงทะเบียนกิจกรรมนี้?')) return
    
    loading.value = true
    const athleteRecord = data.athletes.find(a => a.user_id === auth.user?.id)
    if (!athleteRecord) return
    
    const result = await data.cancelRegistration(selectedEvent.value.id, athleteRecord.id)
    if (result.success) {
      myRegistration.value = null
      registrations.value = await data.getEventRegistrations(selectedEvent.value.id)
    } else {
      alert(result.message || 'ไม่สามารถยกเลิกการลงทะเบียนได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการยกเลิกการลงทะเบียน:', err)
    alert('เกิดข้อผิดพลาดในการยกเลิกการลงทะเบียน กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

function openQRScanner() {
  showQRScanner.value = true
  scanResult.value = ''
}

async function handleQRScanResult(code) {
  try {
    if (!code || !code.trim()) {
      alert('กรุณากรอกรหัสเช็คอิน')
      return
    }
    
    loading.value = true
    const event = await data.getEventByCheckinCode(code.trim())
    if (!event) {
      alert('ไม่พบกิจกรรมจากรหัสนี้')
      return
    }
    
    const athleteRecord = data.athletes.find(a => a.user_id === auth.user?.id)
    if (!athleteRecord) {
      alert('ไม่พบข้อมูลนักกีฬา')
      return
    }
    
    if (event.requires_registration) {
      const reg = await data.getMyRegistration(event.id, athleteRecord.id)
      if (!reg) {
        alert('คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้')
        return
      }
    }
    
    const result = await data.checkinEvent(event.id, athleteRecord.id, 'qr')
    if (result.success) {
      const statusText = result.status === 'on_time' ? 'ตรงเวลา' : result.status === 'late' ? 'สาย' : 'ขาด'
      alert(`เช็คอินสำเร็จ! สถานะ: ${statusText}\nกิจกรรม: ${event.title}`)
      showQRScanner.value = false
      scanResult.value = ''
      await data.fetchEvents()
    } else {
      alert(result.message || 'ไม่สามารถเช็คอินได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเช็คอิน:', err)
    alert('เกิดข้อผิดพลาดในการเช็คอิน กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

async function handleQRScan() {
  try {
    const code = prompt('กรอกรหัสเช็คอิน (จาก QR Code):')
    if (!code) return
    
    loading.value = true
    const event = await data.getEventByCheckinCode(code)
    if (!event) {
      alert('ไม่พบกิจกรรมจากรหัสนี้')
      return
    }
    
    const athleteRecord = data.athletes.find(a => a.user_id === auth.user?.id)
    if (!athleteRecord) {
      alert('ไม่พบข้อมูลนักกีฬา')
      return
    }
    
    if (event.requires_registration) {
      const reg = await data.getMyRegistration(event.id, athleteRecord.id)
      if (!reg) {
        alert('คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้')
        return
      }
    }
    
    const result = await data.checkinEvent(event.id, athleteRecord.id, 'qr')
    if (result.success) {
      const statusText = result.status === 'on_time' ? 'ตรงเวลา' : result.status === 'late' ? 'สาย' : 'ขาด'
      alert(`เช็คอินสำเร็จ! สถานะ: ${statusText}`)
      showQRScanner.value = false
      if (selectedEvent.value?.id === event.id) {
        checkins.value = await data.getEventCheckins(event.id)
        myCheckin.value = await data.getMyCheckin(event.id, athleteRecord.id)
      }
    } else {
      alert(result.message || 'ไม่สามารถเช็คอินได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเช็คอิน:', err)
    alert('เกิดข้อผิดพลาดในการเช็คอิน กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

async function manualCheckinAthlete(athleteId, status) {
  try {
    loading.value = true
    const result = await data.manualCheckin(selectedEvent.value.id, athleteId, status)
    if (result.success) {
      checkins.value = await data.getEventCheckins(selectedEvent.value.id)
    } else {
      alert(result.message || 'ไม่สามารถเช็คอินได้')
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเช็คอิน:', err)
    alert('เกิดข้อผิดพลาดในการเช็คอิน กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

// Export functions
function openExportModal() {
  showExportModal.value = true
}

async function exportCheckinReport() {
  if (!selectedEvent.value) return
  
  try {
    exportLoading.value = true
    const eventData = selectedEvent.value
    const regs = registrations.value
    const checks = checkins.value
    
    let csv = 'ชื่อกิจกรรม,' + eventData.title + '\n'
    csv += 'วันที่,' + formatDate(eventData.event_date) + '\n'
    csv += 'เวลา,' + formatTime(eventData.start_time) + ' - ' + formatTime(eventData.end_time) + '\n'
    csv += 'สถานที่,' + eventData.location + '\n\n'
    
    csv += 'รายการเช็คอิน\n'
    csv += 'ลำดับ,ชื่อ,อีเมล,สถานะ,วิธีเช็คอิน,เวลาเช็คอิน\n'
    
    checks.forEach((c, i) => {
      const statusText = c.checkin_status === 'on_time' ? 'ตรงเวลา' : c.checkin_status === 'late' ? 'สาย' : 'ขาด'
      csv += `${i + 1},${c.athletes?.name || '-'},${c.athletes?.email || '-'},${statusText},${c.checkin_method},${new Date(c.checkin_time).toLocaleString('th-TH')}\n`
    })
    
    csv += '\nสรุป\n'
    csv += 'ตรงเวลา,' + checks.filter(c => c.checkin_status === 'on_time').length + '\n'
    csv += 'สาย,' + checks.filter(c => c.checkin_status === 'late').length + '\n'
    csv += 'ขาด,' + checks.filter(c => c.checkin_status === 'absent').length + '\n'
    csv += 'รวม,' + checks.length + '\n'
    
    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `checkin-report-${eventData.title}-${eventData.event_date}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showExportModal.value = false
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการส่งออกรายงาน:', err)
    alert('เกิดข้อผิดพลาดในการส่งออกรายงาน กรุณาลองใหม่อีกครั้ง')
  } finally {
    exportLoading.value = false
  }
}

function getEventTypeLabel(type) {
  return eventTypes.find(t => t.value === type)?.label || type
}

function getStatusBadge(status) {
  const map = {
    upcoming: { label: 'กำลังจะมาถึง', class: 'badge-info' },
    ongoing: { label: 'กำลังดำเนินการ', class: 'badge-success' },
    completed: { label: 'เสร็จสิ้น', class: 'badge-default' },
    cancelled: { label: 'ยกเลิก', class: 'badge-danger' }
  }
  return map[status] || { label: status, class: 'badge-default' }
}

function getCheckinStatusBadge(status) {
  const map = {
    on_time: { label: 'ตรงเวลา', class: 'badge-success' },
    late: { label: 'สาย', class: 'badge-warning' },
    absent: { label: 'ขาด', class: 'badge-danger' }
  }
  return map[status] || { label: status, class: 'badge-default' }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(time) {
  return time?.slice(0, TIME_FORMAT_LENGTH) || ''
}

function canCheckin(event) {
  if (!event) return false
  if (event.status === 'cancelled' || event.status === 'completed') return false
  
  const now = new Date()
  const eventDateTime = new Date(`${event.event_date}T${event.start_time}`)
  const checkinStart = new Date(eventDateTime.getTime() - (event.checkin_start_minutes || DEFAULT_CHECKIN_START_MINUTES) * MILLISECONDS_PER_MINUTE)
  
  // End time: use event end_time if available, otherwise MAX_CHECKIN_DURATION_HOURS after start
  let checkinEnd
  if (event.end_time) {
    checkinEnd = new Date(`${event.event_date}T${event.end_time}`)
  } else {
    checkinEnd = new Date(eventDateTime.getTime() + MAX_CHECKIN_DURATION_HOURS * MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE)
  }
  
  return now >= checkinStart && now <= checkinEnd
}

function canRegister(event) {
  if (!event || !event.requires_registration) return false
  if (event.registration_deadline) {
    if (new Date() > new Date(event.registration_deadline)) return false
  }
  if (event.max_participants && registrations.value.length >= event.max_participants) return false
  return true
}

function getRegistrationStatus(event) {
  if (!event?.requires_registration) return null
  if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
    return { text: 'หมดเวลาลงทะเบียน', class: 'text-danger' }
  }
  if (event.max_participants && registrations.value.length >= event.max_participants) {
    return { text: 'เต็มแล้ว', class: 'text-warning' }
  }
  return { text: 'เปิดรับลงทะเบียน', class: 'text-success' }
}

function isToday(date) {
  const today = new Date()
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear()
}

function getEventTypeColor(type) {
  const colors = {
    training: '#3b82f6',
    competition: '#f59e0b',
    test: '#22c55e',
    other: '#737373'
  }
  return colors[type] || '#737373'
}
</script>

<template>
  <div class="page">
    <!-- Header with Stats -->
    <header class="page-header">
      <div class="header-left">
        <h1>กิจกรรมพิเศษ</h1>
        <p class="header-subtitle">จัดการกิจกรรม ลงทะเบียน และเช็คอิน</p>
      </div>
      <div class="header-actions">
        <button v-if="isAthlete" class="btn btn-secondary" @click="openQRScanner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h.01M17 14h.01"/></svg>
          สแกน QR
        </button>
        <button v-if="canManage" class="btn btn-primary" @click="openForm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          สร้างกิจกรรม
        </button>
      </div>
    </header>

    <!-- Stats Cards -->
    <div v-if="canManage" class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">กิจกรรมทั้งหมด</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.upcoming }}</span>
          <span class="stat-label">กำลังจะมาถึง</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.today }}</span>
          <span class="stat-label">วันนี้</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">เสร็จสิ้น</span>
        </div>
      </div>
    </div>

    <!-- Today's Events Alert -->
    <div v-if="todayEvents.length > 0" class="today-alert">
      <div class="alert-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      </div>
      <div class="alert-content">
        <strong>กิจกรรมวันนี้:</strong> {{ todayEvents.length }} รายการ
        <span v-for="(e, i) in todayEvents.slice(0, MAX_TODAY_EVENTS_PREVIEW)" :key="e.id">
          {{ e.title }}{{ i < Math.min(todayEvents.length, MAX_TODAY_EVENTS_PREVIEW) - 1 ? ', ' : '' }}
        </span>
        <span v-if="todayEvents.length > MAX_TODAY_EVENTS_PREVIEW">และอื่นๆ</span>
      </div>
    </div>

    <!-- View Toggle & Filters -->
    <div class="toolbar">
      <div class="view-toggle">
        <button :class="['toggle-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          รายการ
        </button>
        <button :class="['toggle-btn', { active: viewMode === 'calendar' }]" @click="viewMode = 'calendar'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ปฏิทิน
        </button>
      </div>
      
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหากิจกรรม..." />
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filterDateRange" class="filter-select">
        <option value="all">ทุกช่วงเวลา</option>
        <option value="today">วันนี้</option>
        <option value="week">7 วันข้างหน้า</option>
        <option value="month">30 วันข้างหน้า</option>
      </select>
      
      <select v-model="filterType" class="filter-select">
        <option value="">ทุกประเภท</option>
        <option v-for="t in eventTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      
      <select v-model="filterStatus" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      
      <select v-if="isAdmin" v-model="filterClub" class="filter-select">
        <option value="">ทุกชมรม</option>
        <option v-for="club in data.clubs" :key="club.id" :value="club.id">{{ club.name }}</option>
      </select>
      
      <button v-if="searchQuery || filterType || filterStatus || filterClub || filterDateRange !== 'all'" class="btn btn-sm btn-secondary" @click="clearFilters">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ล้างตัวกรอง
      </button>
    </div>

    <!-- Calendar View -->
    <div v-if="viewMode === 'calendar'" class="calendar-view">
      <div class="calendar-header">
        <button class="btn btn-sm btn-secondary" @click="prevMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h3>{{ currentMonthLabel }}</h3>
        <button class="btn btn-sm btn-secondary" @click="nextMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button class="btn btn-sm btn-primary" @click="goToToday">วันนี้</button>
      </div>
      
      <div class="calendar-grid">
        <div class="calendar-weekday" v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
        <div 
          v-for="(day, idx) in calendarDays" 
          :key="idx" 
          :class="['calendar-day', { 'other-month': !day.isCurrentMonth, 'today': isToday(day.date), 'has-events': day.events.length > 0 }]"
          @click="day.events.length === 1 ? openDetail(day.events[0]) : null"
        >
          <span class="day-number">{{ day.date.getDate() }}</span>
          <div class="day-events">
            <div 
              v-for="event in day.events.slice(0, MAX_CALENDAR_EVENTS_DISPLAY)" 
              :key="event.id" 
              class="day-event"
              :style="{ borderLeftColor: getEventTypeColor(event.event_type) }"
              @click.stop="openDetail(event)"
              :title="event.title + ' - ' + formatTime(event.start_time)"
            >
              <span class="event-time">{{ formatTime(event.start_time) }}</span>
              <span class="event-name">{{ event.title }}</span>
            </div>
            <div v-if="day.events.length > MAX_CALENDAR_EVENTS_DISPLAY" class="more-events" @click.stop>+{{ day.events.length - MAX_CALENDAR_EVENTS_DISPLAY }} อื่นๆ</div>
          </div>
          <div v-if="day.events.length > 0" class="day-event-count">{{ day.events.length }}</div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else>
      <!-- Upcoming Events -->
      <section class="section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          กิจกรรมที่กำลังจะมาถึง ({{ upcomingEvents.length }})
        </h2>
        <div v-if="upcomingEvents.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <p>ไม่มีกิจกรรมที่กำลังจะมาถึง</p>
        </div>
        <div v-else class="event-grid">
          <div v-for="event in upcomingEvents" :key="event.id" class="event-card" @click="openDetail(event)">
            <div class="event-header">
              <div class="event-icon">
                <svg v-if="event.event_type === 'training'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
                <svg v-else-if="event.event_type === 'competition'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 22V8M14 22V8M8 6h8a2 2 0 012 2v1H6V8a2 2 0 012-2z"/></svg>
                <svg v-else-if="event.event_type === 'test'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <span class="event-type">{{ getEventTypeLabel(event.event_type) }}</span>
              <span v-if="event.clubs?.name" class="event-club">{{ event.clubs.name }}</span>
            </div>
            <h3 class="event-title">{{ event.title }}</h3>
            <div class="event-meta">
              <div class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {{ formatDate(event.event_date) }}
              </div>
              <div class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {{ formatTime(event.start_time) }}<span v-if="event.end_time"> - {{ formatTime(event.end_time) }}</span>
              </div>
              <div class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ event.location }}
              </div>
            </div>
            <div class="event-footer">
              <span :class="['badge', getStatusBadge(event.status).class]">{{ getStatusBadge(event.status).label }}</span>
              <span v-if="event.requires_registration" class="badge badge-info">ต้องลงทะเบียน</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Past Events -->
      <section v-if="pastEvents.length > 0" class="section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          กิจกรรมที่ผ่านมา ({{ pastEvents.length }})
        </h2>
        <div class="event-list">
          <div v-for="event in pastEvents.slice(0, MAX_PAST_EVENTS_DISPLAY)" :key="event.id" class="event-list-item" @click="openDetail(event)">
            <div class="event-list-info">
              <span class="event-list-title">{{ event.title }}</span>
              <span class="event-list-date">{{ formatDate(event.event_date) }} | {{ getEventTypeLabel(event.event_type) }}</span>
            </div>
            <span :class="['badge', getStatusBadge(event.status).class]">{{ getStatusBadge(event.status).label }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Event Form Modal -->
    <Modal :show="showForm" @close="showForm = false">
      <template #title>{{ editingEvent ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่' }}</template>
      <form @submit.prevent="saveEvent" class="form">
        <div class="form-group">
          <label>ชื่อกิจกรรม *</label>
          <input v-model="form.title" type="text" required placeholder="เช่น ทดสอบสมรรถภาพประจำเดือน" />
          <span class="form-hint">ตั้งชื่อให้สื่อความหมายชัดเจน</span>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>ประเภท *</label>
            <select v-model="form.event_type" required>
              <option v-for="t in eventTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="form-group" v-if="isAdmin">
            <label>ชมรม</label>
            <select v-model="form.club_id">
              <option value="">ทุกชมรม</option>
              <option v-for="club in data.clubs" :key="club.id" :value="club.id">{{ club.name }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>วันที่ *</label>
            <input v-model="form.event_date" type="date" required />
          </div>
          <div class="form-group">
            <label>เวลาเริ่ม *</label>
            <input v-model="form.start_time" type="time" required />
          </div>
          <div class="form-group">
            <label>เวลาสิ้นสุด</label>
            <input v-model="form.end_time" type="time" />
          </div>
        </div>

        <div class="form-group">
          <label>สถานที่ *</label>
          <input v-model="form.location" type="text" required placeholder="เช่น สนามกีฬาโรงเรียน" />
        </div>

        <div class="form-group">
          <label>รายละเอียด</label>
          <textarea v-model="form.description" rows="3" placeholder="รายละเอียดเพิ่มเติม"></textarea>
        </div>

        <div class="form-section">
          <h4 class="form-section-title">การลงทะเบียน</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.requires_registration" />
              ต้องลงทะเบียนล่วงหน้า
            </label>
          </div>

          <div v-if="form.requires_registration" class="form-row">
            <div class="form-group">
              <label>ปิดรับลงทะเบียน</label>
              <input v-model="form.registration_deadline" type="datetime-local" />
            </div>
            <div class="form-group">
              <label>จำนวนสูงสุด</label>
              <input v-model.number="form.max_participants" type="number" min="1" placeholder="ไม่จำกัด" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4 class="form-section-title">ตั้งค่าเช็คอิน</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.enable_checkin_settings" />
              กำหนดเวลาเช็คอินเอง
            </label>
          </div>
          <div v-if="form.enable_checkin_settings" class="form-row">
            <div class="form-group">
              <label>เริ่มเช็คอินก่อน (นาที)</label>
              <input v-model.number="form.checkin_start_minutes" type="number" min="0" placeholder="30" />
            </div>
            <div class="form-group">
              <label>สายหลังจาก (นาที)</label>
              <input v-model.number="form.checkin_late_minutes" type="number" min="0" placeholder="15" />
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="showForm = false">ยกเลิก</button>
          <button type="submit" class="btn btn-primary">{{ editingEvent ? 'บันทึก' : 'สร้าง' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Event Detail Modal -->
    <Modal :show="showDetail" @close="showDetail = false" size="large">
      <template #title>{{ selectedEvent?.title }}</template>
      <div v-if="selectedEvent" class="event-detail">
        <!-- Event Hero Section -->
        <div class="detail-hero">
          <div class="hero-icon" :style="{ background: getEventTypeColor(selectedEvent.event_type) }">
            <svg v-if="selectedEvent.event_type === 'training'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
            <svg v-else-if="selectedEvent.event_type === 'competition'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 22V8M14 22V8M8 6h8a2 2 0 012 2v1H6V8a2 2 0 012-2z"/></svg>
            <svg v-else-if="selectedEvent.event_type === 'test'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <div class="hero-badges">
            <span :class="['badge', getStatusBadge(selectedEvent.status).class]">{{ getStatusBadge(selectedEvent.status).label }}</span>
            <span class="badge badge-default">{{ getEventTypeLabel(selectedEvent.event_type) }}</span>
            <span v-if="selectedEvent.clubs?.name" class="badge badge-info">{{ selectedEvent.clubs.name }}</span>
          </div>
        </div>

        <!-- Event Info Cards -->
        <div class="detail-cards">
          <div class="info-card">
            <div class="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </div>
            <div class="info-card-content">
              <span class="info-card-label">วันที่</span>
              <span class="info-card-value">{{ formatDate(selectedEvent.event_date) }}</span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div class="info-card-content">
              <span class="info-card-label">เวลา</span>
              <span class="info-card-value">{{ formatTime(selectedEvent.start_time) }}<span v-if="selectedEvent.end_time"> - {{ formatTime(selectedEvent.end_time) }}</span></span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="info-card-content">
              <span class="info-card-label">สถานที่</span>
              <span class="info-card-value">{{ selectedEvent.location }}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="selectedEvent.description" class="detail-description">
          <h4>รายละเอียด</h4>
          <p>{{ selectedEvent.description }}</p>
        </div>

        <!-- Checkin Info for All -->
        <div class="checkin-info-box">
          <div class="checkin-info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div class="checkin-info-content">
            <span class="checkin-info-title">การเช็คอิน</span>
            <span class="checkin-info-text">เริ่มเช็คอินได้ {{ selectedEvent.checkin_start_minutes || 30 }} นาทีก่อนกิจกรรม</span>
            <span class="checkin-info-text">มาสายหลัง {{ selectedEvent.checkin_late_minutes || 15 }} นาที</span>
          </div>
        </div>

        <!-- Status Change (Admin/Coach) -->
        <div v-if="canManage" class="status-change">
          <label>เปลี่ยนสถานะ:</label>
          <div class="status-buttons">
            <button v-for="s in statusOptions" :key="s.value" 
              :class="['btn btn-sm', selectedEvent.status === s.value ? 'btn-primary' : 'btn-secondary']"
              @click="updateEventStatus(selectedEvent, s.value)">
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- QR Code for Check-in (Admin/Coach) -->
        <div v-if="canManage && selectedEvent.checkin_code" class="qr-section">
          <h4>QR Code เช็คอิน</h4>
          <QRCodeDisplay :value="selectedEvent.checkin_code" :title="selectedEvent.title" />
          <div class="checkin-code-display">
            <span class="code-label">รหัสเช็คอิน:</span>
            <span class="code-value">{{ selectedEvent.checkin_code }}</span>
          </div>
        </div>

        <!-- Athlete Actions -->
        <div v-if="isAthlete" class="athlete-actions">
          <!-- Registration Section -->
          <div v-if="selectedEvent.requires_registration" class="action-section">
            <div class="action-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
              <h4>การลงทะเบียน</h4>
            </div>
            <div v-if="myRegistration" class="registered-box">
              <div class="registered-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              </div>
              <div class="registered-info">
                <span class="registered-title">ลงทะเบียนแล้ว</span>
                <span class="registered-date">เมื่อ {{ new Date(myRegistration.registered_at).toLocaleString('th-TH') }}</span>
              </div>
              <button class="btn btn-sm btn-danger" @click="cancelReg">ยกเลิก</button>
            </div>
            <div v-else class="register-box">
              <p v-if="getRegistrationStatus(selectedEvent)" :class="['reg-status-text', getRegistrationStatus(selectedEvent).class]">
                {{ getRegistrationStatus(selectedEvent).text }}
                <span v-if="selectedEvent.max_participants"> ({{ registrations.length }}/{{ selectedEvent.max_participants }})</span>
              </p>
              <button v-if="canRegister(selectedEvent)" class="btn btn-primary btn-block" @click="register">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                ลงทะเบียนเข้าร่วม
              </button>
              <p v-else class="hint">ไม่สามารถลงทะเบียนได้ในขณะนี้</p>
            </div>
          </div>

          <!-- Checkin Section -->
          <div class="action-section">
            <div class="action-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <h4>เช็คอิน</h4>
            </div>
            <div v-if="myCheckin" class="checkin-done-box">
              <div class="checkin-done-icon" :class="myCheckin.checkin_status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              </div>
              <div class="checkin-done-info">
                <span :class="['badge badge-lg', getCheckinStatusBadge(myCheckin.checkin_status).class]">
                  {{ getCheckinStatusBadge(myCheckin.checkin_status).label }}
                </span>
                <span class="checkin-done-time">{{ new Date(myCheckin.checkin_time).toLocaleString('th-TH') }}</span>
              </div>
            </div>
            <div v-else-if="canCheckin(selectedEvent)" class="checkin-ready-box">
              <p class="checkin-ready-text">พร้อมเช็คอินแล้ว!</p>
              <button class="btn btn-primary btn-block" @click="handleQRScan">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                เช็คอินตอนนี้
              </button>
            </div>
            <div v-else class="checkin-wait-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <p>เช็คอินได้ {{ selectedEvent.checkin_start_minutes || 30 }} นาทีก่อนเริ่มกิจกรรม</p>
            </div>
          </div>
        </div>

        <!-- Registrations List (Admin/Coach) -->
        <div v-if="canManage && selectedEvent.requires_registration" class="participants-section">
          <div class="section-header">
            <h4>ผู้ลงทะเบียน ({{ registrations.length }}{{ selectedEvent.max_participants ? '/' + selectedEvent.max_participants : '' }})</h4>
          </div>
          <div v-if="registrations.length === 0" class="empty-hint">ยังไม่มีผู้ลงทะเบียน</div>
          <div v-else class="participants-list">
            <div v-for="reg in registrations" :key="reg.id" class="participant-item">
              <span>{{ reg.athletes?.name }}</span>
              <span class="participant-email">{{ reg.athletes?.email }}</span>
              <span class="participant-phone">{{ reg.athletes?.phone }}</span>
            </div>
          </div>
        </div>

        <!-- Check-ins List (Admin/Coach) -->
        <div v-if="canManage" class="checkins-section">
          <div class="section-header">
            <h4>รายการเช็คอิน ({{ checkins.length }})</h4>
            <button v-if="checkins.length > 0" class="btn btn-sm btn-secondary" @click="openExportModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              ส่งออก
            </button>
          </div>
          
          <!-- Checkin Summary -->
          <div v-if="checkins.length > 0" class="checkin-summary">
            <div class="summary-item summary-success">
              <span class="summary-count">{{ checkins.filter(c => c.checkin_status === 'on_time').length }}</span>
              <span class="summary-label">ตรงเวลา</span>
            </div>
            <div class="summary-item summary-warning">
              <span class="summary-count">{{ checkins.filter(c => c.checkin_status === 'late').length }}</span>
              <span class="summary-label">สาย</span>
            </div>
            <div class="summary-item summary-danger">
              <span class="summary-count">{{ checkins.filter(c => c.checkin_status === 'absent').length }}</span>
              <span class="summary-label">ขาด</span>
            </div>
          </div>
          
          <div v-if="checkins.length === 0" class="empty-hint">ยังไม่มีการเช็คอิน</div>
          <div v-else class="checkins-list">
            <div v-for="ci in checkins" :key="ci.id" class="checkin-item">
              <span class="checkin-name">{{ ci.athletes?.name }}</span>
              <span :class="['badge', getCheckinStatusBadge(ci.checkin_status).class]">{{ getCheckinStatusBadge(ci.checkin_status).label }}</span>
              <span class="checkin-method">{{ ci.checkin_method === 'qr' ? 'QR' : 'Manual' }}</span>
              <span class="checkin-time">{{ new Date(ci.checkin_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
          </div>

          <!-- Manual Check-in -->
          <div class="manual-checkin">
            <div class="manual-checkin-header">
              <h5>เช็คอินแบบ Manual</h5>
              <span class="pending-count">รอเช็คอิน: {{ uncheckedAthletes.length }} คน</span>
            </div>
            
            <div v-if="uncheckedAthletes.length === 0" class="all-checked-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              <p>นักกีฬาทุกคนเช็คอินแล้ว</p>
            </div>
            
            <div v-else class="athlete-checkin-list">
              <div v-for="athlete in uncheckedAthletes" :key="athlete.id" class="athlete-checkin-item">
                <div class="athlete-info">
                  <span class="athlete-name">{{ athlete.name }}</span>
                  <span v-if="athlete.email" class="athlete-email">{{ athlete.email }}</span>
                </div>
                <div class="checkin-buttons">
                  <button class="btn btn-sm btn-success" @click="manualCheckinAthlete(athlete.id, 'on_time')" title="ตรงเวลา">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                  <button class="btn btn-sm btn-warning" @click="manualCheckinAthlete(athlete.id, 'late')" title="สาย">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </button>
                  <button class="btn btn-sm btn-danger" @click="manualCheckinAthlete(athlete.id, 'absent')" title="ขาด">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="canManage" class="detail-actions">
          <button class="btn btn-secondary" @click="openForm(selectedEvent); showDetail = false">แก้ไข</button>
          <button class="btn btn-danger" @click="deleteEvent(selectedEvent); showDetail = false">ลบ</button>
        </div>
      </div>
    </Modal>

    <!-- QR Scanner Modal -->
    <Modal :show="showQRScanner" @close="showQRScanner = false">
      <template #title>สแกน QR เช็คอิน</template>
      <QRScanner 
        :show="showQRScanner"
        @scan="handleQRScanResult"
        @close="showQRScanner = false"
      />
    </Modal>

    <!-- Export Modal -->
    <Modal :show="showExportModal" @close="showExportModal = false">
      <template #title>ส่งออกรายงานเช็คอิน</template>
      <div class="export-content">
        <p>ส่งออกรายงานเช็คอินของกิจกรรม "{{ selectedEvent?.title }}"</p>
        <div class="export-info">
          <div class="export-stat">
            <span class="export-label">จำนวนเช็คอิน:</span>
            <span class="export-value">{{ checkins.length }} คน</span>
          </div>
          <div class="export-stat">
            <span class="export-label">รูปแบบไฟล์:</span>
            <span class="export-value">CSV (Excel compatible)</span>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="showExportModal = false">ยกเลิก</button>
          <button type="button" class="btn btn-primary" @click="exportCheckinReport" :disabled="exportLoading">
            <svg v-if="!exportLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            {{ exportLoading ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.page { padding: 1rem; padding-bottom: 80px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.header-left h1 { font-size: 1.5rem; font-weight: 700; color: #171717; margin-bottom: 0.25rem; }
.header-subtitle { font-size: 0.875rem; color: #737373; }
.header-actions { display: flex; gap: 0.5rem; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 1rem; }
.stat-icon { width: 40px; height: 40px; background: #171717; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-icon svg { width: 20px; height: 20px; color: #fff; }
.stat-icon-info { background: #0369a1; }
.stat-icon-warning { background: #d97706; }
.stat-icon-success { background: #059669; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 1.25rem; font-weight: 700; color: #171717; }
.stat-label { font-size: 0.75rem; color: #737373; }

/* Today Alert */
.today-alert { display: flex; align-items: center; gap: 0.75rem; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; }
.alert-icon { width: 32px; height: 32px; background: #f59e0b; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.alert-icon svg { width: 18px; height: 18px; color: #fff; }
.alert-content { font-size: 0.875rem; color: #92400e; }

/* Toolbar */
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.view-toggle { display: flex; background: #f5f5f5; border-radius: 8px; padding: 0.25rem; }
.toggle-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border: none; background: transparent; border-radius: 6px; font-size: 0.875rem; color: #525252; cursor: pointer; }
.toggle-btn.active { background: #fff; color: #171717; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.toggle-btn svg { width: 16px; height: 16px; }
.search-box { display: flex; align-items: center; gap: 0.5rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0.5rem 0.75rem; flex: 1; max-width: 300px; }
.search-box svg { width: 18px; height: 18px; color: #a3a3a3; }
.search-box input { border: none; outline: none; flex: 1; font-size: 0.875rem; }

/* Filters */
.filters { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 0.875rem; background: #fff; cursor: pointer; }
.filter-select:focus { outline: none; border-color: #171717; }

/* Calendar */
.calendar-view { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 1rem; }
.calendar-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.calendar-header h3 { flex: 1; text-align: center; font-size: 1rem; font-weight: 600; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e5e5e5; }
.calendar-weekday { background: #f5f5f5; padding: 0.5rem; text-align: center; font-size: 0.75rem; font-weight: 600; color: #525252; }
.calendar-day { background: #fff; min-height: 80px; padding: 0.5rem; }
.calendar-day.other-month { background: #fafafa; }
.calendar-day.other-month .day-number { color: #a3a3a3; }
.calendar-day.today { background: #f0f9ff; }
.calendar-day.today .day-number { background: #171717; color: #fff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.day-number { font-size: 0.75rem; font-weight: 500; color: #171717; margin-bottom: 0.25rem; }
.day-events { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow: hidden; }
.day-event { font-size: 0.625rem; padding: 2px 4px; background: #f5f5f5; border-radius: 2px; border-left: 3px solid #171717; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.day-event:hover { background: #e5e5e5; }
.day-event .event-time { font-weight: 600; color: #525252; flex-shrink: 0; }
.day-event .event-name { overflow: hidden; text-overflow: ellipsis; }
.more-events { font-size: 0.625rem; color: #737373; cursor: pointer; }
.more-events:hover { color: #171717; }
.day-event-count { display: none; }

/* Section */
.section { margin-bottom: 2rem; }
.section-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; color: #525252; margin-bottom: 1rem; }
.section-title svg { width: 18px; height: 18px; }

/* Event Grid */
.event-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.event-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 1rem; cursor: pointer; transition: box-shadow 0.2s, transform 0.2s; }
.event-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px); }
.event-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.event-icon { width: 40px; height: 40px; background: #171717; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.event-icon svg { width: 20px; height: 20px; color: #fff; }
.event-type { font-size: 0.75rem; color: #737373; font-weight: 500; }
.event-club { font-size: 0.75rem; color: #0369a1; background: #e0f2fe; padding: 0.125rem 0.5rem; border-radius: 100px; margin-left: auto; }
.event-title { font-size: 1rem; font-weight: 600; color: #171717; margin-bottom: 0.75rem; }
.event-meta { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
.meta-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #525252; }
.meta-item svg { width: 16px; height: 16px; color: #a3a3a3; flex-shrink: 0; }
.event-footer { display: flex; gap: 0.5rem; flex-wrap: wrap; }

/* Event List */
.event-list { display: flex; flex-direction: column; gap: 0.5rem; }
.event-list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #fafafa; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
.event-list-item:hover { background: #f5f5f5; }
.event-list-info { display: flex; flex-direction: column; gap: 0.25rem; }
.event-list-title { font-weight: 500; color: #171717; }
.event-list-date { font-size: 0.75rem; color: #737373; }

/* Badges */
.badge { display: inline-flex; padding: 0.25rem 0.5rem; border-radius: 100px; font-size: 0.75rem; font-weight: 500; }
.badge-default { background: #f5f5f5; color: #525252; }
.badge-info { background: #e0f2fe; color: #0369a1; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-danger { background: #fee2e2; color: #991b1b; }

/* Empty State */
.empty-state { text-align: center; padding: 3rem 2rem; color: #737373; background: #fafafa; border-radius: 12px; }
.empty-state svg { width: 48px; height: 48px; color: #d4d4d4; margin-bottom: 0.75rem; }
.empty-state p { font-size: 0.875rem; }

/* Form */
.form { display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-group label { font-size: 0.875rem; font-weight: 500; color: #525252; }
.form-group input, .form-group select, .form-group textarea { padding: 0.625rem; border: 1px solid #d4d4d4; border-radius: 8px; font-size: 0.875rem; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #171717; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; }
.form-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; }
.form-section-title { font-size: 0.875rem; font-weight: 600; color: #171717; margin-bottom: 0.75rem; }
.form-hint { font-size: 0.75rem; color: #a3a3a3; margin-top: 0.25rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.checkbox-label input { width: 18px; height: 18px; }
.form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; border: none; cursor: pointer; transition: opacity 0.2s; }
.btn:hover { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn svg { width: 18px; height: 18px; }
.btn-primary { background: #171717; color: #fff; }
.btn-secondary { background: #f5f5f5; color: #171717; border: 1px solid #e5e5e5; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-success { background: #22c55e; color: #fff; }
.btn-warning { background: #f59e0b; color: #fff; }
.btn-sm { padding: 0.375rem 0.625rem; font-size: 0.75rem; }

/* Detail Modal */
.event-detail { display: flex; flex-direction: column; gap: 1.25rem; }

/* Hero Section */
.detail-hero { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e5e5; }
.hero-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.hero-icon svg { width: 32px; height: 32px; color: #fff; }
.hero-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }

/* Info Cards */
.detail-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
.info-card { display: flex; align-items: center; gap: 0.75rem; background: #fafafa; border-radius: 10px; padding: 0.75rem; }
.info-card-icon { width: 36px; height: 36px; background: #171717; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.info-card-icon svg { width: 18px; height: 18px; color: #fff; }
.info-card-content { display: flex; flex-direction: column; min-width: 0; }
.info-card-label { font-size: 0.625rem; color: #737373; text-transform: uppercase; letter-spacing: 0.5px; }
.info-card-value { font-size: 0.875rem; font-weight: 600; color: #171717; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Description */
.detail-description { background: #fafafa; border-radius: 10px; padding: 1rem; }
.detail-description h4 { font-size: 0.75rem; color: #737373; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; }
.detail-description p { font-size: 0.875rem; color: #525252; line-height: 1.5; margin: 0; }

/* Checkin Info Box */
.checkin-info-box { display: flex; align-items: center; gap: 0.75rem; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 0.75rem 1rem; }
.checkin-info-icon { width: 36px; height: 36px; background: #0369a1; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.checkin-info-icon svg { width: 18px; height: 18px; color: #fff; }
.checkin-info-content { display: flex; flex-direction: column; }
.checkin-info-title { font-size: 0.875rem; font-weight: 600; color: #0c4a6e; }
.checkin-info-text { font-size: 0.75rem; color: #0369a1; }

/* Status Change */
.status-change { background: #fafafa; border-radius: 10px; padding: 1rem; }
.status-change label { font-size: 0.75rem; font-weight: 500; color: #737373; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; display: block; }
.status-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }

/* QR Section */
.qr-section { background: #fafafa; border-radius: 10px; padding: 1.25rem; text-align: center; }
.qr-section h4 { font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; }
.checkin-code-display { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0.75rem; }
.code-label { font-size: 0.75rem; color: #737373; }
.code-value { font-size: 1rem; font-weight: 700; color: #171717; font-family: monospace; letter-spacing: 1px; }

/* Athlete Actions */
.athlete-actions { display: flex; flex-direction: column; gap: 1rem; }
.action-section { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 1rem; }
.action-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.action-header svg { width: 18px; height: 18px; color: #525252; }
.action-header h4 { font-size: 0.875rem; font-weight: 600; color: #171717; margin: 0; }

/* Registered Box */
.registered-box { display: flex; align-items: center; gap: 0.75rem; background: #d1fae5; border-radius: 8px; padding: 0.75rem; }
.registered-icon { width: 36px; height: 36px; background: #059669; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.registered-icon svg { width: 18px; height: 18px; color: #fff; }
.registered-info { flex: 1; display: flex; flex-direction: column; }
.registered-title { font-size: 0.875rem; font-weight: 600; color: #065f46; }
.registered-date { font-size: 0.75rem; color: #059669; }

/* Register Box */
.register-box { }
.reg-status-text { font-size: 0.875rem; margin-bottom: 0.75rem; }
.btn-block { width: 100%; justify-content: center; }

/* Checkin Done Box */
.checkin-done-box { display: flex; align-items: center; gap: 0.75rem; background: #fafafa; border-radius: 8px; padding: 0.75rem; }
.checkin-done-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.checkin-done-icon.on_time { background: #059669; }
.checkin-done-icon.late { background: #d97706; }
.checkin-done-icon.absent { background: #dc2626; }
.checkin-done-icon svg { width: 20px; height: 20px; color: #fff; }
.checkin-done-info { display: flex; flex-direction: column; gap: 0.25rem; }
.checkin-done-time { font-size: 0.75rem; color: #737373; }
.badge-lg { padding: 0.375rem 0.75rem; font-size: 0.875rem; }

/* Checkin Ready Box */
.checkin-ready-box { text-align: center; }
.checkin-ready-text { font-size: 0.875rem; color: #059669; font-weight: 500; margin-bottom: 0.75rem; }

/* Checkin Wait Box */
.checkin-wait-box { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; background: #fafafa; border-radius: 8px; text-align: center; }
.checkin-wait-box svg { width: 32px; height: 32px; color: #a3a3a3; }
.checkin-wait-box p { font-size: 0.875rem; color: #737373; margin: 0; }

.hint { font-size: 0.875rem; color: #737373; }
.text-success { color: #065f46; }
.text-warning { color: #92400e; }
.text-danger { color: #991b1b; }

/* Participants & Checkins */
.participants-section, .checkins-section { background: #fafafa; border-radius: 12px; padding: 1rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.section-header h4 { font-size: 0.875rem; font-weight: 600; }
.empty-hint { font-size: 0.875rem; color: #a3a3a3; }
.participants-list, .checkins-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; }
.participant-item, .checkin-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: #fff; border-radius: 8px; }
.participant-email, .participant-phone { font-size: 0.75rem; color: #737373; }
.checkin-name { flex: 1; }
.checkin-method { font-size: 0.75rem; color: #a3a3a3; }

/* Checkin Summary */
.checkin-summary { display: flex; gap: 1rem; margin-bottom: 1rem; }
.summary-item { display: flex; flex-direction: column; align-items: center; padding: 0.5rem 1rem; border-radius: 8px; }
.summary-success { background: #d1fae5; }
.summary-warning { background: #fef3c7; }
.summary-danger { background: #fee2e2; }
.summary-count { font-size: 1.25rem; font-weight: 700; }
.summary-success .summary-count { color: #065f46; }
.summary-warning .summary-count { color: #92400e; }
.summary-danger .summary-count { color: #991b1b; }
.summary-label { font-size: 0.75rem; color: #525252; }

/* Manual Checkin */
.manual-checkin { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; }
.manual-checkin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.manual-checkin h5 { font-size: 0.875rem; font-weight: 600; margin: 0; }
.pending-count { font-size: 0.75rem; color: #737373; background: #f5f5f5; padding: 0.25rem 0.5rem; border-radius: 100px; }
.all-checked-box { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem; background: #d1fae5; border-radius: 8px; text-align: center; }
.all-checked-box svg { width: 32px; height: 32px; color: #059669; }
.all-checked-box p { font-size: 0.875rem; color: #065f46; margin: 0; font-weight: 500; }
.athlete-checkin-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; }
.athlete-checkin-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; }
.athlete-info { display: flex; flex-direction: column; gap: 0.125rem; }
.athlete-name { font-size: 0.875rem; font-weight: 500; color: #171717; }
.athlete-email { font-size: 0.75rem; color: #737373; }
.checkin-buttons { display: flex; gap: 0.375rem; }
.checkin-buttons .btn { padding: 0.5rem; }
.checkin-buttons .btn svg { width: 16px; height: 16px; }

.detail-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #e5e5e5; }

/* QR Scanner */
.qr-scanner-content { display: flex; flex-direction: column; gap: 1rem; }
.scanner-placeholder { background: #fafafa; border-radius: 12px; padding: 2rem; text-align: center; }
.scanner-placeholder svg { width: 64px; height: 64px; color: #a3a3a3; margin-bottom: 0.75rem; }
.scanner-placeholder p { color: #737373; font-size: 0.875rem; }

/* Export */
.export-content { display: flex; flex-direction: column; gap: 1rem; }
.export-content p { color: #525252; }
.export-info { background: #fafafa; border-radius: 8px; padding: 1rem; }
.export-stat { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e5e5; }
.export-stat:last-child { border-bottom: none; }
.export-label { color: #737373; }
.export-value { font-weight: 500; color: #171717; }

/* Responsive */
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .toolbar { flex-direction: column; align-items: stretch; }
  .search-box { max-width: none; }
  .event-grid { grid-template-columns: 1fr; }
  .calendar-day { min-height: 70px; padding: 0.25rem; position: relative; cursor: pointer; }
  .calendar-day.has-events { background: #fafafa; }
  .day-event { font-size: 0.5rem; padding: 1px 3px; }
  .day-event .event-time { display: none; }
  .day-events { gap: 1px; }
  .more-events { font-size: 0.5rem; }
  .day-event-count { display: flex; position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; background: #171717; color: #fff; border-radius: 50%; font-size: 0.625rem; font-weight: 600; align-items: center; justify-content: center; }
  
  /* Detail Modal Responsive */
  .detail-cards { grid-template-columns: 1fr; }
  .hero-icon { width: 56px; height: 56px; }
  .hero-icon svg { width: 28px; height: 28px; }
  .checkin-info-box { flex-direction: column; text-align: center; }
  .checkin-info-content { align-items: center; }
  .status-buttons { justify-content: center; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .stat-card { padding: 0.75rem; }
  .stat-value { font-size: 1rem; }
  .filters { flex-direction: column; }
  .filter-select { width: 100%; }
}
</style>
