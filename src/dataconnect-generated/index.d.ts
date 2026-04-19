import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface ContextLink_Key {
  id: UUIDString;
  __typename?: 'ContextLink_Key';
}

export interface CreateTaskForProjectData {
  task_insert: Task_Key;
}

export interface CreateTaskForProjectVariables {
  projectId: UUIDString;
  title: string;
  dueDate: DateString;
  priority: string;
  description?: string | null;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  displayName: string;
  email: string;
}

export interface GetMyProjectsData {
  projects: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    isCompleted?: boolean | null;
    dueDate?: DateString | null;
  } & Project_Key)[];
}

export interface GetMyTasksData {
  tasks: ({
    id: UUIDString;
    title: string;
    description?: string | null;
    dueDate: DateString;
    priority: string;
    isCompleted?: boolean | null;
    project?: {
      id: UUIDString;
      name: string;
    } & Project_Key;
  } & Task_Key)[];
}

export interface Project_Key {
  id: UUIDString;
  __typename?: 'Project_Key';
}

export interface Task_Key {
  id: UUIDString;
  __typename?: 'Task_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;
export function createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface GetMyProjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProjectsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyProjectsData, undefined>;
  operationName: string;
}
export const getMyProjectsRef: GetMyProjectsRef;

export function getMyProjects(options?: ExecuteQueryOptions): QueryPromise<GetMyProjectsData, undefined>;
export function getMyProjects(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyProjectsData, undefined>;

interface CreateTaskForProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTaskForProjectVariables): MutationRef<CreateTaskForProjectData, CreateTaskForProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateTaskForProjectVariables): MutationRef<CreateTaskForProjectData, CreateTaskForProjectVariables>;
  operationName: string;
}
export const createTaskForProjectRef: CreateTaskForProjectRef;

export function createTaskForProject(vars: CreateTaskForProjectVariables): MutationPromise<CreateTaskForProjectData, CreateTaskForProjectVariables>;
export function createTaskForProject(dc: DataConnect, vars: CreateTaskForProjectVariables): MutationPromise<CreateTaskForProjectData, CreateTaskForProjectVariables>;

interface GetMyTasksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyTasksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyTasksData, undefined>;
  operationName: string;
}
export const getMyTasksRef: GetMyTasksRef;

export function getMyTasks(options?: ExecuteQueryOptions): QueryPromise<GetMyTasksData, undefined>;
export function getMyTasks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyTasksData, undefined>;

