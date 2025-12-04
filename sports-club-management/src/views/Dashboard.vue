<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const router = useRouter()
const auth = useAuthStore()
const data = useDataStore()

const roleLabel = { admin: 'ผู้ดูแลระบบ', coach: 'โค้ช', athlete: 'นักกีฬา' }

onMounted(async () => {
  await data.initData()
  // โหลดใบสมัครสำหรับ Admin/Coach
  if (auth.isAdmin || auth.isCoach) {
    const filters = auth.isCoach && auth.profile?.club_id ? { clubId: auth.profile.club_id } : {}
    await data.fetchClubApplications(filters)
  }
})

const upcomingSchedules = computed(() => {
  return data.upcomingSchedules.slice(0, 4)
})

const recentLogs = computed(() => data.trainingLogs.slice(0, 3))

const todaySchedule = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return data.schedules.find(s => s.date === today)
})

const userName = computed(() => auth.profile?.name || 'ผู้ใช้')
const userRole = computed(() => auth.profile?.role || 'athlete')

// Latest announcements
const latestAnnouncements = computed(() => data.announcements.slice(0, 2))

// Pending applications count
const pendingApplications = computed(() => data.pendingApplicationsCount)

// Quick actions แบ่งเป็นกลุ่มตาม role
const quickActionGroups = computed(() => {
  if (auth.isAdmin) {
    return [
      {
        title: 'จัดการระบบ',
        actions: [
          { icon: 'building', label: 'ชมรม', to: '/clubs' },
          { icon: 'medal', label: 'โค้ช', to: '/coaches' },
          { icon: 'users', label: 'นักกีฬา', to: '/athletes' },
          { icon: 'category', label: 'หมวดหมู่', to: '/category-management' },
        ]
      },
      {
        title: 'ประเมินและพัฒนา',
        actions: [
          { icon: 'chart', label: 'ประเมินผล', to: '/evaluation' },
          { icon: 'progress', label: 'แผนพัฒนา', to: '/training-plans' },
          { icon: 'scoring', label: 'เกณฑ์คะแนน', to: '/scoring-config' },
          { icon: 'calculator', label: 'คำนวณคะแนน', to: '/score-calculator' },
        ]
      },
      {
        title: 'กิจกรรมและการแข่งขัน',
        actions: [
          { icon: 'trophy', label: 'ทัวร์นาเมนต์', to: '/tournaments' },
          { icon: 'history', label: 'ประวัติแข่งขัน', to: '/tournament-history' },
          { icon: 'star', label: 'กิจกรรม', to: '/events' },
          { icon: 'calendar', label: 'ตารางนัดหมาย', to: '/schedules' },
        ]
      },
      {
        title: 'เครื่องมือ',
        actions: [
          { icon: 'checklist', label: 'เช็คชื่อ', to: '/attendance' },
          { icon: 'album', label: 'จัดการอัลบั้ม', to: '/albums' },
          { icon: 'megaphone', label: 'ประกาศ', to: '/announcements' },
          { icon: 'database', label: 'สำรองข้อมูล', to: '/backup' },
        ]
      }
    ]
  }
  if (auth.isCoach) {
    return [
      {
        title: 'จัดการนักกีฬา',
        actions: [
          { icon: 'users', label: 'นักกีฬา', to: '/athletes' },
          { icon: 'chart', label: 'ประเมินผล', to: '/evaluation' },
          { icon: 'progress', label: 'แผนพัฒนา', to: '/training-plans' },
          { icon: 'checklist', label: 'เช็คชื่อ', to: '/attendance' },
        ]
      },
      {
        title: 'การแข่งขันและกิจกรรม',
        actions: [
          { icon: 'trophy', label: 'ทัวร์นาเมนต์', to: '/tournaments' },
          { icon: 'star', label: 'กิจกรรม', to: '/events' },
          { icon: 'calendar', label: 'ตารางนัดหมาย', to: '/schedules' },
          { icon: 'megaphone', label: 'ประกาศ', to: '/announcements' },
        ]
      },
      {
        title: 'เครื่องมือ',
        actions: [
          { icon: 'scoring', label: 'เกณฑ์คะแนน', to: '/scoring-config' },
          { icon: 'calculator', label: 'คำนวณคะแนน', to: '/score-calculator' },
          { icon: 'album', label: 'จัดการอัลบั้ม', to: '/albums' },
          { icon: 'clipboard', label: 'บันทึกฝึกซ้อม', to: '/training-logs' },
        ]
      }
    ]
  }
  // Athlete
  return [
    {
      title: 'ของฉัน',
      actions: [
        { icon: 'chart', label: 'ผลงานของฉัน', to: '/my-performance' },
        { icon: 'clipboard', label: 'บันทึกฝึกซ้อม', to: '/training-logs' },
        { icon: 'file', label: 'ใบสมัครของฉัน', to: '/my-applications' },
        { icon: 'leave', label: 'ขอลา', to: '/leave-request' },
      ]
    },
    {
      title: 'กิจกรรมและการแข่งขัน',
      actions: [
        { icon: 'trophy', label: 'ทัวร์นาเมนต์', to: '/tournaments' },
        { icon: 'star', label: 'กิจกรรม', to: '/events' },
        { icon: 'calendar', label: 'ตารางนัดหมาย', to: '/schedules' },
        { icon: 'megaphone', label: 'ประกาศ', to: '/announcements' },
      ]
    }
  ]
})

// Quick actions แบบเดิม (สำหรับ backward compatibility)
const quickActions = computed(() => {
  return quickActionGroups.value.flatMap(group => group.actions)
})
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <p class="greeting">สวัสดี, {{ userName }}</p>
        <span :class="['badge', `badge-${userRole}`]">{{ roleLabel[userRole] }}</span>
      </div>
      <div class="avatar">{{ userName.charAt(0) }}</div>
    </div>

    <div class="container">
      <!-- Today Alert -->
      <div v-if="todaySchedule" class="today-alert" @click="router.push('/schedules')">
        <div class="today-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </div>
        <div class="today-content">
          <span class="today-label">วันนี้</span>
          <span class="today-title">{{ todaySchedule.title }}</span>
          <span class="today-time">{{ todaySchedule.time }} · {{ todaySchedule.location }}</span>
        </div>
      </div>

      <!-- Pending Applications Alert -->
      <div v-if="(auth.isAdmin || auth.isCoach) && pendingApplications > 0" class="pending-alert" @click="router.push('/club-applications')">
        <div class="pending-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="pending-content">
          <span class="pending-label">ใบสมัครรออนุมัติ</span>
          <span class="pending-count">{{ pendingApplications }} รายการ</span>
        </div>
        <svg class="pending-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>

      <!-- Admin Stats -->
      <div v-if="auth.isAdmin" class="stats-row">
        <div class="stat-item" @click="router.push('/clubs')">
          <span class="stat-num">{{ data.stats.totalClubs }}</span>
          <span class="stat-text">ชมรม</span>
        </div>
        <div class="stat-item" @click="router.push('/coaches')">
          <span class="stat-num">{{ data.stats.totalCoaches }}</span>
          <span class="stat-text">โค้ช</span>
        </div>
        <div class="stat-item" @click="router.push('/athletes')">
          <span class="stat-num">{{ data.stats.totalAthletes }}</span>
          <span class="stat-text">นักกีฬา</span>
        </div>
      </div>

      <!-- Quick Actions แบบจัดกลุ่ม -->
      <div v-for="(group, groupIndex) in quickActionGroups" :key="groupIndex" class="action-group">
        <div class="action-group-header">
          <span class="action-group-title">{{ group.title }}</span>
        </div>
        <div class="quick-grid">
          <button v-for="action in group.actions" :key="action.label" class="quick-btn" @click="router.push(action.to)">
            <span class="quick-icon">
              <svg v-if="action.icon === 'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/></svg>
              <svg v-else-if="action.icon === 'medal'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
              <svg v-else-if="action.icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg>
              <svg v-else-if="action.icon === 'database'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              <svg v-else-if="action.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <svg v-else-if="action.icon === 'clipboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
              <svg v-else-if="action.icon === 'megaphone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 4H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V6a2 2 0 00-2-2z"/></svg>
              <svg v-else-if="action.icon === 'trophy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/></svg>
              <svg v-else-if="action.icon === 'star'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg v-else-if="action.icon === 'file'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <svg v-else-if="action.icon === 'chart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <svg v-else-if="action.icon === 'scoring'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <svg v-else-if="action.icon === 'checklist'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              <svg v-else-if="action.icon === 'leave'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
              <svg v-else-if="action.icon === 'progress'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <svg v-else-if="action.icon === 'category'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <svg v-else-if="action.icon === 'calculator'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="16" y1="18" x2="16" y2="18.01"/></svg>
              <svg v-else-if="action.icon === 'history'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <svg v-else-if="action.icon === 'album'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </span>
            <span class="quick-label">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- Schedules -->
      <div class="section-header">
        <span class="section-title">นัดหมายถัดไป</span>
        <router-link to="/schedules" class="section-link">ดูทั้งหมด</router-link>
      </div>
      
      <div v-if="upcomingSchedules.length === 0" class="empty-card">ไม่มีนัดหมาย</div>
      <div v-else class="list-group">
        <div v-for="s in upcomingSchedules" :key="s.id" class="list-item" @click="router.push('/schedules')">
          <div class="date-box">
            <span class="date-box-day">{{ new Date(s.date).getDate() }}</span>
            <span class="date-box-month">{{ new Date(s.date).toLocaleDateString('th-TH', { month: 'short' }) }}</span>
          </div>
          <div class="list-item-content">
            <div class="list-item-title">{{ s.title }}</div>
            <div class="list-item-subtitle">{{ s.time }} · {{ s.location }}</div>
          </div>
        </div>
      </div>

      <!-- Latest Announcements -->
      <div class="section-header">
        <span class="section-title">ประกาศล่าสุด</span>
        <router-link to="/announcements" class="section-link">ดูทั้งหมด</router-link>
      </div>
      
      <div v-if="latestAnnouncements.length === 0" class="empty-card">ยังไม่มีประกาศ</div>
      <div v-else class="list-group">
        <div v-for="ann in latestAnnouncements" :key="ann.id" class="list-item" @click="router.push('/announcements')">
          <div class="announcement-icon-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 4H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V6a2 2 0 00-2-2z"/></svg>
          </div>
          <div class="list-item-content">
            <div class="list-item-title">{{ ann.title }}</div>
            <div class="list-item-subtitle">{{ ann.content.substring(0, 50) }}{{ ann.content.length > 50 ? '...' : '' }}</div>
          </div>
          <span v-if="ann.is_pinned" class="pin-indicator">ปักหมุด</span>
        </div>
      </div>

      <!-- Recent Logs -->
      <div class="section-header">
        <span class="section-title">บันทึกล่าสุด</span>
        <router-link to="/training-logs" class="section-link">ดูทั้งหมด</router-link>
      </div>
      
      <div v-if="recentLogs.length === 0" class="empty-card">ยังไม่มีบันทึก</div>
      <div v-else class="list-group">
        <div v-for="log in recentLogs" :key="log.id" class="list-item" @click="router.push('/training-logs')">
          <div class="date-box date-box-success">
            <span class="date-box-day">{{ new Date(log.date).getDate() }}</span>
            <span class="date-box-month">{{ new Date(log.date).toLocaleDateString('th-TH', { month: 'short' }) }}</span>
          </div>
          <div class="list-item-content">
            <div class="list-item-title">{{ log.activities }}</div>
            <div class="list-item-subtitle">{{ log.duration }} นาที</div>
          </div>
          <div class="rating">
            <span v-for="i in 5" :key="i" :class="['star', { filled: i <= log.rating }]">★</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.greeting { font-size: 14px; color: var(--gray-500); margin-bottom: 4px; }

.today-alert { 
  display: flex; align-items: center; gap: 12px;
  background: var(--gray-900);
  color: white; padding: 16px; border-radius: var(--radius-lg);
  margin-bottom: 20px; cursor: pointer;
}
.today-alert:active { opacity: 0.95; }
.today-icon { width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.today-icon svg { width: 22px; height: 22px; }
.today-content { flex: 1; }
.today-label { display: block; font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
.today-title { display: block; font-size: 16px; font-weight: 600; margin: 2px 0; }
.today-time { display: block; font-size: 13px; opacity: 0.9; }

.pending-alert { 
  display: flex; align-items: center; gap: 12px;
  background: #FEF3C7; border: 1px solid #F59E0B;
  padding: 14px 16px; border-radius: var(--radius-lg);
  margin-bottom: 16px; cursor: pointer;
}
.pending-alert:active { opacity: 0.95; }
.pending-icon { 
  width: 40px; height: 40px; background: #F59E0B; border-radius: 10px; 
  display: flex; align-items: center; justify-content: center; 
}
.pending-icon svg { width: 20px; height: 20px; color: white; }
.pending-content { flex: 1; }
.pending-label { display: block; font-size: 12px; color: #92400E; font-weight: 500; }
.pending-count { display: block; font-size: 16px; font-weight: 700; color: #78350F; }
.pending-arrow { width: 20px; height: 20px; color: #92400E; }

.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
.stat-item { 
  background: var(--white); border-radius: var(--radius-md);
  padding: 14px 8px; text-align: center; cursor: pointer;
  border: 1px solid var(--gray-100); transition: all 0.15s;
}
.stat-item:active { background: var(--gray-50); }
.stat-num { display: block; font-size: 22px; font-weight: 700; color: var(--gray-900); }
.stat-text { font-size: 10px; color: var(--gray-500); text-transform: uppercase; }

/* Action Groups */
.action-group { margin-bottom: 20px; }
.action-group-header { margin-bottom: 10px; }
.action-group-title { 
  font-size: 12px; 
  font-weight: 600; 
  color: var(--gray-500); 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
}

.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.quick-btn { 
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 6px; background: var(--white); 
  border: 1px solid var(--gray-100); border-radius: var(--radius-lg);
  cursor: pointer; transition: all 0.15s;
}
.quick-btn:active { background: var(--gray-50); transform: scale(0.98); }
.quick-icon { width: 36px; height: 36px; background: var(--gray-900); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.quick-icon svg { width: 18px; height: 18px; color: var(--white); }
.quick-label { font-size: 10px; color: var(--gray-600); font-weight: 500; text-align: center; line-height: 1.3; }

.empty-card { 
  background: var(--white); border-radius: var(--radius-lg);
  padding: 32px; text-align: center; color: var(--gray-400);
  border: 1px solid var(--gray-100); font-size: 14px;
}

.announcement-icon-sm {
  width: 40px; height: 40px;
  background: var(--gray-900);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.announcement-icon-sm svg {
  width: 20px; height: 20px; color: var(--white);
}

.pin-indicator {
  font-size: 10px;
  background: var(--gray-100);
  color: var(--gray-600);
  padding: 4px 8px;
  border-radius: 100px;
}
</style>
