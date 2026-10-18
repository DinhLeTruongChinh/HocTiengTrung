export type Page = 'home' | 'lessons' | 'lesson' | 'practice' | 'review' | 'progress' | 'admin' | 'login' | 'thuy' | 'character' | 'grammar' | 'radicals'
export interface Route { page: Page; lessonId?: string; level?: number; wordIds?: string[]; wordId?: string }
export type Go = (r: Route) => void
