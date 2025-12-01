<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = ref({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

const demoAccounts = [
  { label: 'Admin', email: 'admin@test.com', password: 'password123', desc: 'จัดการทั้งระบบ' },
  { label: 'Coach', email: 'coach@test.com', password: 'password123', desc: 'จัดการทีม' },
  { label: 'Athlete', email: 'athlete@test.com', password: 'password123', desc: 'ดูข้อมูลตัวเอง' }
]

function fillDemo(account) {
  form.value.email = account.email
  form.value.password = account.password
}

async function handleLogin() {
  loading.value = true
  error.value = ''
  const result = await auth.login(form.value)
  loading.value = false
  if (result.success) {
    router.push('/')
  } else {
    error.value = result.message
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo -->
      <div class="login-brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M3 21h18M12 13v8"/></svg>
        </div>
        <h1>Sports Club</h1>
        <p>ระบบจัดการสโมสรกีฬา</p>
      </div>

      <!-- Demo Accounts -->
      <div class="demo-section">
        <span class="demo-label">ทดลองใช้งาน</span>
        <div class="demo-cards">
          <button 
            v-for="acc in demoAccounts" 
            :key="acc.email" 
            type="button"
            class="demo-card"
            @click="fillDemo(acc)"
          >
            <span class="demo-name">{{ acc.label }}</span>
            <span class="demo-desc">{{ acc.desc }}</span>
          </button>
        </div>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="error" class="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>
        
        <div class="form-group">
          <label>อีเมล</label>
          <input v-model="form.email" type="email" class="form-control" placeholder="your@email.com" required />
        </div>
        
        <div class="form-group">
          <label>รหัสผ่าน</label>
          <input v-model="form.password" type="password" class="form-control" placeholder="••••••••" required />
        </div>
        
        <button type="submit" class="btn btn-primary btn-login" :disabled="loading">
          <svg v-if="loading" class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
          <span v-else>เข้าสู่ระบบ</span>
        </button>
      </form>

      <p class="login-hint">คลิกปุ่ม Admin เพื่อกรอกข้อมูลทดสอบ</p>

      <div class="register-link">
        <p>ยังไม่ได้เป็นสมาชิก?</p>
        <router-link to="/register" class="btn btn-secondary">สมัครนักกีฬา</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page { 
  min-height: 100vh; display: flex; align-items: center; justify-content: center; 
  padding: 24px; background: var(--gray-50);
}
.login-container { width: 100%; max-width: 400px; }

.login-brand { text-align: center; margin-bottom: 40px; }
.brand-icon { width: 64px; height: 64px; margin: 0 auto 16px; background: var(--gray-900); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.brand-icon svg { width: 32px; height: 32px; color: var(--white); }
.login-brand h1 { font-size: 28px; font-weight: 700; color: var(--gray-900); letter-spacing: -0.03em; margin-bottom: 4px; }
.login-brand p { color: var(--gray-500); font-size: 15px; }

.demo-section { margin-bottom: 32px; }
.demo-label { display: block; text-align: center; font-size: 12px; color: var(--gray-400); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 500; }
.demo-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.demo-card { 
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 8px; background: var(--white); 
  border: 1.5px solid var(--gray-200); border-radius: var(--radius-lg);
  cursor: pointer; transition: all 0.2s;
}
.demo-card:hover { border-color: var(--gray-900); background: var(--gray-50); }
.demo-card:active { transform: scale(0.98); }

.demo-name { font-size: 13px; font-weight: 600; color: var(--gray-900); }
.demo-desc { font-size: 10px; color: var(--gray-500); }

.login-form { 
  background: var(--white); padding: 28px; 
  border-radius: var(--radius-xl); border: 1px solid var(--gray-100);
  box-shadow: var(--shadow-sm);
}
.btn-login { width: 100%; margin-top: 8px; }

.login-hint { text-align: center; margin-top: 20px; font-size: 13px; color: var(--gray-400); }
.login-hint strong { color: var(--gray-600); }

.register-link { 
  margin-top: 24px; padding-top: 24px; 
  border-top: 1px solid var(--gray-200); text-align: center;
}
.register-link p { font-size: 14px; color: var(--gray-500); margin-bottom: 12px; }
.register-link .btn { width: 100%; }

.spinner { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
