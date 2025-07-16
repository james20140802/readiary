export type BadgeCheckResult = {
  badgeId: string;
  conditionMet: boolean;
};

export type BadgeConditionDefinition = {
  code: string; // badgeId와 동일
  description: string;
  check: (userId: string) => Promise<boolean>;
};

export type Badge = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
};

export type UserBadge = {
  awarded_at: string | null;
  badge: Badge;
};
