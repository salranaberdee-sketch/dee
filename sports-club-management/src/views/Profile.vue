<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { supabase } from '@/lib/supabase'
import AthleteHistory from '@/components/AthleteHistory.vue'

const router = useRouter()
const auth = useAuthStore()
const data = useDataStore()

const editing = ref(false)
const currentStep = ref(1)
const message = ref('')
const messageType = ref('success')
const isSaving = ref(false)

// Form data matching registration form
const form = ref({
  // Step 1: Personal Info
  name: '',
  phone: '',
  emergencyPhone: '',
  bloodType: '',
  birthDate: '',
  email: '',
  address: '',
  // Step 2: Parent Info (for athletes)
  parentName: '',
  parentPhone: '',
  parentRelation: '',
  // Step 3: Club Info
  clubId: null,
  coachId: null,
})

// Documents state
const documents = ref({
  id_card: null,
  parent_id_card: null,
  house_registration: null,
  parent_house_registration: null,
  birth_certificate: null,
})
const existingDocs = ref([])
const uploadingDoc = ref(null)

const docList = [
  { key: 'id_card', label: 'บัตรประชาชน (ตัวเอง)', required: true },
  { key: 'parent_id_card', label: 'บัตรประชาชน (ผู้ปกครอง)', required: true },
  { key: 'house_registration', label: 'ทะเบียนบ้าน (ตัวเอง)', required: true },
  { key: 'parent_house_registration', label: 'ทะเบียนบ้าน (ผู้ปกครอง)', required: false },
  { key: 'birth_certificate', label: 'สูติบัตร (ใบเกิด)', required: true },
]

const steps = computed(() => {
  if (auth.isAthlete) {
    return [
      { num: 1, title: 'ข้อมูลส่วนตัว', icon: 'user' },
      { num: 2, title: 'ผู้ปกครอง', icon: 'users' },
      { num: 3, title: 'ชมรม/โค้ช', icon: 'building' },
      { num: 4, title: 'เอกสาร', icon: 'file' },
    ]
  }
  return [
    { num: 1, title: 'ข้อมูลส่วนตัว', icon: 'user' },
    { num: 2, title: 'ชมรม', icon: 'building' },
  ]
})

const totalSteps = computed(() => steps.value.length)
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const relations = ['บิดา', 'มารดา', 'ปู่', 'ย่า', 'ตา', 'ยาย', 'ลุง', 'ป้า', 'อื่นๆ']
const roleLabels = { admin: 'ผู้ดูแลระบบ', coach: 'โค้ช', athlete: 'นักกีฬา' }

// Get athlete record for current user
const myAthlete = computed(() => {
  if (!auth.user?.id) return null
  return data.athletes.find(a => a.user_id === auth.user.id)
})

// Get coach record for current user
const myCoach = computed(() => {
  if (!auth.user?.id) return null
  return data.coaches.find(c => c.user_id === auth.user.id)
})

const myClub = computed(() => {
  if (!auth.profile?.club_id) return null
  return data.clubs.find(c => c.id === auth.profile.club_id)
})

const availableCoaches = computed(() => {
  return form.value.clubId ? data.getCoachesByClub(form.value.clubId) : []
})

// Load data into form
function loadFormData() {
  const profile = auth.profile
  const athlete = myAthlete.value
  const coach = myCoach.value

  form.value = {
    name: profile?.name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    emergencyPhone: athlete?.emergency_phone || '',
    bloodType: athlete?.blood_type || '',
    birthDate: athlete?.birth_date || '',
    address: athlete?.address || '',
    parentName: athlete?.parent_name || '',
    parentPhone: athlete?.parent_phone || '',
    parentRelation: athlete?.parent_relation || '',
    clubId: profile?.club_id || null,
    coachId: athlete?.coach_id || null,
  }
}

watch(() => [auth.profile, myAthlete.value, myCoach.value], () => {
  if (!editing.value) loadFormData()
}, { immediate: true })

onMounted(async () => {
  data.fetchClubs()
  data.fetchCoaches()
  data.fetchAthletes()
  if (auth.isAthlete && myAthlete.value) {
    await loadExistingDocuments()
  }
})

// Load existing documents from database
async function loadExistingDocuments() {
  if (!myAthlete.value?.id) return
  
  const { data: docs, error } = await supabase
    .from('athlete_documents')
    .select('*')
    .eq('athlete_id', myAthlete.value.id)
  
  if (!error && docs) {
    existingDocs.value = docs
  }
}

// Get existing document by type
function getExistingDoc(docType) {
  return existingDocs.value.find(d => d.document_type === docType)
}

// Handle file upload
async function handleFileUpload(docType, event) {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    message.value = 'ไฟล์ต้องไม่เกิน 5MB'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 3000)
    return
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    message.value = 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 3000)
    return
  }
  
  uploadingDoc.value = docType
  
  try {
    const userId = auth.user.id
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${docType}_${Date.now()}.${fileExt}`
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('athlete-documents')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('athlete-documents')
      .getPublicUrl(fileName)
    
    // Check if document already exists
    const existingDoc = getExistingDoc(docType)
    
    if (existingDoc) {
      // Delete old file from storage
      const oldPath = existingDoc.file_url.split('/athlete-documents/')[1]
      if (oldPath) {
        await supabase.storage.from('athlete-documents').remove([oldPath])
      }
      
      // Update record
      const { error: updateError } = await supabase
        .from('athlete_documents')
        .update({
          file_url: urlData.publicUrl,
          file_name: file.name,
          uploaded_at: new Date().toISOString(),
          verified: false,
          verified_at: null,
          verified_by: null,
        })
        .eq('id', existingDoc.id)
      
      if (updateError) throw updateError
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('athlete_documents')
        .insert({
          athlete_id: myAthlete.value.id,
          document_type: docType,
          file_url: urlData.publicUrl,
          file_name: file.name,
        })
      
      if (insertError) throw insertError
    }
    
    // Reload documents
    await loadExistingDocuments()
    
    message.value = 'อัปโหลดเอกสารสำเร็จ'
    messageType.value = 'success'
    setTimeout(() => message.value = '', 3000)
  } catch (error) {
    console.error('Upload error:', error)
    message.value = error.message || 'เกิดข้อผิดพลาดในการอัปโหลด'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 5000)
  } finally {
    uploadingDoc.value = null
  }
}

// Delete document
async function deleteDocument(docType) {
  if (!confirm('ยืนยันลบเอกสารนี้?')) return
  
  const doc = getExistingDoc(docType)
  if (!doc) return
  
  try {
    // Delete from storage
    const filePath = doc.file_url.split('/athlete-documents/')[1]
    if (filePath) {
      await supabase.storage.from('athlete-documents').remove([filePath])
    }
    
    // Delete from database
    const { error } = await supabase
      .from('athlete_documents')
      .delete()
      .eq('id', doc.id)
    
    if (error) throw error
    
    await loadExistingDocuments()
    
    message.value = 'ลบเอกสารสำเร็จ'
    messageType.value = 'success'
    setTimeout(() => message.value = '', 3000)
  } catch (error) {
    message.value = error.message || 'เกิดข้อผิดพลาดในการลบ'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 5000)
  }
}

// Count uploaded documents
const uploadedDocsCount = computed(() => existingDocs.value.length)

function startEditing() {
  loadFormData()
  editing.value = true
  currentStep.value = 1
}

function cancelEditing() {
  editing.value = false
  currentStep.value = 1
  loadFormData()
}

function goToStep(step) {
  if (step <= currentStep.value || step <= totalSteps.value) {
    currentStep.value = step
  }
}

function nextStep() {
  if (currentStep.value < totalSteps.value) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

async function save() {
  isSaving.value = true
  try {
    // Update user_profiles
    const profileResult = await auth.updateProfile({
      name: form.value.name,
      phone: form.value.phone,
      club_id: form.value.clubId,
    })

    if (!profileResult.success) {
      throw new Error(profileResult.message || 'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้')
    }

    // Update athlete record if user is athlete
    if (auth.isAthlete && myAthlete.value) {
      await data.updateAthlete(myAthlete.value.id, {
        name: form.value.name,
        phone: form.value.phone,
        email: form.value.email,
        emergency_phone: form.value.emergencyPhone,
        blood_type: form.value.bloodType,
        birth_date: form.value.birthDate || null,
        address: form.value.address,
        parent_name: form.value.parentName,
        parent_phone: form.value.parentPhone,
        parent_relation: form.value.parentRelation,
        club_id: form.value.clubId,
        coach_id: form.value.coachId,
      })
    }

    // Update coach record if user is coach
    if (auth.isCoach && myCoach.value) {
      await data.updateCoach(myCoach.value.id, {
        name: form.value.name,
        phone: form.value.phone,
        club_id: form.value.clubId,
      })
    }

    message.value = 'บันทึกข้อมูลเรียบร้อย'
    messageType.value = 'success'
    editing.value = false
    currentStep.value = 1
    
    // Refresh data
    await auth.fetchProfile()
    if (auth.isAthlete) await data.fetchAthletes()
    if (auth.isCoach) await data.fetchCoaches()
    
    setTimeout(() => message.value = '', 3000)
  } catch (error) {
    message.value = error.message || 'เกิดข้อผิดพลาดในการบันทึก'
    messageType.value = 'error'
    setTimeout(() => message.value = '', 5000)
  } finally {
    isSaving.value = false
  }
}

async function logout() {
  if (confirm('ยืนยันออกจากระบบ?')) {
    await auth.logout()
    router.push('/login')
  }
}

function getClubName(id) {
  return data.getClubById(id)?.name || '—'
}

function getCoachName(id) {
  return data.getCoachById(id)?.name || '—'
}

// Menu items
const menuItems = [
  { icon: 'building', label: 'จัดการชมรม', to: '/clubs', roles: ['admin'] },
  { icon: 'file-text', label: 'ใบสมัครชมรม', to: '/club-applications', roles: ['admin', 'coach'] },
  { icon: 'file-check', label: 'ใบสมัครของฉัน', to: '/my-applications', roles: ['athlete'] },
  { icon: 'clipboard', label: 'บันทึกฝึกซ้อม', to: '/training-logs', roles: ['admin', 'coach', 'athlete'] },
  { icon: 'database', label: 'สำรองข้อมูล', to: '/backup', roles: ['admin'] },
]

const filteredMenu = computed(() => menuItems.filter(item => item.roles.includes(auth.profile?.role)))
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1>โปรไฟล์</h1>
        <small v-if="editing">แก้ไขข้อมูล — ขั้นตอน {{ currentStep }}/{{ totalSteps }}</small>
      </div>
      <button v-if="!editing" class="btn btn-ghost" @click="startEditing">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        แก้ไข
      </button>
      <button v-else class="btn btn-ghost" @click="cancelEditing">ยกเลิก</button>
    </header>

    <!-- Message Alert -->
    <div v-if="message" :class="['alert', `alert-${messageType}`]">
      <svg v-if="messageType === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ message }}
    </div>

    <!-- View Mode -->
    <template v-if="!editing">
      <div class="container">
        <!-- Profile Hero -->
        <div class="profile-hero">
          <div class="avatar">{{ auth.profile?.name?.charAt(0) }}</div>
          <h2 class="profile-name">{{ auth.profile?.name }}</h2>
          <span :class="['badge', `badge-${auth.profile?.role}`]">{{ roleLabels[auth.profile?.role] }}</span>
          <p v-if="myClub" class="profile-club">{{ myClub.name }}</p>
        </div>

        <!-- Personal Info Section -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span class="section-title">ข้อมูลส่วนตัว</span>
          </div>
          <div class="info-list">
            <div class="info-row"><span class="info-label">อีเมล</span><span class="info-value">{{ auth.profile?.email }}</span></div>
            <div class="info-row"><span class="info-label">ชื่อ-นามสกุล</span><span class="info-value">{{ auth.profile?.name }}</span></div>
            <div class="info-row"><span class="info-label">เบอร์โทร</span><span class="info-value">{{ auth.profile?.phone || '—' }}</span></div>
            <template v-if="auth.isAthlete && myAthlete">
              <div class="info-row"><span class="info-label">เบอร์ฉุกเฉิน</span><span class="info-value">{{ myAthlete.emergency_phone || '—' }}</span></div>
              <div class="info-row"><span class="info-label">กรุ๊ปเลือด</span><span class="info-value">{{ myAthlete.blood_type || '—' }}</span></div>
              <div class="info-row"><span class="info-label">วันเกิด</span><span class="info-value">{{ myAthlete.birth_date || '—' }}</span></div>
              <div class="info-row"><span class="info-label">ที่อยู่</span><span class="info-value address">{{ myAthlete.address || '—' }}</span></div>
            </template>
          </div>
        </div>

        <!-- Parent Info Section (Athletes only) -->
        <div v-if="auth.isAthlete && myAthlete" class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span class="section-title">ข้อมูลผู้ปกครอง</span>
          </div>
          <div class="info-list">
            <div class="info-row"><span class="info-label">ชื่อผู้ปกครอง</span><span class="info-value">{{ myAthlete.parent_name || '—' }}</span></div>
            <div class="info-row"><span class="info-label">เบอร์โทร</span><span class="info-value">{{ myAthlete.parent_phone || '—' }}</span></div>
            <div class="info-row"><span class="info-label">ความสัมพันธ์</span><span class="info-value">{{ myAthlete.parent_relation || '—' }}</span></div>
          </div>
        </div>

        <!-- Club Info Section -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/>
              </svg>
            </div>
            <span class="section-title">ชมรม/สังกัด</span>
          </div>
          <div class="info-list">
            <div class="info-row"><span class="info-label">บทบาท</span><span class="info-value">{{ roleLabels[auth.profile?.role] }}</span></div>
            <div class="info-row"><span class="info-label">ชมรม</span><span class="info-value">{{ myClub?.name || '—' }}</span></div>
            <div v-if="auth.isAthlete && myAthlete" class="info-row">
              <span class="info-label">โค้ช</span><span class="info-value">{{ getCoachName(myAthlete.coach_id) }}</span>
            </div>
          </div>
        </div>

        <!-- Documents Section (Athletes only) -->
        <div v-if="auth.isAthlete && myAthlete" class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <span class="section-title">เอกสาร ({{ uploadedDocsCount }}/5)</span>
          </div>
          <div class="doc-view-list">
            <div v-for="doc in docList" :key="doc.key" class="doc-view-item">
              <div class="doc-view-info">
                <span class="doc-view-label">{{ doc.label }}</span>
                <span v-if="doc.required" class="doc-required">จำเป็น</span>
              </div>
              <div v-if="getExistingDoc(doc.key)" class="doc-view-status uploaded">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>อัปโหลดแล้ว</span>
                <span v-if="getExistingDoc(doc.key)?.verified" class="verified-badge">ตรวจสอบแล้ว</span>
              </div>
              <div v-else class="doc-view-status pending">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>ยังไม่ได้อัปโหลด</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Menu Section -->
        <div v-if="filteredMenu.length" class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </div>
            <span class="section-title">เมนู</span>
          </div>
          <div class="menu-list">
            <router-link v-for="item in filteredMenu" :key="item.to" :to="item.to" class="menu-row">
              <span class="menu-icon">
                <svg v-if="item.icon === 'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                <svg v-else-if="item.icon === 'file-text'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <svg v-else-if="item.icon === 'file-check'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
                <svg v-else-if="item.icon === 'clipboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                <svg v-else-if="item.icon === 'database'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              </span>
              <span class="menu-label">{{ item.label }}</span>
              <svg class="menu-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </router-link>
          </div>
        </div>

        <!-- Athlete History -->
        <div v-if="myAthlete?.id" class="section">
          <AthleteHistory :athlete-id="myAthlete.id" />
        </div>

        <!-- Logout Button -->
        <button class="logout-btn" @click="logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ออกจากระบบ
        </button>
      </div>
    </template>

    <!-- Edit Mode -->
    <template v-else>
      <!-- Steps Navigation -->
      <nav class="steps">
        <button v-for="s in steps" :key="s.num" :class="['step', { active: s.num === currentStep, done: s.num < currentStep }]" @click="goToStep(s.num)">
          <span class="step-num">{{ s.num < currentStep ? '✓' : s.num }}</span>
          <span class="step-label">{{ s.title }}</span>
        </button>
      </nav>

      <main class="edit-content">
        <!-- Step 1: Personal Info -->
        <section v-if="currentStep === 1" class="card">
          <div class="card-head">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h3>ข้อมูลส่วนตัว</h3>
              <p>แก้ไขข้อมูลพื้นฐาน</p>
            </div>
          </div>
          <div class="fields">
            <div class="field full">
              <label>ชื่อ-นามสกุล <i>*</i></label>
              <input v-model="form.name" placeholder="ชื่อ นามสกุล" />
            </div>
            <div class="field">
              <label>เบอร์โทร</label>
              <input v-model="form.phone" type="tel" placeholder="0812345678" />
            </div>
            <div class="field" v-if="auth.isAthlete">
              <label>เบอร์ฉุกเฉิน</label>
              <input v-model="form.emergencyPhone" type="tel" placeholder="0898765432" />
            </div>
            <div class="field" v-if="auth.isAthlete">
              <label>กรุ๊ปเลือด</label>
              <select v-model="form.bloodType">
                <option value="">เลือก</option>
                <option v-for="b in bloodTypes" :key="b">{{ b }}</option>
              </select>
            </div>
            <div class="field" v-if="auth.isAthlete">
              <label>วันเกิด</label>
              <input v-model="form.birthDate" type="date" />
            </div>
            <div class="field full">
              <label>อีเมล</label>
              <input :value="auth.profile?.email" type="email" disabled class="disabled" />
            </div>
            <div class="field full" v-if="auth.isAthlete">
              <label>ที่อยู่</label>
              <textarea v-model="form.address" rows="2" placeholder="ที่อยู่ปัจจุบัน"></textarea>
            </div>
          </div>
        </section>

        <!-- Step 2: Parent Info (Athletes) -->
        <section v-if="currentStep === 2 && auth.isAthlete" class="card">
          <div class="card-head">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div>
              <h3>ข้อมูลผู้ปกครอง</h3>
              <p>แก้ไขข้อมูลผู้ปกครองหรือผู้ดูแล</p>
            </div>
          </div>
          <div class="fields">
            <div class="field full">
              <label>ชื่อผู้ปกครอง</label>
              <input v-model="form.parentName" placeholder="ชื่อ นามสกุล" />
            </div>
            <div class="field">
              <label>เบอร์โทร</label>
              <input v-model="form.parentPhone" type="tel" placeholder="0812345678" />
            </div>
            <div class="field">
              <label>ความสัมพันธ์</label>
              <select v-model="form.parentRelation">
                <option value="">เลือก</option>
                <option v-for="r in relations" :key="r">{{ r }}</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Step 2/3: Club Info -->
        <section v-if="(currentStep === 2 && !auth.isAthlete) || (currentStep === 3 && auth.isAthlete)" class="card">
          <div class="card-head">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/>
              </svg>
            </div>
            <div>
              <h3>ชมรม/สังกัด</h3>
              <p>เลือกชมรม{{ auth.isAthlete ? 'และโค้ช' : '' }}</p>
            </div>
          </div>
          <div class="fields">
            <div class="field full">
              <label>ชมรม</label>
              <select v-model="form.clubId" @change="form.coachId = null">
                <option :value="null">เลือกชมรม</option>
                <option v-for="c in data.clubs" :key="c.id" :value="c.id">{{ c.name }} — {{ c.sport }}</option>
              </select>
            </div>
            <div class="field full" v-if="auth.isAthlete">
              <label>โค้ช</label>
              <select v-model="form.coachId" :disabled="!form.clubId">
                <option :value="null">{{ form.clubId ? 'เลือกโค้ช' : 'เลือกชมรมก่อน' }}</option>
                <option v-for="c in availableCoaches" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div v-if="form.clubId" class="selected-info">
            <div class="info-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
              </svg>
              {{ getClubName(form.clubId) }}
            </div>
            <div v-if="form.coachId" class="info-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {{ getCoachName(form.coachId) }}
            </div>
          </div>
        </section>

        <!-- Step 4: Documents (Athletes only) -->
        <section v-if="currentStep === 4 && auth.isAthlete" class="card">
          <div class="card-head">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <h3>อัปโหลดเอกสาร</h3>
              <p>อัปโหลดเอกสารประกอบ ({{ uploadedDocsCount }}/5)</p>
            </div>
          </div>
          <div class="doc-list">
            <div v-for="doc in docList" :key="doc.key" class="doc-item">
              <div class="doc-label">
                {{ doc.label }}
                <span v-if="doc.required" class="doc-required-mark">*</span>
              </div>
              
              <!-- Existing document -->
              <div v-if="getExistingDoc(doc.key)" class="doc-uploaded">
                <div class="doc-uploaded-info">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div class="doc-uploaded-details">
                    <span class="doc-filename">{{ getExistingDoc(doc.key).file_name }}</span>
                    <span v-if="getExistingDoc(doc.key).verified" class="doc-verified">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      ตรวจสอบแล้ว
                    </span>
                  </div>
                </div>
                <div class="doc-actions">
                  <a :href="getExistingDoc(doc.key).file_url" target="_blank" class="doc-action-btn view">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </a>
                  <button class="doc-action-btn delete" @click="deleteDocument(doc.key)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- Upload area -->
              <label v-else class="doc-upload" :class="{ uploading: uploadingDoc === doc.key }">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  @change="handleFileUpload(doc.key, $event)"
                  :disabled="uploadingDoc === doc.key"
                  hidden 
                />
                <div v-if="uploadingDoc === doc.key" class="upload-progress">
                  <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <span>กำลังอัปโหลด...</span>
                </div>
                <div v-else class="upload-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span>เลือกไฟล์ (JPG, PNG, PDF ไม่เกิน 5MB)</span>
                </div>
              </label>
            </div>
          </div>
        </section>

        <!-- Navigation Buttons -->
        <div class="nav-buttons">
          <button v-if="currentStep > 1" class="btn btn-secondary" @click="prevStep">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            ย้อนกลับ
          </button>
          <div v-else></div>
          <button v-if="currentStep < totalSteps" class="btn btn-primary" @click="nextStep">
            ถัดไป
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button v-else class="btn btn-primary" :disabled="isSaving || !form.name" @click="save">
            <svg v-if="isSaving" class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
          </button>
        </div>
      </main>
    </template>
  </div>
</template>


<style scoped>
.page { min-height: 100vh; background: #F5F5F5; padding-bottom: 100px; }

/* Header */
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: #fff; border-bottom: 1px solid #E5E5E5;
  position: sticky; top: 0; z-index: 10;
}
.header-content h1 { font-size: 18px; font-weight: 600; }
.header-content small { font-size: 13px; color: #737373; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; transition: 0.15s; }
.btn-ghost { background: #F5F5F5; color: #404040; }
.btn-ghost:hover { background: #E5E5E5; }
.btn-primary { background: #171717; color: #fff; }
.btn-primary:disabled { background: #D4D4D4; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #404040; border: 1px solid #E5E5E5; }

/* Alert */
.alert {
  display: flex; align-items: center; gap: 10px;
  margin: 16px 20px; padding: 14px 16px; border-radius: 12px;
  font-size: 14px; font-weight: 500;
}
.alert-success { background: #D1FAE5; color: #065F46; }
.alert-error { background: #FEE2E2; color: #991B1B; }

/* Container */
.container { padding: 20px; max-width: 500px; margin: 0 auto; }

/* Profile Hero */
.profile-hero {
  text-align: center; padding: 32px 20px; margin-bottom: 20px;
  background: #fff; border-radius: 16px; border: 1px solid #E5E5E5;
}
.avatar {
  width: 72px; height: 72px; margin: 0 auto 16px;
  background: #171717; color: #fff; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; font-weight: 600;
}
.profile-name { font-size: 22px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; }
.badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge-admin { background: #171717; color: #fff; }
.badge-coach { background: #E5E5E5; color: #404040; }
.badge-athlete { background: #F5F5F5; color: #525252; }
.profile-club { margin-top: 10px; font-size: 14px; color: #737373; }

/* Section */
.section { background: #fff; border-radius: 16px; border: 1px solid #E5E5E5; margin-bottom: 16px; overflow: hidden; }
.section-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-bottom: 1px solid #F5F5F5;
}
.section-icon {
  width: 36px; height: 36px; background: #171717; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.section-icon svg { width: 18px; height: 18px; color: #fff; }
.section-title { font-size: 15px; font-weight: 600; color: #171717; }

/* Info List */
.info-list { padding: 0; }
.info-row {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 14px 20px; border-bottom: 1px solid #F5F5F5;
}
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 14px; color: #737373; flex-shrink: 0; }
.info-value { font-size: 14px; font-weight: 500; color: #171717; text-align: right; word-break: break-word; }
.info-value.address { max-width: 200px; }

/* Menu List */
.menu-list { padding: 0; }
.menu-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 20px; border-bottom: 1px solid #F5F5F5;
  text-decoration: none; color: #171717; transition: background 0.15s;
}
.menu-row:last-child { border-bottom: none; }
.menu-row:active { background: #F5F5F5; }
.menu-icon {
  width: 36px; height: 36px; background: #F5F5F5; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.menu-icon svg { width: 18px; height: 18px; color: #525252; }
.menu-label { flex: 1; font-size: 14px; font-weight: 500; }
.menu-chevron { color: #D4D4D4; }

/* Logout Button */
.logout-btn {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 16px; margin-top: 20px;
  background: none; border: 1.5px solid #EF4444;
  border-radius: 12px; color: #EF4444;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.logout-btn:hover { background: #EF4444; color: #fff; }

/* Steps Navigation */
.steps {
  display: flex; background: #fff; border-bottom: 1px solid #E5E5E5;
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.step {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 16px 8px; border: none; background: none; cursor: pointer;
  opacity: 0.4; transition: 0.2s; min-width: 90px;
}
.step.active, .step.done { opacity: 1; }
.step.active { border-bottom: 2px solid #171717; }
.step-num {
  width: 28px; height: 28px; border-radius: 50%; background: #E5E5E5;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
}
.step.active .step-num, .step.done .step-num { background: #171717; color: #fff; }
.step-label { font-size: 11px; color: #525252; white-space: nowrap; }

/* Edit Content */
.edit-content { padding: 20px; max-width: 500px; margin: 0 auto; }

/* Card */
.card {
  background: #fff; border-radius: 16px; padding: 24px;
  margin-bottom: 16px; border: 1px solid #E5E5E5;
}
.card-head { display: flex; gap: 14px; margin-bottom: 24px; }
.card-icon {
  width: 48px; height: 48px; background: #171717; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.card-icon svg { width: 24px; height: 24px; color: #fff; }
.card-head h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.card-head p { font-size: 14px; color: #737373; }

/* Fields */
.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field.full { grid-column: span 2; }
.field label { font-size: 14px; font-weight: 500; color: #404040; }
.field i { color: #DC2626; font-style: normal; }
.field input, .field select, .field textarea {
  padding: 14px 16px; border: 1.5px solid #E5E5E5; border-radius: 12px;
  font-size: 16px; background: #fff; width: 100%; font-family: inherit;
}
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none; border-color: #171717;
}
.field input.disabled { background: #F5F5F5; color: #737373; cursor: not-allowed; }
.field select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; padding-right: 44px;
}
.field select:disabled { background-color: #F5F5F5; color: #A3A3A3; cursor: not-allowed; }

/* Selected Info */
.selected-info {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E5E5;
}
.info-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: #F5F5F5; border-radius: 8px;
  font-size: 14px; font-weight: 500;
}

/* Navigation Buttons */
.nav-buttons {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; gap: 12px;
  padding: 16px 20px; background: #fff; border-top: 1px solid #E5E5E5;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
.nav-buttons .btn { flex: 1; justify-content: center; padding: 14px 20px; }

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner { animation: spin 1s linear infinite; }

/* Document View List (View Mode) */
.doc-view-list { padding: 0; }
.doc-view-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid #F5F5F5;
}
.doc-view-item:last-child { border-bottom: none; }
.doc-view-info { display: flex; align-items: center; gap: 8px; }
.doc-view-label { font-size: 14px; color: #404040; }
.doc-required { font-size: 11px; color: #DC2626; background: #FEE2E2; padding: 2px 6px; border-radius: 4px; }
.doc-view-status { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.doc-view-status.uploaded { color: #065F46; }
.doc-view-status.pending { color: #737373; }
.verified-badge { font-size: 11px; background: #D1FAE5; color: #065F46; padding: 2px 6px; border-radius: 4px; margin-left: 4px; }

/* Document List (Edit Mode) */
.doc-list { display: flex; flex-direction: column; gap: 12px; }
.doc-item { padding: 16px; background: #FAFAFA; border-radius: 12px; }
.doc-label { font-size: 14px; font-weight: 500; margin-bottom: 12px; color: #404040; }
.doc-required-mark { color: #DC2626; margin-left: 2px; }

/* Document Upload Area */
.doc-upload {
  display: flex; align-items: center; justify-content: center;
  padding: 20px; border: 2px dashed #D4D4D4; border-radius: 10px;
  cursor: pointer; transition: 0.15s; background: #fff;
}
.doc-upload:hover { border-color: #171717; background: #FAFAFA; }
.doc-upload.uploading { border-color: #A3A3A3; cursor: wait; }
.upload-placeholder, .upload-progress {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  color: #737373; font-size: 13px; text-align: center;
}
.upload-progress { color: #404040; }

/* Uploaded Document */
.doc-uploaded {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #D1FAE5; border-radius: 10px;
}
.doc-uploaded-info { display: flex; align-items: center; gap: 12px; color: #065F46; }
.doc-uploaded-details { display: flex; flex-direction: column; gap: 2px; }
.doc-filename { font-size: 13px; font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-verified { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #047857; }
.doc-actions { display: flex; gap: 8px; }
.doc-action-btn {
  width: 32px; height: 32px; border-radius: 8px; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.15s; text-decoration: none;
}
.doc-action-btn.view { background: #fff; color: #065F46; }
.doc-action-btn.view:hover { background: #ECFDF5; }
.doc-action-btn.delete { background: #FEE2E2; color: #991B1B; }
.doc-action-btn.delete:hover { background: #FECACA; }

/* Responsive */
@media (max-width: 480px) {
  .fields { grid-template-columns: 1fr; }
  .field.full { grid-column: span 1; }
  .doc-view-item { flex-direction: column; align-items: flex-start; gap: 8px; }
  .doc-uploaded { flex-direction: column; align-items: flex-start; gap: 12px; }
  .doc-filename { max-width: 200px; }
}
</style>
