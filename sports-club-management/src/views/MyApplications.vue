<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { supabase } from '@/lib/supabase'

const auth = useAuthStore()
const data = useDataStore()

const loading = ref(false)
const applications = ref([])
const athleteRecord = ref(null)

onMounted(async () => {
  loading.value = true
  await data.fetchClubs()
  
  // หา athlete record จาก user_id
  const { data: athlete } = await supabase
    .from('athletes')
    .select('*')
    .eq('user_id', auth.user?.id)
    .single()
  
  if (athlete) {
    athleteRecord.value = athlete
    applications.value = await data.getMyApplications(athlete.id)
  }
  loading.value = false
})

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
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>ใบสมัครของฉัน</h1>
      <p class="subtitle">ติดตามสถานะการสมัครเข้าชมรม</p>
    </header>

    <div v-if="loading" class="loading">กำลังโหลด...</div>

    <div v-else-if="applications.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <p>ยังไม่มีใบสมัคร</p>
    </div>

    <div v-else class="applications-list">
      <div v-for="app in applications" :key="app.id" class="application-card">
        <div class="card-header">
          <div class="club-info">
            <div class="club-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/>
              </svg>
            </div>
            <div>
              <h3>{{ app.clubs?.name || 'ชมรม' }}</h3>
              <p class="sport-type">{{ app.clubs?.sport || '-' }}</p>
            </div>
          </div>
          <span :class="['status-badge', getStatusClass(app.status)]">
            {{ getStatusLabel(app.status) }}
          </span>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>สมัครเมื่อ: {{ formatDate(app.applied_at) }}</span>
          </div>
          
          <div v-if="app.notes" class="notes">
            <strong>หมายเหตุ:</strong> {{ app.notes }}
          </div>
          
          <div v-if="app.status === 'approved'" class="success-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
            </svg>
            <span>ยินดีต้อนรับสู่ชมรม! คุณสามารถเข้าถึงข้อมูลชมรมได้แล้ว</span>
          </div>
          
          <div v-if="app.status === 'rejected'" class="reject-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <div>
              <span>ใบสมัครถูกปฏิเสธ</span>
              <p v-if="app.rejection_reason">เหตุผล: {{ app.rejection_reason }}</p>
            </div>
          </div>
          
          <div v-if="app.status === 'pending'" class="pending-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>กำลังรอการพิจารณาจากโค้ชหรือผู้ดูแลระบบ</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; max-width: 600px; margin: 0 auto; padding-bottom: 80px; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: #171717; margin: 0; }
.subtitle { color: #737373; font-size: 14px; margin-top: 4px; }

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
.club-info { display: flex; gap: 12px; align-items: center; }
.club-icon { 
  width: 48px; height: 48px; border-radius: 12px; background: #171717;
  display: flex; align-items: center; justify-content: center;
}
.club-icon svg { width: 24px; height: 24px; color: #fff; }
.club-info h3 { font-size: 16px; font-weight: 600; margin: 0; color: #171717; }
.sport-type { font-size: 13px; color: #737373; margin-top: 2px; }

.status-badge { 
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
}
.status-pending { background: #FEF3C7; color: #92400E; }
.status-approved { background: #D1FAE5; color: #065F46; }
.status-rejected { background: #FEE2E2; color: #991B1B; }

.card-body { padding: 16px; }
.info-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #525252; }
.info-row svg { width: 16px; height: 16px; }

.notes { margin-top: 12px; padding: 12px; background: #F5F5F5; border-radius: 8px; font-size: 13px; }

.success-message, .reject-message, .pending-message {
  display: flex; gap: 10px; padding: 14px; border-radius: 10px; margin-top: 12px; font-size: 13px;
}
.success-message { background: #D1FAE5; color: #065F46; }
.success-message svg { width: 20px; height: 20px; flex-shrink: 0; }
.reject-message { background: #FEE2E2; color: #991B1B; }
.reject-message svg { width: 20px; height: 20px; flex-shrink: 0; }
.reject-message p { margin-top: 4px; font-size: 12px; }
.pending-message { background: #FEF3C7; color: #92400E; }
.pending-message svg { width: 20px; height: 20px; flex-shrink: 0; }
</style>
