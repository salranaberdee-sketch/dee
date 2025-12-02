import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { guest: true } },
  { path: '/register', name: 'AthleteRegistration', component: () => import('@/views/AthleteRegistration.vue'), meta: { guest: true } },
  { path: '/', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { requiresAuth: true } },
  
  // Admin only
  { path: '/clubs', name: 'Clubs', component: () => import('@/views/Clubs.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/clubs/:id', name: 'ClubDetail', component: () => import('@/views/ClubDetail.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/backup', name: 'Backup', component: () => import('@/views/Backup.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/category-management', name: 'CategoryManagement', component: () => import('@/views/CategoryManagement.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  
  // Admin & Coach
  { path: '/coaches', name: 'Coaches', component: () => import('@/views/Coaches.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/athletes', name: 'Athletes', component: () => import('@/views/Athletes.vue'), meta: { requiresAuth: true, roles: ['admin', 'coach'] } },
  { path: '/club-applications', name: 'ClubApplications', component: () => import('@/views/ClubApplications.vue'), meta: { requiresAuth: true, roles: ['admin', 'coach'] } },
  { path: '/evaluation', name: 'EvaluationDashboard', component: () => import('@/views/EvaluationDashboard.vue'), meta: { requiresAuth: true, roles: ['admin', 'coach'] } },
  { path: '/evaluation/settings', name: 'ScoringCriteriaSettings', component: () => import('@/views/ScoringCriteriaSettings.vue'), meta: { requiresAuth: true, roles: ['admin', 'coach'] } },
  { path: '/evaluation/athlete/:id', name: 'AthletePerformance', component: () => import('@/views/AthletePerformance.vue'), meta: { requiresAuth: true } },
  { path: '/attendance', name: 'AttendanceManager', component: () => import('@/views/AttendanceManager.vue'), meta: { requiresAuth: true, roles: ['admin', 'coach'] } },
  { path: '/tournaments', name: 'Tournaments', component: () => import('@/views/Tournaments.vue'), meta: { requiresAuth: true } },
  { path: '/tournament-history', name: 'TournamentHistory', component: () => import('@/views/TournamentHistory.vue'), meta: { requiresAuth: true, roles: ['admin'] } },
  
  // Athlete only
  { path: '/my-applications', name: 'MyApplications', component: () => import('@/views/MyApplications.vue'), meta: { requiresAuth: true, roles: ['athlete'] } },
  { path: '/leave-request', name: 'LeaveRequest', component: () => import('@/views/LeaveRequest.vue'), meta: { requiresAuth: true, roles: ['athlete'] } },
  { path: '/my-performance', name: 'MyPerformance', component: () => import('@/views/AthletePerformance.vue'), meta: { requiresAuth: true, roles: ['athlete'] } },
  
  // All users
  { path: '/events', name: 'Events', component: () => import('@/views/Events.vue'), meta: { requiresAuth: true } },
  { path: '/schedules', name: 'Schedules', component: () => import('@/views/Schedules.vue'), meta: { requiresAuth: true } },
  { path: '/training-logs', name: 'TrainingLogs', component: () => import('@/views/TrainingLogs.vue'), meta: { requiresAuth: true } },
  { path: '/announcements', name: 'Announcements', component: () => import('@/views/Announcements.vue'), meta: { requiresAuth: true } },
  { path: '/notifications', name: 'NotificationInbox', component: () => import('@/views/NotificationInbox.vue'), meta: { requiresAuth: true } },
  { path: '/notification-settings', name: 'NotificationSettings', component: () => import('@/views/NotificationSettings.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('@/views/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/profile/albums/:albumId', name: 'AlbumDetail', component: () => import('@/views/AlbumDetail.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  
  // Wait for auth to initialize
  if (auth.loading) {
    const unwatch = auth.$subscribe(() => {
      if (!auth.loading) {
        unwatch()
        handleNavigation()
      }
    })
    return
  }
  
  handleNavigation()
  
  function handleNavigation() {
    if (to.meta.requiresAuth && !auth.isAuthenticated) return next('/login')
    if (to.meta.guest && auth.isAuthenticated) return next('/')
    if (to.meta.roles && !to.meta.roles.includes(auth.profile?.role)) return next('/')
    next()
  }
})

export default router
