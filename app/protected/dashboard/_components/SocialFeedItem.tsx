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

export default function FeedItem({ entry, profile, initialLiked }: SocialFeedEntry) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  // 초기 좋아요 상태 (entry.initialLiked 등 이미 prop으로 넘어온다고 가정하거나, 필요시 fetch)
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
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

  // 실제 좋아요 처리 로직
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLikeLoading) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    // 1. Optimistic Update: UI 먼저 변경
    const previousState = isLiked;
    setIsLiked(!previousState);
    setIsLikeLoading(true);

    try {
      if (!previousState) {
        // 좋아요 추가
        const { error } = await supabase.from('likes').insert({
          entry_id: entry.id,
          user_id: user.id,
        });
        if (error) throw error;
      } else {
        // 좋아요 취소
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ entry_id: entry.id, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Like error:', error);
      setIsLiked(previousState); // 실패 시 롤백
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <Card
      aria-label="소셜 피드 항목"
      className="relative flex gap-4 p-4 items-start bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-2xl group transition-all"
    >
      <Link href={userProfilePath} className="shrink-0 mt-0.5">
        <Avatar
          alt={`${profile.nickname}의 프로필 이미지`}
          fallbackText={profile.nickname.charAt(0).toUpperCase()}
          src={getImageUrl(profile.profile_image) || undefined}
          size="lg"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1.5">
          <div className="text-sm">
            <Link
              href={userProfilePath}
              className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              {profile.name}
            </Link>
            <span className="text-zinc-500 ml-1">님이</span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-md transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <button
                  onClick={() => router.push(userProfilePath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left text-[13px] font-medium transition-colors"
                >
                  <User size={14} className="text-zinc-400" /> 프로필 방문
                </button>
                <button
                  onClick={() => router.push(bookDetailPath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left text-[13px] font-medium transition-colors"
                >
                  <BookOpen size={14} className="text-zinc-400" /> 도서 정보
                </button>
                <button
                  onClick={() => router.push(entryDetailPath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left text-[13px] font-semibold border-t border-zinc-50 dark:border-zinc-800 text-tint transition-colors"
                >
                  <Maximize2 size={14} /> 상세 보기
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-[14px] leading-snug">
            <Link
              href={bookDetailPath}
              className="font-bold text-zinc-800 dark:text-zinc-200 hover:underline underline-offset-4 decoration-2 decoration-tint/20"
            >
              {entry.book.title}
            </Link>
            <span className="ml-1 text-zinc-500 font-medium text-[13px]"> </span>
            <span className="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-zinc-700 text-tint text-[11px] font-extrabold border border-zinc-100 dark:border-zinc-600 mr-2 shadow-sm">
              {entry.to_page ? `${entry.to_page}p까지` : ''}
            </span>
            <span className="ml-1 text-zinc-500 font-medium text-[13px]">읽었어요</span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-medium text-zinc-400">
              {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
            </span>

            <button
              onClick={handleLike}
              disabled={isLikeLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all active:scale-95 border ${
                isLiked
                  ? 'text-red-500 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/40 shadow-sm'
                  : 'text-zinc-400 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:text-red-400 hover:border-red-100'
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
      </div>
    </Card>
  );
}
