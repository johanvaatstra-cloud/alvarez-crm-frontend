<template>
  <div class="shell">
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="sidebar-brand">
        <div class="logo-mark">AC</div>
        <div class="brand-text">
          <span class="brand-name">Alvarez Catalunya</span>
          <span class="brand-sub">CRM</span>
        </div>
      </div>

      <div class="nav-section">
        <RouterLink to="/dashboard" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-home" />
          <span>{{ t('nav.dashboard') }}</span>
        </RouterLink>
        <RouterLink to="/clients" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-building" />
          <span>{{ t('nav.clients') }}</span>
        </RouterLink>
        <RouterLink to="/agenda" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-calendar" />
          <span>{{ t('nav.agenda') }}</span>
        </RouterLink>
        <RouterLink to="/reports" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-file-edit" />
          <span>{{ t('nav.reports') }}</span>
        </RouterLink>
        <RouterLink to="/reports/missing" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-exclamation-triangle" />
          <span>{{ t('nav.missingReports') }}</span>
        </RouterLink>
      </div>

      <div v-if="auth.isAdmin" class="nav-section">
        <p class="nav-label">{{ t('nav.admin') }}</p>
        <RouterLink to="/admin/users" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-users" />
          <span>{{ t('nav.employees') }}</span>
        </RouterLink>
        <RouterLink to="/admin/products" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-box" />
          <span>{{ t('nav.products') }}</span>
        </RouterLink>
        <RouterLink to="/admin/promotions" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-tag" />
          <span>{{ t('nav.promotions') }}</span>
        </RouterLink>
        <RouterLink to="/admin/settings" class="nav-item" active-class="nav-item--active">
          <i class="pi pi-cog" />
          <span>{{ t('nav.settings') }}</span>
        </RouterLink>
      </div>

      <div class="sidebar-spacer" />

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ initials }}</div>
          <div class="user-details">
            <span class="user-name">{{ auth.fullName }}</span>
            <span class="user-role">{{ auth.isAdmin ? t('nav.adminRole') : t('nav.salesRepRole') }}</span>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout" :title="t('nav.logout')">
          <i class="pi pi-sign-out" />
        </button>
      </div>
    </nav>

    <!-- Main content -->
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const initials = computed(() => {
  const name = auth.fullName || ''
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--green-dark);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  overflow-y: auto;
  z-index: 100;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-mark {
  width: 40px;
  height: 40px;
  background: var(--green-light);
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  color: white;
  font-weight: 600;
  font-size: 13px;
  line-height: 1.2;
}

.brand-sub {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.nav-section {
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 8px 8px;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
  margin-bottom: 2px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.nav-item--active {
  background: var(--green-light);
  color: white !important;
}

.nav-item i {
  font-size: 16px;
  width: 18px;
  text-align: center;
}

.sidebar-spacer { flex: 1; }

/* ── Footer ───────────────────────────────────────────────────────────────── */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--green-light);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  color: white;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.logout-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.logout-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
.main {
  margin-left: 240px;
  flex: 1;
  min-height: 100vh;
  background: #f1f5f2;
}
</style>
