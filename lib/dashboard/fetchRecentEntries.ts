export interface RecentEntry {
  id: string;
  quote: string | null;
  note: string | null;
  date: string;
  createdAt: string;
  userBookId: string;
  bookTitle: string;
  bookAuthor: string | null;
}
