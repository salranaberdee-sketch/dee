<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'
import AthleteHistory from '@/components/AthleteHistory.vue'
import AlbumSection from '@/components/AlbumSection.vue'
import AthleteTrainingStats from '@/components/AthleteTrainingStats.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const auth = useAuthStore()
const data = useDataStore()

// UI State
const showModal = ref(false)
const showDetailModal = ref(false)
const editingId = ref(null)
const editingAthlete = ref(null)
const selectedAthlete = ref(null)
const athleteDocuments = ref([])
const loadingDocs = ref(false)
const activeTab = ref('info')
const viewMode = ref('grid') // grid หรือ list
const sortBy = ref('name') // name, created_at, status
const sortOrder = ref('asc')
const selectedAthletes = ref([]) // สำหรับ bulk actions
const showBulkActions = ref(false)
const mainTab = ref('all') // all = ทั้งหมด (ค่าเริ่มต้น), pending = รอตรวจสอบ, approved = อนุมัติแล้ว

// Form State
const form = ref({ name: '', email: '', phone: '', coach_id: null, club_id: null })

// Filter State
const searchQuery = ref('')
const filterClub = ref('')
const filterStatus = ref('')
const filterAgeGroup = ref('') // เพิ่ม filter ตามกลุ่มอายุ
const filterDocStatus = ref('') // เพิ่ม filter ตามสถานะเอกสาร

const documentTypes = {
  id_card: 'บัตรประชาชน',
  parent_id_card: 'บัตรประชาชนผู้ปกครอง',
  house_registration: 'ทะเบียนบ้าน',
  parent_house_registration: 'ทะเบียนบ้านผู้ปกครอง',
  birth_certificate: 'สูติบัตร'
}

// กลุ่มอายุ
const ageGroups = [
  { value: 'under10', label: 'ต่ำกว่า 10 ปี', min: 0, max: 9 },
  { value: '10-12', label: '10-12 ปี', min: 10, max: 12 },
  { value: '13-15', label: '13-15 ปี', min: 13, max: 15 },
  { value: '16-18', label: '16-18 ปี', min: 16, max: 18 },
  { value: 'over18', label: 'มากกว่า 18 ปี', min: 19, max: 99 }
]

onMounted(async () => {
  await Promise.all([data.fetchAthletes(), data.fetchClubs(), data.fetchCoaches()])
})

const currentCoach = computed(() => {
  if (auth.isCoach) {
    return data.coaches.find(c => c.email === auth.profile?.email)
  }
  return null
})

// คำนวณอายุจากวันเกิด
function calculateAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// นับจำนวนนักกีฬาตามสถานะ (ใช้ได้ทุก role)
const athleteStats = computed(() => {
  let all = [...data.athletes]
  
  // Coach เห็นเฉพาะนักกีฬาในชมรมตัวเอง
  if (auth.isCoach && currentCoach.value) {
    all = all.filter(a => a.club_id === currentCoach.value.club_id)
  }
  
  const approved = all.filter(a => a.registration_status === 'approved')
  const pending = all.filter(a => a.registration_status !== 'approved')
  
  // คำนวณอายุเฉลี่ย
  const ages = all.map(a => calculateAge(a.birth_date)).filter(a => a !== null)
  const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0
  
  return {
    total: all.length,
    approved: approved.length,
    pending: pending.length,
    avgAge
  }
})

// กรองและเรียงลำดับนักกีฬา
const filteredAthletes = computed(() => {
  let result = [...data.athletes]
  
  // Coach sees only their club's athletes
  if (auth.isCoach && currentCoach.value) {
    result = result.filter(a => a.club_id === currentCoach.value.club_id)
  }
  
  // Admin: Filter by club
  if (auth.isAdmin && filterClub.value) {
    result = result.filter(a => a.club_id === filterClub.value)
  }
  
  // กรองตาม mainTab (หมวดหมู่หลัก)
  if (mainTab.value === 'pending') {
    result = result.filter(a => a.registration_status !== 'approved')
  } else if (mainTab.value === 'approved') {
    result = result.filter(a => a.registration_status === 'approved')
  }
  // mainTab === 'all' ไม่ต้องกรอง
  
  // Filter by status (เพิ่มเติมจาก mainTab)
  if (filterStatus.value) {
    if (filterStatus.value === 'approved') {
      result = result.filter(a => a.registration_status === 'approved')
    } else if (filterStatus.value === 'pending') {
      result = result.filter(a => a.registration_status !== 'approved')
    }
  }
  
  // Filter by age group
  if (filterAgeGroup.value) {
    const group = ageGroups.find(g => g.value === filterAgeGroup.value)
    if (group) {
      result = result.filter(a => {
        const age = calculateAge(a.birth_date)
        return age !== null && age >= group.min && age <= group.max
      })
    }
  }
  
  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.email.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q)
    )
  }
  
  // Sort
  result.sort((a, b) => {
    let valA, valB
    switch (sortBy.value) {
      case 'name':
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
        break
      case 'created_at':
        valA = new Date(a.created_at)
        valB = new Date(b.created_at)
        break
      case 'status':
        valA = a.registration_status === 'approved' ? 1 : 0
        valB = b.registration_status === 'approved' ? 1 : 0
        break
      case 'age':
        valA = calculateAge(a.birth_date) || 999
        valB = calculateAge(b.birth_date) || 999
        break
      default:
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
    }
    
    if (sortOrder.value === 'asc') {
      return valA > valB ? 1 : -1
    } else {
      return valA < valB ? 1 : -1
    }
  })
  
  return result
})

// จำนวน filters ที่ใช้งานอยู่
const activeFiltersCount = computed(() => {
  let count = 0
  if (filterClub.value) count++
  if (filterStatus.value) count++
  if (filterAgeGroup.value) count++
  if (filterDocStatus.value) count++
  return count
})

/**
 * Check if current user can edit this athlete
 */
function canEditAthlete(athlete) {
  if (auth.isAdmin) return true
  if (auth.isCoach && currentCoach.value) {
    return athlete.club_id === currentCoach.value.club_id
  }
  return false
}

/**
 * Check if current user can delete this athlete
 */
function canDeleteAthlete(athlete) {
  if (auth.isAdmin) return true
  if (auth.isCoach && currentCoach.value) {
    return athlete.club_id === currentCoach.value.club_id
  }
  return false
}

function openAdd() {
  editingId.value = null
  editingAthlete.value = null
  form.value = { 
    name: '', email: '', phone: '', 
    coach_id: currentCoach.value?.id || null,
    club_id: currentCoach.value?.club_id || null
  }
  showModal.value = true
}

function openEdit(athlete) {
  if (!canEditAthlete(athlete)) {
    alert('คุณไม่มีสิทธิ์แก้ไขนักกีฬานี้')
    return
  }
  editingId.value = athlete.id
  editingAthlete.value = athlete
  form.value = { 
    name: athlete.name,
    email: athlete.email,
    phone: athlete.phone,
    coach_id: athlete.coach_id,
    club_id: athlete.club_id
  }
  showModal.value = true
}

async function viewDetail(athlete) {
  selectedAthlete.value = athlete
  activeTab.value = 'info'
  showDetailModal.value = true
  await loadDocuments(athlete.id)
}

async function loadDocuments(athleteId) {
  loadingDocs.value = true
  athleteDocuments.value = await data.fetchAthleteDocuments(athleteId)
  loadingDocs.value = false
}

async function save() {
  if (editingId.value && editingAthlete.value && !canEditAthlete(editingAthlete.value)) {
    alert('คุณไม่มีสิทธิ์แก้ไขนักกีฬานี้')
    return
  }
  
  if (editingId.value) {
    const result = await data.updateAthlete(editingId.value, form.value)
    if (!result.success) {
      alert(result.message || 'เกิดข้อผิดพลาดในการบันทึก')
      return
    }
  } else {
    const result = await data.addAthlete({ ...form.value })
    if (!result.success) {
      alert(result.message || 'เกิดข้อผิดพลาดในการเพิ่มนักกีฬา')
      return
    }
  }
  showModal.value = false
}

async function remove() {
  if (editingAthlete.value && !canDeleteAthlete(editingAthlete.value)) {
    alert('คุณไม่มีสิทธิ์ลบนักกีฬานี้')
    return
  }
  
  if (confirm('ยืนยันการลบนักกีฬานี้?')) {
    const result = await data.deleteAthlete(editingId.value)
    if (!result.success) {
      alert(result.message || 'เกิดข้อผิดพลาดในการลบ')
      return
    }
    showModal.value = false
  }
}

/**
 * Admin: Approve athlete registration
 */
async function approveAthlete(athlete) {
  if (!auth.isAdmin) return
  if (confirm(`ยืนยันอนุมัตินักกีฬา "${athlete.name}"?`)) {
    const result = await data.updateAthlete(athlete.id, { registration_status: 'approved' })
    if (result.success) {
      if (selectedAthlete.value?.id === athlete.id) {
        selectedAthlete.value.registration_status = 'approved'
      }
    } else {
      alert(result.message || 'เกิดข้อผิดพลาด')
    }
  }
}

/**
 * Admin: Reject/Revoke athlete registration
 */
async function rejectAthlete(athlete) {
  if (!auth.isAdmin) return
  if (confirm(`ยืนยันยกเลิกการอนุมัตินักกีฬา "${athlete.name}"?`)) {
    const result = await data.updateAthlete(athlete.id, { registration_status: 'pending' })
    if (result.success) {
      if (selectedAthlete.value?.id === athlete.id) {
        selectedAthlete.value.registration_status = 'pending'
      }
    } else {
      alert(result.message || 'เกิดข้อผิดพลาด')
    }
  }
}

/**
 * Clear all filters
 */
function clearFilters() {
  filterClub.value = ''
  filterStatus.value = ''
  filterAgeGroup.value = ''
  filterDocStatus.value = ''
  searchQuery.value = ''
}

/**
 * Toggle sort order
 */
function toggleSort(field) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
}

/**
 * Bulk Actions - เลือก/ยกเลิกเลือกนักกีฬา
 */
function toggleSelectAthlete(athleteId) {
  const idx = selectedAthletes.value.indexOf(athleteId)
  if (idx > -1) {
    selectedAthletes.value.splice(idx, 1)
  } else {
    selectedAthletes.value.push(athleteId)
  }
}

function selectAllAthletes() {
  if (selectedAthletes.value.length === filteredAthletes.value.length) {
    selectedAthletes.value = []
  } else {
    selectedAthletes.value = filteredAthletes.value.map(a => a.id)
  }
}

/**
 * Bulk approve - อนุมัติหลายคนพร้อมกัน
 */
async function bulkApprove() {
  if (!auth.isAdmin) return
  if (selectedAthletes.value.length === 0) return
  
  if (confirm(`ยืนยันอนุมัตินักกีฬา ${selectedAthletes.value.length} คน?`)) {
    for (const id of selectedAthletes.value) {
      await data.updateAthlete(id, { registration_status: 'approved' })
    }
    selectedAthletes.value = []
    await data.fetchAthletes()
  }
}

/**
 * Bulk approve all pending - อนุมัติทั้งหมดที่รอตรวจสอบ
 */
async function bulkApproveAll() {
  if (!auth.isAdmin) return
  const pendingAthletes = filteredAthletes.value.filter(a => a.registration_status !== 'approved')
  if (pendingAthletes.length === 0) return
  
  if (confirm(`ยืนยันอนุมัตินักกีฬาทั้งหมด ${pendingAthletes.length} คน?`)) {
    for (const athlete of pendingAthletes) {
      await data.updateAthlete(athlete.id, { registration_status: 'approved' })
    }
    await data.fetchAthletes()
  }
}

/**
 * Quick approve single athlete - อนุมัติรายบุคคล
 */
async function quickApprove(athlete, event) {
  event.stopPropagation()
  if (!auth.isAdmin) return
  
  if (confirm(`ยืนยันอนุมัตินักกีฬา "${athlete.name}"?`)) {
    const result = await data.updateAthlete(athlete.id, { registration_status: 'approved' })
    if (!result.success) {
      alert(result.message || 'เกิดข้อผิดพลาด')
    }
  }
}

/**
 * Quick actions - โทรหานักกีฬา
 */
function callAthlete(phone, event) {
  event.stopPropagation()
  if (phone) {
    window.location.href = `tel:${phone}`
  }
}

/**
 * Quick actions - ส่งอีเมล
 */
function emailAthlete(email, event) {
  event.stopPropagation()
  if (email) {
    window.location.href = `mailto:${email}`
  }
}

async function verifyDocument(doc) {
  if (confirm('ยืนยันเอกสารนี้?')) {
    const result = await data.verifyAthleteDocument(doc.id, auth.user?.id)
    if (result.success) {
      await loadDocuments(selectedAthlete.value.id)
    }
  }
}

function getCoachName(athlete) {
  return athlete.coaches?.name || '—'
}

function getClubName(athlete) {
  return athlete.clubs?.name || '—'
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAge(birthDate) {
  const age = calculateAge(birthDate)
  if (age === null) return '-'
  return age + ' ปี'
}

/**
 * Admin function to remove athlete's avatar
 */
async function removeAthleteAvatar() {
  if (!auth.isAdmin) return
  if (!selectedAthlete.value?.user_id) return
  
  if (!confirm('ยืนยันลบรูปโปรไฟล์ของนักกีฬานี้?')) return
  
  const result = await auth.adminRemoveUserAvatar(
    selectedAthlete.value.user_id,
    selectedAthlete.value.user_profiles?.avatar_url
  )
  
  if (result.success) {
    if (selectedAthlete.value.user_profiles) {
      selectedAthlete.value.user_profiles.avatar_url = null
    }
    await data.fetchAthletes()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาดในการลบรูปโปรไฟล์')
  }
}

/**
 * Export athletes to CSV
 */
function exportToCSV() {
  const headers = ['ชื่อ', 'อีเมล', 'เบอร์โทร', 'ชมรม', 'โค้ช', 'อายุ', 'สถานะ']
  const rows = filteredAthletes.value.map(a => [
    a.name,
    a.email,
    a.phone || '',
    getClubName(a),
    getCoachName(a),
    formatAge(a.birth_date),
    a.registration_status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `athletes_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}
</script>

<template>
  <div class="athletes-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">นักกีฬา</h1>
        <p class="subtitle">จัดการข้อมูลนักกีฬาและเอกสาร</p>
      </div>
      <div class="header-actions">
        <button v-if="auth.isAdmin" class="btn-secondary" @click="exportToCSV" title="ส่งออก CSV">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ส่งออก
        </button>
        <button class="btn-primary" @click="openAdd">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มนักกีฬา
        </button>
      </div>
    </div>

    <div class="container">
      <!-- Clean Category Tabs -->
      <div class="category-tabs">
        <button 
          :class="['cat-tab', { active: mainTab === 'pending' }]" 
          @click="mainTab = 'pending'; selectedAthletes = []"
        >
          <span class="cat-tab-label">รอตรวจสอบ</span>
          <span :class="['cat-tab-badge', 'badge-pending', { 'has-items': athleteStats.pending > 0 }]">
            {{ athleteStats.pending }}
          </span>
        </button>
        <button 
          :class="['cat-tab', { active: mainTab === 'approved' }]" 
          @click="mainTab = 'approved'; selectedAthletes = []"
        >
          <span class="cat-tab-label">อนุมัติแล้ว</span>
          <span class="cat-tab-badge badge-approved">{{ athleteStats.approved }}</span>
        </button>
        <button 
          :class="['cat-tab', { active: mainTab === 'all' }]" 
          @click="mainTab = 'all'; selectedAthletes = []"
        >
          <span class="cat-tab-label">ทั้งหมด</span>
          <span class="cat-tab-badge">{{ athleteStats.total }}</span>
        </button>
      </div>

      <!-- Pending Alert (แสดงเฉพาะเมื่อมีรอตรวจสอบ) -->
      <div v-if="mainTab === 'pending' && athleteStats.pending > 0 && auth.isAdmin" class="pending-banner">
        <div class="banner-content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>มี {{ athleteStats.pending }} คนรอการอนุมัติ</span>
        </div>
        <button class="btn-approve-all-sm" @click="bulkApproveAll">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          อนุมัติทั้งหมด
        </button>
      </div>

      <!-- Toolbar: Search + Filters + View Toggle -->
      <div class="toolbar">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" type="text" class="search-input" placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..." />
        </div>
        
        <div class="toolbar-actions">
          <!-- View Mode Toggle -->
          <div class="view-toggle">
            <button :class="['toggle-btn', { active: viewMode === 'grid' }]" @click="viewMode = 'grid'" title="แสดงแบบ Grid">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button :class="['toggle-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'" title="แสดงแบบ List">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
          
          <!-- Sort Dropdown -->
          <div class="sort-dropdown">
            <select v-model="sortBy" class="sort-select">
              <option value="name">เรียงตามชื่อ</option>
              <option value="created_at">เรียงตามวันที่สมัคร</option>
              <option value="status">เรียงตามสถานะ</option>
              <option value="age">เรียงตามอายุ</option>
            </select>
            <button class="sort-order-btn" @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'">
              <svg v-if="sortOrder === 'asc'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="filters-row">
        <div v-if="auth.isAdmin" class="filter-group">
          <label>ชมรม</label>
          <select v-model="filterClub" class="filter-select">
            <option value="">ทั้งหมด</option>
            <option v-for="c in data.clubs" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>สถานะ</label>
          <select v-model="filterStatus" class="filter-select">
            <option value="">ทั้งหมด</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="pending">รอตรวจสอบ</option>
          </select>
        </div>
        <div class="filter-group">
          <label>กลุ่มอายุ</label>
          <select v-model="filterAgeGroup" class="filter-select">
            <option value="">ทั้งหมด</option>
            <option v-for="g in ageGroups" :key="g.value" :value="g.value">{{ g.label }}</option>
          </select>
        </div>
        <button v-if="activeFiltersCount > 0" class="btn-clear" @click="clearFilters">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          ล้างตัวกรอง ({{ activeFiltersCount }})
        </button>
      </div>

      <!-- Bulk Actions Bar -->
      <div v-if="auth.isAdmin && selectedAthletes.length > 0" class="bulk-actions-bar">
        <div class="bulk-info">
          <span>เลือก {{ selectedAthletes.length }} คน</span>
          <button class="btn-link" @click="selectedAthletes = []">ยกเลิกทั้งหมด</button>
        </div>
        <div class="bulk-buttons">
          <button class="btn-bulk btn-approve-bulk" @click="bulkApprove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            อนุมัติทั้งหมด
          </button>
        </div>
      </div>

      <!-- Results Info -->
      <div class="results-info">
        <span>พบ {{ filteredAthletes.length }} คน</span>
        <label v-if="auth.isAdmin && viewMode === 'list'" class="select-all-label">
          <input type="checkbox" :checked="selectedAthletes.length === filteredAthletes.length && filteredAthletes.length > 0" @change="selectAllAthletes" />
          เลือกทั้งหมด
        </label>
      </div>

      <!-- Empty State -->
      <div v-if="filteredAthletes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
        <p>{{ searchQuery || activeFiltersCount > 0 ? 'ไม่พบนักกีฬาตามเงื่อนไข' : 'ยังไม่มีนักกีฬา' }}</p>
        <button v-if="!searchQuery && activeFiltersCount === 0" class="btn-primary" @click="openAdd">เพิ่มนักกีฬาแรก</button>
        <button v-else class="btn-secondary" @click="clearFilters">ล้างตัวกรอง</button>
      </div>

      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="athletes-grid">
        <div v-for="a in filteredAthletes" :key="a.id" :class="['athlete-card', { 'card-pending': a.registration_status !== 'approved' }]" @click="viewDetail(a)">
          <!-- Pending Badge -->
          <div v-if="a.registration_status !== 'approved'" class="pending-ribbon">
            <span>รอตรวจสอบ</span>
          </div>
          <div class="card-header">
            <UserAvatar :avatar-url="a.user_profiles?.avatar_url" :user-name="a.name" size="md" />
            <div class="card-actions">
              <button v-if="a.phone" class="btn-icon btn-quick" @click="callAthlete(a.phone, $event)" title="โทร">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </button>
              <button v-if="canEditAthlete(a)" class="btn-icon" @click.stop="openEdit(a)" title="แก้ไข">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="card-body">
            <h3 class="athlete-name">{{ a.name }}</h3>
            <p class="athlete-email">{{ a.email }}</p>
            <div class="athlete-meta">
              <span v-if="auth.isAdmin" class="meta-item">{{ getClubName(a) }}</span>
              <span class="meta-item">โค้ช: {{ getCoachName(a) }}</span>
              <span v-if="a.birth_date" class="meta-item meta-age">{{ formatAge(a.birth_date) }}</span>
            </div>
            <div class="card-footer">
              <!-- แสดงปุ่มอนุมัติสำหรับนักกีฬาที่รอตรวจสอบ -->
              <template v-if="a.registration_status !== 'approved' && auth.isAdmin">
                <button class="btn-approve-card" @click="quickApprove(a, $event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  อนุมัติ
                </button>
              </template>
              <template v-else>
                <span :class="['status-badge', 'status-approved']">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  อนุมัติแล้ว
                </span>
              </template>
              <span class="view-detail">ดูรายละเอียด →</span>
            </div>
          </div>
        </div>
      </div>

      <!-- List View - Table Style -->
      <div v-else class="athletes-table-wrapper">
        <table class="athletes-table">
          <thead>
            <tr>
              <th v-if="auth.isAdmin" class="th-select">
                <input type="checkbox" :checked="selectedAthletes.length === filteredAthletes.length && filteredAthletes.length > 0" @change="selectAllAthletes" />
              </th>
              <th class="th-name sortable" @click="toggleSort('name')">
                <span>นักกีฬา</span>
                <svg v-if="sortBy === 'name'" class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path v-if="sortOrder === 'asc'" d="M12 19V5M5 12l7-7 7 7"/>
                  <path v-else d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </th>
              <th class="th-phone">เบอร์โทร</th>
              <th v-if="auth.isAdmin" class="th-club">ชมรม</th>
              <th class="th-coach">โค้ช</th>
              <th class="th-age sortable" @click="toggleSort('age')">
                <span>อายุ</span>
                <svg v-if="sortBy === 'age'" class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path v-if="sortOrder === 'asc'" d="M12 19V5M5 12l7-7 7 7"/>
                  <path v-else d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </th>
              <th class="th-status sortable" @click="toggleSort('status')">
                <span>สถานะ</span>
                <svg v-if="sortBy === 'status'" class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path v-if="sortOrder === 'asc'" d="M12 19V5M5 12l7-7 7 7"/>
                  <path v-else d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </th>
              <th class="th-actions">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in filteredAthletes" :key="a.id" class="table-row" @click="viewDetail(a)">
              <td v-if="auth.isAdmin" class="td-select" @click.stop>
                <input type="checkbox" :checked="selectedAthletes.includes(a.id)" @change="toggleSelectAthlete(a.id)" />
              </td>
              <td class="td-name">
                <div class="athlete-info">
                  <UserAvatar :avatar-url="a.user_profiles?.avatar_url" :user-name="a.name" size="sm" />
                  <div class="athlete-details">
                    <span class="athlete-name-text">{{ a.name }}</span>
                    <span class="athlete-email-text">{{ a.email }}</span>
                  </div>
                </div>
              </td>
              <td class="td-phone">
                <div class="phone-cell">
                  <span class="phone-number">{{ a.phone || '-' }}</span>
                  <div v-if="a.phone" class="phone-actions">
                    <button class="btn-phone" @click="callAthlete(a.phone, $event)" title="โทร">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </td>
              <td v-if="auth.isAdmin" class="td-club">
                <span class="club-name">{{ getClubName(a) }}</span>
              </td>
              <td class="td-coach">{{ getCoachName(a) }}</td>
              <td class="td-age">
                <span v-if="a.birth_date" class="age-badge">{{ formatAge(a.birth_date) }}</span>
                <span v-else class="no-data">-</span>
              </td>
              <td class="td-status">
                <span :class="['status-pill', a.registration_status === 'approved' ? 'status-approved' : 'status-pending']">
                  <svg v-if="a.registration_status === 'approved'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {{ a.registration_status === 'approved' ? 'อนุมัติ' : 'รอตรวจสอบ' }}
                </span>
              </td>
              <td class="td-actions" @click.stop>
                <div class="action-buttons">
                  <button class="btn-action" @click="emailAthlete(a.email, $event)" title="ส่งอีเมล">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </button>
                  <button v-if="canEditAthlete(a)" class="btn-action" @click="openEdit(a)" title="แก้ไข">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="btn-action btn-view" @click.stop="viewDetail(a)" title="ดูรายละเอียด">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile List View - แสดงเฉพาะบน mobile เมื่อเลือก list view -->
      <div v-if="viewMode === 'list'" class="mobile-list-container">
        <div v-for="a in filteredAthletes" :key="'m-'+a.id" class="mobile-card" @click="viewDetail(a)">
          <div class="mobile-card-header">
            <div class="mobile-select" v-if="auth.isAdmin" @click.stop>
              <input type="checkbox" :checked="selectedAthletes.includes(a.id)" @change="toggleSelectAthlete(a.id)" />
            </div>
            <UserAvatar :avatar-url="a.user_profiles?.avatar_url" :user-name="a.name" size="md" />
            <div class="mobile-info">
              <span class="mobile-name">{{ a.name }}</span>
              <span class="mobile-email">{{ a.email }}</span>
            </div>
            <span :class="['status-dot', a.registration_status === 'approved' ? 'dot-approved' : 'dot-pending']"></span>
          </div>
          <div class="mobile-card-body">
            <div class="mobile-row">
              <span class="mobile-label">เบอร์โทร</span>
              <span class="mobile-value">{{ a.phone || '-' }}</span>
            </div>
            <div v-if="auth.isAdmin" class="mobile-row">
              <span class="mobile-label">ชมรม</span>
              <span class="mobile-value">{{ getClubName(a) }}</span>
            </div>
            <div class="mobile-row">
              <span class="mobile-label">โค้ช</span>
              <span class="mobile-value">{{ getCoachName(a) }}</span>
            </div>
            <div class="mobile-row">
              <span class="mobile-label">อายุ</span>
              <span class="mobile-value">{{ formatAge(a.birth_date) }}</span>
            </div>
          </div>
          <div class="mobile-card-footer">
            <span :class="['status-badge', a.registration_status === 'approved' ? 'status-approved' : 'status-pending']">
              {{ a.registration_status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ' }}
            </span>
            <div class="mobile-actions" @click.stop>
              <button v-if="a.phone" class="btn-mobile" @click="callAthlete(a.phone, $event)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </button>
              <button class="btn-mobile" @click="emailAthlete(a.email, $event)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </button>
              <button v-if="canEditAthlete(a)" class="btn-mobile" @click="openEdit(a)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-if="showModal" @close="showModal = false">
      <template #header>
        <h2>{{ editingId ? 'แก้ไขนักกีฬา' : 'เพิ่มนักกีฬา' }}</h2>
      </template>
      <template #body>
        <form @submit.prevent="save" class="form">
          <div class="form-group">
            <label>ชื่อ-นามสกุล *</label>
            <input v-model="form.name" class="form-control" required />
          </div>
          <div class="form-group">
            <label>อีเมล *</label>
            <input v-model="form.email" type="email" class="form-control" required />
          </div>
          <div class="form-group">
            <label>เบอร์โทร</label>
            <input v-model="form.phone" class="form-control" />
          </div>
          <div class="form-group" v-if="auth.isAdmin">
            <label>ชมรม *</label>
            <select v-model="form.club_id" class="form-control" required @change="form.coach_id = null">
              <option v-for="c in data.clubs" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group" v-if="auth.isAdmin">
            <label>โค้ชที่ดูแล *</label>
            <select v-model="form.coach_id" class="form-control" required>
              <option v-for="c in data.getCoachesByClub(form.club_id)" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </form>
      </template>
      <template #footer>
        <button v-if="editingId && editingAthlete && canDeleteAthlete(editingAthlete)" class="btn-danger" @click="remove">ลบ</button>
        <button class="btn-secondary" @click="showModal = false">ยกเลิก</button>
        <button class="btn-primary" @click="save">บันทึก</button>
      </template>
    </Modal>

    <!-- Detail Modal -->
    <Modal v-if="showDetailModal" @close="showDetailModal = false" size="large">
      <template #header>
        <h2>ข้อมูลนักกีฬา</h2>
      </template>
      <template #body>
        <div class="detail-content">
          <!-- Athlete Header -->
          <div class="detail-header">
            <div class="avatar-container">
              <UserAvatar :avatar-url="selectedAthlete?.user_profiles?.avatar_url" :user-name="selectedAthlete?.name || ''" size="lg" />
              <button v-if="auth.isAdmin && selectedAthlete?.user_profiles?.avatar_url" class="btn-remove-avatar" @click.stop="removeAthleteAvatar" title="ลบรูปโปรไฟล์">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
            <div class="detail-info">
              <h3>{{ selectedAthlete?.name }}</h3>
              <p>{{ selectedAthlete?.email }}</p>
              <div class="status-actions">
                <span :class="['status-badge', selectedAthlete?.registration_status === 'approved' ? 'status-approved' : 'status-pending']">
                  {{ selectedAthlete?.registration_status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ' }}
                </span>
                <template v-if="auth.isAdmin">
                  <button v-if="selectedAthlete?.registration_status !== 'approved'" class="btn-sm btn-approve" @click="approveAthlete(selectedAthlete)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    อนุมัติ
                  </button>
                  <button v-else class="btn-sm btn-reject" @click="rejectAthlete(selectedAthlete)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    ยกเลิกอนุมัติ
                  </button>
                </template>
              </div>
              <!-- Quick Contact -->
              <div class="quick-contact">
                <button v-if="selectedAthlete?.phone" class="btn-contact-lg" @click="callAthlete(selectedAthlete.phone, $event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  {{ selectedAthlete.phone }}
                </button>
                <button class="btn-contact-lg" @click="emailAthlete(selectedAthlete?.email, $event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  ส่งอีเมล
                </button>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button :class="['tab', { active: activeTab === 'info' }]" @click="activeTab = 'info'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              ข้อมูลส่วนตัว
            </button>
            <button :class="['tab', { active: activeTab === 'documents' }]" @click="activeTab = 'documents'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              เอกสาร ({{ athleteDocuments.length }})
            </button>
            <button :class="['tab', { active: activeTab === 'history' }]" @click="activeTab = 'history'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M18 2H6v7a6 6 0 0012 0V2z"/>
              </svg>
              ประวัติแข่งขัน
            </button>
            <button :class="['tab', { active: activeTab === 'albums' }]" @click="activeTab = 'albums'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              อัลบั้มรูปภาพ
            </button>
            <button v-if="auth.isCoach || auth.isAdmin" :class="['tab', { active: activeTab === 'training' }]" @click="activeTab = 'training'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>
              </svg>
              สถิติการฝึก
            </button>
          </div>

          <!-- Info Tab -->
          <div v-if="activeTab === 'info'" class="tab-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">ชมรม</span>
                <span class="value">{{ getClubName(selectedAthlete) }}</span>
              </div>
              <div class="info-item">
                <span class="label">โค้ช</span>
                <span class="value">{{ getCoachName(selectedAthlete) }}</span>
              </div>
              <div class="info-item">
                <span class="label">เบอร์โทร</span>
                <span class="value">{{ selectedAthlete?.phone || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">วันเกิด</span>
                <span class="value">{{ formatDate(selectedAthlete?.birth_date) }}</span>
              </div>
              <div class="info-item">
                <span class="label">อายุ</span>
                <span class="value">{{ formatAge(selectedAthlete?.birth_date) }}</span>
              </div>
              <div class="info-item">
                <span class="label">กรุ๊ปเลือด</span>
                <span class="value">{{ selectedAthlete?.blood_type || '-' }}</span>
              </div>
              <div class="info-item full">
                <span class="label">ที่อยู่</span>
                <span class="value">{{ selectedAthlete?.address || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">เบอร์ฉุกเฉิน</span>
                <span class="value">{{ selectedAthlete?.emergency_phone || '-' }}</span>
              </div>
            </div>

            <!-- Parent Info -->
            <div v-if="selectedAthlete?.parent_name" class="parent-section">
              <h4>ข้อมูลผู้ปกครอง</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">ชื่อผู้ปกครอง</span>
                  <span class="value">{{ selectedAthlete?.parent_name }}</span>
                </div>
                <div class="info-item">
                  <span class="label">ความสัมพันธ์</span>
                  <span class="value">{{ selectedAthlete?.parent_relation || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">เบอร์โทรผู้ปกครอง</span>
                  <span class="value">{{ selectedAthlete?.parent_phone || '-' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Documents Tab -->
          <div v-if="activeTab === 'documents'" class="tab-content">
            <div v-if="loadingDocs" class="loading">กำลังโหลดเอกสาร...</div>
            <div v-else-if="athleteDocuments.length === 0" class="empty-docs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>ยังไม่มีเอกสาร</p>
            </div>
            <div v-else class="documents-list">
              <div v-for="doc in athleteDocuments" :key="doc.id" class="document-item">
                <div class="doc-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div class="doc-info">
                  <div class="doc-type">{{ documentTypes[doc.document_type] || doc.document_type }}</div>
                  <div class="doc-meta">
                    <span>{{ doc.file_name || 'ไม่ระบุชื่อไฟล์' }}</span>
                    <span>อัพโหลด: {{ formatDate(doc.uploaded_at) }}</span>
                  </div>
                </div>
                <div class="doc-actions">
                  <span v-if="doc.verified" class="verified-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    ยืนยันแล้ว
                  </span>
                  <button v-else-if="auth.isAdmin" class="btn-sm btn-verify" @click="verifyDocument(doc)">ยืนยันเอกสาร</button>
                  <a v-if="doc.file_url" :href="doc.file_url" target="_blank" class="btn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- History Tab -->
          <div v-if="activeTab === 'history'" class="tab-content">
            <AthleteHistory v-if="selectedAthlete" :athlete-id="selectedAthlete.id" />
          </div>

          <!-- Albums Tab -->
          <div v-if="activeTab === 'albums'" class="tab-content">
            <AlbumSection v-if="selectedAthlete?.user_id" :user-id="selectedAthlete.user_id" :read-only="true" />
            <div v-else class="empty-docs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <p>ไม่พบข้อมูลอัลบั้ม</p>
            </div>
          </div>

          <!-- Training Stats Tab -->
          <div v-if="activeTab === 'training'" class="tab-content">
            <AthleteTrainingStats v-if="selectedAthlete?.user_id" :athlete-id="selectedAthlete.id" :user-id="selectedAthlete.user_id" />
            <div v-else class="empty-docs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/>
              </svg>
              <p>ไม่พบข้อมูลสถิติการฝึก</p>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.athletes-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover { background: #262626; }
.btn-primary svg { width: 18px; height: 18px; }

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover { background: #F5F5F5; }
.btn-secondary svg { width: 18px; height: 18px; }

.btn-danger {
  background: #EF4444;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-icon {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon svg { width: 16px; height: 16px; }
.btn-icon:hover { background: #F5F5F5; }

.btn-quick {
  background: #F5F5F5;
  border: none;
}

.btn-quick:hover { background: #E5E5E5; }

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-card.stat-approved { border-left: 3px solid #22C55E; }
.stat-card.stat-pending { border-left: 3px solid #F59E0B; }
.stat-card.stat-age { border-left: 3px solid #3B82F6; }

.stat-icon {
  width: 44px;
  height: 44px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg { width: 22px; height: 22px; color: #fff; }
.stat-card.stat-approved .stat-icon { background: #22C55E; }
.stat-card.stat-pending .stat-icon { background: #F59E0B; }
.stat-card.stat-age .stat-icon { background: #3B82F6; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: #171717; }
.stat-label { font-size: 13px; color: #737373; }

/* Clean Category Tabs */
.category-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  background: #F5F5F5;
  border-radius: 10px;
  padding: 4px;
}

.cat-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.cat-tab:hover {
  background: rgba(255,255,255,0.5);
}

.cat-tab.active {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.cat-tab-label {
  font-size: 14px;
  font-weight: 500;
  color: #737373;
}

.cat-tab.active .cat-tab-label {
  color: #171717;
  font-weight: 600;
}

.cat-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: #E5E5E5;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #525252;
}

.cat-tab-badge.badge-pending {
  background: #FEF3C7;
  color: #92400E;
}

.cat-tab-badge.badge-pending.has-items {
  background: #F59E0B;
  color: #fff;
}

.cat-tab-badge.badge-approved {
  background: #D1FAE5;
  color: #065F46;
}

.cat-tab.active .cat-tab-badge {
  background: #171717;
  color: #fff;
}

/* Pending Banner */
.pending-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #FEF3C7;
  border-radius: 8px;
  margin-bottom: 16px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #92400E;
}

.banner-content svg {
  width: 20px;
  height: 20px;
  color: #F59E0B;
}

.btn-approve-all-sm {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #22C55E;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-approve-all-sm:hover {
  background: #16A34A;
}

.btn-approve-all-sm svg {
  width: 16px;
  height: 16px;
}

/* Pending Card Style */
.athlete-card.card-pending {
  border: 2px solid #F59E0B;
  position: relative;
  overflow: hidden;
}

.pending-ribbon {
  position: absolute;
  top: 12px;
  right: -30px;
  background: #F59E0B;
  color: #fff;
  padding: 4px 40px;
  font-size: 11px;
  font-weight: 600;
  transform: rotate(45deg);
  z-index: 1;
}

.btn-approve-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #22C55E;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-approve-card:hover {
  background: #16A34A;
}

.btn-approve-card svg {
  width: 16px;
  height: 16px;
}

.status-badge svg {
  width: 12px;
  height: 12px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #A3A3A3;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #171717;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.view-toggle {
  display: flex;
  background: #F5F5F5;
  border-radius: 8px;
  padding: 2px;
}

.toggle-btn {
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toggle-btn svg { width: 18px; height: 18px; color: #737373; }
.toggle-btn.active { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.toggle-btn.active svg { color: #171717; }

.sort-dropdown {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}

.sort-order-btn {
  background: #F5F5F5;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sort-order-btn svg { width: 16px; height: 16px; }
.sort-order-btn:hover { background: #E5E5E5; }

/* Filters Row */
.filters-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  color: #737373;
  font-weight: 500;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  min-width: 140px;
  background: #fff;
}

.btn-clear {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #737373;
  cursor: pointer;
}

.btn-clear:hover { background: #F5F5F5; color: #171717; }
.btn-clear svg { width: 14px; height: 14px; }

/* Bulk Actions */
.bulk-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #171717;
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-link {
  background: none;
  border: none;
  color: #A3A3A3;
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
}

.btn-link:hover { color: #fff; }

.bulk-buttons { display: flex; gap: 8px; }

.btn-bulk {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: none;
}

.btn-approve-bulk {
  background: #22C55E;
  color: #fff;
}

.btn-approve-bulk:hover { background: #16A34A; }
.btn-bulk svg { width: 16px; height: 16px; }

/* Results Info */
.results-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  color: #737373;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.select-all-label input { cursor: pointer; }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Grid View */
.athletes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.athlete-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.athlete-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-actions { display: flex; gap: 6px; }

.card-body {}

.athlete-name {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.athlete-email {
  font-size: 13px;
  color: #737373;
  margin: 0 0 8px;
}

.athlete-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 12px;
  color: #525252;
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 12px;
}

.meta-age { background: #EFF6FF; color: #1D4ED8; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #F5F5F5;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.status-approved { background: #D1FAE5; color: #065F46; }
.status-pending { background: #FEF3C7; color: #92400E; }

.view-detail { font-size: 12px; color: #737373; }

/* Table List View */
.athletes-table-wrapper {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

.athletes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.athletes-table thead {
  background: #FAFAFA;
  border-bottom: 1px solid #E5E5E5;
}

.athletes-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.athletes-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.athletes-table th.sortable:hover {
  color: #171717;
}

.athletes-table th span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sort-icon {
  width: 14px;
  height: 14px;
  color: #171717;
}

.th-select { width: 50px; }
.th-name { min-width: 250px; }
.th-phone { width: 150px; }
.th-club { width: 140px; }
.th-coach { width: 120px; }
.th-age { width: 80px; text-align: center; }
.th-status { width: 130px; }
.th-actions { width: 120px; text-align: center; }

.athletes-table tbody tr {
  border-bottom: 1px solid #F5F5F5;
  cursor: pointer;
  transition: background 0.15s;
}

.athletes-table tbody tr:last-child {
  border-bottom: none;
}

.athletes-table tbody tr:hover {
  background: #FAFAFA;
}

.athletes-table td {
  padding: 12px 16px;
  vertical-align: middle;
}

.td-select { width: 50px; }
.td-select input { cursor: pointer; width: 16px; height: 16px; }

.td-name { min-width: 250px; }

.athlete-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.athlete-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.athlete-name-text {
  font-weight: 600;
  color: #171717;
  font-size: 14px;
}

.athlete-email-text {
  font-size: 12px;
  color: #737373;
}

.td-phone { width: 150px; }

.phone-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-number {
  color: #525252;
  font-size: 13px;
}

.phone-actions {
  opacity: 0;
  transition: opacity 0.15s;
}

.table-row:hover .phone-actions {
  opacity: 1;
}

.btn-phone {
  background: #22C55E;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-phone svg {
  width: 14px;
  height: 14px;
  color: #fff;
}

.btn-phone:hover {
  background: #16A34A;
}

.td-club { width: 140px; }

.club-name {
  font-size: 13px;
  color: #525252;
  background: #F5F5F5;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.td-coach {
  width: 120px;
  color: #525252;
  font-size: 13px;
}

.td-age {
  width: 80px;
  text-align: center;
}

.age-badge {
  background: #EFF6FF;
  color: #1D4ED8;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.no-data {
  color: #A3A3A3;
}

.td-status { width: 130px; }

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-pill svg {
  width: 14px;
  height: 14px;
}

.status-pill.status-approved {
  background: #D1FAE5;
  color: #065F46;
}

.status-pill.status-pending {
  background: #FEF3C7;
  color: #92400E;
}

.td-actions {
  width: 120px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.table-row:hover .action-buttons {
  opacity: 1;
}

.btn-action {
  background: #F5F5F5;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-action svg {
  width: 16px;
  height: 16px;
  color: #525252;
}

.btn-action:hover {
  background: #171717;
}

.btn-action:hover svg {
  color: #fff;
}

.btn-action.btn-view {
  background: #171717;
}

.btn-action.btn-view svg {
  color: #fff;
}

.btn-action.btn-view:hover {
  background: #262626;
}

/* Mobile List View */
.mobile-list-container {
  display: none;
}

.mobile-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.mobile-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #F5F5F5;
}

.mobile-select {
  flex-shrink: 0;
}

.mobile-select input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.mobile-info {
  flex: 1;
  min-width: 0;
}

.mobile-name {
  display: block;
  font-weight: 600;
  color: #171717;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-email {
  display: block;
  font-size: 13px;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-approved { background: #22C55E; }
.dot-pending { background: #F59E0B; }

.mobile-card-body {
  padding: 12px 16px;
}

.mobile-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #F5F5F5;
}

.mobile-row:last-child {
  border-bottom: none;
}

.mobile-label {
  font-size: 13px;
  color: #737373;
}

.mobile-value {
  font-size: 13px;
  color: #171717;
  font-weight: 500;
}

.mobile-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #FAFAFA;
}

.mobile-actions {
  display: flex;
  gap: 8px;
}

.btn-mobile {
  background: #fff;
  border: 1px solid #E5E5E5;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-mobile svg {
  width: 18px;
  height: 18px;
  color: #525252;
}

.btn-mobile:hover {
  background: #171717;
  border-color: #171717;
}

.btn-mobile:hover svg {
  color: #fff;
}

/* Legacy styles for compatibility */
.btn-contact {
  background: #F5F5F5;
  border: none;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-contact svg { width: 14px; height: 14px; color: #525252; }
.btn-contact:hover { background: #E5E5E5; }

/* Detail Modal */
.detail-content { min-height: 400px; }

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 16px;
}

.avatar-container { position: relative; }

.btn-remove-avatar {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  background: #EF4444;
  color: #fff;
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.btn-remove-avatar:hover { background: #DC2626; }
.btn-remove-avatar svg { width: 12px; height: 12px; }

.detail-info { flex: 1; }
.detail-info h3 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
.detail-info p { color: #737373; margin: 0 0 8px; }

.status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.quick-contact {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-contact-lg {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #F5F5F5;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-contact-lg svg { width: 16px; height: 16px; }
.btn-contact-lg:hover { background: #E5E5E5; color: #171717; }

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 16px;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #737373;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: -1px;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab svg { width: 16px; height: 16px; }
.tab.active { color: #171717; border-bottom-color: #171717; }
.tab:hover { color: #171717; }

.tab-content { min-height: 200px; }

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full { grid-column: 1 / -1; }
.info-item .label { font-size: 12px; color: #737373; }
.info-item .value { font-size: 14px; color: #171717; font-weight: 500; }

.parent-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #E5E5E5;
}

.parent-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #171717;
}

/* Documents */
.loading, .empty-docs {
  text-align: center;
  padding: 32px;
  color: #737373;
}

.empty-docs svg {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.doc-icon {
  width: 40px;
  height: 40px;
  background: #171717;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-icon svg { width: 20px; height: 20px; color: #fff; }
.doc-info { flex: 1; }
.doc-type { font-size: 14px; font-weight: 500; color: #171717; }
.doc-meta { display: flex; gap: 12px; font-size: 12px; color: #737373; }
.doc-actions { display: flex; align-items: center; gap: 8px; }

.verified-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #D1FAE5;
  color: #065F46;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
}

.verified-badge svg { width: 14px; height: 14px; }

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-verify {
  background: #171717;
  color: #fff;
  border: none;
}

.btn-verify:hover { background: #262626; }

.btn-approve {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #22C55E;
  color: #fff;
  border: none;
}

.btn-approve:hover { background: #16A34A; }
.btn-approve svg { width: 14px; height: 14px; }

.btn-reject {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  color: #EF4444;
  border: 1px solid #EF4444;
}

.btn-reject:hover { background: #FEF2F2; }
.btn-reject svg { width: 14px; height: 14px; }

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-control {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #171717;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* ซ่อนคอลัมน์ที่ไม่จำเป็นบน tablet */
  .th-club, .td-club {
    display: none;
  }
}

@media (max-width: 768px) {
  .athletes-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Category Tabs Mobile - ยังคงแนวนอน */
  .category-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .cat-tab {
    padding: 10px 16px;
    white-space: nowrap;
    min-width: auto;
    flex: none;
  }
  
  .cat-tab-label {
    font-size: 13px;
  }
  
  .cat-tab-badge {
    min-width: 20px;
    height: 20px;
    font-size: 11px;
  }
  
  /* Pending Banner Mobile */
  .pending-banner {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .btn-approve-all-sm {
    width: 100%;
    justify-content: center;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: 100%;
  }
  
  .toolbar-actions {
    justify-content: space-between;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-select {
    width: 100%;
  }

  .athletes-grid {
    grid-template-columns: 1fr;
  }
  
  /* ซ่อน table บน mobile แสดง mobile-list แทน */
  .athletes-table-wrapper {
    display: none;
  }
  
  .mobile-list-container {
    display: block;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab {
    padding: 10px 12px;
    font-size: 13px;
  }

  .status-actions {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .quick-contact {
    flex-direction: column;
    width: 100%;
  }
  
  .btn-contact-lg {
    width: 100%;
    justify-content: center;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .detail-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .bulk-info, .bulk-buttons {
    width: 100%;
    justify-content: center;
  }
}
</style>
