'use client';

import { useState, useRef, useEffect } from 'react';
import { SocialFeedEntry } from '@/types/entry';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { MoreHorizontal, Heart, User, BookOpen, Maximize2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { getImageUrl } from '@/utils/profile';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function FeedItem({ entry, profile, initialLiked }: SocialFeedEntry) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const timeZone = 'Asia/Seoul';
  const now = toZonedTime(new Date(), timeZone);
  const targetDate = toZonedTime(new Date(entry.created_at), timeZone);

  const userProfilePath = `/protected/social/u/${profile.nickname}-${profile.tag}`;
  const bookDetailPath = `${userProfilePath}/books/${entry.book.id}`;
  const entryDetailPath = `${userProfilePath}/entry/${entry.id}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLikeLoading) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorModalMessage('로그인이 필요한 기능입니다.');
      setIsErrorModalOpen(true);
      return;
    }

    const previousState = isLiked;
    setIsLiked(!previousState);
    setIsLikeLoading(true);

    try {
      if (!previousState) {
        const { error } = await supabase
          .from('likes')
          .insert({ entry_id: entry.id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ entry_id: entry.id, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Like error:', error);
      setIsLiked(previousState);
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <Card
      aria-label="소셜 피드 항목"
      className="relative flex gap-3 p-4 items-start"
      hoverable={false}
    >
      {/* 아바타 */}
      <Link href={userProfilePath} className="shrink-0 mt-0.5">
        <Avatar
          alt={`${profile.nickname}의 프로필 이미지`}
          fallbackText={profile.nickname.charAt(0).toUpperCase()}
          src={getImageUrl(profile.profile_image) || undefined}
          size="lg"
        />
      </Link>

      <div className="flex-1 min-w-0">
        {/* 헤더: 이름 + 메뉴 */}
        <div className="flex justify-between items-start mb-1">
          <Link href={userProfilePath} className="flex items-center gap-1 group">
            <span className="text-body-sm font-bold text-ink group-hover:underline">
              {profile.name}
            </span>
            <span className="text-body-sm text-ink-faint">님이</span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-ink-faint hover:text-ink-sub rounded-md transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-card border border-hairline rounded-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <button
                  onClick={() => router.push(userProfilePath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-card-raised text-left text-body-sm transition-colors"
                >
                  <User size={14} className="text-ink-faint" /> 프로필 방문
                </button>
                <button
                  onClick={() => router.push(bookDetailPath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-card-raised text-left text-body-sm transition-colors"
                >
                  <BookOpen size={14} className="text-ink-faint" /> 도서 정보
                </button>
                <button
                  onClick={() => router.push(entryDetailPath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-card-raised text-left text-body-sm font-semibold border-t border-hairline text-accent transition-colors"
                >
                  <Maximize2 size={14} /> 상세 보기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 책 제목 + 페이지 배지 */}
        <Link href={bookDetailPath} className="flex items-center gap-1.5 mb-2 group/book">
          <span className="text-caption text-ink-faint">📚</span>
          <span className="text-body-sm font-semibold text-ink group-hover/book:text-accent transition-colors line-clamp-1">
            {entry.book.title}
          </span>
          {entry.to_page && (
            <span className="shrink-0 text-[10px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded-full border border-accent/20">
              {entry.from_page ? `${entry.from_page}→${entry.to_page}p` : `${entry.to_page}p`}
            </span>
          )}
        </Link>

        {/* 본문 */}
        {(entry.note || entry.quote) && (
          <Link href={entryDetailPath}>
            <p className="text-body-sm text-ink-sub leading-relaxed line-clamp-3 hover:text-ink transition-colors">
              {entry.note ?? `“${entry.quote}”`}
            </p>
          </Link>
        )}

        {/* 하단: 시간 + 좋아요 */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-caption text-ink-faint">
            {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
          </span>

          <button
            onClick={handleLike}
            disabled={isLikeLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all active:scale-95 border ${
              isLiked
                ? 'text-danger bg-danger-soft border-danger/30'
                : 'text-ink-faint bg-card border-hairline hover:text-danger hover:border-danger/30'
            } ${isLikeLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Heart
              size={12}
              fill={isLiked ? 'currentColor' : 'none'}
              strokeWidth={isLiked ? 0 : 2.5}
            />
            <span className="text-[11px] font-bold">좋아요</span>
          </button>
        </div>
      </div>

      {/* 에러 모달 */}
      <Modal isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink">알림</h2>
          <p className="text-sm text-ink-sub">{errorModalMessage}</p>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setIsErrorModalOpen(false)}>
              확인
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
