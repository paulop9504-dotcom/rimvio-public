export type UserDefinedActionParam = {
  key: string;
  label: string;
  required?: boolean;
};

export type UserDefinedAction = {
  id: string;
  name: string;
  triggers: string[];
  urlTemplate: string;
  params: UserDefinedActionParam[];
  createdAt: string;
  updatedAt: string;
};

export type UserDefinedActionMatch = {
  action: UserDefinedAction;
  trigger: string;
  params: Record<string, string>;
  resolvedUrl: string;
};
