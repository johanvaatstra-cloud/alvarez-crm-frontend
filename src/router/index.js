import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../components/AppShell.vue'),
    children: [
      { path: '', redirect: 'dashboard' },
      { path: 'dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'clients', component: () => import('../views/ClientsView.vue') },
      { path: 'clients/:id', component: () => import('../views/ClientDetailView.vue') },
      { path: 'clients/:clientId/order/new', component: () => import('../views/OrderEntryView.vue') },
      { path: 'clients/:clientId/menu', component: () => import('../views/ClientMenuView.vue'), meta: { adminOnly: true } },
      { path: 'orders', component: () => import('../views/OrdersView.vue') },
      { path: 'agenda', component: () => import('../views/AgendaView.vue') },
      { path: 'reports', component: () => import('../views/ReportsView.vue') },
      { path: 'reports/missing', component: () => import('../views/MissingReportsView.vue') },
      { path: 'reports/:id', component: () => import('../views/ReportDetailView.vue') },
      {
        path: 'admin/users',
        component: () => import('../views/admin/UsersView.vue'),
        meta: { adminOnly: true }
      },
      {
        path: 'admin/products',
        component: () => import('../views/admin/ProductsView.vue'),
        meta: { adminOnly: true }
      },
      {
        path: 'admin/promotions',
        component: () => import('../views/admin/PromotionsView.vue'),
        meta: { adminOnly: true }
      },
      {
        path: 'admin/settings',
        component: () => import('../views/admin/SettingsView.vue'),
        meta: { adminOnly: true }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return '/login'
  if (to.meta.adminOnly && !auth.isAdmin) return '/dashboard'
})

export default router
