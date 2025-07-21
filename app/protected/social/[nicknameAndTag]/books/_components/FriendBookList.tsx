'use client';

import Link from 'next/link';
import { MyBook } from '@/types/book';
import { Profile } from '@/types/profile';

export default function FriendBookList({
  books,
  profile,
}: {
  books: MyBook[];
  profile: Profile | null;
}) {
  // Profile section above book list
  // Inserted as per instructions
  return (
    <>
      {profile && (
        <div className="mb-6 flex items-center gap-4">
          {profile.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_image}
              alt="프로필 이미지"
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-white">
              {profile.nickname[0]}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {profile.nickname}#{profile.tag}
            </p>
          </div>
        </div>
      )}
      {!books || books.length === 0 ? (
        <div className="text-center text-gray-700 dark:text-gray-300 space-y-2">
          <p>아직 등록한 책이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {books.map((userBook) => {
            const book = userBook.books;
            const percent = book?.total_pages ? userBook.progress : 0;

            return (
              <li
                key={userBook.id}
                className="rounded-xl border p-4 bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {book?.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{book?.author}</p>
                    <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                      📖 {percent}% 진행 중
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/protected/social/${profile?.nickname}-${profile?.tag}/books/${userBook.book_id}`}
                      className="text-sm px-3 py-1 h-8 min-w-[80px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"
                    >
                      상세 보기
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
