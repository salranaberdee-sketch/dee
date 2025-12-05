<template>
  <div class="athlete-performance">
    <!-- Back Button -->
    <router-link to="/evaluation" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      กลับ
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <template v-else-if="athlete">
      <!-- Athlete Header -->
      <div class="athlete-header">
        <div class="avatar">
          {{ athlete.name?.charAt(0) || '?' }}
        </div>
        <div class="info">
          <h1>{{ athlete.name }}</h1>
          <p>{{ athlete.email }}</p>
        </div>
        <div class="tier-badge" :class="stats.performance_tier">
          {{ getTierLabel(stats.performance_tier) }}
        </div>
      </div>

      <!-- Month Selector -->
      <div class="month-selector">
        <button @click="prevMonth" class="btn-nav">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="month-label">{{ formatMonth(selectedMonth) }}</span>
        <button @click="nextMonth" class="btn-nav">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Score Overview with Target -->
      <div class="score-section">
        <div class="score-circle" :style="{ '--score': stats.overall_score }">
          <span class="score-value">{{ stats.overall_score || 0 }}</span>
          <span class="score-label">คะแนนรวม</span>
        </div>
        <div class="target-info">
          <div class="target-tier" :class="nextTier.key">
            <span class="target-label">เป้าหมายถัดไป</span>
            <span class="target-name">{{ nextTier.label }}</span>
            <span class="target-score">ต้องการ {{ nextTier.required }} คะแนน</span>
          </div>
          <div class="points-needed" v-if="pointsToNextTier > 0">
            <span class="needed-value">+{{ pointsToNextTier }}</span>
            <span class="needed-label">คะแนนที่ต้องเพิ่ม</span>
          </div>
          <div class="points-needed achieved" v-else>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span class="needed-label">ถึงระดับสูงสุดแล้ว!</span>
          </div>
        </div>
      </div>

      <!-- Score Breakdown Card - Requirement 8.5 -->
      <div class="score-breakdown-section" v-if="scoreBreakdown && scoreBreakdown.categoryScores">
        <h2>รายละเอียดคะแนน</h2>
        <ScoreBreakdownCard 
          :score-result="scoreBreakdown"
          :show-no-conditions-message="true"
        />
      </div>

      <!-- How to Earn Points Section -->
      <div class="earn-points-section">
        <h2>วิธีเพิ่มคะแนน</h2>
        <div class="earn-cards">
          <!-- Attendance Card -->
          <div class="earn-card">
            <div class="earn-header">
              <div class="earn-icon attendance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <polyline points="16 11 18 13 22 9"/>
                </svg>
              </div>
              <div class="earn-title">
                <span class="title">การเข้าร่วม</span>
                <span class="weight">{{ criteriaUsed.attendance_weight }}% ของคะแนนรวม</span>
              </div>
            </div>
            <div class="earn-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: Math.min(stats.attendance_rate || 0, 100) + '%' }"></div>
              </div>
              <div class="progress-labels">
                <span>{{ stats.attendance_rate || 0 }}%</span>
                <span>เป้าหมาย 100%</span>
              </div>
            </div>
            <div class="earn-score">
              <span class="current">ได้ {{ attendanceScore.toFixed(1) }} คะแนน</span>
              <span class="max">จาก {{ criteriaUsed.attendance_weight }} คะแนน</span>
            </div>
            <div class="earn-tips">
              <div class="tip-item positive">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>มาตรงเวลา = นับเป็นเข้าร่วม</span>
              </div>
              <div class="tip-item positive">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>มาสาย = นับเป็นเข้าร่วม</span>
              </div>
              <div class="tip-item negative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                <span>ลา/ขาด = ไม่นับเป็นเข้าร่วม</span>
              </div>
            </div>
          </div>

          <!-- Training Card -->
          <div class="earn-card">
            <div class="earn-header">
              <div class="earn-icon training">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
                  <line x1="6" y1="1" x2="6" y2="4"/>
                  <line x1="10" y1="1" x2="10" y2="4"/>
                  <line x1="14" y1="1" x2="14" y2="4"/>
                </svg>
              </div>
              <div class="earn-title">
                <span class="title">จำนวนฝึกซ้อม</span>
                <span class="weight">{{ criteriaUsed.training_weight }}% ของคะแนนรวม</span>
              </div>
            </div>
            <div class="earn-progress">
              <div class="progress-bar">
                <div class="progress-fill training" :style="{ width: Math.min((stats.training_sessions || 0) / criteriaUsed.target_training_sessions * 100, 100) + '%' }"></div>
              </div>
              <div class="progress-labels">
                <span>{{ stats.training_sessions || 0 }} ครั้ง</span>
                <span>เป้าหมาย {{ criteriaUsed.target_training_sessions }} ครั้ง</span>
              </div>
            </div>
            <div class="earn-score">
              <span class="current">ได้ {{ trainingScore.toFixed(1) }} คะแนน</span>
              <span class="max">จาก {{ criteriaUsed.training_weight }} คะแนน</span>
            </div>
            <div class="earn-tips">
              <div class="tip-item positive">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>ฝึก {{ criteriaUsed.target_training_sessions }} ครั้ง/เดือน = {{ criteriaUsed.training_weight }} คะแนนเต็ม</span>
              </div>
              <div class="tip-item info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>ฝึก 1 ครั้ง = +{{ (criteriaUsed.training_weight / criteriaUsed.target_training_sessions).toFixed(1) }} คะแนน</span>
              </div>
              <div class="tip-item info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>ต้องบันทึกใน "บันทึกฝึกซ้อม"</span>
              </div>
            </div>
          </div>

          <!-- Rating Card -->
          <div class="earn-card">
            <div class="earn-header">
              <div class="earn-icon rating">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div class="earn-title">
                <span class="title">Rating จากโค้ช</span>
                <span class="weight">{{ criteriaUsed.rating_weight }}% ของคะแนนรวม</span>
              </div>
            </div>
            <div class="earn-progress">
              <div class="progress-bar">
                <div class="progress-fill rating" :style="{ width: (stats.average_rating || 0) / 5 * 100 + '%' }"></div>
              </div>
              <div class="progress-labels">
                <span>{{ stats.average_rating || 0 }} ดาว</span>
                <span>เป้าหมาย 5 ดาว</span>
              </div>
            </div>
            <div class="earn-score">
              <span class="current">ได้ {{ ratingScore.toFixed(1) }} คะแนน</span>
              <span class="max">จาก {{ criteriaUsed.rating_weight }} คะแนน</span>
            </div>
            <div class="earn-tips">
              <div class="tip-item positive">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>ตั้งใจฝึกซ้อม = Rating สูง</span>
              </div>
              <div class="tip-item positive">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>ทำตามคำแนะนำโค้ช</span>
              </div>
              <div class="tip-item info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>โค้ชให้คะแนนในบันทึกฝึกซ้อม</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tier Requirements -->
      <div class="tier-requirements">
        <h2>เกณฑ์แต่ละระดับ</h2>
        <div class="tier-cards">
          <div class="tier-card" :class="{ active: stats.performance_tier === 'excellent' }">
            <div class="tier-header excellent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>ดีเยี่ยม</span>
            </div>
            <div class="tier-requirement">≥ 85 คะแนน</div>
            <div class="tier-check" v-if="stats.overall_score >= 85">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              ผ่านแล้ว!
            </div>
          </div>
          <div class="tier-card" :class="{ active: stats.performance_tier === 'good' }">
            <div class="tier-header good">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>ดี</span>
            </div>
            <div class="tier-requirement">≥ 70 คะแนน</div>
            <div class="tier-check" v-if="stats.overall_score >= 70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              ผ่านแล้ว!
            </div>
          </div>
          <div class="tier-card" :class="{ active: stats.performance_tier === 'average' }">
            <div class="tier-header average">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span>ปานกลาง</span>
            </div>
            <div class="tier-requirement">≥ 50 คะแนน</div>
            <div class="tier-check" v-if="stats.overall_score >= 50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              ผ่านแล้ว!
            </div>
          </div>
          <div class="tier-card" :class="{ active: stats.performance_tier === 'needs_improvement' }">
            <div class="tier-header needs_improvement">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>ต้องปรับปรุง</span>
            </div>
            <div class="tier-requirement">&lt; 50 คะแนน</div>
          </div>
        </div>
      </div>

      <!-- Action Suggestions -->
      <div class="action-section" v-if="suggestions.length > 0">
        <h2>สิ่งที่ควรทำเพื่อเพิ่มคะแนน</h2>
        <div class="suggestion-list">
          <div v-for="(suggestion, index) in suggestions" :key="index" class="suggestion-item">
            <div class="suggestion-icon" :class="suggestion.type">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div class="suggestion-content">
              <span class="suggestion-title">{{ suggestion.title }}</span>
              <span class="suggestion-desc">{{ suggestion.description }}</span>
            </div>
            <div class="suggestion-points">+{{ suggestion.points }} คะแนน</div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon attendance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <polyline points="16 11 18 13 22 9"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.attendance_rate || 0 }}%</span>
            <span class="stat-label">อัตราเข้าร่วม</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon training">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.training_sessions || 0 }}</span>
            <span class="stat-label">ครั้งฝึกซ้อม</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon hours">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.training_hours || 0 }}</span>
            <span class="stat-label">ชั่วโมงฝึก</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon rating">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.average_rating || 0 }}</span>
            <span class="stat-label">Rating เฉลี่ย</span>
          </div>
        </div>
      </div>

      <!-- Attendance Breakdown -->
      <div class="section">
        <h2>สรุปการเข้าร่วม</h2>
        <div class="attendance-breakdown">
          <div class="breakdown-item on-time">
            <span class="count">{{ stats.attended_on_time || 0 }}</span>
            <span class="label">ตรงเวลา</span>
          </div>
          <div class="breakdown-item late">
            <span class="count">{{ stats.attended_late || 0 }}</span>
            <span class="label">มาสาย</span>
          </div>
          <div class="breakdown-item leave">
            <span class="count">{{ stats.leave_count || 0 }}</span>
            <span class="label">ลา</span>
          </div>
          <div class="breakdown-item absent">
            <span class="count">{{ stats.absent_count || 0 }}</span>
            <span class="label">ขาด</span>
          </div>
        </div>
      </div>

      <!-- Activity History Section -->
      <div class="section activity-history-section">
        <div class="section-header">
          <h2>ประวัติการเข้าร่วมกิจกรรมทั้งหมด</h2>
          <p class="section-desc">บันทึกการเข้าร่วมกิจกรรม การฝึกซ้อม และการแข่งขันของคุณ</p>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
          <button 
            class="filter-tab" 
            :class="{ active: activityFilter === 'all' }"
            @click="activityFilter = 'all'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            ทั้งหมด ({{ allActivities.length }})
          </button>
          <button 
            class="filter-tab" 
            :class="{ active: activityFilter === 'events' }"
            @click="activityFilter = 'events'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            กิจกรรม ({{ eventHistory.length }})
          </button>
          <button 
            class="filter-tab" 
            :class="{ active: activityFilter === 'training' }"
            @click="activityFilter = 'training'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
            ฝึกซ้อม ({{ attendanceHistory.length }})
          </button>
        </div>

        <!-- Activity List -->
        <div class="history-list">
          <div v-if="filteredActivities.length === 0" class="empty-history">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>ไม่มีข้อมูลในเดือนนี้</p>
          </div>

          <!-- Event Activities -->
          <div 
            v-for="activity in filteredActivities" 
            :key="activity.id" 
            class="history-item"
            :class="[activity.type, activity.status]"
          >
            <div class="history-date">
              <span class="day">{{ formatDay(activity.date) }}</span>
              <span class="weekday">{{ formatWeekday(activity.date) }}</span>
            </div>
            <div class="history-info">
              <div class="activity-title">
                <span class="type">{{ activity.title }}</span>
                <span class="activity-type-badge" :class="activity.type">
                  {{ activity.typeLabel }}
                </span>
              </div>
              <div class="activity-details">
                <span v-if="activity.details" class="details-text">
                  {{ activity.details }}
                </span>
              </div>
            </div>
            <div class="history-status">
              <span class="status-badge" :class="activity.status">
                {{ activity.statusLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Improvement Tips (for needs_improvement) -->
      <div v-if="stats.performance_tier === 'needs_improvement'" class="tips-section">
        <h2>จุดที่ควรปรับปรุง</h2>
        <ul class="tips-list">
          <li v-if="stats.attendance_rate < 70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            อัตราการเข้าร่วมต่ำ ({{ stats.attendance_rate }}%) - ควรเข้าร่วมให้มากกว่า 70%
          </li>
          <li v-if="stats.training_sessions < Math.floor(criteriaUsed.target_training_sessions * 0.67)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            ฝึกซ้อมน้อย ({{ stats.training_sessions }} ครั้ง) - ควรฝึกอย่างน้อย {{ Math.floor(criteriaUsed.target_training_sessions * 0.67) }} ครั้ง/เดือน
          </li>
          <li v-if="stats.absent_count > 3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            ขาดบ่อย ({{ stats.absent_count }} ครั้ง) - ควรลดการขาดให้น้อยกว่า 3 ครั้ง/เดือน
          </li>
        </ul>
      </div>
    </template>

    <div v-else class="not-found">
      <p>ไม่พบข้อมูลนักกีฬา</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useEvaluationStore } from '../stores/evaluation'
import { useAuthStore } from '../stores/auth'
import { useScoringCriteriaStore } from '../stores/scoringCriteria'
import { calculateScore } from '../lib/scoreCalculator'
import ScoreBreakdownCard from '../components/ScoreBreakdownCard.vue'

const route = useRoute()
const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const scoringCriteriaStore = useScoringCriteriaStore()

// ถ้าไม่มี id ใน params แสดงว่าเป็น athlete ดูผลงานตัวเอง
const athleteId = ref(null)
const athlete = ref(null)
const stats = ref({})
const attendanceHistory = ref([])
const eventHistory = ref([])
const loading = ref(true)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const scoreBreakdown = ref(null)
const activityFilter = ref('all')

function getTierLabel(tier) {
  return evaluationStore.getTierLabel(tier)
}

// Get configured weights from scoreBreakdown (Requirement 5.2)
const criteriaUsed = computed(() => {
  return scoreBreakdown.value?.criteria_used || {
    attendance_weight: 40,
    training_weight: 30,
    rating_weight: 30,
    target_training_sessions: 12
  }
})

// คำนวณคะแนนแต่ละส่วน using configured weights
const attendanceScore = computed(() => {
  const weight = criteriaUsed.value.attendance_weight
  return (stats.value.attendance_rate || 0) * (weight / 100)
})
const trainingScore = computed(() => {
  const weight = criteriaUsed.value.training_weight
  const target = criteriaUsed.value.target_training_sessions || 12
  return Math.min(((stats.value.training_sessions || 0) / target) * weight, weight)
})
const ratingScore = computed(() => {
  const weight = criteriaUsed.value.rating_weight
  return ((stats.value.average_rating || 0) / 5) * weight
})

// หา tier ถัดไป
const nextTier = computed(() => {
  const score = stats.value.overall_score || 0
  if (score >= 85) return { key: 'excellent', label: 'ดีเยี่ยม', required: 85 }
  if (score >= 70) return { key: 'excellent', label: 'ดีเยี่ยม', required: 85 }
  if (score >= 50) return { key: 'good', label: 'ดี', required: 70 }
  return { key: 'average', label: 'ปานกลาง', required: 50 }
})

const pointsToNextTier = computed(() => {
  const score = stats.value.overall_score || 0
  if (score >= 85) return 0
  return nextTier.value.required - score
})

// รวมข้อมูลกิจกรรมทั้งหมด
const allActivities = computed(() => {
  const activities = []
  
  // เพิ่มกิจกรรมจาก events
  eventHistory.value.forEach(event => {
    activities.push({
      id: `event-${event.id}`,
      type: 'event',
      date: event.event_date,
      title: event.event_title,
      typeLabel: getEventTypeLabel(event.event_type),
      status: event.checkin_status || 'registered',
      statusLabel: event.checkin_status ? getCheckinStatusLabel(event.checkin_status) : 'ลงทะเบียนแล้ว',
      details: event.checkin_time ? `เช็คอิน: ${formatTime(event.checkin_time)}` : null
    })
  })
  
  // เพิ่มกิจกรรมจาก attendance
  attendanceHistory.value.forEach(record => {
    let details = null
    if (record.status === 'late') {
      details = `สาย ${record.late_minutes} นาที`
    } else if (record.status === 'leave') {
      details = `${getLeaveTypeLabel(record.leave_type)}: ${record.leave_reason}`
    }
    
    activities.push({
      id: `attendance-${record.id}`,
      type: 'training',
      date: record.record_date,
      title: getTypeLabel(record.record_type),
      typeLabel: 'ฝึกซ้อม',
      status: record.status,
      statusLabel: getStatusLabel(record.status),
      details
    })
  })
  
  // เรียงตามวันที่ (ใหม่สุดก่อน)
  return activities.sort((a, b) => new Date(b.date) - new Date(a.date))
})

// กรองกิจกรรมตาม filter
const filteredActivities = computed(() => {
  if (activityFilter.value === 'events') {
    return allActivities.value.filter(a => a.type === 'event')
  } else if (activityFilter.value === 'training') {
    return allActivities.value.filter(a => a.type === 'training')
  }
  return allActivities.value
})

// คำแนะนำเพื่อเพิ่มคะแนน (using configured weights)
const suggestions = computed(() => {
  const list = []
  const s = stats.value
  const criteria = criteriaUsed.value
  
  // ถ้าเข้าร่วมน้อย
  if ((s.attendance_rate || 0) < 90) {
    const currentScore = (s.attendance_rate || 0) * (criteria.attendance_weight / 100)
    const targetScore = 90 * (criteria.attendance_weight / 100)
    const gain = Math.round((targetScore - currentScore) * 10) / 10
    if (gain > 0) {
      list.push({
        type: 'attendance',
        title: 'เข้าร่วมให้ครบ',
        description: `เพิ่มอัตราเข้าร่วมจาก ${s.attendance_rate || 0}% เป็น 90%`,
        points: gain
      })
    }
  }
  
  // ถ้าฝึกซ้อมน้อย
  const targetSessions = criteria.target_training_sessions || 12
  if ((s.training_sessions || 0) < targetSessions) {
    const remaining = targetSessions - (s.training_sessions || 0)
    const gain = Math.round((remaining / targetSessions) * criteria.training_weight * 10) / 10
    list.push({
      type: 'training',
      title: `ฝึกซ้อมเพิ่มอีก ${remaining} ครั้ง`,
      description: `บันทึกการฝึกซ้อมให้ครบ ${targetSessions} ครั้ง/เดือน`,
      points: gain
    })
  }
  
  // ถ้า rating ต่ำ
  if ((s.average_rating || 0) < 4) {
    const currentScore = ((s.average_rating || 0) / 5) * criteria.rating_weight
    const targetScore = (4 / 5) * criteria.rating_weight
    const gain = Math.round((targetScore - currentScore) * 10) / 10
    if (gain > 0) {
      list.push({
        type: 'rating',
        title: 'เพิ่ม Rating เป็น 4 ดาว',
        description: 'ตั้งใจฝึกซ้อมและทำตามคำแนะนำโค้ช',
        points: gain
      })
    }
  }
  
  return list.sort((a, b) => b.points - a.points).slice(0, 3)
})

function formatMonth(month) {
  const date = new Date(month + '-01')
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

function formatDay(dateStr) {
  return new Date(dateStr).getDate()
}

function formatWeekday(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'short' })
}

function getTypeLabel(type) {
  const labels = { training: 'ฝึกซ้อม', competition: 'แข่งขัน', meeting: 'ประชุม', other: 'อื่นๆ' }
  return labels[type] || type
}

function getStatusLabel(status) {
  const labels = { on_time: 'ตรงเวลา', late: 'มาสาย', leave: 'ลา', absent: 'ขาด' }
  return labels[status] || status
}

function getLeaveTypeLabel(type) {
  const labels = { sick: 'ลาป่วย', personal: 'ลากิจ', emergency: 'ฉุกเฉิน', other: 'อื่นๆ' }
  return labels[type] || type
}

function getEventTypeLabel(type) {
  const labels = { training: 'ฝึกซ้อม', competition: 'แข่งขัน', test: 'ทดสอบ', other: 'อื่นๆ' }
  return labels[type] || type
}

function getCheckinStatusLabel(status) {
  const labels = { on_time: 'ตรงเวลา', late: 'สาย', absent: 'ขาด' }
  return labels[status] || status
}

function formatTime(datetime) {
  return new Date(datetime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function prevMonth() {
  const date = new Date(selectedMonth.value + '-01')
  date.setMonth(date.getMonth() - 1)
  selectedMonth.value = date.toISOString().slice(0, 7)
}

function nextMonth() {
  const date = new Date(selectedMonth.value + '-01')
  date.setMonth(date.getMonth() + 1)
  selectedMonth.value = date.toISOString().slice(0, 7)
}

async function loadData() {
  loading.value = true
  try {
    // ถ้าไม่มี id ใน route params ให้หา athlete id จาก user_id
    if (route.params.id) {
      athleteId.value = route.params.id
    } else {
      // หา athlete id จาก user_id (สำหรับ athlete ดูผลงานตัวเอง)
      const { data: myAthlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('user_id', authStore.user?.id)
        .single()
      
      if (myAthlete) {
        athleteId.value = myAthlete.id
      }
    }

    if (!athleteId.value) {
      loading.value = false
      return
    }

    // Load athlete info
    const { data: athleteData } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId.value)
      .single()
    
    athlete.value = athleteData

    if (!athleteData) {
      loading.value = false
      return
    }

    // Calculate stats for selected month
    const monthStart = `${selectedMonth.value}-01`
    const monthEnd = new Date(selectedMonth.value + '-01')
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthEnd.setDate(0)
    const endDate = monthEnd.toISOString().slice(0, 10)

    // Attendance records
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('athlete_id', athleteId.value)
      .gte('record_date', monthStart)
      .lte('record_date', endDate)
      .order('record_date', { ascending: false })

    attendanceHistory.value = attendance || []

    // Event participation (registrations + checkins)
    const { data: eventRegistrations } = await supabase
      .from('event_registrations')
      .select(`
        id,
        event_id,
        registered_at,
        events!inner (
          id,
          title,
          event_type,
          event_date,
          start_time
        )
      `)
      .eq('athlete_id', athleteId.value)
      .gte('events.event_date', monthStart)
      .lte('events.event_date', endDate)

    // Event checkins
    const { data: eventCheckins } = await supabase
      .from('event_checkins')
      .select(`
        id,
        event_id,
        checkin_status,
        checkin_time,
        events!inner (
          id,
          title,
          event_type,
          event_date,
          start_time
        )
      `)
      .eq('athlete_id', athleteId.value)
      .gte('events.event_date', monthStart)
      .lte('events.event_date', endDate)

    // รวมข้อมูล events (registrations + checkins)
    const eventMap = new Map()
    
    // เพิ่ม registrations
    eventRegistrations?.forEach(reg => {
      if (reg.events) {
        eventMap.set(reg.event_id, {
          id: reg.id,
          event_id: reg.event_id,
          event_title: reg.events.title,
          event_type: reg.events.event_type,
          event_date: reg.events.event_date,
          start_time: reg.events.start_time,
          registered_at: reg.registered_at,
          checkin_status: null,
          checkin_time: null
        })
      }
    })
    
    // อัพเดทด้วย checkins
    eventCheckins?.forEach(checkin => {
      if (checkin.events) {
        const existing = eventMap.get(checkin.event_id)
        if (existing) {
          existing.checkin_status = checkin.checkin_status
          existing.checkin_time = checkin.checkin_time
        } else {
          eventMap.set(checkin.event_id, {
            id: checkin.id,
            event_id: checkin.event_id,
            event_title: checkin.events.title,
            event_type: checkin.events.event_type,
            event_date: checkin.events.event_date,
            start_time: checkin.events.start_time,
            registered_at: null,
            checkin_status: checkin.checkin_status,
            checkin_time: checkin.checkin_time
          })
        }
      }
    })
    
    eventHistory.value = Array.from(eventMap.values()).sort((a, b) => 
      new Date(b.event_date) - new Date(a.event_date)
    )

    // Training logs
    const { data: training } = await supabase
      .from('training_logs')
      .select('duration, rating')
      .eq('athlete_id', athleteId.value)
      .gte('date', monthStart)
      .lte('date', endDate)

    // Calculate stats
    const totalSessions = attendance?.length || 0
    const onTime = attendance?.filter(a => a.status === 'on_time').length || 0
    const late = attendance?.filter(a => a.status === 'late').length || 0
    const leave = attendance?.filter(a => a.status === 'leave').length || 0
    const absent = attendance?.filter(a => a.status === 'absent').length || 0
    
    const attended = onTime + late
    const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0

    const trainingHours = Math.round((training?.reduce((sum, t) => sum + (t.duration || 0), 0) / 60) * 10) / 10 || 0
    const trainingSessions = training?.length || 0
    const avgRating = training?.length > 0 
      ? Math.round((training.reduce((sum, t) => sum + (t.rating || 0), 0) / training.length) * 10) / 10
      : 0

    // Calculate overall score
    const attendanceScore = attendanceRate * 0.4
    const trainingScore = Math.min((trainingSessions / 12) * 30, 30)
    const ratingScore = (avgRating / 5) * 30
    const overallScore = Math.round(attendanceScore + trainingScore + ratingScore)

    // Determine tier
    let tier = 'needs_improvement'
    if (overallScore >= 85) tier = 'excellent'
    else if (overallScore >= 70) tier = 'good'
    else if (overallScore >= 50) tier = 'average'

    stats.value = {
      total_sessions: totalSessions,
      attended_on_time: onTime,
      attended_late: late,
      leave_count: leave,
      absent_count: absent,
      attendance_rate: attendanceRate,
      training_hours: trainingHours,
      training_sessions: trainingSessions,
      average_rating: avgRating,
      overall_score: overallScore,
      performance_tier: tier
    }

    // Fetch scoring criteria and conditions for the club
    // Requirement 8.5: Show breakdown including all applied conditions
    if (athleteData?.club_id) {
      await scoringCriteriaStore.fetchCriteria(athleteData.club_id)
      await scoringCriteriaStore.fetchConditions(athleteData.club_id)
      
      // Calculate score breakdown with criteria and conditions
      const criteria = scoringCriteriaStore.getEffectiveCriteria()
      const conditions = scoringCriteriaStore.activeConditions
      
      scoreBreakdown.value = calculateScore(
        {
          attendance_rate: attendanceRate,
          training_sessions: trainingSessions,
          average_rating: avgRating,
          absent_count: absent,
          training_hours: trainingHours
        },
        criteria,
        conditions
      )
      
      // Update stats with calculated values from scoreBreakdown
      stats.value.overall_score = scoreBreakdown.value.overall_score
      stats.value.performance_tier = scoreBreakdown.value.tier
    } else {
      // No club, use basic calculation
      scoreBreakdown.value = calculateScore(
        {
          attendance_rate: attendanceRate,
          training_sessions: trainingSessions,
          average_rating: avgRating,
          absent_count: absent,
          training_hours: trainingHours
        },
        null,
        []
      )
    }
  } catch (err) {
    console.error('Error loading data:', err)
  } finally {
    loading.value = false
  }
}

watch(selectedMonth, () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.athlete-performance {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #525252;
  text-decoration: none;
  margin-bottom: 1.5rem;
}

.back-link svg {
  width: 20px;
  height: 20px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #737373;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.athlete-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #171717;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.info h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.info p {
  color: #737373;
  margin: 0;
}

.tier-badge {
  margin-left: auto;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-weight: 500;
}

.tier-badge.excellent { background: #D1FAE5; color: #065F46; }
.tier-badge.good { background: #DBEAFE; color: #1E40AF; }
.tier-badge.average { background: #FEF3C7; color: #92400E; }
.tier-badge.needs_improvement { background: #FEE2E2; color: #991B1B; }

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-nav {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #E5E5E5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nav svg {
  width: 20px;
  height: 20px;
}

.month-label {
  font-size: 1.125rem;
  font-weight: 500;
  min-width: 150px;
  text-align: center;
}

.score-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.target-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.target-tier {
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
}

.target-tier.excellent { background: #D1FAE5; }
.target-tier.good { background: #DBEAFE; }
.target-tier.average { background: #FEF3C7; }

.target-label {
  display: block;
  font-size: 0.75rem;
  color: #525252;
}

.target-name {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.25rem 0;
}

.target-score {
  display: block;
  font-size: 0.875rem;
  color: #525252;
}

.points-needed {
  text-align: center;
  padding: 0.75rem;
  background: #171717;
  border-radius: 8px;
  color: #fff;
}

.points-needed .needed-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
}

.points-needed .needed-label {
  font-size: 0.75rem;
  opacity: 0.8;
}

.points-needed.achieved {
  background: #22C55E;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.points-needed.achieved svg {
  width: 24px;
  height: 24px;
}

/* Earn Points Section */
.earn-points-section {
  margin-bottom: 2rem;
}

.earn-points-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.earn-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.earn-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.25rem;
}

.earn-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.earn-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.earn-icon svg {
  width: 24px;
  height: 24px;
}

.earn-icon.attendance { background: #D1FAE5; color: #065F46; }
.earn-icon.training { background: #DBEAFE; color: #1E40AF; }
.earn-icon.rating { background: #FEF3C7; color: #92400E; }

.earn-title {
  display: flex;
  flex-direction: column;
}

.earn-title .title {
  font-weight: 600;
  font-size: 1rem;
}

.earn-title .weight {
  font-size: 0.75rem;
  color: #737373;
}

.earn-progress {
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 8px;
  background: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  background: #22C55E;
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.training { background: #3B82F6; }
.progress-fill.rating { background: #F59E0B; }

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #737373;
}

.earn-score {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-top: 1px solid #F5F5F5;
  border-bottom: 1px solid #F5F5F5;
  margin-bottom: 0.75rem;
}

.earn-score .current {
  font-weight: 600;
  color: #171717;
}

.earn-score .max {
  color: #737373;
  font-size: 0.875rem;
}

.earn-tips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.tip-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.tip-item.positive { color: #065F46; }
.tip-item.negative { color: #991B1B; }
.tip-item.info { color: #525252; }

/* Tier Requirements */
.tier-requirements {
  margin-bottom: 2rem;
}

.tier-requirements h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.tier-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.tier-card {
  background: #fff;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  transition: all 0.2s;
}

.tier-card.active {
  border-color: #171717;
  background: #F5F5F5;
}

.tier-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.tier-header svg {
  width: 24px;
  height: 24px;
}

.tier-header span {
  font-size: 0.875rem;
  font-weight: 600;
}

.tier-header.excellent { color: #065F46; }
.tier-header.good { color: #1E40AF; }
.tier-header.average { color: #92400E; }
.tier-header.needs_improvement { color: #991B1B; }

.tier-requirement {
  font-size: 0.75rem;
  color: #737373;
  margin-bottom: 0.5rem;
}

.tier-check {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #065F46;
  background: #D1FAE5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.tier-check svg {
  width: 14px;
  height: 14px;
}

/* Action Suggestions */
.action-section {
  margin-bottom: 2rem;
}

.action-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.suggestion-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.suggestion-icon svg {
  width: 20px;
  height: 20px;
}

.suggestion-icon.attendance { background: #D1FAE5; color: #065F46; }
.suggestion-icon.training { background: #DBEAFE; color: #1E40AF; }
.suggestion-icon.rating { background: #FEF3C7; color: #92400E; }

.suggestion-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.suggestion-title {
  font-weight: 500;
}

.suggestion-desc {
  font-size: 0.75rem;
  color: #737373;
}

.suggestion-points {
  padding: 0.5rem 1rem;
  background: #171717;
  color: #fff;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(#171717 calc(var(--score) * 1%), #E5E5E5 0);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #fff;
}

.score-value {
  position: relative;
  font-size: 2rem;
  font-weight: 700;
}

.score-label {
  position: relative;
  font-size: 0.75rem;
  color: #737373;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-icon.attendance { background: #D1FAE5; color: #065F46; }
.stat-icon.training { background: #DBEAFE; color: #1E40AF; }
.stat-icon.hours { background: #FEF3C7; color: #92400E; }
.stat-icon.rating { background: #FEE2E2; color: #991B1B; }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.875rem;
  color: #737373;
}

.section {
  margin-bottom: 2rem;
}

.section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

/* Activity History Section */
.activity-history-section {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.section-desc {
  font-size: 0.875rem;
  color: #737373;
  margin: 0;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #E5E5E5;
  padding-bottom: 0.5rem;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #737373;
  transition: all 0.2s;
}

.filter-tab svg {
  width: 18px;
  height: 18px;
}

.filter-tab:hover {
  background: #F5F5F5;
  color: #171717;
}

.filter-tab.active {
  background: #171717;
  color: #fff;
  position: relative;
}

.filter-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #171717;
}

.attendance-breakdown {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
}

.breakdown-item .count {
  font-size: 1.5rem;
  font-weight: 700;
}

.breakdown-item .label {
  font-size: 0.75rem;
}

.breakdown-item.on-time { background: #D1FAE5; color: #065F46; }
.breakdown-item.late { background: #FEF3C7; color: #92400E; }
.breakdown-item.leave { background: #DBEAFE; color: #1E40AF; }
.breakdown-item.absent { background: #FEE2E2; color: #991B1B; }

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 2rem;
  color: #737373;
}

.empty-history svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.empty-history p {
  margin: 0;
  font-size: 0.875rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  transition: all 0.2s;
}

.history-item:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.history-item.on_time { border-left: 4px solid #22C55E; }
.history-item.late { border-left: 4px solid #F59E0B; }
.history-item.leave { border-left: 4px solid #3B82F6; }
.history-item.absent { border-left: 4px solid #EF4444; }
.history-item.registered { border-left: 4px solid #A3A3A3; }

.history-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.history-date .day {
  font-size: 1.25rem;
  font-weight: 700;
}

.history-date .weekday {
  font-size: 0.75rem;
  color: #737373;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.activity-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.history-info .type {
  font-weight: 600;
  font-size: 1rem;
  color: #171717;
}

.activity-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #F5F5F5;
  color: #525252;
}

.activity-type-badge.event {
  background: #DBEAFE;
  color: #1E40AF;
}

.activity-type-badge.training {
  background: #D1FAE5;
  color: #065F46;
}

.activity-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.details-text {
  font-size: 0.875rem;
  color: #737373;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.on_time { background: #D1FAE5; color: #065F46; }
.status-badge.late { background: #FEF3C7; color: #92400E; }
.status-badge.leave { background: #DBEAFE; color: #1E40AF; }
.status-badge.absent { background: #FEE2E2; color: #991B1B; }
.status-badge.registered { background: #F5F5F5; color: #525252; }

.tips-section {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 12px;
  padding: 1.5rem;
}

.tips-section h2 {
  color: #991B1B;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #FECACA;
  color: #991B1B;
}

.tips-list li:last-child {
  border-bottom: none;
}

.tips-list svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.not-found {
  text-align: center;
  padding: 3rem;
  color: #737373;
}

/* Score Breakdown Section */
.score-breakdown-section {
  margin-bottom: 2rem;
}

.score-breakdown-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .attendance-breakdown {
    grid-template-columns: repeat(2, 1fr);
  }

  .athlete-header {
    flex-wrap: wrap;
  }

  .tier-badge {
    margin-left: 0;
    margin-top: 0.5rem;
  }

  .score-section {
    flex-direction: column;
  }

  .tier-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .suggestion-item {
    flex-wrap: wrap;
  }

  .suggestion-points {
    width: 100%;
    text-align: center;
    margin-top: 0.5rem;
  }
}
</style>
