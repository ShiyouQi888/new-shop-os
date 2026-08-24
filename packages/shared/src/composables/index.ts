/**
 * 共享 Composables
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 本地存储 - 响应式
 */
export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  const value = ref<T>(defaultValue) as Ref<T>

  try {
    const stored = localStorage.getItem(key)
    if (stored) value.value = JSON.parse(stored)
  } catch {
    // ignore
  }

  const update = (newVal: T) => {
    value.value = newVal
    try {
      localStorage.setItem(key, JSON.stringify(newVal))
    } catch {
      // ignore
    }
  }

  return new Proxy(value, {
    set(target, prop, val) {
      if (prop === 'value') {
        update(val)
      }
      return true
    },
  }) as Ref<T>
}

/**
 * 倒计时
 */
export function useCountdown(seconds: number) {
  const remaining = ref(seconds)
  let timer: ReturnType<typeof setInterval> | null = null

  const start = () => {
    remaining.value = seconds
    timer = setInterval(() => {
      if (remaining.value > 0) {
        remaining.value--
      } else {
        stop()
      }
    }, 1000)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(stop)

  return { remaining, start, stop }
}

/**
 * 列表分页 + 筛选
 */
export function useListQuery<T>(fetchFn: (params: { page: number; pageSize: number; [key: string]: any }) => Promise<{ list: T[]; total: number }>) {
  const loading = ref(false)
  const list = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const filters = ref<Record<string, any>>({})

  const load = async () => {
    loading.value = true
    try {
      const result = await fetchFn({ page: page.value, pageSize: pageSize.value, ...filters.value })
      list.value = result.list
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  const search = () => {
    page.value = 1
    return load()
  }

  const resetPage = () => {
    page.value = 1
    filters.value = {}
    return load()
  }

  return { loading, list, total, page, pageSize, filters, load, search, resetPage }
}

/**
 * 复制到剪贴板
 */
export function useCopy() {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        copied.value = false
      }, 2000)
      return true
    } catch {
      return false
    }
  }

  return { copied, copy }
}

/**
 * 弹窗控制
 */
export function useDialog() {
  const visible = ref(false)
  const open = () => { visible.value = true }
  const close = () => { visible.value = false }
  const toggle = () => { visible.value = !visible.value }
  return { visible, open, close, toggle }
}
