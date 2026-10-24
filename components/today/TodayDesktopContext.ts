'use client';

import { createContext } from 'react';

/** 배치만 바꾸며 작성기와 그 안의 입력 상태는 마운트한 채 유지한다. */
export const TodayDesktopContext = createContext(false);
