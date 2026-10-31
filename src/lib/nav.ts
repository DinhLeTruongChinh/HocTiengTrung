export type Page = 'home' | 'lessons' | 'lesson' | 'practice' | 'review' | 'progress' | 'admin' | 'login' | 'thuy' | 'exam' | 'thuy_exam' | 'thuy_progress' | 'thuy_lessons' | 'thuy_lesson' | 'thuy_vocab' | 'thuy_review' | 'character' | 'grammar' | 'radicals'
export interface Route { page: Page; lessonId?: string; level?: number; wordIds?: string[]; wordId?: string }
export type Go = (r: Route) => void
