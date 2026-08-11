import { useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  FileUp,
  Eye,
} from 'lucide-react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

export default function UploadPrescriptionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadMutation = useMutation({
    mutationFn: ({ file, name, phone }) => {
      const formData = new FormData()
      formData.append('image', file)
      if (name) formData.append('patientName', name)
      if (phone) formData.append('patientPhone', phone)
      return api.post(`/prescriptions/${id}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          )
          setUploadProgress(percent)
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      toast.success('Prescription uploaded successfully')
      navigate(`/app/prescriptions/${id}`)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to upload prescription'))
      setUploadProgress(0)
    },
  })

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragOut = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer?.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const processFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image or PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setFilePreview(ev.target?.result)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }
    uploadMutation.mutate({
      file: selectedFile,
      name: patientName,
      phone: patientPhone,
    })
  }

  const isPdf = selectedFile?.type === 'application/pdf'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Prescription</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a prescription image or document
            {id && (
              <span className="font-mono ml-1">
                #{id.slice(-8).toUpperCase()}
              </span>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div
                  onDragEnter={handleDragIn}
                  onDragLeave={handleDragOut}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative flex flex-col items-center justify-center p-12 rounded-xl border-2 border-dashed transition-all cursor-pointer',
                    dragActive
                      ? 'border-primary bg-primary/5 scale-[1.02]'
                      : selectedFile
                        ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <>
                      <div className={cn(
                        'p-4 rounded-2xl mb-4 transition-colors',
                        dragActive
                          ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        <FileUp className="w-10 h-10" />
                      </div>
                      <p className="text-base font-medium mb-1">
                        {dragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Image className="w-3.5 h-3.5" />
                          Images
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          PDF
                        </span>
                        <span>Max 10MB</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {filePreview ? (
                        <div className="relative w-full max-w-sm">
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-full h-48 object-contain rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFile(null)
                              setFilePreview(null)
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isPdf ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-2xl bg-primary/10 dark:bg-white/10 text-primary dark:text-foreground">
                            <FileText className="w-10 h-10" />
                          </div>
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFile(null)
                              setFilePreview(null)
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 mt-4 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>File selected</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {uploadMutation.isPending && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uploading...</span>
                    <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {selectedFile?.name}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Patient Information</CardTitle>
                <CardDescription>Optional patient details for the uploaded prescription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input
                    id="patientName"
                    placeholder="Enter patient name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    disabled={uploadMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientPhone">Phone Number</Label>
                  <Input
                    id="patientPhone"
                    placeholder="Enter phone number"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    disabled={uploadMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                {id && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/app/prescriptions/${id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Prescription Details
                  </Button>
                )}
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={!selectedFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Prescription
                    </>
                  )}
                </Button>
                {uploadMutation.isError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {getApiErrorMessage(uploadMutation.error, 'Upload failed')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Requirements
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Accepted formats: JPEG, PNG, GIF, WebP, PDF</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Maximum file size: 10MB</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Image should be clear and legible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Patient info fields are optional but recommended</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
