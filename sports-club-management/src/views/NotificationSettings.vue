<script setup>
/**
 * NotificationSettings View
 * Page for managing push notification settings
 * 
 * Requirements: 2.1
 */
import { useRouter } from 'vue-router'
import NotificationSettings from '@/components/NotificationSettings.vue'

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1>ตั้งค่าการแจ้งเตือน</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Content -->
    <main class="content">
      <NotificationSettings />
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 40px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #E5E5E5;
  position: sticky;
  top: 0;
  z-index: 10;
}
.header h1 {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}
.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.back-btn:hover {
  background: #E5E5E5;
}
.header-spacer {
  width: 40px;
}

/* Content */
.content {
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
}
</style>
