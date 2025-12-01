<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const router = useRouter()
const data = useDataStore()

const clubId = computed(() => parseInt(route.params.id))
const club = computed(() => data.getClubById(clubId.value))
const coaches = computed(() => data.getCoachesByClub(clubId.value))
const athletes = computed(() => data.getAthletesByClub(clubId.value))

const showCoachModal = ref(false)
const showAthleteModal = ref(false)
const editingCoachId = ref(null)
const editingAthleteId = ref(null)

const coachForm = ref({ name: '', email: '', phone: '' })
const athleteForm = ref({ name: '', email: '', phone: '', coachId: null })

// Coach functions
function openAddCoach() {
  editingCoachId.value = null
  coachForm.value = { name: '', email: '', phone: '' }
  showCoachModal.value = true
}

function openEditCoach(coach) {
  editingCoachId.value = coach.id
  coachForm.value = { ...coach }
  showCoachModal.value = true
}

function saveCoach() {
  if (editingCoachId.value) {
    data.updateCoach(editingCoachId.value, coachForm.value)
  } else {
    data.addCoach({ ...coachForm.value, clubId: clubId.value })
  }
  showCoachModal.value = false
}

function removeCoach() {
  if (confirm('ยืนยันการลบโค้ชนี้?')) {
    data.deleteCoach(editingCoachId.value)
    showCoachModal.value = false
  }
}

// Athlete functions
function openAddAthlete() {
  editingAthleteId.value = null
  athleteForm.value = { name: '', email: '', phone: '', coachId: coaches.value[0]?.id || null }
  showAthleteModal.value = true
}

function openEditAthlete(athlete) {
  editingAthleteId.value = athlete.id
  athleteForm.value = { ...athlete }
  showAthleteModal.value = true
}

function saveAthlete() {
  if (editingAthleteId.value) {
    data.updateAthlete(editingAthleteId.value, athleteForm.value)
  } else {
    data.addAthlete({ ...athleteForm.value, clubId: clubId.value })
  }
  showAthleteModal.value = false
}

function removeAthlete() {
  if (confirm('ยืนยันการลบนักกีฬานี้?')) {
    data.deleteAthlete(editingAthleteId.value)
    showAthleteModal.value = false
  }
}

function getCoachName(coachId) {
  return data.getCoachById(coachId)?.name || '—'
}
</script>

<template>
  <div>
    <div class="page-header">
      <button class="btn btn-ghost" @click="router.back()">← กลับ</button>
      <h1 class="page-title">{{ club?.name }}</h1>
    </div>

    <div class="container">
      <!-- Club Info -->
      <div class="club-header">
        <div class="club-icon">🏆</div>
        <div>
          <h2>{{ club?.name }}</h2>
          <span class="badge badge-coach">{{ club?.sport }}</span>
          <p v-if="club?.description" class="club-desc">{{ club?.description }}</p>
        </div>
      </div>

      <!-- Coaches Section -->
      <div class="section-header">
        <span class="section-title">🏅 โค้ช</span>
        <button class="btn btn-sm btn-primary" @click="openAddCoach">+ เพิ่ม</button>
      </div>

      <div v-if="coaches.length === 0" class="empty-card">ยังไม่มีโค้ช</div>
      <div v-else class="list-group">
        <div v-for="coach in coaches" :key="coach.id" class="list-item" @click="openEditCoach(coach)">
          <div class="avatar avatar-sm">{{ coach.name.charAt(0) }}</div>
          <div class="list-item-content">
            <div class="list-item-title">{{ coach.name }}</div>
            <div class="list-item-subtitle">{{ coach.email }}</div>
          </div>
          <span class="athlete-count">{{ data.getAthletesByCoach(coach.id).length }} นักกีฬา</span>
        </div>
      </div>

      <!-- Athletes Section -->
      <div class="section-header mt-3">
        <span class="section-title">🏃 นักกีฬา</span>
        <button class="btn btn-sm btn-primary" @click="openAddAthlete" :disabled="coaches.length === 0">+ เพิ่ม</button>
      </div>

      <div v-if="athletes.length === 0" class="empty-card">
        {{ coaches.length === 0 ? 'เพิ่มโค้ชก่อน' : 'ยังไม่มีนักกีฬา' }}
      </div>
      <div v-else class="list-group">
        <div v-for="athlete in athletes" :key="athlete.id" class="list-item" @click="openEditAthlete(athlete)">
          <div class="avatar avatar-sm">{{ athlete.name.charAt(0) }}</div>
          <div class="list-item-content">
            <div class="list-item-title">{{ athlete.name }}</div>
            <div class="list-item-subtitle">โค้ช: {{ getCoachName(athlete.coachId) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Coach Modal -->
    <Modal :show="showCoachModal" :title="editingCoachId ? 'แก้ไขโค้ช' : 'เพิ่มโค้ช'" @close="showCoachModal = false">
      <form @submit.prevent="saveCoach">
        <div class="form-group">
          <label>ชื่อ-นามสกุล</label>
          <input v-model="coachForm.name" class="form-control" required />
        </div>
        <div class="form-group">
          <label>อีเมล</label>
          <input v-model="coachForm.email" type="email" class="form-control" required />
        </div>
        <div class="form-group">
          <label>เบอร์โทร</label>
          <input v-model="coachForm.phone" class="form-control" />
        </div>
      </form>
      <template #footer>
        <button v-if="editingCoachId" class="btn btn-danger" @click="removeCoach">ลบ</button>
        <button class="btn btn-secondary" @click="showCoachModal = false">ยกเลิก</button>
        <button class="btn btn-primary" @click="saveCoach">บันทึก</button>
      </template>
    </Modal>

    <!-- Athlete Modal -->
    <Modal :show="showAthleteModal" :title="editingAthleteId ? 'แก้ไขนักกีฬา' : 'เพิ่มนักกีฬา'" @close="showAthleteModal = false">
      <form @submit.prevent="saveAthlete">
        <div class="form-group">
          <label>ชื่อ-นามสกุล</label>
          <input v-model="athleteForm.name" class="form-control" required />
        </div>
        <div class="form-group">
          <label>อีเมล</label>
          <input v-model="athleteForm.email" type="email" class="form-control" required />
        </div>
        <div class="form-group">
          <label>เบอร์โทร</label>
          <input v-model="athleteForm.phone" class="form-control" />
        </div>
        <div class="form-group">
          <label>โค้ชที่ดูแล</label>
          <select v-model="athleteForm.coachId" class="form-control" required>
            <option v-for="c in coaches" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button v-if="editingAthleteId" class="btn btn-danger" @click="removeAthlete">ลบ</button>
        <button class="btn btn-secondary" @click="showAthleteModal = false">ยกเลิก</button>
        <button class="btn btn-primary" @click="saveAthlete">บันทึก</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.club-header { 
  display: flex; gap: 16px; align-items: flex-start;
  background: var(--white); border-radius: var(--radius-lg);
  padding: 20px; border: 1px solid var(--gray-100); margin-bottom: 24px;
}
.club-icon { font-size: 48px; }
.club-header h2 { font-size: 20px; margin-bottom: 8px; }
.club-desc { margin-top: 8px; font-size: 14px; color: var(--gray-500); }
.empty-card { 
  background: var(--white); border-radius: var(--radius-lg);
  padding: 24px; text-align: center; color: var(--gray-400);
  border: 1px solid var(--gray-100); font-size: 14px;
}
.athlete-count { font-size: 12px; color: var(--gray-400); }
</style>
