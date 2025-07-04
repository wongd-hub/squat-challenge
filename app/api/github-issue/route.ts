import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Buffer } from 'buffer'

export async function POST(request: NextRequest) {
  try {
    const { title, body, labels, screenshot } = await request.json()

    // Validate required fields
    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // GitHub configuration
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const GITHUB_REPO = process.env.GITHUB_REPO || 'darrenwong/squat-challenge' // Replace with your repo

    if (!GITHUB_TOKEN) {
      console.error('GitHub token not configured')
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 500 }
      )
    }

    let screenshotUrl: string | undefined

    // If screenshot provided (data URL), upload it to repo
    if (screenshot && typeof screenshot === 'string' && screenshot.startsWith('data:image')) {
      try {
        const matches = screenshot.match(/^data:(image\/\w+);base64,(.+)$/)
        if (matches) {
          const ext = matches[1].split('/')[1]
          const base64Data = matches[2]
          const buffer = Buffer.from(base64Data, 'base64')
          const path = `bug-report-screenshots/${Date.now()}-${randomUUID()}.${ext}`

          const uploadRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURI(path)}`, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: 'Add bug-report screenshot',
              content: buffer.toString('base64')
            })
          })

          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json()
            screenshotUrl = uploadJson.content?.download_url || uploadJson.content?.html_url
          } else {
            const errTxt = await uploadRes.text()
            console.error('Screenshot upload GitHub error', uploadRes.status, errTxt)
          }
        }
      } catch (err) {
        console.error('Screenshot upload failed', err)
      }
    }

    let finalBody = body
    if (screenshotUrl) {
      finalBody = body.replace('_Attached below_', `![Screenshot](${screenshotUrl})`)
    }

    // Create GitHub issue
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body: finalBody,
        labels: labels || ['user-reported']
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('GitHub API error:', error)
      return NextResponse.json(
        { error: 'Failed to create GitHub issue' },
        { status: response.status }
      )
    }

    const issue = await response.json()
    
    return NextResponse.json({
      success: true,
      issue: {
        number: issue.number,
        url: issue.html_url
      }
    })

  } catch (error) {
    console.error('Error creating GitHub issue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 