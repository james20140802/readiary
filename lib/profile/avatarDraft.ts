export interface AvatarStorage {
  upload(path: string, file: File): Promise<void>;
  remove(paths: string[]): Promise<void>;
}

export class AvatarCleanupError extends Error {
  constructor() {
    super('이미지 파일 삭제를 완료하지 못했습니다. 이 화면에서 다시 저장해주세요.');
  }
}

/** 선택 중인 사진은 메모리에만 둔다. 저장하지 않고 떠나도 업로드 파일이 생기지 않는다. */
export class AvatarDraft {
  private file: File | null = null;
  private preview: string | null = null;
  private selectedPath: string | null;
  private persistedPath: string | null;
  private cleanup = new Set<string>();
  private saving = false;

  constructor(
    private userId: string,
    initialPath: string | null
  ) {
    this.selectedPath = initialPath;
    this.persistedPath = initialPath;
  }

  get source() {
    return this.preview ?? this.selectedPath;
  }

  select(file: File | null) {
    if (this.saving) throw new Error('저장이 끝난 뒤 사진을 변경해주세요.');
    if (file) {
      if (
        !/\.(jpe?g|png|webp)$/i.test(file.name) ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ) {
        throw new Error('jpg, png, webp 파일만 업로드 가능합니다.');
      }
      if (file.size > 2 * 1024 * 1024) throw new Error('파일 크기는 2MB 이하여야 합니다.');
    }
    const preview = file ? URL.createObjectURL(file) : null;
    this.dispose();
    this.file = file;
    this.preview = preview;
    this.selectedPath = null;
  }

  /** 네트워크 작업이 없는 미리보기 정리. React Strict Mode에서도 저장 상태는 건드리지 않는다. */
  dispose() {
    if (this.preview) URL.revokeObjectURL(this.preview);
    this.preview = null;
  }

  private async clean(storage: AvatarStorage) {
    if (!this.cleanup.size) return;
    try {
      await storage.remove([...this.cleanup]);
      this.cleanup.clear();
    } catch {
      // 실패한 경로는 유지해 다음 저장 때 먼저 재시도한다. 성공으로 안내하지 않는다.
      throw new AvatarCleanupError();
    }
  }

  async save(storage: AvatarStorage, persist: (path: string | null) => Promise<void>) {
    if (this.saving) throw new Error('이미 저장 중입니다.');
    this.saving = true;
    try {
      await this.clean(storage);
      let path = this.selectedPath;
      if (this.file) {
        path = `${this.userId}/${crypto.randomUUID()}.${this.file.name.split('.').pop()!.toLowerCase()}`;
        await storage.upload(path, this.file);
        this.cleanup.add(path);
      }
      try {
        await persist(path);
      } catch (error) {
        await this.clean(storage);
        throw error;
      }
      if (path) this.cleanup.delete(path);
      if (
        this.persistedPath &&
        this.persistedPath !== path &&
        this.persistedPath.startsWith(`${this.userId}/`)
      ) {
        this.cleanup.add(this.persistedPath);
      }
      // DB 저장 성공을 먼저 기억한다. 삭제 실패 후 재시도해도 재업로드하거나 현재 사진을 지우지 않는다.
      this.persistedPath = path;
      this.selectedPath = path;
      this.file = null;
      this.dispose();
      await this.clean(storage);
    } finally {
      this.saving = false;
    }
  }
}
