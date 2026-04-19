import { CreateUserData, CreateUserVariables, GetMyProjectsData, CreateTaskForProjectData, CreateTaskForProjectVariables, GetMyTasksData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;

export function useGetMyProjects(options?: useDataConnectQueryOptions<GetMyProjectsData>): UseDataConnectQueryResult<GetMyProjectsData, undefined>;
export function useGetMyProjects(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyProjectsData>): UseDataConnectQueryResult<GetMyProjectsData, undefined>;

export function useCreateTaskForProject(options?: useDataConnectMutationOptions<CreateTaskForProjectData, FirebaseError, CreateTaskForProjectVariables>): UseDataConnectMutationResult<CreateTaskForProjectData, CreateTaskForProjectVariables>;
export function useCreateTaskForProject(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTaskForProjectData, FirebaseError, CreateTaskForProjectVariables>): UseDataConnectMutationResult<CreateTaskForProjectData, CreateTaskForProjectVariables>;

export function useGetMyTasks(options?: useDataConnectQueryOptions<GetMyTasksData>): UseDataConnectQueryResult<GetMyTasksData, undefined>;
export function useGetMyTasks(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyTasksData>): UseDataConnectQueryResult<GetMyTasksData, undefined>;
