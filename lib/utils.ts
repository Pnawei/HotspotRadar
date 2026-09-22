import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 独立后端地址：配置了 NEXT_PUBLIC_API_BASE_URL 则直连独立服务，否则走相对路径
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''
