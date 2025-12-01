<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const data = useDataStore()

const showModal = ref(false)
const editingId = ref(null)
const form = ref({ name: '', sport: '', description: '' })

onMounted(async () => {
  await Promise.all([data.fetchClubs(), data.fetchCoaches(), data.fetchAthletes()])
})

function openAdd() {
  editingId.value = null
  form.value = { name: '', sport: '', description: '' }
  showModal.value = true
}

function openEdit(e, club) {
  e.stopPropagation()
  editingId.value = club.id
  form.value = { name: club.name, sport: club.sport, description: club.description }
  showModal.value = true
}

async function save() {
  if (editingId.value) {
    await data.updateClub(editingId.value, form.value)
  } else {
    await data.addClub({ ...form.value })
  }
  showModal.value = false
}

async function remove() {
  if (confirm('ยืนยันการลบชมรมนี้?\n\nโค้ชและนักกีฬาในชมรมจะถูกลบด้วย')) {
    await data.deleteClub(editingId.value)
    showModal.value = false
  }
}

function goToDetail(club) {
  router.push(`/clubs/${club.id}`)
}

function getCoachCount(clubId) {
  return data.getCoachesByClub(clubId).length
}

function getAthleteCount(clubId) {
  return data.getAthletesByClub(clubId).length
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">ชมรม</h1>
      <button class="btn btn-sm btn-primary" @click="openAdd">+ เพิ่ม</button>
    </div>

    <div class="container">
      <div v-if="data.clubs.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/></svg>
          </div>
          <p>ยังไม่มีชมรม</p>
          <button class="btn btn-primary" @click="openAdd">เพิ่มชมรมแรก</button>
        </div>
      </div>

      <div v-else class="clubs-list">
        <div v-for="club in data.clubs" :key="club.id" class="club-card" @click="goToDetail(club)">
          <div class="club-main">
            <div class="club-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M3 21h18M12 13v8"/></svg>
            </div>
            <div class="club-info">
              <h3>{{ club.name }}</h3>
              <span class="club-sport">{{ club.sport }}</span>
            </div>
            <button class="btn btn-ghost btn-sm" @click="(e) => openEdit(e, club)">แก้ไข</button>
          </div>
          <div class="club-stats">
            <div class="club-stat">
              <span class="stat-num">{{ getCoachCount(club.id) }}</span>
              <span class="stat-label">โค้ช</span>
            </div>
            <div class="club-stat">
              <span class="stat-num">{{ getAthleteCount(club.id) }}</span>
              <span class="stat-label">นักกีฬา</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="fab" @click="openAdd">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <Modal :show="showModal" :title="editingId ? 'แก้ไขชมรม' : 'ชมรมใหม่'" @close="showModal = false">
      <form @submit.prevent="save">
        <div class="form-group">
          <label>ชื่อชมรม</label>
          <input v-model="form.name" class="form-control" placeholder="ชื่อชมรม" required />
        </div>
        <div class="form-group">
          <label>ประเภทกีฬา</label>
          <input v-model="form.sport" class="form-control" placeholder="เช่น ฟุตบอล, บาสเกตบอล" required />
        </div>
        <div class="form-group">
          <label>คำอธิบาย</label>
          <textarea v-model="form.description" class="form-control" rows="3" placeholder="รายละเอียดชมรม"></textarea>
        </div>
      </form>
      <template #footer>
        <button v-if="editingId" class="btn btn-danger" @click="remove">ลบ</button>
        <button class="btn btn-secondary" @click="showModal = false">ยกเลิก</button>
        <button class="btn btn-primary" @click="save">บันทึก</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.clubs-list { display: flex; flex-direction: column; gap: 12px; }
.club-card { 
  background: var(--white); border-radius: var(--radius-lg);
  padding: 16px; border: 1px solid var(--gray-100);
  cursor: pointer; transition: all 0.15s;
}
.club-card:active { background: var(--gray-50); }
.club-main { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.club-icon { width: 48px; height: 48px; background: var(--gray-900); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.club-icon svg { width: 24px; height: 24px; color: var(--white); }
.empty-state-icon { width: 64px; height: 64px; margin: 0 auto 16px; background: var(--gray-100); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.empty-state-icon svg { width: 32px; height: 32px; color: var(--gray-400); }
.club-info { flex: 1; }
.club-info h3 { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
.club-sport { font-size: 12px; color: var(--gray-500); }
.club-stats { display: flex; gap: 24px; padding-top: 12px; border-top: 1px solid var(--gray-100); }
.club-stat { }
.stat-num { font-size: 18px; font-weight: 700; color: var(--gray-900); margin-right: 4px; }
.stat-label { font-size: 12px; color: var(--gray-500); }
</style>
