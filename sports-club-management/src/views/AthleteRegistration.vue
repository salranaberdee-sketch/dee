<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const data = useDataStore()
const auth = useAuthStore()

const currentStep = ref(1)
const totalSteps = 5
const isSubmitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref('')

const form = ref({
  name: '', phone: '', emergencyPhone: '', bloodType: '', birthDate: '', email: '', address: '',
  parentName: '', parentPhone: '', parentRelation: '',
  clubId: null, coachId: null,
  password: '', confirmPassword: '',
  applicationNotes: '',
})

const documents = ref({
  idCard: null, parentIdCard: null, houseRegistration: null, parentHouseRegistration: null, birthCertificate: null,
})

const steps = [
  { num: 1, title: 'บัญชีผู้ใช้' },
  { num: 2, title: 'ข้อมูลส่วนตัว' },
  { num: 3, title: 'ผู้ปกครอง' },
  { num: 4, title: 'เลือกชมรม' },
  { num: 5, title: 'เอกสาร' },
]

onMounted(async () => {
  await data.fetchClubs()
  await data.fetchCoaches()
})

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const relations = ['บิดา', 'มารดา', 'ปู่', 'ย่า', 'ตา', 'ยาย', 'ลุง', 'ป้า', 'อื่นๆ']

const docList = [
  { key: 'idCard', label: 'บัตรประชาชน (ตัวเอง)', required: true },
  { key: 'parentIdCard', label: 'บัตรประชาชน (ผู้ปกครอง)', required: true },
  { key: 'houseRegistration', label: 'ทะเบียนบ้าน (ตัวเอง)', required: true },
  { key: 'parentHouseRegistration', label: 'ทะเบียนบ้าน (ผู้ปกครอง)', required: false },
  { key: 'birthCertificate', label: 'สูติบัตร (ใบเกิด)', required: true },
]

const availableCoaches = computed(() => form.value.clubId ? data.getCoachesByClub(form.value.clubId) : [])

const canProceed = computed(() => {
  if (currentStep.value === 1) return form.value.email && form.value.password && form.value.password.length >= 6 && form.value.password === form.value.confirmPassword
  if (currentStep.value === 2) return form.value.name && form.value.phone && form.value.emergencyPhone && form.value.bloodType && form.value.birthDate
  if (currentStep.value === 3) return form.value.parentName && form.value.parentPhone && form.value.parentRelation
  if (currentStep.value === 4) return form.value.clubId && form.value.coachId
  if (currentStep.value === 5) return documents.value.idCard && documents.value.parentIdCard && documents.value.houseRegistration && documents.value.birthCertificate
  return false
})

const uploadedCount = computed(() => Object.values(documents.value).filter(d => d).length)

function goToStep(step) { if (step <= currentStep.value) currentStep.value = step }
function nextStep() { if (currentStep.value < totalSteps && canProceed.value) { currentStep.value++; window.scrollTo({ top: 0, behavior: 'smooth' }) } }
function prevStep() { if (currentStep.value > 1) { currentStep.value--; window.scrollTo({ top: 0, behavior: 'smooth' }) } }

function handleFile(key, e) {
  const file = e.target.files[0]
  if (file && file.size <= 5 * 1024 * 1024) {
    documents.value[key] = { file, name: file.name }
  } else if (file) { alert('ไฟล์ต้องไม่เกิน 5MB') }
}
function removeFile(key) { documents.value[key] = null }

async function submit() {
  isSubmitting.value = true
  submitError.value = ''
  
  try {
    // 1. สร้าง user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.value.email,
      password: form.value.password
    })
    
    if (authError) throw new Error(authError.message)
    if (!authData.user) throw new Error('ไม่สามารถสร้างบัญชีได้')
    
    const userId = authData.user.id
    
    // 2. สร้าง user profile
    await supabase.from('user_profiles').insert({
      id: userId,
      email: form.value.email,
      name: form.value.name,
      role: 'athlete',
      phone: form.value.phone,
      club_id: null // ยังไม่เข้าชมรม รอการอนุมัติ
    })
    
    // 3. สร้าง athlete record (ยังไม่มี club_id)
    const { data: athleteData, error: athleteError } = await supabase
      .from('athletes')
      .insert({
        name: form.value.name,
        email: form.value.email,
        phone: form.value.phone,
        emergency_phone: form.value.emergencyPhone,
        blood_type: form.value.bloodType,
        birth_date: form.value.birthDate,
        address: form.value.address,
        parent_name: form.value.parentName,
        parent_phone: form.value.parentPhone,
        parent_relation: form.value.parentRelation,
        user_id: userId,
        club_id: null, // รอการอนุมัติ
        coach_id: null, // รอการอนุมัติ
        registration_status: 'pending'
      })
      .select()
      .single()
    
    if (athleteError) throw new Error(athleteError.message)
    
    // 4. สร้างใบสมัครชมรม
    const { error: appError } = await supabase
      .from('club_applications')
      .insert({
        athlete_id: athleteData.id,
        club_id: form.value.clubId,
        notes: form.value.applicationNotes || null,
        status: 'pending'
      })
    
    if (appError) throw new Error(appError.message)
    
    // TODO: อัปโหลดเอกสาร (ถ้าต้องการ)
    
    submitSuccess.value = true
  } catch (err) {
    submitError.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isSubmitting.value = false
  }
}

function getClubName(id) { return data.getClubById(id)?.name || '' }
function getCoachName(id) { return data.getCoachById(id)?.name || '' }
</script>

<template>
  <div class="page">
    <div v-if="submitSuccess" class="success">
      <div class="success-box">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
        </div>
        <h2>สมัครสำเร็จ</h2>
        <p>ใบสมัครถูกส่งแล้ว รอการอนุมัติจากชมรม</p>
        <div class="summary">
          <div><span>ชื่อ</span><b>{{ form.name }}</b></div>
          <div><span>ชมรม</span><b>{{ getClubName(form.clubId) }}</b></div>
          <div><span>โค้ช</span><b>{{ getCoachName(form.coachId) }}</b></div>
        </div>
        <button class="btn btn-primary" @click="router.push('/login')">กลับหน้าเข้าสู่ระบบ</button>
      </div>
    </div>

    <template v-else>
      <header class="header">
        <button class="back" @click="router.push('/login')">←</button>
        <div><h1>สมัครนักกีฬา</h1><small>ขั้นตอน {{ currentStep }}/{{ totalSteps }}</small></div>
      </header>

      <nav class="steps">
        <button v-for="s in steps" :key="s.num" :class="['step', { active: s.num === currentStep, done: s.num < currentStep }]" @click="goToStep(s.num)" :disabled="s.num > currentStep">
          <span class="step-num">{{ s.num < currentStep ? '✓' : s.num }}</span>
          <span class="step-label">{{ s.title }}</span>
        </button>
      </nav>

      <main class="content">
        <!-- Step 1: บัญชีผู้ใช้ -->
        <section v-if="currentStep === 1" class="card">
          <div class="card-head"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><div><h3>สร้างบัญชีผู้ใช้</h3><p>กรอกอีเมลและรหัสผ่านสำหรับเข้าสู่ระบบ</p></div></div>
          <div class="fields">
            <div class="field full"><label>อีเมล <i>*</i></label><input v-model="form.email" type="email" placeholder="email@example.com" /></div>
            <div class="field full"><label>รหัสผ่าน <i>*</i></label><input v-model="form.password" type="password" placeholder="อย่างน้อย 6 ตัวอักษร" /></div>
            <div class="field full"><label>ยืนยันรหัสผ่าน <i>*</i></label><input v-model="form.confirmPassword" type="password" placeholder="กรอกรหัสผ่านอีกครั้ง" /></div>
            <div v-if="form.password && form.confirmPassword && form.password !== form.confirmPassword" class="field full error-text">รหัสผ่านไม่ตรงกัน</div>
          </div>
        </section>

        <!-- Step 2: ข้อมูลส่วนตัว -->
        <section v-if="currentStep === 2" class="card">
          <div class="card-head"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div><h3>ข้อมูลส่วนตัว</h3><p>กรอกข้อมูลพื้นฐานของนักกีฬา</p></div></div>
          <div class="fields">
            <div class="field full"><label>ชื่อ-นามสกุล <i>*</i></label><input v-model="form.name" placeholder="ชื่อ นามสกุล" /></div>
            <div class="field"><label>เบอร์โทร <i>*</i></label><input v-model="form.phone" type="tel" placeholder="0812345678" /></div>
            <div class="field"><label>เบอร์ฉุกเฉิน <i>*</i></label><input v-model="form.emergencyPhone" type="tel" placeholder="0898765432" /></div>
            <div class="field"><label>กรุ๊ปเลือด <i>*</i></label><select v-model="form.bloodType"><option value="">เลือก</option><option v-for="b in bloodTypes" :key="b">{{ b }}</option></select></div>
            <div class="field"><label>วันเกิด <i>*</i></label><input v-model="form.birthDate" type="date" /></div>
            <div class="field full"><label>ที่อยู่</label><textarea v-model="form.address" rows="2" placeholder="ที่อยู่ปัจจุบัน"></textarea></div>
          </div>
        </section>

        <!-- Step 3: ผู้ปกครอง -->
        <section v-if="currentStep === 3" class="card">
          <div class="card-head"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg></div><div><h3>ข้อมูลผู้ปกครอง</h3><p>กรอกข้อมูลผู้ปกครองหรือผู้ดูแล</p></div></div>
          <div class="fields">
            <div class="field full"><label>ชื่อผู้ปกครอง <i>*</i></label><input v-model="form.parentName" placeholder="ชื่อ นามสกุล" /></div>
            <div class="field"><label>เบอร์โทร <i>*</i></label><input v-model="form.parentPhone" type="tel" placeholder="0812345678" /></div>
            <div class="field"><label>ความสัมพันธ์ <i>*</i></label><select v-model="form.parentRelation"><option value="">เลือก</option><option v-for="r in relations" :key="r">{{ r }}</option></select></div>
          </div>
        </section>

        <!-- Step 4: เลือกชมรม -->
        <section v-if="currentStep === 4" class="card">
          <div class="card-head"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/></svg></div><div><h3>เลือกชมรม</h3><p>เลือกชมรมและโค้ชที่ต้องการสมัคร</p></div></div>
          <div class="fields">
            <div class="field full"><label>ชมรม <i>*</i></label><select v-model="form.clubId" @change="form.coachId = null"><option :value="null">เลือกชมรม</option><option v-for="c in data.clubs" :key="c.id" :value="c.id">{{ c.name }} — {{ c.sport }}</option></select></div>
            <div class="field full"><label>โค้ช <i>*</i></label><select v-model="form.coachId" :disabled="!form.clubId"><option :value="null">{{ form.clubId ? 'เลือกโค้ช' : 'เลือกชมรมก่อน' }}</option><option v-for="c in availableCoaches" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
            <div class="field full"><label>หมายเหตุ (ถ้ามี)</label><textarea v-model="form.applicationNotes" rows="2" placeholder="ข้อความถึงชมรม เช่น ประสบการณ์กีฬา"></textarea></div>
          </div>
          <div v-if="form.clubId && form.coachId" class="selected-info">
            <div class="info-item"><b>{{ getClubName(form.clubId) }}</b></div>
            <div class="info-item"><b>{{ getCoachName(form.coachId) }}</b></div>
          </div>
          <div class="notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>หลังจากส่งใบสมัคร คุณจะต้องรอการอนุมัติจากโค้ชหรือผู้ดูแลระบบก่อนจึงจะเข้าชมรมได้</span>
          </div>
        </section>

        <!-- Step 5: เอกสาร -->
        <section v-if="currentStep === 5" class="card">
          <div class="card-head"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><h3>อัปโหลดเอกสาร</h3><p>อัปโหลดเอกสารประกอบ ({{ uploadedCount }}/5)</p></div></div>
          <div class="doc-list">
            <div v-for="doc in docList" :key="doc.key" class="doc-item">
              <div class="doc-label">{{ doc.label }} <i v-if="doc.required">*</i></div>
              <div v-if="documents[doc.key]" class="doc-done"><span>{{ documents[doc.key].name }}</span><button @click="removeFile(doc.key)">ลบ</button></div>
              <label v-else class="doc-upload"><input type="file" accept="image/*,.pdf" @change="handleFile(doc.key, $event)" hidden /><span>เลือกไฟล์</span></label>
            </div>
          </div>
        </section>

        <div v-if="submitError" class="error-box">{{ submitError }}</div>

        <div class="nav">
          <button v-if="currentStep > 1" class="btn btn-secondary" @click="prevStep">← ย้อนกลับ</button>
          <div v-else></div>
          <button v-if="currentStep < totalSteps" class="btn btn-primary" :disabled="!canProceed" @click="nextStep">ถัดไป →</button>
          <button v-else class="btn btn-primary" :disabled="!canProceed || isSubmitting" @click="submit">{{ isSubmitting ? 'กำลังส่ง...' : 'ส่งใบสมัคร' }}</button>
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.header { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: #fff; border-bottom: 1px solid #E5E5E5; position: sticky; top: 0; z-index: 10; }
.header h1 { font-size: 18px; font-weight: 600; }
.header small { font-size: 13px; color: #737373; }
.back { width: 40px; height: 40px; border: none; background: #F5F5F5; border-radius: 50%; font-size: 18px; cursor: pointer; }
.steps { display: flex; background: #fff; border-bottom: 1px solid #E5E5E5; overflow-x: auto; }
.step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 8px; border: none; background: none; cursor: pointer; opacity: 0.4; transition: 0.2s; min-width: 80px; }
.step:disabled { cursor: not-allowed; }
.step.active, .step.done { opacity: 1; }
.step.active { border-bottom: 2px solid #171717; }
.step-num { width: 28px; height: 28px; border-radius: 50%; background: #E5E5E5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.step.active .step-num, .step.done .step-num { background: #171717; color: #fff; }
.step-label { font-size: 11px; color: #525252; white-space: nowrap; }
.content { padding: 20px; max-width: 500px; margin: 0 auto; padding-bottom: 120px; }
.card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #E5E5E5; }
.card-head { display: flex; gap: 14px; margin-bottom: 24px; }
.card-icon { width: 48px; height: 48px; background: #171717; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.card-icon svg { width: 24px; height: 24px; color: #fff; }
.card-head h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.card-head p { font-size: 14px; color: #737373; }
.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field.full { grid-column: span 2; }
.field label { font-size: 14px; font-weight: 500; color: #404040; }
.field i { color: #DC2626; font-style: normal; }
.field input, .field select, .field textarea { padding: 14px 16px; border: 1.5px solid #E5E5E5; border-radius: 12px; font-size: 16px; background: #fff; width: 100%; font-family: inherit; }
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: #171717; }
.field select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 44px; }
.selected-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E5E5; display: flex; gap: 24px; }
.info-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #F5F5F5; border-radius: 8px; }
.info-item b { font-size: 15px; }
.doc-list { display: flex; flex-direction: column; gap: 12px; }
.doc-item { padding: 16px; background: #FAFAFA; border-radius: 12px; }
.doc-label { font-size: 14px; font-weight: 500; margin-bottom: 12px; }
.doc-label i { color: #DC2626; font-style: normal; }
.doc-upload { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; border: 2px dashed #D4D4D4; border-radius: 8px; cursor: pointer; font-size: 14px; color: #525252; transition: 0.15s; }
.doc-upload:hover { border-color: #737373; background: #fff; }
.doc-done { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #D1FAE5; border-radius: 8px; font-size: 13px; color: #065F46; }
.doc-done span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.doc-done button { background: none; border: none; color: #991B1B; font-size: 13px; cursor: pointer; font-weight: 500; }
.nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; padding: 16px 20px; background: #fff; border-top: 1px solid #E5E5E5; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
.btn { padding: 14px 24px; border-radius: 12px; font-size: 15px; font-weight: 600; border: none; cursor: pointer; transition: 0.15s; }
.btn-primary { background: #171717; color: #fff; }
.btn-primary:disabled { background: #D4D4D4; cursor: not-allowed; }
.btn-secondary { background: #F5F5F5; color: #404040; }
.success { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.success-box { background: #fff; border-radius: 20px; padding: 40px 32px; text-align: center; max-width: 380px; width: 100%; }
.success-icon { width: 64px; height: 64px; margin: 0 auto 16px; }
.success-icon svg { width: 100%; height: 100%; color: #171717; }
.success-box h2 { font-size: 24px; margin-bottom: 8px; }
.success-box > p { color: #737373; margin-bottom: 24px; }
.summary { background: #F5F5F5; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; }
.summary div { display: flex; justify-content: space-between; padding: 8px 0; }
.summary span { color: #737373; font-size: 14px; }
.summary b { font-size: 14px; }
.error-text { color: #DC2626; font-size: 13px; }
.error-box { background: #FEE2E2; color: #991B1B; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
.notice { display: flex; gap: 10px; padding: 14px; background: #FEF3C7; border-radius: 10px; margin-top: 20px; font-size: 13px; color: #92400E; }
.notice svg { width: 20px; height: 20px; flex-shrink: 0; }
@media (max-width: 480px) { .fields { grid-template-columns: 1fr; } .field.full { grid-column: span 1; } }
</style>
