<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const data = useDataStore()

const showModal = ref(false)
const editingId = ref(null)
const form = ref({ name: '', email: '', phone: '', club_id: null })
const searchQuery = ref('')

onMounted(async () => {
  await Promise.all([data.fetchCoaches(), data.fetchClubs(), data.fetchAthletes()])
})

const filteredCoaches = computed(() => {
  let result = data.coaches
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
  }
  return result
})

function openAdd() {
  editingId.value = null
  form.value = { name: '', email: '', phone: '', club_id: data.clubs[0]?.id || null }
  showModal.value = true
}

function openEdit(coach) {
  editingId.value = coach.id
  form.value = { name: coach.name, email: coach.email, phone: coach.phone, club_id: coach.club_id }
  showModal.value = true
}

async function save() {
  if (editingId.value) {
    await data.updateCoach(editingId.value, form.value)
  } else {
    await data.addCoach({ ...form.value })
  }
  showModal.value = false
}

async function remove() {
  if (confirm('ยืนยันการลบโค้ชนี้?')) {
    await data.deleteCoach(editingId.value)
    showModal.value = false
  }
}

function getClubName(coach) {
  return coach.clubs?.name || '—'
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">โค้ช</h1>
      <button class="btn btn-sm btn-primary" @click="openAdd">+ เพิ่ม</button>
    </div>

    <div class="container">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" type="text" class="search-input" placeholder="ค้นหาโค้ช..." />
      </div>

      <div v-if="filteredCoaches.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-icon">🏅</div>
          <p>{{ searchQuery ? 'ไม่พบโค้ช' : 'ยังไม่มีโค้ช' }}</p>
          <button v-if="!searchQuery" class="btn btn-primary" @click="openAdd">เพิ่มโค้ชแรก</button>
        </div>
      </div>

      <div v-else class="list-group">
        <div v-for="c in filteredCoaches" :key="c.id" class="list-item" @click="openEdit(c)">
          <div class="avatar avatar-sm">{{ c.name.charAt(0) }}</div>
          <div class="list-item-content">
            <div class="list-item-title">{{ c.name }}</div>
            <div class="list-item-subtitle">{{ getClubName(c) }}</div>
          </div>
          <span class="athlete-count">{{ data.getAthletesByCoach(c.id).length }} นักกีฬา</span>
        </div>
      </div>
    </div>

    <button class="fab" @click="openAdd">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <Modal :show="showModal" :title="editingId ? 'แก้ไขโค้ช' : 'เพิ่มโค้ช'" @close="showModal = false">
      <form @submit.prevent="save">
        <div class="form-group">
          <label>ชื่อ-นามสกุล</label>
          <input v-model="form.name" class="form-control" required />
        </div>
        <div class="form-group">
          <label>อีเมล</label>
          <input v-model="form.email" type="email" class="form-control" required />
        </div>
        <div class="form-group">
          <label>เบอร์โทร</label>
          <input v-model="form.phone" class="form-control" />
        </div>
        <div class="form-group">
          <label>ชมรม</label>
          <select v-model="form.club_id" class="form-control" required>
            <option v-for="club in data.clubs" :key="club.id" :value="club.id">{{ club.name }}</option>
          </select>
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
.athlete-count { font-size: 12px; color: var(--gray-400); }
</style>
