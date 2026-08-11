import { Routes, Route } from 'react-router-dom'
import PrescriptionsPage from '@/features/prescriptions/PrescriptionsPage'
import PrescriptionDetailPage from '@/features/prescriptions/PrescriptionDetailPage'
import CreatePrescriptionPage from '@/features/prescriptions/CreatePrescriptionPage'
import UploadPrescriptionPage from '@/features/prescriptions/UploadPrescriptionPage'

export default function PrescriptionPages() {
  return (
    <Routes>
      <Route index element={<PrescriptionsPage />} />
      <Route path="create" element={<CreatePrescriptionPage />} />
      <Route path=":id/upload" element={<UploadPrescriptionPage />} />
      <Route path=":id" element={<PrescriptionDetailPage />} />
    </Routes>
  )
}
