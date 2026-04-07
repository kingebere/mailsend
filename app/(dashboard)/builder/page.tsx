'use client'

import { Suspense, useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Monitor, Smartphone, Save, Send, Eye, Plus, Trash2, Copy,
  ChevronUp, ChevronDown, Settings, Type, ImageIcon, AlignLeft,
  AlignCenter, AlignRight, Check, Loader2, AlertCircle,
  ArrowLeft, Layout, Mail, Minus, Square, Columns, Upload,
  Tablet, RefreshCw, Share2
} from 'lucide-react'

type BlockType =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'footer'
  | 'social'
  | 'video'
  | 'html'

type ViewMode = 'desktop' | 'tablet' | 'mobile'

interface Block {
  id: string
  type: BlockType
  content: Record<string, string | number | boolean>
}

interface TemplateResponse {
  id: string
  name: string
  subject: string
  htmlBody: string

}

const FONT_FAMILIES = [
  'Inter',
  'Archivo',
  'Roboto',
  'Arial',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Times New Roman',
  'Georgia',
  'Courier New',
] as const

const UNIT_OPTIONS = ['px', '%', 'em'] as const

const BUILDER_META_PREFIX = 'MAILSEND_BUILDER_META:'

const SOCIAL_ICONS: Record<string, { svg: string; color: string; label: string }> = {
  facebook:  { color: '#1877F2', label: 'Facebook',  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
  twitter:   { color: '#000000', label: 'X (Twitter)', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
  instagram: { color: '#E1306C', label: 'Instagram', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' },
  linkedin:  { color: '#0A66C2', label: 'LinkedIn',  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' },
  youtube:   { color: '#FF0000', label: 'YouTube',   svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
  tiktok:    { color: '#000000', label: 'TikTok',    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>' },
  pinterest: { color: '#E60023', label: 'Pinterest', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>' },
  whatsapp:  { color: '#25D366', label: 'WhatsApp',  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' },
  website:   { color: '#6366f1', label: 'Website',   svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
}

const BLOCK_DEFAULTS: Record<BlockType, Record<string, string | number | boolean>> = {
  header: {
    text: 'Your Email Headline',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    align: 'center',
    bgColor: '#ffffff',
    padding: 32,
  },
  text: {
    text: 'Write your message here. Keep it personal and focused.',
    width: 100,
    widthUnit: '%',
    height: 0,
    heightUnit: 'px',
    flexGrow: 0,
    alignSelf: 'auto',
    linkTo: 'website',
    link: '',
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 16,
    fontSizeUnit: 'px',
    lineHeight: 1.7,
    lineHeightUnit: 'em',
    color: '#374151',
    bgColor: 'transparent',
    align: 'left',
    padding: 24,
  },
  image: {
    src: 'https://placehold.co/600x300/e0e7ff/6366f1?text=Your+Image',
    alt: '',
    caption: '',
    linkTo: 'website',
    link: '',
    width: 100,
    height: 0,
    bgColor: '#e9ecef',
    objectFit: 'cover',
    objectPosition: 'center',
    align: 'center',
    borderRadius: 4,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: '#000000',
    boxShadow: 'none',
    opacity: 1,
    filter: 'none',
    transition: 'all 0.3s ease',
    hoverOpacity: 0.8,
    hoverFilter: 'brightness(1.1)',
    hoverTransform: 'none',
    padding: 16,
  },
  columns: {
    col1Type: 'text',
    col1: 'Left column content.',
    col1ImageSrc: '',
    col1ImageAlt: '',
    col1ImageLink: '',
    col2Type: 'text',
    col2: 'Right column content.',
    col2ImageSrc: '',
    col2ImageAlt: '',
    col2ImageLink: '',
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#374151',
    bgColor: '#ffffff',
    gap: 24,
    padding: 24,
  },
  button: {
    text: 'Click Here',
    link: 'https://',
    bgColor: '#6366f1',
    textColor: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    borderRadius: 8,
    align: 'center',
    containerBg: '#ffffff',
    padding: 24,
  },
  divider: {
    color: '#e5e7eb',
    thickness: 1,
    bgColor: '#ffffff',
    padding: 16,
  },
  spacer: {
    height: 32,
    bgColor: '#ffffff',
  },

  footer: {
    companyName: 'Your Company',
    address: '123 Main St, City, State',
    text: 'You received this because you subscribed.',
    unsubscribeText: 'Unsubscribe',
    fontSize: 12,
    color: '#9ca3af',
    bgColor: '#f9fafb',
    padding: 32,
  },
  social: {
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
    pinterest: '',
    whatsapp: '',
    website: '',
    bgColor: '#ffffff',
    padding: 24,
    iconSize: 36,
    iconStyle: 'filled',
    align: 'center',
    gap: 12,
  },
  video: {
    thumbnailUrl: 'https://placehold.co/600x338/1f2937/ffffff?text=▶ Play Video',
    link: 'https://youtube.com',
    caption: 'Watch our latest video',
    bgColor: '#ffffff',
    padding: 16,
    align: 'center',
  },
  html: {
    html: '<div style="padding:24px;background:#ffffff;font-family:sans-serif;color:#374151">Custom HTML block</div>',
  },
}

function encodeBuilderMeta(data: { blocks: Block[]; emailBg: string }) {
  try {
    return `<!--${BUILDER_META_PREFIX}${encodeURIComponent(JSON.stringify(data))}-->`
  } catch {
    return ''
  }
}

function extractBuilderMeta(html: string): { blocks: Block[]; emailBg: string } | null {
  const match = html.match(/<!--MAILSEND_BUILDER_META:([\s\S]*?)-->/)
  if (!match?.[1]) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as {
      blocks?: Block[]
      emailBg?: string
    }

    if (!Array.isArray(parsed.blocks)) return null

    return {
      blocks: parsed.blocks,
      emailBg: typeof parsed.emailBg === 'string' ? parsed.emailBg : '#f3f4f6',
    }
  } catch {
    return null
  }
}

function stripBuilderMeta(html: string) {
  return html.replace(/<!--MAILSEND_BUILDER_META:[\s\S]*?-->/, '').trim()
}

function normalizeLink(linkTo: string, value: string) {
  const v = value.trim()
  if (!v) return ''

  if (linkTo === 'email') {
    return v.startsWith('mailto:') ? v : `mailto:${v}`
  }

  if (linkTo === 'phone') {
    return v.startsWith('tel:') ? v : `tel:${v}`
  }

  return v
}

function makeTextStyles(block: Block, view: ViewMode) {
  const c = block.content
  const width = Number(getResponsiveValue(c, 'width', view, 100))
  const height = Number(getResponsiveValue(c, 'height', view, 0))
  const widthUnit = String(getResponsiveValue(c, 'widthUnit', view, '%'))
  const heightUnit = String(getResponsiveValue(c, 'heightUnit', view, 'px'))
  const fontSize = Number(getResponsiveValue(c, 'fontSize', view, 16))
  const fontSizeUnit = String(getResponsiveValue(c, 'fontSizeUnit', view, 'px'))
  const lineHeight = String(getResponsiveValue(c, 'lineHeight', view, 1.7))
  const lineHeightUnit = String(getResponsiveValue(c, 'lineHeightUnit', view, 'em'))
  const align = String(getResponsiveValue(c, 'align', view, 'left'))

  return [
    `margin:0`,
    `width:${width}${widthUnit}`,
    height > 0 ? `height:${height}${heightUnit}` : '',
    `font-size:${fontSize}${fontSizeUnit}`,
    `font-family:${String(c.fontFamily || 'Inter')}, Arial, sans-serif`,
    `font-weight:${String(c.fontWeight || '400')}`,
    `color:${String(c.color || '#374151')}`,
    `text-align:${align}`,
    `line-height:${lineHeight}${lineHeightUnit}`,
    `background:${String(c.bgColor || 'transparent')}`,
    `flex-grow:${Number(getResponsiveValue(c, 'flexGrow', view, 0))}`,
    `align-self:${String(getResponsiveValue(c, 'alignSelf', view, 'auto'))}`,
  ]
    .filter(Boolean)
    .join(';')
}

function deviceKey(base: string, view: ViewMode) {
  return `${base}_${view}`
}

function getResponsiveValue(
  content: Record<string, string | number | boolean>,
  base: string,
  view: ViewMode,
  fallback: string | number | boolean
) {
  const keyed = content[deviceKey(base, view)]
  if (keyed !== undefined && keyed !== '') return keyed
  const plain = content[base]
  if (plain !== undefined && plain !== '') return plain
  return fallback
}

function setResponsiveValue(
  content: Record<string, string | number | boolean>,
  base: string,
  view: ViewMode,
  value: string | number | boolean
) {
  return {
    ...content,
    [deviceKey(base, view)]: value,
  }
}

function renderColumnContent(
  kind: string,
  text: string,
  imageSrc: string,
  imageAlt: string,
  imageLink: string
) {
  if (kind === 'image' && imageSrc) {
    const imageHtml = `<img src="${imageSrc}" alt="${imageAlt}" style="width:100%;max-width:100%;display:block;border-radius:8px"/>`
    return imageLink
      ? `<a href="${imageLink}" style="display:block;text-decoration:none">${imageHtml}</a>`
      : imageHtml
  }

  return text
}

function makeImageStyles(block: Block, view: ViewMode) {
  const c = block.content
  const width = Number(getResponsiveValue(c, 'width', view, 100))
  const height = Number(getResponsiveValue(c, 'height', view, 0))
  const borderWidth = Number(getResponsiveValue(c, 'borderWidth', view, 0))
  const borderRadius = Number(getResponsiveValue(c, 'borderRadius', view, 4))
  const opacity = Number(getResponsiveValue(c, 'opacity', view, 1))
  const align = String(getResponsiveValue(c, 'align', view, 'center'))
  const objectFit = String(getResponsiveValue(c, 'objectFit', view, 'cover'))
  const objectPosition = String(getResponsiveValue(c, 'objectPosition', view, 'center'))
  const padding = Number(getResponsiveValue(c, 'padding', view, 16))

  return {
    wrapperAlign: align,
    wrapperPadding: padding,
    imageStyle: [
      `width:${width}%`,
      'max-width:100%',
      height > 0 ? `height:${height}px` : 'height:auto',
      'display:block',
      align === 'center' ? 'margin:0 auto' : align === 'right' ? 'margin:0 0 0 auto' : 'margin:0',
      `background:${String(c.bgColor || '#e9ecef')}`,
      `object-fit:${objectFit}`,
      `object-position:${objectPosition}`,
      `border-radius:${borderRadius}px`,
      `border:${borderWidth}px ${String(c.borderStyle || 'solid')} ${String(c.borderColor || '#000000')}`,
      `box-shadow:${String(c.boxShadow || 'none')}`,
      `opacity:${opacity}`,
      `filter:${String(c.filter || 'none')}`,
      `transition:${String(c.transition || 'all 0.3s ease')}`,
    ].join(';'),
    hoverStyle: [
      `opacity:${String(c.hoverOpacity || 0.8)}`,
      `filter:${String(c.hoverFilter || 'brightness(1.1)')}`,
      String(c.hoverTransform || 'none') !== 'none'
        ? `transform:${String(c.hoverTransform)}`
        : '',
    ]
      .filter(Boolean)
      .join(';'),
  }
}

function renderBlock(block: Block, view: ViewMode = 'desktop'): string {
  const c = block.content

  switch (block.type) {
    case 'header':
      return `<div style="background:${c.bgColor};padding:${c.padding}px 32px;text-align:${c.align}"><h1 style="margin:0;font-size:${c.fontSize}px;font-weight:${c.fontWeight};color:${c.color};font-family:sans-serif;line-height:1.3">${c.text}</h1></div>`

      case 'text': {
        const styles = makeTextStyles(block, view)
        const href = normalizeLink(String(c.linkTo || 'website'), String(c.link || ''))
        const content = String(c.text).replace(/\n/g, '<br/>')
        const body = href
          ? `<a href="${href}" style="color:inherit;text-decoration:none">${content}</a>`
          : content
      
        return `<div style="background:${c.bgColor};padding:${c.padding}px 32px"><div style="${styles}">${body}</div></div>`
      }
      case 'image': {
        const styles = makeImageStyles(block, view)
        const imageClass = `img-${block.id}`
        const img = `<img class="${imageClass}" src="${c.src}" alt="${c.alt}" style="${styles.imageStyle}"/>`
        const href = normalizeLink(String(c.linkTo || 'website'), String(c.link || ''))
        const linked = href ? `<a href="${href}" style="text-decoration:none;display:block">${img}</a>` : img
        const caption = c.caption
          ? `<div style="margin-top:8px;font-size:13px;line-height:1.5;color:#6b7280;font-family:sans-serif">${c.caption}</div>`
          : ''
      
        return `
          <style>
            .${imageClass}:hover{${styles.hoverStyle}}
          </style>
          <div style="background:${c.bgColor};padding:${styles.wrapperPadding}px 32px;text-align:${styles.wrapperAlign}">
            ${linked}
            ${caption}
          </div>
        `
      }

    case 'button':
      return `<div style="background:${c.containerBg};padding:${c.padding}px 32px;text-align:${c.align}"><a href="${c.link}" style="display:inline-block;background:${c.bgColor};color:${c.textColor};padding:14px 32px;border-radius:${c.borderRadius}px;text-decoration:none;font-size:${c.fontSize}px;font-weight:${c.fontWeight};font-family:sans-serif">${c.text}</a></div>`

    case 'divider':
      return `<div style="background:${c.bgColor};padding:${c.padding}px 32px"><hr style="border:none;border-top:${c.thickness}px solid ${c.color};margin:0"/></div>`

    case 'spacer':
      return `<div style="background:${c.bgColor};height:${c.height}px">&nbsp;</div>`

      case 'columns': {
        const left = renderColumnContent(
          String(c.col1Type || 'text'),
          String(c.col1 || ''),
          String(c.col1ImageSrc || ''),
          String(c.col1ImageAlt || ''),
          String(c.col1ImageLink || '')
        )
      
        const right = renderColumnContent(
          String(c.col2Type || 'text'),
          String(c.col2 || ''),
          String(c.col2ImageSrc || ''),
          String(c.col2ImageAlt || ''),
          String(c.col2ImageLink || '')
        )
      
        return `<div style="background:${c.bgColor};padding:${c.padding}px 32px"><table style="width:100%;border-collapse:collapse"><tr><td style="width:50%;padding-right:${Number(c.gap) / 2}px;vertical-align:top;font-size:${c.fontSize}px;color:${c.color};font-family:${String(c.fontFamily || 'Inter')}, Arial, sans-serif;line-height:1.6">${left}</td><td style="width:50%;padding-left:${Number(c.gap) / 2}px;vertical-align:top;font-size:${c.fontSize}px;color:${c.color};font-family:${String(c.fontFamily || 'Inter')}, Arial, sans-serif;line-height:1.6">${right}</td></tr></table></div>`
      }
    case 'social': {
      const size = Number(c.iconSize)
      const icons = Object.entries(SOCIAL_ICONS)
        .filter(([k]) => c[k])
        .map(([k, ic]) => `<a href="${c[k]}" style="display:inline-block;margin:0 ${Number(c.gap) / 2}px;text-decoration:none"><span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:${c.iconStyle === 'filled' ? ic.color : 'transparent'};border:${c.iconStyle === 'outline' ? `2px solid ${ic.color}` : 'none'};border-radius:50%;overflow:hidden">${ic.svg}</span></a>`)
        .join('')

      return `<div style="background:${c.bgColor};padding:${c.padding}px 32px;text-align:${c.align}">${icons || '<span style="color:#9ca3af;font-size:13px;font-family:sans-serif">Add social links in the editor</span>'}</div>`
    }

    case 'video':
      return `<div style="background:${c.bgColor};padding:${c.padding}px 32px;text-align:${c.align}"><a href="${c.link}" style="display:block;text-decoration:none"><img src="${c.thumbnailUrl}" alt="Video" style="width:100%;max-width:100%;display:block;border-radius:8px;${c.align === 'center' ? 'margin:0 auto;' : ''}"/>${c.caption ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;font-family:sans-serif">${c.caption}</p>` : ''}</a></div>`

    case 'footer':
      return `<div style="background:${c.bgColor};padding:${c.padding}px 32px;text-align:center"><p style="margin:0 0 6px;font-size:${c.fontSize}px;color:${c.color};font-family:sans-serif;font-weight:600">${c.companyName}</p><p style="margin:0 0 6px;font-size:${c.fontSize}px;color:${c.color};font-family:sans-serif">${c.address}</p><p style="margin:0;font-size:${c.fontSize}px;color:${c.color};font-family:sans-serif">${c.text} · <a href="{{unsubscribe_link}}" style="color:${c.color}">${c.unsubscribeText}</a></p></div>`

    case 'html':
      return String(c.html || '')

    default:
      return ''
  }
}

function buildHtml(blocks: Block[], bg = '#f3f4f6', view: ViewMode = 'desktop'): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${bg}"><table width="100%" cellpadding="0" cellspacing="0" style="background:${bg}"><tr><td align="center" style="padding:24px 0"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%"><tr><td>${blocks.map((block) => renderBlock(block, view)).join('')}</td></tr></table></td></tr></table></body></html>`
}

const PALETTE = [
  { type: 'header' as BlockType, label: 'Heading', icon: <Type className="w-4 h-4" />, desc: 'Big headline text' },
  { type: 'text' as BlockType, label: 'Text', icon: <AlignLeft className="w-4 h-4" />, desc: 'Body paragraph' },
  { type: 'image' as BlockType, label: 'Image', icon: <ImageIcon className="w-4 h-4" />, desc: 'Photo / graphic' },
  { type: 'button' as BlockType, label: 'Button', icon: <Square className="w-4 h-4" />, desc: 'Call to action' },
  { type: 'social' as BlockType, label: 'Social', icon: <Share2 className="w-4 h-4" />, desc: 'Social media icons' },
  { type: 'columns' as BlockType, label: '2 Columns', icon: <Columns className="w-4 h-4" />, desc: 'Side by side layout' },
  { type: 'video' as BlockType, label: 'Video', icon: <Layout className="w-4 h-4" />, desc: 'Video thumbnail link' },
  { type: 'divider' as BlockType, label: 'Divider', icon: <Minus className="w-4 h-4" />, desc: 'Horizontal rule' },
  { type: 'spacer' as BlockType, label: 'Spacer', icon: <Layout className="w-4 h-4" />, desc: 'Empty vertical space' },
  { type: 'footer' as BlockType, label: 'Footer', icon: <Mail className="w-4 h-4" />, desc: 'Footer + unsubscribe' },
]

function P({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}) {
  return (
    <select className="input text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function DimensionInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
}: {
  value: string | number
  unit: string
  onValueChange: (value: number) => void
  onUnitChange: (value: string) => void
}) {
  return (
    <div className="flex gap-2">
      <input
        className="input text-sm flex-1"
        type="number"
        value={String(value)}
        onChange={(e) => onValueChange(Number(e.target.value))}
      />
      <select
        className="input text-sm w-20"
        value={unit}
        onChange={(e) => onUnitChange(e.target.value)}
      >
        {UNIT_OPTIONS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  )
}

function ImageUpload({ value, onChange }: { value: string; onChange: (u: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  type UploadResponse = {
    url?: string
    error?: string
  }

  async function go(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    setUploading(true)
    setErr('')

    const fd = new FormData()
    fd.append('file', f)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const d: UploadResponse = await res.json()

      if (res.ok && d.url) {
        onChange(d.url)
      } else {
        setErr(d.error || 'Upload failed')
      }
    } catch {
      setErr('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        className="input text-xs mb-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://... or upload below"
      />
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={go} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="btn btn-secondary w-full text-xs py-2"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Uploading to R2...' : 'Upload image from device'}
      </button>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
      {value && <img src={value} alt="" className="mt-2 w-full rounded border border-gray-200 object-cover max-h-28" />}
    </>
  )
}

function BlockProps({
  block,
  onChange,
  view,
}: {
  block: Block
  onChange: (c: Record<string, string | number | boolean>) => void
  view: ViewMode
}) {
  const c = block.content
  const setResponsive = (k: string, v: string | number | boolean) =>
  onChange(setResponsiveValue(c, k, view, v))
  const set = (k: string, v: string | number | boolean) => onChange({ ...c, [k]: v })

  const inp = (k: string, type = 'text', ph = '') => (
    <input
      className="input text-sm"
      type={type}
      value={String(c[k] ?? '')}
      placeholder={ph}
      onChange={(e) => set(k, type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  )

  const clr = (k: string) => (
    <div className="flex gap-2">
      <input
        type="color"
        value={String(c[k] || '#ffffff')}
        onChange={(e) => set(k, e.target.value)}
        className="w-10 h-9 rounded border border-gray-200 p-0.5 cursor-pointer flex-shrink-0"
      />
      <input
        className="input flex-1 font-mono text-xs"
        value={String(c[k] || '')}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  )

  const aln = (k: string) => (
    <div className="flex gap-1">
      {['left', 'center', 'right'].map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => set(k, a)}
          className={`btn flex-1 py-1.5 text-xs ${c[k] === a ? 'btn-primary' : 'btn-secondary'}`}
        >
          {a === 'left' ? (
            <AlignLeft className="w-3.5 h-3.5 mx-auto" />
          ) : a === 'center' ? (
            <AlignCenter className="w-3.5 h-3.5 mx-auto" />
          ) : (
            <AlignRight className="w-3.5 h-3.5 mx-auto" />
          )}
        </button>
      ))}
    </div>
  )

  const ta = (k: string, rows = 5) => (
    <textarea
      className="input text-sm"
      rows={rows}
      value={String(c[k] ?? '')}
      onChange={(e) => set(k, e.target.value)}
    />
  )

  switch (block.type) {
    case 'header':
      return (
        <>
          <P label="Headline">{ta('text', 3)}</P>
          <P label="Font size">{inp('fontSize', 'number')}</P>
          <P label="Text color">{clr('color')}</P>
          <P label="Background">{clr('bgColor')}</P>
          <P label="Alignment">{aln('align')}</P>
          <P label="Padding">{inp('padding', 'number')}</P>
        </>
      )

      case 'text':
  return (
    <>
      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Text ({view === 'desktop' ? 'desktop' : view === 'tablet' ? 'tablet' : 'mobile'})
      </div>

      <P label="Content">{ta('text', 8)}</P>

      <P label="Width">
        <DimensionInput
          value={Number(getResponsiveValue(c, 'width', view, 100))}
          unit={String(getResponsiveValue(c, 'widthUnit', view, '%'))}
          onValueChange={(v) => setResponsive('width', v)}
          onUnitChange={(v) => setResponsive('widthUnit', v)}
        />
      </P>

      <P label="Height">
        <DimensionInput
          value={Number(getResponsiveValue(c, 'height', view, 0))}
          unit={String(getResponsiveValue(c, 'heightUnit', view, 'px'))}
          onValueChange={(v) => setResponsive('height', v)}
          onUnitChange={(v) => setResponsive('heightUnit', v)}
        />
      </P>

      <P label="Flex Grow">
        <input
          className="input text-sm"
          type="number"
          value={String(getResponsiveValue(c, 'flexGrow', view, 0))}
          onChange={(e) => setResponsive('flexGrow', Number(e.target.value))}
        />
      </P>

      <P label="Align Self">
        <SelectInput
          value={String(getResponsiveValue(c, 'alignSelf', view, 'auto'))}
          onChange={(v) => setResponsive('alignSelf', v)}
          options={['auto', 'flex-start', 'center', 'flex-end', 'stretch']}
        />
      </P>

      <P label="Link To">
        <SelectInput
          value={String(c.linkTo || 'website')}
          onChange={(v) => set('linkTo', v)}
          options={['website', 'email', 'phone']}
        />
      </P>

      <P label="Content Link">
        <input
          className="input text-sm"
          value={String(c.link || '')}
          placeholder={
            c.linkTo === 'email'
              ? 'hello@example.com'
              : c.linkTo === 'phone'
              ? '+1234567890'
              : 'https://example.com'
          }
          onChange={(e) => set('link', e.target.value)}
        />
      </P>

      <P label="Font Family">
        <SelectInput
          value={String(c.fontFamily || 'Inter')}
          onChange={(v) => set('fontFamily', v)}
          options={FONT_FAMILIES}
        />
      </P>

      <P label="Font Weight">
        <SelectInput
          value={String(c.fontWeight || '400')}
          onChange={(v) => set('fontWeight', v)}
          options={['normal', 'bold', 'lighter', 'bolder', '100', '200', '300', '400', '500', '600', '700', '800', '900']}
        />
      </P>

      <P label="Font Size">
        <DimensionInput
          value={Number(getResponsiveValue(c, 'fontSize', view, 16))}
          unit={String(getResponsiveValue(c, 'fontSizeUnit', view, 'px'))}
          onValueChange={(v) => setResponsive('fontSize', v)}
          onUnitChange={(v) => setResponsive('fontSizeUnit', v)}
        />
      </P>

      <P label="Line Height">
        <DimensionInput
          value={Number(getResponsiveValue(c, 'lineHeight', view, 1.7))}
          unit={String(getResponsiveValue(c, 'lineHeightUnit', view, 'em'))}
          onValueChange={(v) => setResponsive('lineHeight', v)}
          onUnitChange={(v) => setResponsive('lineHeightUnit', v)}
        />
      </P>

      <P label="Text Color">{clr('color')}</P>

      <P label="Background">
        <input
          className="input text-sm"
          value={String(c.bgColor || 'transparent')}
          onChange={(e) => set('bgColor', e.target.value)}
          placeholder="transparent"
        />
      </P>

      <P label="Align">
        <div className="flex gap-1">
          {['left', 'center', 'right'].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setResponsive('align', a)}
              className={`btn flex-1 py-1.5 text-xs ${getResponsiveValue(c, 'align', view, 'left') === a ? 'btn-primary' : 'btn-secondary'}`}
            >
              {a === 'left' ? (
                <AlignLeft className="w-3.5 h-3.5 mx-auto" />
              ) : a === 'center' ? (
                <AlignCenter className="w-3.5 h-3.5 mx-auto" />
              ) : (
                <AlignRight className="w-3.5 h-3.5 mx-auto" />
              )}
            </button>
          ))}
        </div>
      </P>

      <P label="Padding">{inp('padding', 'number')}</P>
    </>
  )

    case 'image':
      return (
        <>
          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Image ({view === 'desktop' ? 'desktop' : view === 'tablet' ? 'ipad/tablet' : 'mobile'})
          </div>
          <P label="Image">
            <ImageUpload value={String(c.src)} onChange={(v) => set('src', v)} />
          </P>
          <P label="Change Image">
            <button type="button" onClick={() => set('src', '')} className="btn btn-secondary w-full text-xs py-2">
              Remove image
            </button>
          </P>
          <P label="Alt Text">{inp('alt', 'text', 'Describe the image')}</P>
          <P label="Caption">{inp('caption')}</P>
          <P label="Link To">
            <select
              className="input text-sm"
              value={String(c.linkTo || 'website')}
              onChange={(e) => set('linkTo', e.target.value)}
            >
              <option value="website">Website</option>
            </select>
          </P>
          <P label="Website">{inp('link', 'text', 'https://example.com')}</P>
          <P label="Width (%)">
  <input
    className="input text-sm"
    type="number"
    value={String(getResponsiveValue(c, 'width', view, 100))}
    onChange={(e) => setResponsive('width', Number(e.target.value))}
  />
</P>
<P label="Height (px, 0 = Auto)">
  <input
    className="input text-sm"
    type="number"
    value={String(getResponsiveValue(c, 'height', view, 0))}
    onChange={(e) => setResponsive('height', Number(e.target.value))}
  />
</P>
          <P label="Background">{clr('bgColor')}</P>
          <P label="Object Fit">
  <SelectInput
    value={String(getResponsiveValue(c, 'objectFit', view, 'cover'))}
    onChange={(v) => setResponsive('objectFit', v)}
    options={['cover', 'contain', 'fill', 'scale-down', 'none']}
  />
</P>
<P label="Object Position">
  <input
    className="input text-sm"
    value={String(getResponsiveValue(c, 'objectPosition', view, 'center'))}
    onChange={(e) => setResponsive('objectPosition', e.target.value)}
    placeholder="center"
  />
</P>
<P label="Alignment">
  <div className="flex gap-1">
    {['left', 'center', 'right'].map((a) => (
      <button
        key={a}
        type="button"
        onClick={() => setResponsive('align', a)}
        className={`btn flex-1 py-1.5 text-xs ${getResponsiveValue(c, 'align', view, 'center') === a ? 'btn-primary' : 'btn-secondary'}`}
      >
        {a === 'left' ? (
          <AlignLeft className="w-3.5 h-3.5 mx-auto" />
        ) : a === 'center' ? (
          <AlignCenter className="w-3.5 h-3.5 mx-auto" />
        ) : (
          <AlignRight className="w-3.5 h-3.5 mx-auto" />
        )}
      </button>
    ))}
  </div>
</P>
<P label="Border Radius (px)">
  <input
    className="input text-sm"
    type="number"
    value={String(getResponsiveValue(c, 'borderRadius', view, 4))}
    onChange={(e) => setResponsive('borderRadius', Number(e.target.value))}
  />
</P>
<P label="Border Width (px)">
  <input
    className="input text-sm"
    type="number"
    value={String(getResponsiveValue(c, 'borderWidth', view, 0))}
    onChange={(e) => setResponsive('borderWidth', Number(e.target.value))}
  />
</P>
          <P label="Border Style">
            <select className="input text-sm" value={String(c.borderStyle)} onChange={(e) => set('borderStyle', e.target.value)}>
              <option value="solid">solid</option>
              <option value="dashed">dashed</option>
              <option value="dotted">dotted</option>
              <option value="double">double</option>
              <option value="none">none</option>
            </select>
          </P>
          <P label="Border Color">{clr('borderColor')}</P>
          <P label="Box Shadow">{inp('boxShadow', 'text', 'none')}</P>
          <P label="Opacity">
  <input
    className="input text-sm"
    type="number"
    value={String(getResponsiveValue(c, 'opacity', view, 1))}
    onChange={(e) => setResponsive('opacity', Number(e.target.value))}
  />
</P>
          <P label="Filter">{inp('filter', 'text', 'none')}</P>
          <P label="Transition">{inp('transition', 'text', 'all 0.3s ease')}</P>
          <P label="Hover Opacity">{inp('hoverOpacity', 'number')}</P>
          <P label="Hover Filter">{inp('hoverFilter', 'text', 'brightness(1.1)')}</P>
          <P label="Hover Transform">{inp('hoverTransform', 'text', 'none')}</P>
          <P label="Padding">
  <input
    className="input text-sm"
    type="number"
    value={String(getResponsiveValue(c, 'padding', view, 16))}
    onChange={(e) => setResponsive('padding', Number(e.target.value))}
  />
</P>
        </>
      )

    case 'button':
      return (
        <>
          <P label="Button text">{inp('text')}</P>
          <P label="Link URL">{inp('link', 'text', 'https://')}</P>
          <P label="Button color">{clr('bgColor')}</P>
          <P label="Text color">{clr('textColor')}</P>
          <P label="Container bg">{clr('containerBg')}</P>
          <P label="Font size">{inp('fontSize', 'number')}</P>
          <P label="Border radius">{inp('borderRadius', 'number')}</P>
          <P label="Alignment">{aln('align')}</P>
          <P label="Padding">{inp('padding', 'number')}</P>
        </>
      )

    case 'social':
      return (
        <>
          <div className="mb-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
            Enter URLs for icons you want to show. Leave blank to hide.
          </div>
          {Object.entries(SOCIAL_ICONS).map(([k, ic]) => (
            <P key={k} label={ic.label}>
              <div className="flex gap-2 items-center">
                <span
                  dangerouslySetInnerHTML={{
                    __html: `<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:${ic.color};border-radius:50%;flex-shrink:0">${ic.svg}</span>`,
                  }}
                />
                <input
                  className="input flex-1 text-xs"
                  value={String(c[k] || '')}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder={`${ic.label} URL`}
                />
              </div>
            </P>
          ))}
          <P label="Icon size">{inp('iconSize', 'number')}</P>
          <P label="Style">
            <select className="input text-sm" value={String(c.iconStyle)} onChange={(e) => set('iconStyle', e.target.value)}>
              <option value="filled">Filled (coloured)</option>
              <option value="outline">Outline</option>
            </select>
          </P>
          <P label="Gap">{inp('gap', 'number')}</P>
          <P label="Alignment">{aln('align')}</P>
          <P label="Background">{clr('bgColor')}</P>
          <P label="Padding">{inp('padding', 'number')}</P>
        </>
      )

    case 'video':
      return (
        <>
          <P label="Thumbnail">
            <ImageUpload value={String(c.thumbnailUrl)} onChange={(v) => set('thumbnailUrl', v)} />
          </P>
          <P label="Video link">{inp('link', 'text', 'https://youtube.com/...')}</P>
          <P label="Caption">{inp('caption')}</P>
          <P label="Alignment">{aln('align')}</P>
          <P label="Background">{clr('bgColor')}</P>
          <P label="Padding">{inp('padding', 'number')}</P>
        </>
      )

      case 'columns':
        return (
          <>
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Two columns with text or image in each side
            </div>
      
            <P label="Left Column Type">
              <SelectInput
                value={String(c.col1Type || 'text')}
                onChange={(v) => set('col1Type', v)}
                options={['text', 'image']}
              />
            </P>
      
            {String(c.col1Type || 'text') === 'image' ? (
              <>
                <P label="Left Image">
                  <ImageUpload value={String(c.col1ImageSrc || '')} onChange={(v) => set('col1ImageSrc', v)} />
                </P>
                <P label="Left Image Alt">{inp('col1ImageAlt')}</P>
                <P label="Left Image Link">{inp('col1ImageLink', 'text', 'https://')}</P>
              </>
            ) : (
              <P label="Left column">{ta('col1', 4)}</P>
            )}
      
            <P label="Right Column Type">
              <SelectInput
                value={String(c.col2Type || 'text')}
                onChange={(v) => set('col2Type', v)}
                options={['text', 'image']}
              />
            </P>
      
            {String(c.col2Type || 'text') === 'image' ? (
              <>
                <P label="Right Image">
                  <ImageUpload value={String(c.col2ImageSrc || '')} onChange={(v) => set('col2ImageSrc', v)} />
                </P>
                <P label="Right Image Alt">{inp('col2ImageAlt')}</P>
                <P label="Right Image Link">{inp('col2ImageLink', 'text', 'https://')}</P>
              </>
            ) : (
              <P label="Right column">{ta('col2', 4)}</P>
            )}
      
            <P label="Font Family">
              <SelectInput
                value={String(c.fontFamily || 'Inter')}
                onChange={(v) => set('fontFamily', v)}
                options={FONT_FAMILIES}
              />
            </P>
      
            <P label="Font size">{inp('fontSize', 'number')}</P>
            <P label="Color">{clr('color')}</P>
            <P label="Background">{clr('bgColor')}</P>
            <P label="Gap">{inp('gap', 'number')}</P>
            <P label="Padding">{inp('padding', 'number')}</P>
          </>
        )

    case 'divider':
      return (
        <>
          <P label="Color">{clr('color')}</P>
          <P label="Thickness (px)">{inp('thickness', 'number')}</P>
          <P label="Background">{clr('bgColor')}</P>
          <P label="Padding">{inp('padding', 'number')}</P>
        </>
      )

    case 'spacer':
      return (
        <>
          <P label="Height (px)">{inp('height', 'number')}</P>
          <P label="Background">{clr('bgColor')}</P>
        </>
      )

    case 'footer':
      return (
        <>
          <P label="Company">{inp('companyName')}</P>
          <P label="Address">{inp('address')}</P>
          <P label="Footer text">{ta('text', 2)}</P>
          <P label="Unsubscribe text">{inp('unsubscribeText')}</P>
          <P label="Font size">{inp('fontSize', 'number')}</P>
          <P label="Color">{clr('color')}</P>
          <P label="Background">{clr('bgColor')}</P>
          <P label="Padding">{inp('padding', 'number')}</P>
        </>
      )

    case 'html':
      return (
        <>
          <P label="Custom HTML">{ta('html', 16)}</P>
        </>
      )

    default:
      return null
  }
}

function CanvasBlock({
  block,
  selected,
  onSelect,
  onMove,
  onDelete,
  onDuplicate,
  total,
  index,
  view,
}: {
  block: Block
  selected: boolean
  index: number
  total: number
  onSelect: () => void
  onMove: (d: -1 | 1) => void
  onDelete: () => void
  onDuplicate: () => void
  view: ViewMode
}) {
  return (
    <div onClick={onSelect} className={`relative group cursor-pointer ${selected ? 'ring-2 ring-brand-500 ring-offset-1' : 'hover:ring-1 hover:ring-gray-300'}`}>
<div dangerouslySetInnerHTML={{ __html: renderBlock(block, view) }} />
      <div className={`absolute top-1 right-1 flex gap-1 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMove(-1) }} disabled={index === 0} className="w-7 h-7 bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMove(1) }} disabled={index === total - 1} className="w-7 h-7 bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate() }} className="w-7 h-7 bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center hover:bg-gray-50"><Copy className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="w-7 h-7 bg-white border border-red-200 rounded shadow-sm flex items-center justify-center hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {selected && <div className="absolute top-1 left-1 bg-brand-600 text-white text-xs px-2 py-0.5 rounded capitalize">{block.type}</div>}
    </div>
  )
}

const VIEW_W: Record<ViewMode, string> = {
  desktop: '600px',
  tablet: '480px',
  mobile: '375px',
}

const DEFAULT: Block[] = [
  { id: '1', type: 'header', content: { ...BLOCK_DEFAULTS.header } },
  { id: '2', type: 'text', content: { ...BLOCK_DEFAULTS.text } },
  { id: '3', type: 'button', content: { ...BLOCK_DEFAULTS.button } },
  { id: '4', type: 'social', content: { ...BLOCK_DEFAULTS.social } },
  { id: '5', type: 'footer', content: { ...BLOCK_DEFAULTS.footer } },
]

function BuildersPageContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const tid = sp.get('template')

  const [blocks, setBlocks] = useState<Block[]>(DEFAULT)
  const [sel, setSel] = useState<string | null>('1')
  const [view, setView] = useState<ViewMode>('desktop')
  const [panel, setPanel] = useState<'blocks' | 'settings'>('blocks')
  const [emailBg, setEmailBg] = useState('#f3f4f6')
  const [name, setName] = useState('New Email Template')
  const [subject, setSubject] = useState('Your subject line')
  const [saving, setSaving] = useState(false)
  const [autoSave, setAutoSave] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [preview, setPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [dragType, setDragType] = useState<BlockType | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(tid)
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(tid))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selBlock = blocks.find((b) => b.id === sel) || null
  const html = useMemo(() => buildHtml(blocks, emailBg, view), [blocks, emailBg, view])
  const htmlForSave = useMemo(
    () => `${encodeBuilderMeta({ blocks, emailBg })}\n${html}`,
    [blocks, emailBg, html]
  )

  useEffect(() => {
    async function loadTemplateFromBuilder() {
      if (!tid) {
        setLoadingTemplate(false)
        return
      }

      setLoadingTemplate(true)

      try {
        const res = await fetch(`/api/templates/${tid}`)
        if (!res.ok) return

        const data: TemplateResponse = await res.json()
        setSavedId(data.id)
        setName(data.name || 'New Email Template')
        setSubject(data.subject || 'Your subject line')

        const meta = extractBuilderMeta(data.htmlBody)
        if (meta) {
          setBlocks(meta.blocks.length ? meta.blocks : DEFAULT)
          setEmailBg(meta.emailBg || '#f3f4f6')
          setSel(meta.blocks[0]?.id || null)
        } else {
          const cleanedHtml = stripBuilderMeta(data.htmlBody)
          const importedBlock: Block = {
            id: 'imported-html',
            type: 'html',
            content: { html: cleanedHtml || '<div></div>' },
          }
          setBlocks([importedBlock])
          setSel(importedBlock.id)
        }

        setAutoSave('saved')
      } catch (error) {
        console.error('Failed to load template into builder:', error)
      } finally {
        setLoadingTemplate(false)
      }
    }

    loadTemplateFromBuilder()
  }, [tid])

  useEffect(() => {
    if (loadingTemplate || !savedId) return

    setAutoSave('unsaved')

    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      setAutoSave('saving')
      await fetch(`/api/templates/${savedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, htmlBody: htmlForSave }),
      })
      setAutoSave('saved')
    }, 5000)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [blocks, emailBg, name, subject, htmlForSave, savedId, loadingTemplate])

  function uid() {
    return Math.random().toString(36).slice(2, 10)
  }

  function addBlock(type: BlockType, afterId?: string) {
    const nb: Block = { id: uid(), type, content: { ...BLOCK_DEFAULTS[type] } }

    setBlocks((prev) => {
      if (!afterId) return [...prev, nb]
      const idx = prev.findIndex((b) => b.id === afterId)
      const n = [...prev]
      n.splice(idx + 1, 0, nb)
      return n
    })

    setSel(nb.id)
  }

  function upd(id: string, c: Record<string, string | number | boolean>) {
    setBlocks((p) => p.map((b) => (b.id === id ? { ...b, content: c } : b)))
  }

  function mov(id: string, d: -1 | 1) {
    setBlocks((p) => {
      const i = p.findIndex((b) => b.id === id)
      const n = [...p]
      const s = i + d
      if (s < 0 || s >= n.length) return p
      ;[n[i], n[s]] = [n[s], n[i]]
      return n
    })
  }

  function del(id: string) {
    setBlocks((p) => {
      const n = p.filter((b) => b.id !== id)
      if (sel === id) setSel(n[0]?.id || null)
      return n
    })
  }

  function dup(id: string) {
    const b = blocks.find((x) => x.id === id)
    if (!b) return

    const nb = { ...b, id: uid(), content: { ...b.content } }

    setBlocks((p) => {
      const i = p.findIndex((x) => x.id === id)
      const n = [...p]
      n.splice(i + 1, 0, nb)
      return n
    })

    setSel(nb.id)
  }

  type SaveTemplateResponse = {
    id?: string
    error?: string
  }

  type SendResponse = {
    ok?: boolean
    error?: string
  }

  async function save() {
    setSaving(true)

    const body = { name, subject, htmlBody: htmlForSave }

    try {
      const res = await fetch(savedId ? `/api/templates/${savedId}` : '/api/templates', {
        method: savedId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const d: SaveTemplateResponse = await res.json()

      if (res.ok) {
        setSavedId(d.id || savedId)
        setAutoSave('saved')
      }
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    if (!testEmail) return

    setSendingTest(true)

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${subject}`,
          html,
        }),
      })

      if (res.ok) {
        setTestSent(true)
        setTimeout(() => setTestSent(false), 3000)
      } else {
        const d: SendResponse = await res.json()
        alert(d.error || 'Failed to send test email')
      }
    } finally {
      setSendingTest(false)
    }
  }

  const checklist = [
    { ok: subject.length > 0 && subject.length <= 50, label: `Subject (${subject.length}/50 chars)` },
    { ok: blocks.some((b) => b.type === 'footer'), label: 'Footer with unsubscribe' },
    { ok: blocks.some((b) => b.type === 'button') || html.includes('href='), label: 'At least one button/link' },
    { ok: html.includes('{{unsubscribe_link}}'), label: 'Unsubscribe link present' },
    { ok: !blocks.filter((b) => b.type === 'image').some((b) => !b.content.alt), label: 'All images have alt text' },
  ]

  if (loadingTemplate) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading template into builder...
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="flex border-b border-gray-200">
          <button type="button" onClick={() => setPanel('blocks')} className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 ${panel === 'blocks' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}><Plus className="w-3.5 h-3.5" />Blocks</button>
          <button type="button" onClick={() => setPanel('settings')} className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 ${panel === 'settings' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}><Settings className="w-3.5 h-3.5" />Settings</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {panel === 'blocks' ? (
            <div className="p-3">
              <p className="text-xs text-gray-400 mb-2">Drag to canvas · click to add below selected</p>
              <div className="grid grid-cols-2 gap-2">
                {PALETTE.map((it) => (
                  <button
                    key={it.type}
                    type="button"
                    draggable
                    onDragStart={() => setDragType(it.type)}
                    onDragEnd={() => setDragType(null)}
                    onClick={() => addBlock(it.type, sel || undefined)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors cursor-grab text-center"
                  >
                    <div className="text-brand-600">{it.icon}</div>
                    <div className="text-xs font-medium text-gray-700">{it.label}</div>
                    <div className="text-[10px] text-gray-400">{it.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              <div><label className="label">Template name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div>
                <label className="label">Subject line</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <div className={`text-xs mt-1 ${subject.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>{subject.length}/50 {subject.length > 50 ? '⚠️ too long' : '✓'}</div>
              </div>
              <div>
                <label className="label">Email background</label>
                <div className="flex gap-2"><input type="color" value={emailBg} onChange={(e) => setEmailBg(e.target.value)} className="w-10 h-9 rounded border border-gray-200 p-0.5 cursor-pointer" /><input className="input flex-1 font-mono text-xs" value={emailBg} onChange={(e) => setEmailBg(e.target.value)} /></div>
              </div>
              <div>
                <label className="label">Send test email</label>
                <input className="input mb-2" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@email.com" />
                <button type="button" onClick={sendTest} disabled={sendingTest || !testEmail} className="btn btn-secondary w-full text-sm">
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : testSent ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Send className="w-3.5 h-3.5" />}
                  {testSent ? 'Sent!' : sendingTest ? 'Sending...' : 'Send test email'}
                </button>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs font-semibold text-gray-600 mb-2">Pre-send checklist</div>
                {checklist.map((it) => (
                  <div key={it.label} className="flex items-center gap-2 py-1">
                    {it.ok ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                    <span className={`text-xs ${it.ok ? 'text-gray-600' : 'text-amber-700'}`}>{it.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost p-1.5"><ArrowLeft className="w-4 h-4" /></button>
          <input className="input text-sm font-medium max-w-[180px]" value={name} onChange={(e) => setName(e.target.value)} />
          <div className={`text-xs flex items-center gap-1 ${autoSave === 'saved' ? 'text-green-600' : autoSave === 'saving' ? 'text-gray-400' : 'text-amber-600'}`}>
            {autoSave === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : autoSave === 'saved' ? <Check className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
            {autoSave === 'saved' ? 'Auto saved' : autoSave === 'saving' ? 'Saving...' : 'Unsaved changes'}
          </div>

          <div className="flex items-center gap-1 ml-2 bg-gray-100 rounded-lg p-1">
            {([['desktop', 'Desktop', Monitor], ['tablet', 'Tablet', Tablet], ['mobile', 'Mobile', Smartphone]] as const).map(([v, lbl, Icon]) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-3.5 h-3.5" /><span className="hidden lg:inline">{lbl}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => setPreview(!preview)} className={`btn text-xs py-1.5 px-3 ${preview ? 'btn-primary' : 'btn-secondary'}`}><Eye className="w-3.5 h-3.5" />{preview ? 'Edit' : 'Preview'}</button>
            <button type="button" onClick={save} disabled={saving} className="btn btn-primary text-xs py-1.5 px-4">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : autoSave === 'saved' && savedId ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : autoSave === 'saved' && savedId ? 'Saved' : 'Save template'}
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto bg-gray-100 py-8 flex justify-center px-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (dragType) {
              addBlock(dragType)
              setDragType(null)
            }
            setDragOver(null)
          }}
        >
          <div style={{ width: VIEW_W[view], maxWidth: '100%', transition: 'width .3s' }}>
            <div style={{ background: emailBg }}>
              {preview ? (
                <div dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <>
                  {blocks.map((b, i) => (
                    <div
                      key={b.id}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(b.id) }}
                      onDrop={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (dragType) {
                          addBlock(dragType, b.id)
                          setDragType(null)
                        }
                        setDragOver(null)
                      }}
                    >
                      {dragOver === b.id && dragType && <div className="h-1.5 bg-brand-400 rounded mx-2 my-0.5" />}
                      <CanvasBlock
  block={b}
  index={i}
  total={blocks.length}
  selected={sel === b.id}
  onSelect={() => setSel(b.id)}
  onMove={(d) => mov(b.id, d)}
  onDelete={() => del(b.id)}
  onDuplicate={() => dup(b.id)}
  view={view}
/>
                    </div>
                  ))}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver('end') }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragType) {
                        addBlock(dragType)
                        setDragType(null)
                      }
                      setDragOver(null)
                    }}
                    className={`mx-4 my-3 border-2 border-dashed rounded-lg py-5 text-center text-xs transition-colors ${dragOver === 'end' && dragType ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-gray-300 text-gray-400'}`}
                  >
                    {dragType ? 'Drop block here' : 'Drag a block here · click a palette item to add below selection'}
                  </div>
                </>
              )}
            </div>
            <div className="text-center mt-2 text-xs text-gray-400">{view === 'desktop' ? 'Desktop · 600px' : view === 'tablet' ? 'Tablet · 480px' : 'Mobile · 375px'}</div>
          </div>
        </div>
      </div>

      <div className="w-64 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{selBlock ? `✏️ ${selBlock.type}` : 'Properties'}</div>
          {selBlock && <button type="button" onClick={() => del(selBlock.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
        {selBlock ? (
  <BlockProps block={selBlock} onChange={(c) => upd(selBlock.id, c)} view={view} />
) : (
  <div className="text-center py-10 text-sm text-gray-400">Click any block to edit it</div>
)}
        </div>
      </div>
    </div>
  )
}

function BuilderFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="text-sm text-gray-500">Loading builder...</div>
    </div>
  )
}

export default function Builders() {
  return (
    <Suspense fallback={<BuilderFallback />}>
      <BuildersPageContent />
    </Suspense>
  )
}