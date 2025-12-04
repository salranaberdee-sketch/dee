<script setup>
defineProps({ title: String, show: { type: Boolean, default: true }, size: String })
defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
        <div :class="['modal', size === 'large' ? 'modal-large' : '']">
          <div class="modal-handle"></div>
          <div class="modal-header">
            <h3><slot name="header"><slot name="title">{{ title }}</slot></slot></h3>
            <button class="close-btn" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <slot name="body"><slot /></slot>
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-large {
  max-width: 600px;
}

.modal-handle {
  width: 40px;
  height: 4px;
  background: #d4d4d4;
  border-radius: 2px;
  margin: 8px auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e5e5;
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.close-btn { 
  background: #f5f5f5;
  border: none; 
  width: 36px;
  height: 36px;
  border-radius: 50%; 
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.close-btn:hover {
  background: #e5e5e5;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #525252;
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #e5e5e5;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(100%); }

/* Mobile - Bottom sheet style */
@media (max-width: 639px) {
  .modal-overlay {
    padding: 0;
  }
  
  .modal {
    max-height: 95vh;
    border-radius: 20px 20px 0 0;
  }
  
  .modal-large {
    max-width: 100%;
  }
  
  .modal-handle {
    width: 48px;
    height: 5px;
    margin: 10px auto;
  }
  
  .modal-header {
    padding: 0.875rem 1rem;
  }
  
  .modal-header h3 {
    font-size: 1.125rem;
  }
  
  /* Close button - touch-friendly */
  .close-btn {
    width: 44px;
    height: 44px;
  }
  
  .close-btn svg {
    width: 22px;
    height: 22px;
  }
  
  .modal-body {
    padding: 1rem;
    /* ให้ scroll ได้ดีบน iOS */
    -webkit-overflow-scrolling: touch;
  }
  
  .modal-footer {
    padding: 1rem;
    /* Safe area สำหรับ iPhone X+ */
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }
}

/* Desktop/Tablet - Centered modal */
@media (min-width: 640px) {
  .modal-overlay {
    align-items: center;
  }
  
  .modal {
    border-radius: 16px;
    max-height: 85vh;
  }
  
  .modal-handle {
    display: none;
  }
}
</style>
