module.exports = {
  ci: {
    collect: {
      url: [], // 배포된 주소
      numberOfRuns: 3,
      startServerCommand: null, // 서버는 배포된 상태로 접근
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage', // 결과를 Google의 임시 저장소에 업로드
    },
  },
};
