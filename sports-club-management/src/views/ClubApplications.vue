<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const auth = useAuthStore()
const data = useDataStore()

const loading = ref(false)
const filterStatus = ref('all')
const filterClub = ref('all')
const showRejectModal = ref(false)
const selectedApplication = ref(null)
const rejectionReason = ref('')

onMounted(async () => {
  loading.value = true
  await data.fetchClubs()
  await loadApplications()
  loading.value = false
})

async function loadApplications() {
  const filters = {}
  if (filterStatus.value !== 'all') filters.status = filterStatus.value
  if (filterClub.value !== 'all') filters.clubId = filterClub.value
  
  // Coach เห็นเฉพาะชมรมตัวเอง
  if (auth.isCoach && auth.profile?.club_id) {
    filters.clubId = auth.profile.club_id
  }
  
  await data.fetchClubApplications(filters)
}

const filteredApplications = computed(() => {
  let apps = data.clubApplications
  if (filterStatus.value !== 'all') {
    apps = apps.filter(a => a.status === filterStatus.value)
  }
  if (filterClub.value !== 'all') {
    apps = apps.filter(a => a.club_id === filterClub.value)
  }
  return apps
})

const statusCounts = computed(() => ({
  all: data.clubApplications.length,
  pending: data.clubApplications.filter(a => a.status === 'pending').length,
  approved: data.clubApplications.filter(a => a.status === 'approved').length,
  rejected: data.clubApplications.filter(a => a.status === 'rejected').length
}))

async function handleApprove(app) {
  if (!confirm(`อนุมัติใบสมัครของ ${app.athletes?.name} เข้าชมรม ${app.clubs?.name}?`)) return
  
  const result = await data.approveApplication(app.id, auth.user.id, auth.profile.role)
  if (result.success) {
    await loadApplications()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

function openRejectModal(app) {
  selectedApplication.value = app
  rejectionReason.value = ''
  showRejectModal.value = true
}

async function handleReject() {
  if (!selectedApplication.value) return
  
  const result = await data.rejectApplication(
    selectedApplication.value.id, 
    auth.user.id, 
    auth.profile.role,
    rejectionReason.value || null
  )
  
  if (result.success) {
    showRejectModal.value = false
    selectedApplication.value = null
    await loadApplications()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function getStatusLabel(status) {
  const labels = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ' }
  return labels[status] || status
}

function getStatusClass(status) {
  const classes = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' }
  return classes[status] || ''
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
  <div class="page">
    <header class="page-header">
      <h1>ใบสมัครชมรม</h1>
      <p class="subtitle">จัดการใบสมัครนักกีฬาเข้าชมรม</p>
    </header>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-tabs">
        <button 
          v-for="s in ['all', 'pending', 'approved', 'rejected']" 
          :key="s"
          :class="['tab', { active: filterStatus === s }]"
          @click="filterStatus = s; loadApplications()"
        >
          {{ s === 'all' ? 'ทั้งหมด' : getStatusLabel(s) }}
          <span class="count">{{ statusCounts[s] }}</span>
        </button>
      </div>
      
      <select v-if="auth.isAdmin" v-model="filterClub" @change="loadApplications()" class="filter-select">
        <option value="all">ทุกชมรม</option>
        <option v-for="club in data.clubs" :key="club.id" :value="club.id">{{ club.name }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลด...</div>

    <!-- Empty State -->
    <div v-else-if="filteredApplications.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <p>ไม่มีใบสมัคร{{ filterStatus !== 'all' ? getStatusLabel(filterStatus) : '' }}</p>
    </div>

    <!-- Applications List -->
    <div v-else class="applications-list">
      <div v-for="app in filteredApplications" :key="app.id" class="application-card">
        <div class="card-header">
          <div class="athlete-info">
            <div class="avatar">{{ app.athletes?.name?.charAt(0) || '?' }}</div>
            <div>
              <h3>{{ app.athletes?.name || 'ไม่ระบุชื่อ' }}</h3>
              <p class="club-name">สมัครเข้า: {{ app.clubs?.name || '-' }}</p>
            </div>
          </div>
          <span :class="['status-badge', getStatusClass(app.status)]">
            {{ getStatusLabel(app.status) }}
          </span>
        </div>
        
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>{{ app.athletes?.email || '-' }}</span>
            </div>
            <div class="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <span>{{ app.athletes?.phone || '-' }}</span>
            </div>
            <div class="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>อายุ: {{ calculateAge(app.athletes?.birth_date) }}</span>
            </div>
            <div class="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>สมัครเมื่อ: {{ formatDate(app.applied_at) }}</span>
            </div>
          </div>
          
          <div v-if="app.notes" class="notes">
            <strong>หมายเหตุ:</strong> {{ app.notes }}
          </div>
          
          <div v-if="app.status === 'rejected' && app.rejection_reason" class="rejection-reason">
            <strong>เหตุผลที่ปฏิเสธ:</strong> {{ app.rejection_reason }}
          </div>
          
          <div v-if="app.reviewed_at" class="review-info">
            <span>{{ app.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ' }}โดย: {{ app.reviewer?.name || '-' }}</span>
            <span>เมื่อ: {{ formatDate(app.reviewed_at) }}</span>
          </div>
        </div>
        
        <div v-if="app.status === 'pending'" class="card-actions">
          <button class="btn btn-approve" @click="handleApprove(app)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            อนุมัติ
          </button>
          <button class="btn btn-reject" @click="openRejectModal(app)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            ปฏิเสธ
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal">
        <h2>ปฏิเสธใบสมัคร</h2>
        <p>ปฏิเสธใบสมัครของ <strong>{{ selectedApplication?.athletes?.name }}</strong></p>
        
        <div class="form-group">
          <label>เหตุผล (ไม่บังคับ)</label>
          <textarea v-model="rejectionReason" rows="3" placeholder="ระบุเหตุผลที่ปฏิเสธ..."></textarea>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showRejectModal = false">ยกเลิก</button>
          <button class="btn btn-danger" @click="handleReject">ยืนยันปฏิเสธ</button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.page { padding: 16px; max-width: 800px; margin: 0 auto; padding-bottom: 80px; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: #171717; margin: 0; }
.subtitle { color: #737373; font-size: 14px; margin-top: 4px; }

.filters { margin-bottom: 16px; }
.filter-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
.tab { 
  padding: 8px 16px; border-radius: 20px; border: 1px solid #E5E5E5;
  background: #fff; font-size: 14px; cursor: pointer; white-space: nowrap;
  display: flex; align-items: center; gap: 6px;
}
.tab.active { background: #171717; color: #fff; border-color: #171717; }
.count { 
  background: rgba(0,0,0,0.1); padding: 2px 8px; border-radius: 10px; font-size: 12px;
}
.tab.active .count { background: rgba(255,255,255,0.2); }

.filter-select { 
  margin-top: 12px; padding: 10px 12px; border: 1px solid #E5E5E5; 
  border-radius: 8px; width: 100%; font-size: 14px;
}

.loading, .empty-state { text-align: center; padding: 40px 20px; color: #737373; }
.empty-icon { width: 64px; height: 64px; margin: 0 auto 16px; }
.empty-icon svg { width: 100%; height: 100%; stroke: #D4D4D4; }

.applications-list { display: flex; flex-direction: column; gap: 16px; }

.application-card { 
  background: #fff; border: 1px solid #E5E5E5; border-radius: 12px; 
  overflow: hidden;
}

.card-header { 
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 16px; border-bottom: 1px solid #F5F5F5;
}
.athlete-info { display: flex; gap: 12px; align-items: center; }
.avatar { 
  width: 48px; height: 48px; border-radius: 50%; background: #171717; color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px;
}
.athlete-info h3 { font-size: 16px; font-weight: 600; margin: 0; color: #171717; }
.club-name { font-size: 13px; color: #737373; margin-top: 2px; }

.status-badge { 
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
}
.status-pending { background: #FEF3C7; color: #92400E; }
.status-approved { background: #D1FAE5; color: #065F46; }
.status-rejected { background: #FEE2E2; color: #991B1B; }

.card-body { padding: 16px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #525252; }
.info-item svg { width: 16px; height: 16px; flex-shrink: 0; }

.notes, .rejection-reason, .review-info { 
  margin-top: 12px; padding: 12px; background: #F5F5F5; border-radius: 8px; font-size: 13px;
}
.rejection-reason { background: #FEE2E2; }
.review-info { display: flex; justify-content: space-between; color: #737373; }

.card-actions { 
  display: flex; gap: 12px; padding: 16px; border-top: 1px solid #F5F5F5;
}
.btn { 
  flex: 1; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 500;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; border: none;
}
.btn svg { width: 18px; height: 18px; }
.btn-approve { background: #171717; color: #fff; }
.btn-reject { background: #fff; color: #171717; border: 1px solid #E5E5E5; }
.btn-secondary { background: #F5F5F5; color: #171717; }
.btn-danger { background: #EF4444; color: #fff; }

.modal-overlay { 
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); 
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
}
.modal { 
  background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 400px;
}
.modal h2 { font-size: 18px; margin: 0 0 8px; }
.modal p { color: #737373; font-size: 14px; margin-bottom: 16px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
.form-group textarea { 
  width: 100%; padding: 12px; border: 1px solid #E5E5E5; border-radius: 8px; 
  font-size: 14px; resize: none;
}
.modal-actions { display: flex; gap: 12px; }
.modal-actions .btn { flex: 1; }
</style>
