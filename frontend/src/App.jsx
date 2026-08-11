import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route, useParams } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardLayout } from '@/app/DashboardLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { PatientLayout } from '@/features/patient/PatientLayout'
import { PatientProtectedRoute } from '@/features/patient/components/PatientProtectedRoute'

const LandingPage = lazy(() => import('@/features/landing/LandingPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))
const OtpVerificationPage = lazy(() => import('@/features/auth/pages/OtpVerificationPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const PrescriptionPages = lazy(() => import('@/features/prescriptions/pages/PrescriptionPages'))
const InventoryPage = lazy(() => import('@/features/inventory/pages/InventoryPage'))
const SalesPage = lazy(() => import('@/features/sales/pages/SalesPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/AnalyticsPage'))
const SearchPage = lazy(() => import('@/features/search/pages/SearchPage'))
const PublicMedicinesPage = lazy(() => import('@/features/search/pages/PublicMedicinesPage'))
const MedicineDetailsPage = lazy(() => import('@/features/shop/MedicineDetailsPage'))
const CartPage = lazy(() => import('@/features/shop/CartPage'))
const CheckoutPage = lazy(() => import('@/features/shop/CheckoutPage'))
const OrderTrackingPage = lazy(() => import('@/features/shop/OrderTrackingPage'))
const DispensingLabelPage = lazy(() => import('@/features/shop/DispensingLabelPage'))
const PaymentPage = lazy(() => import('@/features/shop/PaymentPage'))
const PrescriptionRequestPage = lazy(() => import('@/features/shop/PrescriptionRequestPage'))
const DrugCheckerPage = lazy(() => import('@/features/safety/pages/DrugCheckerPage'))
const AuditPage = lazy(() => import('@/features/audit/pages/AuditPage'))
const AdminPage = lazy(() => import('@/features/admin/pages/AdminPage'))
const PartnersPage = lazy(() => import('@/features/admin/pages/PartnersPage'))
const NotFoundPage = lazy(() => import('@/features/not-found/pages/NotFoundPage'))

const PatientLoginPage = lazy(() => import('@/features/patient/pages/PatientLoginPage'))
const PatientRegisterPage = lazy(() => import('@/features/patient/pages/PatientRegisterPage'))
const PatientDashboard = lazy(() => import('@/features/patient/pages/PatientDashboard'))
const MessagesPage = lazy(() => import('@/features/patient/pages/MessagesPage'))
const PrescriptionsPage = lazy(() => import('@/features/patient/pages/PrescriptionsPage'))
const MedicinesPage = lazy(() => import('@/features/patient/pages/MedicinesPage'))
const PatientOrdersPage = lazy(() => import('@/features/patient/pages/OrdersPage'))
const ProfilePage = lazy(() => import('@/features/patient/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/features/patient/pages/SettingsPage'))

const InboxPage = lazy(() => import('@/features/pharmacist/pages/InboxPage'))
const OrderQueuePage = lazy(() => import('@/features/pharmacist/pages/OrderQueuePage'))
const OrderReviewPage = lazy(() => import('@/features/pharmacist/pages/OrderReviewPage'))

const AboutPage = lazy(() => import('@/features/about/pages/AboutPage'))
const ServicesPage = lazy(() => import('@/features/services/pages/ServicesPage'))
const ContactPage = lazy(() => import('@/features/contact/pages/ContactPage'))
const ContactInboxPage = lazy(() => import('@/features/contact/pages/ContactInboxPage'))

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-4 w-[400px]" />
      <div className="grid grid-cols-3 gap-4 pt-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function PrescriptionRedirect() {
  const { id } = useParams()
  return id ? <Navigate to={`/app/prescriptions/${id}`} replace /> : <Navigate to="/app/prescriptions" replace />
}

function PrescriptionUploadRedirect() {
  const { id } = useParams()
  return id ? <Navigate to={`/app/prescriptions/${id}/upload`} replace /> : <Navigate to="/app/prescriptions" replace />
}

function InboxRedirect() {
  const { id } = useParams()
  return id ? <Navigate to={`/app/inbox/${id}`} replace /> : <Navigate to="/app/inbox" replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/prescriptions" element={<Navigate to="/app/prescriptions" replace />} />
        <Route path="/prescriptions/create" element={<Navigate to="/app/prescriptions/create" replace />} />
        <Route path="/prescriptions/:id" element={<PrescriptionRedirect />} />
        <Route path="/prescriptions/:id/upload" element={<PrescriptionUploadRedirect />} />
        <Route path="/inbox" element={<Navigate to="/app/inbox" replace />} />
        <Route path="/inbox/:id" element={<InboxRedirect />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-otp" element={<OtpVerificationPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/medicines" element={<PublicMedicinesPage />} />
        <Route path="/medicines/:id" element={<MedicineDetailsPage />} />
        <Route path="/medicines/:id/prescription" element={<PrescriptionRequestPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:id" element={<OrderTrackingPage />} />
        <Route path="/orders/:id/label" element={<DispensingLabelPage />} />
        <Route path="/orders/:id/payment" element={<PaymentPage />} />

        <Route path="/patient/login" element={<PatientLoginPage />} />
        <Route path="/patient/register" element={<PatientRegisterPage />} />
        <Route
          path="/patient"
          element={
            <PatientProtectedRoute>
              <PatientLayout />
            </PatientProtectedRoute>
          }
        >
          <Route index element={<PatientDashboard />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:id" element={<MessagesPage />} />
          <Route path="prescriptions" element={<PrescriptionsPage />} />
          <Route path="medicines" element={<MedicinesPage />} />
          <Route path="orders" element={<PatientOrdersPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="prescriptions/*" element={<PrescriptionPages />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="safety/drug-checker" element={<DrugCheckerPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route
            path="partners"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <PartnersPage />
              </ProtectedRoute>
            }
          />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="inbox/:id" element={<InboxPage />} />
          <Route path="contact-inbox" element={<ContactInboxPage />} />
          <Route path="orders" element={<OrderQueuePage />} />
          <Route path="orders/:id" element={<OrderReviewPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
