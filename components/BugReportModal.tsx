import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Bug, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface BugReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug',
    email: ''
  })
  const [screenshotData, setScreenshotData] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Enable paste support for images
  React.useEffect(() => {
    if (!isOpen) return
    const handlePasteDoc = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i]
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              handleFile(file)
              break
            }
          }
        }
      }
    }
    document.addEventListener('paste', handlePasteDoc)
    return () => document.removeEventListener('paste', handlePasteDoc)
  }, [isOpen])

  // Reset form & status when modal is opened, and pre-check rate limit
  React.useEffect(() => {
    if (isOpen) {
      // Clear previous data
      setFormData({ title: '', description: '', type: 'bug', email: '' })
      setScreenshotData(null)

      // Rate limit pre-check
      if (typeof window !== 'undefined') {
        const lastStr = localStorage.getItem('bug_report_last_ts')
        if (lastStr) {
          const last = parseInt(lastStr)
          if (!isNaN(last) && Date.now() - last < RATE_LIMIT_MS) {
            setSubmitStatus('rateLimit')
            return
          }
        }
      }
      setSubmitStatus('idle')
    }
  }, [isOpen])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'rateLimit'>('idle')
  const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Front-end rate limiting using localStorage
    if (typeof window !== 'undefined') {
      const lastStr = localStorage.getItem('bug_report_last_ts')
      if (lastStr) {
        const last = parseInt(lastStr)
        if (!isNaN(last) && Date.now() - last < RATE_LIMIT_MS) {
          setSubmitStatus('rateLimit')
          return
        }
      }
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Get current domain/URL for bug report context
      const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'Unknown'
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'Unknown'
      
      // Create GitHub issue body
      let issueBody = `
## Issue Description
${formData.description}

## Issue Type
${formData.type === 'bug' ? '🐛 Bug' : formData.type === 'feature' ? '✨ Feature Request' : '🔧 Enhancement'}

## Reporter Info
- Email: ${formData.email || 'Not provided'}
- Domain: ${currentDomain}
- URL: ${currentUrl}
- Submitted via: Squat Challenge App
- Timestamp: ${new Date().toISOString()}
`.trim()

      // screenshot will be uploaded separately in API route if provided
      if (screenshotData) {
        issueBody += `\n\n## Screenshot\n_Attached below_`
      }

      // Submit to GitHub Issues API
      const response = await fetch('/api/github-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          body: issueBody,
          labels: [formData.type === 'bug' ? 'bug' : 'enhancement', 'user-reported'],
          screenshot: screenshotData
        })
      })

      if (response.ok) {
        setSubmitStatus('success')

        // Record submission time for rate limiting
        if (typeof window !== 'undefined') {
          localStorage.setItem('bug_report_last_ts', Date.now().toString())
        }

        // Reset form
        setFormData({
          title: '',
          description: '',
          type: 'bug',
          email: ''
        })
        setScreenshotData(null)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error submitting bug report:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let scale = 1
        let quality = 0.7
        let dataUrl = ''

        const MAX_CHARS = 60000 // stay below GitHub 65536 char limit with buffer

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

        // Iteratively downscale / recompress until under limit
        while (true) {
          const targetWidth = img.width * scale
          const targetHeight = img.height * scale
          canvas.width = targetWidth
          canvas.height = targetHeight
          ctx.clearRect(0, 0, targetWidth, targetHeight)
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
          dataUrl = canvas.toDataURL('image/jpeg', quality)

          if (dataUrl.length <= MAX_CHARS) break

          // further reduce
          if (scale > 0.3) {
            scale *= 0.8 // shrink dimensions first
          } else {
            quality *= 0.8 // then reduce quality
          }

          // bail-out safeguard
          if (quality < 0.2) {
            break
          }
        }

        setScreenshotData(dataUrl)
      }
      if (typeof reader.result === 'string') {
        img.src = reader.result
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/30 dark:border-white/20 shadow-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Help us improve the Squat Challenge app by reporting bugs or suggesting features.
          </DialogDescription>

          {/* dev indicator removed from here */}
        </DialogHeader>

        {submitStatus === 'success' ? (
          <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                Thank you for your report!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                Your issue has been submitted to our GitHub repository. We'll review it and get back to you soon.
              </p>
            </CardContent>
          </Card>
        ) : submitStatus === 'error' ? (
          <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                We couldn't submit your report. Please try again or contact us directly.
              </p>
              <Button
                variant="outline"
                onClick={() => setSubmitStatus('idle')}
                className="border-red-500/20"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : submitStatus === 'rateLimit' ? (
          <Card className="border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                Slow down ⏱️
              </h3>
              <p className="text-sm text-muted-foreground">
                You can submit one report every 5 minutes. Please wait a bit and try again.
              </p>
              <Button variant="outline" onClick={() => setSubmitStatus('idle')}>Okay</Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Issue Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">🐛 Bug Report</SelectItem>
                    <SelectItem value="feature">✨ Feature Request</SelectItem>
                    <SelectItem value="enhancement">🔧 Enhancement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
                rows={4}
              />
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label>Screenshot (optional)</Label>
              <div
                className="flex flex-col items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFile(file)
                }}
              >
                {screenshotData ? (
                  <img src={screenshotData} alt="Screenshot preview" className="max-h-40 object-contain rounded-md" />
                ) : (
                  <p className="text-center text-xs">
                    Drag & drop, paste, or click to select an image.<br/>
                    Screenshots are greatly appreciated and will help with the debugging process.
                  </p>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title || !formData.description}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Issue
                  </>
                )}
              </Button>
            </div>

            {/* Dev Awake Indicator */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Is the dev asleep?</span>
              <span className="w-2 h-2 rounded-full bg-green-500 shadow animate-pulse" />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
} 