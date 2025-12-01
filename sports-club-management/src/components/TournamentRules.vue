<template>
  <div class="rules-panel">
    <div class="rules-header" @click="expanded = !expanded">
      <div class="rules-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>กฎกติกาและขั้นตอนการใช้งาน</span>
      </div>
      <svg :class="['chevron', { expanded }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    
    <div v-if="expanded" class="rules-content">
      <!-- Role Info -->
      <div class="role-section">
        <h4>สิทธิ์การใช้งานตามบทบาท</h4>
        <div class="role-grid">
          <div class="role-card">
            <div class="role-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div class="role-info">
              <div class="role-name">Admin</div>
              <ul class="role-perms">
                <li>สร้าง/แก้ไข/ลบทัวนาเมนต์ทั้งหมด</li>
                <li>เพิ่มนักกีฬาจากทุกชมรม</li>
                <li>บันทึกผลและรางวัลทุกคน</li>
              </ul>
            </div>
          </div>
          
          <div class="role-card">
            <div class="role-icon coach">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div class="role-info">
              <div class="role-name">Coach</div>
              <ul class="role-perms">
                <li>สร้างทัวนาเมนต์ได้</li>
                <li>เพิ่มเฉพาะนักกีฬาในชมรมตัวเอง</li>
                <li>บันทึกผล/รางวัลเฉพาะนักกีฬาในสังกัด</li>
              </ul>
            </div>
          </div>
          
          <div class="role-card">
            <div class="role-icon athlete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="role-info">
              <div class="role-name">Athlete</div>
              <ul class="role-perms">
                <li>ดูทัวนาเมนต์และผู้เข้าแข่งขัน</li>
                <li>ดูประวัติการแข่งขันของตัวเอง</li>
                <li>ไม่สามารถแก้ไขข้อมูลได้</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Workflow -->
      <div class="workflow-section">
        <h4>ขั้นตอนการใช้งาน</h4>
        <div class="workflow-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <div class="step-title">สร้างทัวนาเมนต์</div>
              <div class="step-desc">Admin/Coach กรอกข้อมูลรายการแข่งขัน</div>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <div class="step-title">เพิ่มนักกีฬา</div>
              <div class="step-desc">เลือกนักกีฬาเข้าแข่งขัน ระบุรุ่น/น้ำหนัก</div>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <div class="step-title">บันทึกผลการแข่งขัน</div>
              <div class="step-desc">บันทึกวันแข่ง คู่แข่ง ผล (ชนะ/แพ้/เสมอ)</div>
            </div>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <div class="step-title">บันทึกรางวัล</div>
              <div class="step-desc">เพิ่มรางวัลที่ได้รับ (ทอง/เงิน/ทองแดง)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Award Types -->
      <div class="awards-section">
        <h4>ประเภทรางวัล</h4>
        <div class="award-types">
          <span class="award-tag gold">เหรียญทอง</span>
          <span class="award-tag silver">เหรียญเงิน</span>
          <span class="award-tag bronze">เหรียญทองแดง</span>
          <span class="award-tag certificate">ประกาศนียบัตร</span>
          <span class="award-tag special">รางวัลพิเศษ</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const expanded = ref(false)
</script>

<style scoped>
.rules-panel {
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  margin-bottom: 20px;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
}

.rules-header:hover {
  background: #F5F5F5;
}

.rules-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
}

.rules-title svg {
  width: 18px;
  height: 18px;
}

.chevron {
  width: 18px;
  height: 18px;
  color: #A3A3A3;
  transition: transform 0.2s;
}

.chevron.expanded {
  transform: rotate(180deg);
}

.rules-content {
  padding: 16px;
  border-top: 1px solid #E5E5E5;
}

.rules-content h4 {
  font-size: 13px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-section, .workflow-section, .awards-section {
  margin-bottom: 20px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.role-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.role-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.role-icon svg {
  width: 18px;
  height: 18px;
}

.role-icon.admin {
  background: #171717;
  color: #fff;
}

.role-icon.coach {
  background: #DBEAFE;
  color: #1E40AF;
}

.role-icon.athlete {
  background: #D1FAE5;
  color: #065F46;
}

.role-name {
  font-weight: 600;
  font-size: 14px;
  color: #171717;
  margin-bottom: 4px;
}

.role-perms {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #525252;
}

.role-perms li {
  margin-bottom: 2px;
}

.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  width: 28px;
  height: 28px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-title {
  font-weight: 500;
  font-size: 14px;
  color: #171717;
}

.step-desc {
  font-size: 12px;
  color: #737373;
}

.award-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.award-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.award-tag.gold { background: #FEF3C7; color: #D97706; }
.award-tag.silver { background: #F3F4F6; color: #6B7280; }
.award-tag.bronze { background: #FED7AA; color: #C2410C; }
.award-tag.certificate { background: #DBEAFE; color: #2563EB; }
.award-tag.special { background: #E9D5FF; color: #7C3AED; }

@media (max-width: 640px) {
  .role-grid {
    grid-template-columns: 1fr;
  }
}
</style>
