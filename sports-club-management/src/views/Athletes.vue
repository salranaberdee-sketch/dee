<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'
import AthleteHistory from '@/components/AthleteHistory.vue'
import AlbumSection from '@/components/AlbumSection.vue'
import AthleteTrainingStats from '@/components/AthleteTrainingStats.vue'

const auth = useAuthStore()
const data = useDataStore()

const showModal = ref(false)
const showDetailModal = ref(false)
const editingId = ref(null)
const selectedAthlete = ref(null)
const athleteDocuments = ref([])
const loadingDocs = ref(false)
const activeTab = ref('info')
const form = ref({ name: '', email: '', phone: '', coach_id: null, club_id: null })
const searchQuery = ref('')

const documentTypes = {
  id_card: 'บัตรประชาชน',
  parent_id_card: 'บัตรประชาชนผู้ปกครอง',
  house_registration: 'ทะเบียนบ้าน',
  parent_house_registration: 'ทะเบียนบ้านผู้ปกครอง',
  birth_certificate: 'สูติบัตร'
}

onMounted(async () => {
  await Promise.all([data.fetchAthletes(), data.fetchClubs(), data.fetchCoaches()])
})

const currentCoach = computed(() => {
  if (auth.isCoach) {
    return data.coaches.find(c => c.email === auth.profile?.email)
  }
  return null
})

const filteredAthletes = computed(() => {
  let result = data.athletes
  
  // Coach sees only their club's athletes
  if (auth.isCoach && currentCoach.value) {
    result = result.filter(a => a.club_id === currentCoach.value.club_id)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
  }
  return result
})

function openAdd() {
  editingId.value = null
  form.value = { 
    name: '', email: '', phone: '', 
    coach_id: currentCoach.value?.id || null,
    club_id: currentCoach.value?.club_id || null
  }
  showModal.value = true
}

function openEdit(athlete) {
  editingId.value = athlete.id
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
  if (editingId.value) {
    await data.updateAthlete(editingId.value, form.value)
  } else {
    await data.addAthlete({ ...form.value })
  }
  showModal.value = false
}

async function remove() {
  if (confirm('ยืนยันการลบนักกีฬานี้?')) {
    await data.deleteAthlete(editingId.value)
    showModal.value = false
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

function calculateAge(birthDate) {
  if (!birthDate) return '-'
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age + ' ปี'
}
</script>

<template>
  <div class="athletes-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">นักกีฬา</h1>
        <p class="subtitle">จัดการข้อมูลนักกีฬาและเอกสาร</p>
      </div>
      <button class="btn-primary" @click="openAdd">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        เพิ่มนักกีฬา
      </button>
    </div>

    <div class="container">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="searchQuery" type="text" class="search-input" placeholder="ค้นหานักกีฬา..." />
      </div>

      <div v-if="filteredAthletes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
        <p>{{ searchQuery ? 'ไม่พบนักกีฬา' : 'ยังไม่มีนักกีฬา' }}</p>
        <button v-if="!searchQuery" class="btn-primary" @click="openAdd">เพิ่มนักกีฬาแรก</button>
      </div>

      <div v-else class="athletes-grid">
        <div v-for="a in filteredAthletes" :key="a.id" class="athlete-card" @click="viewDetail(a)">
          <div class="card-header">
            <div class="avatar">{{ a.name.charAt(0) }}</div>
            <div class="card-actions">
              <button class="btn-icon" @click.stop="openEdit(a)">
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
            </div>
            <div class="card-footer">
              <span :class="['status-badge', a.registration_status === 'approved' ? 'status-approved' : 'status-pending']">
                {{ a.registration_status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ' }}
              </span>
              <span class="view-detail">ดูรายละเอียด →</span>
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
        <button v-if="editingId" class="btn-danger" @click="remove">ลบ</button>
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
            <div class="avatar-large">{{ selectedAthlete?.name?.charAt(0) }}</div>
            <div class="detail-info">
              <h3>{{ selectedAthlete?.name }}</h3>
              <p>{{ selectedAthlete?.email }}</p>
              <span :class="['status-badge', selectedAthlete?.registration_status === 'approved' ? 'status-approved' : 'status-pending']">
                {{ selectedAthlete?.registration_status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ' }}
              </span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button :class="['tab', { active: activeTab === 'info' }]" @click="activeTab = 'info'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
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
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              อัลบั้มรูปภาพ
            </button>
            <button v-if="auth.isCoach || auth.isAdmin" :class="['tab', { active: activeTab === 'training' }]" @click="activeTab = 'training'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/>
                <path d="M9 14l2 2 4-4"/>
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
                <span class="value">{{ calculateAge(selectedAthlete?.birth_date) }}</span>
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
                  <button v-else-if="auth.isAdmin" class="btn-sm btn-verify" @click="verifyDocument(doc)">
                    ยืนยันเอกสาร
                  </button>
                  <a v-if="doc.file_url" :href="doc.file_url" target="_blank" class="btn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
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
            <AlbumSection 
              v-if="selectedAthlete?.user_id" 
              :user-id="selectedAthlete.user_id" 
              :read-only="true"
            />
            <div v-else class="empty-docs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p>ไม่พบข้อมูลอัลบั้ม</p>
            </div>
          </div>

          <!-- Training Stats Tab - Requirements 5.1, 5.2 -->
          <div v-if="activeTab === 'training'" class="tab-content">
            <AthleteTrainingStats 
              v-if="selectedAthlete?.user_id" 
              :athlete-id="selectedAthlete.id"
              :user-id="selectedAthlete.user_id"
            />
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
  max-width: 1200px;
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
}

.btn-primary:hover { background: #262626; }
.btn-primary svg { width: 18px; height: 18px; }

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover { background: #F5F5F5; }

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
}

.btn-icon svg { width: 16px; height: 16px; }
.btn-icon:hover { background: #F5F5F5; }

.container { max-width: 100%; }

.search-box {
  position: relative;
  margin-bottom: 20px;
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
  transition: box-shadow 0.2s;
}

.athlete-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.avatar-large {
  width: 64px;
  height: 64px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 24px;
}

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

.view-detail {
  font-size: 12px;
  color: #737373;
}

/* Detail Modal */
.detail-content { min-height: 400px; }

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 16px;
}

.detail-info h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
}

.detail-info p {
  color: #737373;
  margin: 0 0 8px;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 16px;
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
}

.tab svg { width: 16px; height: 16px; }
.tab.active { color: #171717; border-bottom-color: #171717; }
.tab:hover { color: #171717; }

.tab-content { min-height: 200px; }

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

.info-item .label {
  font-size: 12px;
  color: #737373;
}

.info-item .value {
  font-size: 14px;
  color: #171717;
  font-weight: 500;
}

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

.doc-type {
  font-size: 14px;
  font-weight: 500;
  color: #171717;
}

.doc-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #737373;
}

.doc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .athletes-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tabs {
    overflow-x: auto;
  }
}
</style>
