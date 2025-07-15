export type BadgeCheckResult = {
  badgeId: string;
  conditionMet: boolean;
};

export type BadgeConditionDefinition = {
  code: string; // badgeId와 동일
  description: string;
  check: (userId: string) => Promise<boolean>;
};
